'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  useGroupCallSocket,
  type GroupCallSocketStatus,
} from '../hooks/useGroupCallSocket'
import { useAuth } from '../hooks/useAuth'
import { useToast } from './ToastContext'
import { useTranslation } from '../hooks/useTranslation'
import { getIceServers } from '../api/calls'
import { playRingtone, stopRingtone } from '../utils/ringtone'
import {
  bufferIce,
  createNegState,
  drainIce,
  isPolitePeer,
  shouldIOffer,
  type PeerNegState,
} from '../utils/groupCallNegotiation'
import { participantIdentity } from '../utils/groupCallParticipants'
import type {
  ActiveGroupCall,
  GroupCallCreatedPayload,
  GroupCallCreatorChangedPayload,
  GroupCallEndedPayload,
  GroupCallIncomingPayload,
  GroupCallJoinRequestPayload,
  GroupCallJoinRequestSentPayload,
  GroupCallJoinRejectedPayload,
  GroupCallJoinedPayload,
  GroupCallLeftPayload,
  GroupCallMicPayload,
  GroupCallParticipantsResponse,
  GroupCallPhase,
  GroupCallProfiles,
  GroupCallSignalPayload,
  GroupCallVideoPayload,
  GroupCallParticipant,
} from '../types/groupCall'

const CONNECT_TIMEOUT_MS = 45_000
const REJOIN_TIMEOUT_MS = 12_000
const END_FALLBACK_MS = 2_500

/** Dọn một timer ref an toàn (dùng ở cả hook và callback). */
function clearTimerRef(ref: { current: ReturnType<typeof setTimeout> | null }) {
  if (ref.current) {
    clearTimeout(ref.current)
    ref.current = null
  }
}

export interface GroupCallContextValue {
  phase: GroupCallPhase
  call: ActiveGroupCall | null
  duration: number
  localStream: MediaStream | null
  localMuted: boolean
  localVideoOn: boolean
  isCreator: boolean
  isInGroupCall: boolean
  myUserId: string
  pendingRequests: string[]
  /** Profile của người đang xin vào (chưa chắc đã là participant). */
  profiles: GroupCallProfiles
  remoteStreams: Map<string, MediaStream>
  startGroupCall: (chatId: string, participantIds?: string[]) => Promise<void>
  joinGroupCall: (callId: string) => Promise<void>
  declineGroupCall: () => void
  acceptJoinRequest: (userId: string) => void
  rejectJoinRequest: (userId: string) => void
  endGroupCall: () => void
  toggleMute: () => void
  toggleVideo: () => void
  toggleMuteParticipant: (userId: string) => void
  minimize: () => void
  expand: () => void
  dismiss: () => void
}

const GroupCallContext = createContext<GroupCallContextValue | undefined>(
  undefined,
)

export function GroupCallProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { user } = useAuth()
  const myUserId = user?.user_id ?? ''
  const socket = useGroupCallSocket()

  const [phase, setPhase] = useState<GroupCallPhase>('idle')
  const [call, setCall] = useState<ActiveGroupCall | null>(null)
  const [duration, setDuration] = useState(0)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [localMuted, setLocalMuted] = useState(false)
  const [localVideoOn, setLocalVideoOn] = useState(true)
  const [profiles, setProfiles] = useState<GroupCallProfiles>({})
  const [remoteStreams, setRemoteStreams] = useState<
    Map<string, MediaStream>
  >(new Map())

  const phaseRef = useRef<GroupCallPhase>('idle')
  const callRef = useRef<ActiveGroupCall | null>(null)
  const callIdRef = useRef<string | null>(null)
  const myUserIdRef = useRef('')
  const localStreamRef = useRef<MediaStream | null>(null)
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const negRef = useRef<Map<string, PeerNegState>>(new Map())
  const iceServersRef = useRef<RTCIceServer[]>([])
  const iceServersPromiseRef = useRef<Promise<unknown> | null>(null)
  const profilesRef = useRef<GroupCallProfiles>({})
  const participantsRef = useRef<Map<string, GroupCallParticipant>>(new Map())
  /** Những người đã thực sự join (khác với Participants = được mời). */
  const joinedRef = useRef<Set<string>>(new Set())
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const endedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const connectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rejoinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const endFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasOpenedSocketRef = useRef(false)
  const lastSocketStatusRef = useRef<GroupCallSocketStatus>('connecting')
  const handlersRef = useRef<Record<string, (payload: unknown) => void>>({})

  const setPhaseBoth = useCallback((p: GroupCallPhase) => {
    phaseRef.current = p
    setPhase(p)
  }, [])

  const setCallState = useCallback((c: ActiveGroupCall | null) => {
    callRef.current = c
    callIdRef.current = c?.callId ?? null
    setCall(c)
  }, [])

  useEffect(() => {
    myUserIdRef.current = myUserId
  }, [myUserId])

  useEffect(() => {
    iceServersPromiseRef.current = getIceServers().then((servers) => {
      iceServersRef.current = servers
      return servers
    })
  }, [])

  const clearDuration = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current)
      durationTimerRef.current = null
    }
  }, [])

  const startDurationTimer = () => {
    clearDuration()
    const started = Date.now()
    setDuration(0)
    durationTimerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - started) / 1000))
    }, 1000)
  }

  const syncParticipants = () => {
    setCallState(
      callRef.current
        ? { ...callRef.current, participants: new Map(participantsRef.current) }
        : null,
    )
  }

  const rememberProfiles = useCallback((incoming?: GroupCallProfiles) => {
    if (!incoming) return
    let changed = false
    const next: GroupCallProfiles = { ...profilesRef.current }
    for (const [uid, profile] of Object.entries(incoming)) {
      if (!uid || !profile) continue
      const current = next[uid]
      if (
        current?.display_name === profile.display_name &&
        current?.avatar_uri === profile.avatar_uri
      ) {
        continue
      }
      next[uid] = profile
      changed = true
    }
    if (changed) {
      profilesRef.current = next
      setProfiles(next)
    }
  }, [])

  const identityOf = useCallback(
    (userId: string) =>
      participantIdentity(userId, myUserIdRef.current, profilesRef.current[userId], {
        you: t('groupCall.you'),
        member: t('groupCall.member'),
      }),
    [t],
  )

  /** Làm mới tên/avatar của mọi participant đã biết từ profile mới nhất. */
  const refreshIdentities = () => {
    for (const [uid, participant] of participantsRef.current) {
      const identity = identityOf(uid)
      if (
        participant.display_name !== identity.display_name ||
        participant.avatar_uri !== identity.avatar_uri
      ) {
        participantsRef.current.set(uid, { ...participant, ...identity })
      }
    }
  }

  const ensureParticipant = (userId: string): GroupCallParticipant => {
    const existing = participantsRef.current.get(userId)
    if (existing) return existing
    const participant: GroupCallParticipant = {
      user_id: userId,
      ...identityOf(userId),
      muted: false,
      video_enabled: true,
      is_active: false,
    }
    participantsRef.current.set(userId, participant)
    return participant
  }

  const closeAllPeerConnections = useCallback(() => {
    pcsRef.current.forEach((pc) => {
      pc.onicecandidate = null
      pc.ontrack = null
      pc.onconnectionstatechange = null
      pc.close()
    })
    pcsRef.current.clear()
    negRef.current.clear()
  }, [])

  const stopStreams = useCallback(() => {
    const stream = localStreamRef.current
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
    }
    localStreamRef.current = null
    setLocalStream(null)
  }, [])

  const resetToIdle = useCallback(() => {
    stopRingtone()
    closeAllPeerConnections()
    stopStreams()
    participantsRef.current.clear()
    joinedRef.current.clear()
    callIdRef.current = null
    clearDuration()
    clearTimerRef(endedTimerRef)
    clearTimerRef(connectTimerRef)
    clearTimerRef(rejoinTimerRef)
    clearTimerRef(endFallbackTimerRef)
    setCallState(null)
    setPhaseBoth('idle')
    setDuration(0)
    setLocalMuted(false)
    setLocalVideoOn(true)
    setRemoteStreams(new Map())
    profilesRef.current = {}
    setProfiles({})
  }, [
    setCallState,
    setPhaseBoth,
    closeAllPeerConnections,
    stopStreams,
    clearDuration,
  ])

  const showEnded = useCallback(
    (extraMs = 3000) => {
      stopRingtone()
      closeAllPeerConnections()
      stopStreams()
      callIdRef.current = null
      clearDuration()
      clearTimerRef(connectTimerRef)
      clearTimerRef(rejoinTimerRef)
      clearTimerRef(endFallbackTimerRef)
      setPhaseBoth('ended')
      setRemoteStreams(new Map())
      if (endedTimerRef.current) clearTimeout(endedTimerRef.current)
      endedTimerRef.current = setTimeout(() => {
        if (phaseRef.current === 'ended') resetToIdle()
      }, extraMs)
    },
    [resetToIdle, setPhaseBoth, closeAllPeerConnections, stopStreams, clearDuration],
  )

  // ── Peer connection & negotiation ────────────────────────────────────────

  const negStateOf = (remoteUserId: string): PeerNegState => {
    let state = negRef.current.get(remoteUserId)
    if (!state) {
      state = createNegState()
      negRef.current.set(remoteUserId, state)
    }
    return state
  }

  const sendSignal = (
    remoteUserId: string,
    signal:
      | { type: 'offer'; sdp: string }
      | { type: 'answer'; sdp: string }
      | { type: 'ice'; candidate: RTCIceCandidateInit },
  ) => {
    const callId = callIdRef.current
    if (!callId) return
    // target_user_id bắt buộc: server chỉ relay cho đúng peer này. Nếu broadcast,
    // offer dành cho C sẽ bị B áp vào PC A–B và phá luôn kết nối đang tốt.
    socket.send('group:call:signal', {
      call_id: callId,
      target_user_id: remoteUserId,
      signal,
    })
  }

  const ensurePeer = (remoteUserId: string): RTCPeerConnection => {
    const existing = pcsRef.current.get(remoteUserId)
    if (existing) return existing

    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current })
    pcsRef.current.set(remoteUserId, pc)
    negStateOf(remoteUserId)

    pc.onicecandidate = (event) => {
      if (!event.candidate) return
      sendSignal(remoteUserId, {
        type: 'ice',
        candidate: event.candidate.toJSON(),
      })
    }

    pc.ontrack = (event) => {
      const stream = event.streams[0] ?? new MediaStream([event.track])
      setRemoteStreams((prev) => {
        const next = new Map(prev)
        next.set(remoteUserId, stream)
        return next
      })
      const participant = participantsRef.current.get(remoteUserId)
      if (participant && !participant.is_active) {
        participantsRef.current.set(remoteUserId, {
          ...participant,
          is_active: true,
        })
        // Phải setState, nếu chỉ sửa ref thì overlay "đang kết nối" không tắt.
        syncParticipants()
      }
    }

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      if (state === 'failed') {
        pc.close()
        pcsRef.current.delete(remoteUserId)
        negRef.current.delete(remoteUserId)
        setRemoteStreams((prev) => {
          const next = new Map(prev)
          next.delete(remoteUserId)
          return next
        })
      } else if (state === 'disconnected') {
        // ICE có thể tự phục hồi; chỉ bỏ hình, giữ tile.
        setRemoteStreams((prev) => {
          const next = new Map(prev)
          next.delete(remoteUserId)
          return next
        })
      }
    }

    const stream = localStreamRef.current
    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream))
    } else {
      pc.addTransceiver('audio', { direction: 'sendrecv' })
      pc.addTransceiver('video', { direction: 'sendrecv' })
    }

    return pc
  }

  const flushIce = async (remoteUserId: string, pc: RTCPeerConnection) => {
    const state = negStateOf(remoteUserId)
    const pending = drainIce(state)
    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(candidate)
      } catch (err) {
        console.warn('group call: bỏ qua ICE không hợp lệ', err)
      }
    }
  }

  const maybeOffer = async (remoteUserId: string) => {
    const callId = callIdRef.current
    if (!callId) return
    if (!shouldIOffer(myUserIdRef.current, remoteUserId)) return

    const state = negStateOf(remoteUserId)
    if (state.makingOffer) return

    const pc = ensurePeer(remoteUserId)
    if (pc.signalingState !== 'stable') return
    // Đã kết nối rồi thì không renegotiate: rớt socket signaling không làm
    // media P2P dừng, offer lại chỉ gây giật hình.
    if (pc.connectionState === 'connected') {
      return
    }

    state.makingOffer = true
    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      sendSignal(remoteUserId, { type: 'offer', sdp: offer.sdp ?? '' })
    } catch (err) {
      console.error('group call: tạo offer thất bại', remoteUserId, err)
    } finally {
      state.makingOffer = false
    }
  }

  const handleSignal = async (payload: GroupCallSignalPayload) => {
    if (callIdRef.current !== payload.call_id) return
    if (payload.sender_id === myUserIdRef.current) return
    // Signal có đích rõ ràng thì chỉ người đó xử lý.
    if (
      payload.target_user_id &&
      payload.target_user_id !== myUserIdRef.current
    ) {
      return
    }

    const senderId = payload.sender_id
    const sig = payload.signal
    if (!sig || !sig.type) return

    if (sig.type === 'ice') {
      const pc = pcsRef.current.get(senderId)
      const state = negStateOf(senderId)
      if (!pc || !state.haveRemoteDesc) {
        bufferIce(state, sig.candidate)
        return
      }
      try {
        await pc.addIceCandidate(sig.candidate)
      } catch (err) {
        console.warn('group call: bỏ qua ICE không hợp lệ', err)
      }
      return
    }

    const pc = ensurePeer(senderId)
    const state = negStateOf(senderId)

    try {
      if (sig.type === 'offer') {
        const offerCollision =
          state.makingOffer || pc.signalingState !== 'stable'
        const polite = isPolitePeer(myUserIdRef.current, senderId)
        state.ignoreOffer = !polite && offerCollision
        if (state.ignoreOffer) return
        if (offerCollision) {
          await pc.setLocalDescription({ type: 'rollback' })
        }
        await pc.setRemoteDescription({ type: 'offer', sdp: sig.sdp })
        state.haveRemoteDesc = true
        await flushIce(senderId, pc)
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        sendSignal(senderId, { type: 'answer', sdp: answer.sdp ?? '' })
        ensureParticipant(senderId)
      } else if (sig.type === 'answer') {
        if (pc.signalingState !== 'have-local-offer') return
        await pc.setRemoteDescription({ type: 'answer', sdp: sig.sdp })
        state.haveRemoteDesc = true
        await flushIce(senderId, pc)
        ensureParticipant(senderId)
      }
    } catch (err) {
      console.error('group call: xử lý signal thất bại', senderId, err)
    }
  }

  const offerToJoinedPeers = () => {
    // Chỉ offer tới người đã thực sự join. Người mới được mời nhưng chưa vào
    // không nhận được signal, và offer gửi nhầm peer sẽ phá PC của cặp khác.
    for (const uid of Array.from(joinedRef.current)) {
      if (uid === myUserIdRef.current) continue
      void maybeOffer(uid)
    }
  }

  // ── WS event handlers ────────────────────────────────────────────────────

  const handleIncoming = (payload: GroupCallIncomingPayload) => {
    if (phaseRef.current === 'ended') resetToIdle()
    if (phaseRef.current !== 'idle') return

    callIdRef.current = payload.call_id
    rememberProfiles(payload.profiles)

    const participants = new Map<string, GroupCallParticipant>()
    for (const uid of payload.participants) {
      participants.set(uid, {
        user_id: uid,
        ...identityOf(uid),
        muted: false,
        video_enabled: true,
        is_active: false,
      })
    }
    if (!participants.has(payload.caller_id)) {
      participants.set(payload.caller_id, {
        user_id: payload.caller_id,
        ...identityOf(payload.caller_id),
        muted: false,
        video_enabled: true,
        is_active: false,
      })
    }

    participantsRef.current = participants
    joinedRef.current = new Set()
    setCallState({
      callId: payload.call_id,
      chatId: payload.chat_id,
      callerId: payload.caller_id,
      isVideo: payload.is_video,
      participants,
      pendingRequests: [],
    })
    setPhaseBoth('ringing')
    setDuration(0)
    playRingtone()
  }

  const handleCreated = (payload: GroupCallCreatedPayload) => {
    if (phaseRef.current !== 'connecting') return

    callIdRef.current = payload.call_id
    rememberProfiles(payload.profiles)

    const participants = new Map<string, GroupCallParticipant>()
    for (const uid of payload.participants) {
      participants.set(uid, {
        user_id: uid,
        ...identityOf(uid),
        muted: false,
        video_enabled: true,
        is_active: uid === myUserIdRef.current,
      })
    }

    participantsRef.current = participants
    joinedRef.current = new Set([myUserIdRef.current])
    setCallState({
      callId: payload.call_id,
      chatId: payload.chat_id,
      callerId: payload.caller_id,
      isVideo: payload.is_video,
      participants,
      pendingRequests: [],
    })
    clearTimerRef(connectTimerRef)
    setPhaseBoth('active')
    startDurationTimer()
    // Không offer ở đây: người được mời chưa join nên server sẽ bỏ signal.
    // Offer được tạo khi nhận `group:call:joined` của từng người.
  }

  const handleJoined = (payload: GroupCallJoinedPayload) => {
    if (callIdRef.current !== payload.call_id) return

    rememberProfiles(payload.profiles)

    // Creator có thể đã đổi trong lúc ta mất kết nối (server chuyển quyền).
    if (payload.caller_id && callRef.current?.callerId !== payload.caller_id) {
      setCallState({ ...callRef.current!, callerId: payload.caller_id })
    }

    if (payload.user_id === myUserIdRef.current) {
      clearTimerRef(connectTimerRef)
      clearTimerRef(rejoinTimerRef)
      joinedRef.current.add(myUserIdRef.current)
      if (phaseRef.current === 'connecting') {
        setPhaseBoth('active')
        startDurationTimer()
      }
      refreshIdentities()
      syncParticipants()
      // `joined` trong payload không chứa người đã vào trước mình — xin full
      // danh sách để modal call hiện đủ participant (server trả
      // group:call:participants → handleParticipants).
      socket.send('group:call:list-participants', { call_id: payload.call_id })
      // Người vào sau phải chủ động offer tới những ai có id lớn hơn mình.
      offerToJoinedPeers()
      return
    }

    joinedRef.current.add(payload.user_id)
    ensureParticipant(payload.user_id)
    refreshIdentities()
    syncParticipants()
    void maybeOffer(payload.user_id)
  }

  const handleJoinRequest = (payload: GroupCallJoinRequestPayload) => {
    if (callIdRef.current !== payload.call_id) return
    rememberProfiles(payload.profiles)
    const current = callRef.current
    if (!current) return
    if (current.pendingRequests.includes(payload.user_id)) return
    setCallState({
      ...current,
      pendingRequests: [...current.pendingRequests, payload.user_id],
    })
  }

  const handleJoinRequestSent = (payload: GroupCallJoinRequestSentPayload) => {
    if (callIdRef.current !== payload.call_id) return
    // Đang chờ duyệt — giữ phase connecting.
  }

  const handleJoinRejected = (payload: GroupCallJoinRejectedPayload) => {
    if (callIdRef.current !== payload.call_id) return
    if (payload.user_id !== myUserIdRef.current) return
    toast({ type: 'warning', title: t('groupCall.joinRejected') })
    showEnded()
  }

  const handleEnded = (payload: GroupCallEndedPayload) => {
    if (callIdRef.current !== payload.call_id) return
    showEnded()
  }

  const handleLeft = (payload: GroupCallLeftPayload) => {
    if (callIdRef.current !== payload.call_id) return

    const pc = pcsRef.current.get(payload.user_id)
    if (pc) {
      pc.onicecandidate = null
      pc.ontrack = null
      pc.onconnectionstatechange = null
      pc.close()
      pcsRef.current.delete(payload.user_id)
    }
    negRef.current.delete(payload.user_id)

    setRemoteStreams((prev) => {
      const next = new Map(prev)
      next.delete(payload.user_id)
      return next
    })
    participantsRef.current.delete(payload.user_id)
    joinedRef.current.delete(payload.user_id)
    syncParticipants()
  }

  const handleMic = (payload: GroupCallMicPayload) => {
    if (callIdRef.current !== payload.call_id) return
    const participant = participantsRef.current.get(payload.user_id)
    if (!participant) return
    participantsRef.current.set(payload.user_id, {
      ...participant,
      muted: payload.muted,
    })
    syncParticipants()
  }

  const handleVideo = (payload: GroupCallVideoPayload) => {
    if (callIdRef.current !== payload.call_id) return
    const participant = participantsRef.current.get(payload.user_id)
    if (!participant) return
    participantsRef.current.set(payload.user_id, {
      ...participant,
      video_enabled: payload.video_enabled,
    })
    syncParticipants()
  }

  const handleParticipants = (payload: GroupCallParticipantsResponse) => {
    if (callIdRef.current !== payload.call_id) return
    rememberProfiles(payload.profiles)
    joinedRef.current = new Set(payload.joined)
    for (const uid of payload.participants) {
      const participant = ensureParticipant(uid)
      const isActive = payload.active_participants.includes(uid)
      if (isActive && !participant.is_active) {
        participantsRef.current.set(uid, { ...participant, is_active: true })
      }
    }
    refreshIdentities()
    syncParticipants()
  }

  const handleCreatorChanged = (payload: GroupCallCreatorChangedPayload) => {
    if (callIdRef.current !== payload.call_id) return
    const current = callRef.current
    if (!current || current.callerId === payload.caller_id) return
    setCallState({ ...current, callerId: payload.caller_id })
  }

  // Session bị kết thúc trong lúc socket đang rớt: server không còn call để
  // rejoin, nên báo kết thúc thay vì treo ở phase active.
  const armRejoinTimeout = useCallback(() => {
    clearTimerRef(rejoinTimerRef)
    rejoinTimerRef.current = setTimeout(() => {
      const p = phaseRef.current
      if (p === 'active' || p === 'minimized' || p === 'connecting') {
        toast({ type: 'warning', title: t('groupCall.reconnectFailed') })
        showEnded()
      }
    }, REJOIN_TIMEOUT_MS)
  }, [showEnded, t, toast])

  useEffect(() => {
    handlersRef.current = {
      'group:call:incoming': handleIncoming as (p: unknown) => void,
      'group:call:created': handleCreated as (p: unknown) => void,
      'group:call:joined': handleJoined as (p: unknown) => void,
      'group:call:join-request': handleJoinRequest as (p: unknown) => void,
      'group:call:join-request-sent': handleJoinRequestSent as (p: unknown) => void,
      'group:call:join-rejected': handleJoinRejected as (p: unknown) => void,
      'group:call:signal': handleSignal as (p: unknown) => void,
      'group:call:ended': handleEnded as (p: unknown) => void,
      'group:call:left': handleLeft as (p: unknown) => void,
      'group:call:mic': handleMic as (p: unknown) => void,
      'group:call:video': handleVideo as (p: unknown) => void,
      'group:call:participants': handleParticipants as (p: unknown) => void,
      'group:call:creator-changed': handleCreatorChanged as (p: unknown) => void,
    }
  })

  useEffect(() => {
    // Đọc handler qua ref lúc dispatch: effect này chỉ chạy lại khi socket đổi
    // status, nếu capture handler trực tiếp thì nó bị "đóng băng" ở render đầu
    // (đổi ngôn ngữ, toast mới... sẽ không được áp dụng).
    const unsubscribers = Object.keys(handlersRef.current).map((type) =>
      socket.subscribe(type, (payload) => {
        handlersRef.current[type]?.(payload)
      }),
    )
    return () => unsubscribers.forEach((unsub) => unsub())
  }, [socket])

  // Reconnect: server đã đánh dấu participant là "disconnected" nhưng vẫn giữ
  // trong cuộc gọi trong 15s. Gửi lại request-join để quay lại đúng session.
  useEffect(() => {
    const previous = lastSocketStatusRef.current
    lastSocketStatusRef.current = socket.status
    if (socket.status !== 'open' || previous === 'open') return

    if (!hasOpenedSocketRef.current) {
      hasOpenedSocketRef.current = true
      return
    }

    const callId = callIdRef.current
    const p = phaseRef.current
    if (!callId) return
    if (p !== 'active' && p !== 'minimized' && p !== 'connecting') return

    toast({ type: 'info', title: t('groupCall.reconnecting') })
    socket.send('group:call:request-join', { call_id: callId })
    armRejoinTimeout()
  }, [socket, socket.status, t, toast, armRejoinTimeout])

  useEffect(() => {
    return () => {
      resetToIdle()
      socket.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Actions ──────────────────────────────────────────────────────────────

  const armConnectTimeout = useCallback(() => {
    clearTimerRef(connectTimerRef)
    connectTimerRef.current = setTimeout(() => {
      if (phaseRef.current === 'connecting') {
        toast({ type: 'warning', title: t('groupCall.connectTimeout') })
        showEnded()
      }
    }, CONNECT_TIMEOUT_MS)
  }, [toast, t, showEnded])

  const requestLocalMedia = useCallback(async (): Promise<MediaStream | null> => {
    try {
      await iceServersPromiseRef.current
    } catch {
      // Không lấy được ICE server vẫn thử gọi với cấu hình rỗng/STUN mặc định.
    }
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      })
    } catch {
      toast({ type: 'error', title: t('groupCall.permissionDenied') })
      return null
    }
  }, [toast, t])

  const startGroupCall = useCallback(
    async (chatId: string, participantIds?: string[]) => {
      if (phaseRef.current !== 'idle') return
      if (socket.status !== 'open') {
        toast({ type: 'error', title: t('groupCall.noConnection') })
        return
      }

      const stream = await requestLocalMedia()
      if (!stream) return

      localStreamRef.current = stream
      setLocalStream(stream)
      setLocalMuted(false)
      setLocalVideoOn(true)

      const participants = new Map<string, GroupCallParticipant>()
      participants.set(myUserIdRef.current, {
        user_id: myUserIdRef.current,
        display_name: t('groupCall.you'),
        avatar_uri: '',
        muted: false,
        video_enabled: true,
        is_active: true,
      })

      participantsRef.current = participants
      setCallState({
        callId: '',
        chatId,
        callerId: myUserIdRef.current,
        isVideo: true,
        participants,
        pendingRequests: [],
      })
      setPhaseBoth('connecting')
      setDuration(0)
      armConnectTimeout()

      const ok = socket.send('group:call:create', {
        chat_id: chatId,
        participant_ids: participantIds,
        call_type: 'video',
      })
      if (!ok) {
        toast({ type: 'error', title: t('groupCall.noConnection') })
        resetToIdle()
      }
    },
    [
      socket,
      toast,
      t,
      setCallState,
      setPhaseBoth,
      resetToIdle,
      requestLocalMedia,
      armConnectTimeout,
    ],
  )

  const joinGroupCall = useCallback(
    async (callId: string) => {
      if (phaseRef.current !== 'idle' && phaseRef.current !== 'ringing') return
      if (socket.status !== 'open') {
        toast({ type: 'error', title: t('groupCall.noConnection') })
        return
      }

      const stream = await requestLocalMedia()
      if (!stream) return

      stopRingtone()
      localStreamRef.current = stream
      setLocalStream(stream)
      setLocalMuted(false)
      setLocalVideoOn(true)
      setPhaseBoth('connecting')
      armConnectTimeout()

      socket.send('group:call:request-join', { call_id: callId })
    },
    [
      socket,
      toast,
      t,
      setPhaseBoth,
      requestLocalMedia,
      armConnectTimeout,
    ],
  )

  const declineGroupCall = useCallback(() => {
    if (phaseRef.current !== 'ringing') return
    stopRingtone()
    resetToIdle()
  }, [resetToIdle])

  const acceptJoinRequest = useCallback(
    (userId: string) => {
      const active = callRef.current
      if (!active || !active.callId) return
      socket.send('group:call:approve-join', {
        call_id: active.callId,
        user_id: userId,
      })
      setCallState({
        ...active,
        pendingRequests: active.pendingRequests.filter((id) => id !== userId),
      })
    },
    [socket, setCallState],
  )

  const rejectJoinRequest = useCallback(
    (userId: string) => {
      const active = callRef.current
      if (!active || !active.callId) return
      socket.send('group:call:reject-join', {
        call_id: active.callId,
        user_id: userId,
      })
      setCallState({
        ...active,
        pendingRequests: active.pendingRequests.filter((id) => id !== userId),
      })
    },
    [socket, setCallState],
  )

  const endGroupCall = useCallback(() => {
    const active = callRef.current
    if (!active || !active.callId) {
      resetToIdle()
      return
    }
    socket.send('group:call:end', { call_id: active.callId })
    // Chờ server xác nhận (`ended` hoặc `left`); nếu socket chết vẫn phải đóng UI.
    clearTimerRef(endFallbackTimerRef)
    endFallbackTimerRef.current = setTimeout(() => {
      if (phaseRef.current === 'active' || phaseRef.current === 'minimized') {
        showEnded()
      }
    }, END_FALLBACK_MS)
  }, [socket, showEnded, resetToIdle])

  const toggleMute = useCallback(() => {
    const active = callRef.current
    if (!active || !active.callId || phaseRef.current !== 'active') return
    const next = !localMuted
    setLocalMuted(next)
    const stream = localStreamRef.current
    if (stream) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !next
      })
    }
    socket.send('group:call:toggle-mic', {
      call_id: active.callId,
      muted: next,
    })
  }, [localMuted, socket])

  const toggleVideo = useCallback(() => {
    const active = callRef.current
    if (!active || !active.callId || phaseRef.current !== 'active') return
    const next = !localVideoOn
    setLocalVideoOn(next)
    const stream = localStreamRef.current
    if (stream) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = next
      })
    }
    socket.send('group:call:toggle-video', {
      call_id: active.callId,
      video_enabled: next,
    })
  }, [localVideoOn, socket])

  const toggleMuteParticipant = useCallback(
    (userId: string) => {
      const active = callRef.current
      if (!active || !active.callId || phaseRef.current !== 'active') return
      if (active.callerId !== myUserIdRef.current) return
      const participant = participantsRef.current.get(userId)
      if (!participant) return
      socket.send('group:call:toggle-mute', {
        call_id: active.callId,
        target_user_id: userId,
        muted: !participant.muted,
      })
    },
    [socket],
  )

  const minimize = useCallback(() => {
    if (phaseRef.current === 'active') {
      setPhaseBoth('minimized')
    }
  }, [setPhaseBoth])

  const expand = useCallback(() => {
    if (phaseRef.current === 'minimized') {
      setPhaseBoth('active')
    }
  }, [setPhaseBoth])

  const dismiss = useCallback(() => {
    if (phaseRef.current === 'ended') resetToIdle()
  }, [resetToIdle])

  return (
    <GroupCallContext.Provider
      value={{
        phase,
        call,
        duration,
        localStream,
        localMuted,
        localVideoOn,
        isCreator: call?.callerId === myUserId,
        isInGroupCall:
          phase === 'active' ||
          phase === 'minimized' ||
          phase === 'connecting' ||
          phase === 'ringing',
        myUserId,
        pendingRequests: call?.pendingRequests ?? [],
        profiles,
        remoteStreams,
        startGroupCall,
        joinGroupCall,
        declineGroupCall,
        acceptJoinRequest,
        rejectJoinRequest,
        endGroupCall,
        toggleMute,
        toggleVideo,
        toggleMuteParticipant,
        minimize,
        expand,
        dismiss,
      }}
    >
      {children}
    </GroupCallContext.Provider>
  )
}

export function useGroupCall(): GroupCallContextValue {
  const context = useContext(GroupCallContext)
  if (context === undefined) {
    throw new Error('useGroupCall must be used within a GroupCallProvider')
  }
  return context
}
