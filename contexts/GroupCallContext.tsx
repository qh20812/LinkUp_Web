'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useGroupCallSocket } from '../hooks/useGroupCallSocket'
import { useAuth } from '../hooks/useAuth'
import { useToast } from './ToastContext'
import { useTranslation } from '../hooks/useTranslation'
import { getIceServers } from '../api/calls'
import { playRingtone, stopRingtone } from '../utils/ringtone'
import type {
  ActiveGroupCall,
  GroupCallCreatedPayload,
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
  GroupCallSignalPayload,
  GroupCallVideoPayload,
  GroupCallParticipant,
} from '../types/groupCall'

export interface GroupCallContextValue {
  phase: GroupCallPhase
  call: ActiveGroupCall | null
  duration: number
  localStream: MediaStream | null
  localMuted: boolean
  localVideoOn: boolean
  isCreator: boolean
  isInGroupCall: boolean
  pendingRequests: string[]
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
  const [remoteStreams, setRemoteStreams] = useState<
    Map<string, MediaStream>
  >(new Map())

  const phaseRef = useRef<GroupCallPhase>('idle')
  const callRef = useRef<ActiveGroupCall | null>(null)
  const callIdRef = useRef<string | null>(null)
  const myUserIdRef = useRef('')
  const localStreamRef = useRef<MediaStream | null>(null)
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const iceServersRef = useRef<RTCIceServer[]>([])
  const pendingSignalsRef = useRef<
    Map<string, { offer?: RTCSessionDescriptionInit; ice: RTCIceCandidateInit[] }>
  >(new Map())
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const endedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const participantsRef = useRef<Map<string, GroupCallParticipant>>(new Map())

  const setPhaseBoth = (p: GroupCallPhase) => {
    phaseRef.current = p
    setPhase(p)
  }

  const setCallState = useCallback((c: ActiveGroupCall | null) => {
    callRef.current = c
    callIdRef.current = c?.callId ?? null
    setCall(c)
  }, [])

  useEffect(() => {
    myUserIdRef.current = myUserId
  }, [myUserId])

  useEffect(() => {
    getIceServers().then((servers) => {
      iceServersRef.current = servers
    })
  }, [])

  const clearDuration = () => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current)
      durationTimerRef.current = null
    }
  }

  const closeAllPeerConnections = () => {
    pcsRef.current.forEach((pc) => {
      pc.onicecandidate = null
      pc.ontrack = null
      pc.onconnectionstatechange = null
      pc.close()
    })
    pcsRef.current.clear()
  }

  const stopStreams = () => {
    const stream = localStreamRef.current
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
    }
    localStreamRef.current = null
    setLocalStream(null)
  }

  const resetToIdle = useCallback(() => {
    stopRingtone()
    closeAllPeerConnections()
    stopStreams()
    pendingSignalsRef.current.clear()
    participantsRef.current.clear()
    callIdRef.current = null
    clearDuration()
    if (endedTimerRef.current) {
      clearTimeout(endedTimerRef.current)
      endedTimerRef.current = null
    }
    setCallState(null)
    setPhaseBoth('idle')
    setDuration(0)
    setLocalMuted(false)
    setLocalVideoOn(true)
    setRemoteStreams(new Map())
  }, [setCallState])

  const showEnded = useCallback(
    (extraMs = 3000) => {
      stopRingtone()
      closeAllPeerConnections()
      stopStreams()
      pendingSignalsRef.current.clear()
      callIdRef.current = null
      clearDuration()
      setPhaseBoth('ended')
      setRemoteStreams(new Map())
      if (endedTimerRef.current) clearTimeout(endedTimerRef.current)
      endedTimerRef.current = setTimeout(() => {
        if (phaseRef.current === 'ended') resetToIdle()
      }, extraMs)
    },
    [resetToIdle],
  )

  const getOrCreatePc = useCallback(
    (remoteUserId: string, callId: string) => {
      const existing = pcsRef.current.get(remoteUserId)
      if (existing) return existing

      const pc = new RTCPeerConnection({ iceServers: iceServersRef.current })
      pcsRef.current.set(remoteUserId, pc)

      pc.onicecandidate = (event) => {
        if (!event.candidate) return
        socket.send('group:call:signal', {
          call_id: callId,
          signal: { type: 'ice', candidate: event.candidate.toJSON() },
        })
      }

      pc.ontrack = (event) => {
        const stream = event.streams[0]
        if (stream) {
          setRemoteStreams((prev) => {
            const next = new Map(prev)
            next.set(remoteUserId, stream)
            return next
          })
          // Mark participant as active
          const p = participantsRef.current.get(remoteUserId)
          if (p) {
            p.is_active = true
            participantsRef.current.set(remoteUserId, { ...p })
          }
        }
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setRemoteStreams((prev) => {
            const next = new Map(prev)
            next.delete(remoteUserId)
            return next
          })
        }
      }

      // Add local tracks
      const stream = localStreamRef.current
      if (stream) {
        stream.getTracks().forEach((track) => pc.addTrack(track, stream))
      }

      return pc
    },
    [socket],
  )

  const createOfferForPeer = useCallback(
    async (remoteUserId: string, callId: string) => {
      const pc = getOrCreatePc(remoteUserId, callId)
      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        socket.send('group:call:signal', {
          call_id: callId,
          signal: { type: 'offer', sdp: offer.sdp },
        })
      } catch (err) {
        console.error('Failed to create offer for', remoteUserId, err)
      }
    },
    [getOrCreatePc, socket],
  )

  // Handle incoming signal from another participant
  const handleSignal = useCallback(
    async (payload: GroupCallSignalPayload) => {
      if (callIdRef.current !== payload.call_id) return
      if (payload.sender_id === myUserIdRef.current) return

      const sig = payload.signal
      const senderId = payload.sender_id

      const pc = pcsRef.current.get(senderId)

      if (!pc) {
        // No PeerConnection yet — buffer the signal
        if (!pendingSignalsRef.current.has(senderId)) {
          pendingSignalsRef.current.set(senderId, { ice: [] })
        }
        const buf = pendingSignalsRef.current.get(senderId)!
        if (sig.type === 'offer') {
          buf.offer = { type: sig.type, sdp: sig.sdp }
        } else if (sig.type === 'ice') {
          buf.ice.push(sig.candidate)
        }
        return
      }

      try {
        if (sig.type === 'offer') {
          await pc.setRemoteDescription({ type: sig.type, sdp: sig.sdp })
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          socket.send('group:call:signal', {
            call_id: payload.call_id,
            signal: { type: 'answer', sdp: answer.sdp },
          })
        } else if (sig.type === 'answer') {
          await pc.setRemoteDescription({ type: sig.type, sdp: sig.sdp })
        } else if (sig.type === 'ice') {
          await pc.addIceCandidate(sig.candidate)
        }
      } catch (err) {
        console.error('Failed to handle group call signal:', err)
      }
    },
    [socket],
  )

  // WS event handlers
  const handleIncoming = useCallback(
    async (payload: GroupCallIncomingPayload) => {
      if (phaseRef.current === 'ended') resetToIdle()
      if (phaseRef.current !== 'idle') return

      callIdRef.current = payload.call_id

      const participants = new Map<string, GroupCallParticipant>()
      for (const uid of payload.participants) {
        participants.set(uid, {
          user_id: uid,
          display_name: uid === myUserIdRef.current ? 'Bạn' : uid,
          avatar_uri: '',
          muted: false,
          video_enabled: true,
          is_active: false,
        })
      }
      // Add caller
      if (!participants.has(payload.caller_id)) {
        participants.set(payload.caller_id, {
          user_id: payload.caller_id,
          display_name: payload.caller_id,
          avatar_uri: '',
          muted: false,
          video_enabled: true,
          is_active: false,
        })
      }

      const activeCall: ActiveGroupCall = {
        callId: payload.call_id,
        chatId: payload.chat_id,
        callerId: payload.caller_id,
        isVideo: payload.is_video,
        participants,
        pendingRequests: [],
      }

      setCallState(activeCall)
      setPhaseBoth('ringing')
      setDuration(0)
      participantsRef.current = participants
      playRingtone()
    },
    [resetToIdle, setCallState],
  )

  const handleCreated = useCallback(
    async (payload: GroupCallCreatedPayload) => {
      if (phaseRef.current !== 'connecting') return

      callIdRef.current = payload.call_id

      const participants = new Map<string, GroupCallParticipant>()
      for (const uid of payload.participants) {
        participants.set(uid, {
          user_id: uid,
          display_name: uid === myUserIdRef.current ? 'Bạn' : uid,
          avatar_uri: '',
          muted: false,
          video_enabled: true,
          is_active: false,
        })
      }

      const activeCall: ActiveGroupCall = {
        callId: payload.call_id,
        chatId: payload.chat_id,
        callerId: payload.caller_id,
        isVideo: payload.is_video,
        participants,
        pendingRequests: [],
      }
      setCallState(activeCall)
      participantsRef.current = participants

      // Creator transitions to active immediately
      setPhaseBoth('active')
      const started = Date.now()
      setDuration(0)
      durationTimerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - started) / 1000))
      }, 1000)

      // Create offers for all other participants
      for (const uid of payload.participants) {
        if (uid !== myUserIdRef.current) {
          await createOfferForPeer(uid, payload.call_id)
        }
      }
    },
    [createOfferForPeer, setCallState],
  )

  const handleJoined = useCallback(
    async (payload: GroupCallJoinedPayload) => {
      if (callIdRef.current !== payload.call_id) return

      // If this is us joining, transition to active
      if (payload.user_id === myUserIdRef.current) {
        if (phaseRef.current === 'connecting') {
          setPhaseBoth('active')
          const started = Date.now()
          setDuration(0)
          durationTimerRef.current = setInterval(() => {
            setDuration(Math.floor((Date.now() - started) / 1000))
          }, 1000)
        }
        return
      }

      // A new participant joined — create PC and send offer
      // Add to participants
      const p: GroupCallParticipant = {
        user_id: payload.user_id,
        display_name: payload.user_id,
        avatar_uri: '',
        muted: false,
        video_enabled: true,
        is_active: false,
      }
      participantsRef.current.set(payload.user_id, p)
      setCallState(
        callRef.current
          ? { ...callRef.current, participants: new Map(participantsRef.current) }
          : null,
      )

      // Create offer for the new participant
      if (callIdRef.current) {
        await createOfferForPeer(payload.user_id, callIdRef.current)
      }
    },
    [createOfferForPeer, setCallState],
  )

  const handleJoinRequest = useCallback(
    (payload: GroupCallJoinRequestPayload) => {
      if (callIdRef.current !== payload.call_id) return
      setCallState(
        callRef.current
          ? {
              ...callRef.current,
              pendingRequests: [
                ...callRef.current.pendingRequests,
                payload.user_id,
              ],
            }
          : null,
      )
    },
    [setCallState],
  )

  const handleJoinRequestSent = useCallback(
    (payload: GroupCallJoinRequestSentPayload) => {
      if (callIdRef.current !== payload.call_id) return
      // Request sent, waiting for approval — stay in connecting phase
    },
    [],
  )

  const handleJoinRejected = useCallback(
    (payload: GroupCallJoinRejectedPayload) => {
      if (callIdRef.current !== payload.call_id) return
      if (payload.user_id !== myUserIdRef.current) return
      toast({ type: 'warning', title: t('groupCall.joinRejected') })
      showEnded()
    },
    [toast, t, showEnded],
  )

  const handleEnded = useCallback(
    (payload: GroupCallEndedPayload) => {
      if (callIdRef.current !== payload.call_id) return
      showEnded()
    },
    [showEnded],
  )

  const handleLeft = useCallback(
    (payload: GroupCallLeftPayload) => {
      if (callIdRef.current !== payload.call_id) return

      // Clean up peer connection and stream for this user
      const pc = pcsRef.current.get(payload.user_id)
      if (pc) {
        pc.onicecandidate = null
        pc.ontrack = null
        pc.onconnectionstatechange = null
        pc.close()
        pcsRef.current.delete(payload.user_id)
      }
      setRemoteStreams((prev) => {
        const next = new Map(prev)
        next.delete(payload.user_id)
        return next
      })
      participantsRef.current.delete(payload.user_id)

      setCallState(
        callRef.current
          ? { ...callRef.current, participants: new Map(participantsRef.current) }
          : null,
      )
    },
    [setCallState],
  )

  const handleMic = useCallback(
    (payload: GroupCallMicPayload) => {
      if (callIdRef.current !== payload.call_id) return
      const p = participantsRef.current.get(payload.user_id)
      if (p) {
        p.muted = payload.muted
        participantsRef.current.set(payload.user_id, { ...p })
        setCallState(
          callRef.current
            ? { ...callRef.current, participants: new Map(participantsRef.current) }
            : null,
        )
      }
    },
    [setCallState],
  )

  const handleVideo = useCallback(
    (payload: GroupCallVideoPayload) => {
      if (callIdRef.current !== payload.call_id) return
      const p = participantsRef.current.get(payload.user_id)
      if (p) {
        p.video_enabled = payload.video_enabled
        participantsRef.current.set(payload.user_id, { ...p })
        setCallState(
          callRef.current
            ? { ...callRef.current, participants: new Map(participantsRef.current) }
            : null,
        )
      }
    },
    [setCallState],
  )

  const handleParticipants = useCallback(
    (payload: GroupCallParticipantsResponse) => {
      if (callIdRef.current !== payload.call_id) return
      // Sync participant list
      for (const uid of payload.participants) {
        if (!participantsRef.current.has(uid)) {
          participantsRef.current.set(uid, {
            user_id: uid,
            display_name: uid,
            avatar_uri: '',
            muted: false,
            video_enabled: true,
            is_active: payload.active_participants.includes(uid),
          })
        }
      }
      setCallState(
        callRef.current
          ? { ...callRef.current, participants: new Map(participantsRef.current) }
          : null,
      )
    },
    [setCallState],
  )

  // Register WS handlers
  const handlersRef = useRef<Record<string, (payload: unknown) => void>>({})
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
    }
  })

  useEffect(() => {
    const unsubscribers = Object.entries(handlersRef.current).map(
      ([type, handler]) =>
        socket.subscribe(type, (payload) => handler(payload)),
    )
    return () => unsubscribers.forEach((unsub) => unsub())
  }, [socket])

  useEffect(() => {
    return () => {
      resetToIdle()
      socket.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Actions
  const startGroupCall = useCallback(
    async (chatId: string, participantIds?: string[]) => {
      if (phaseRef.current !== 'idle') return
      if (socket.status !== 'open') {
        toast({ type: 'error', title: t('groupCall.noConnection') })
        return
      }

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        })
      } catch {
        toast({ type: 'error', title: t('groupCall.permissionDenied') })
        return
      }

      localStreamRef.current = stream
      setLocalStream(stream)
      setLocalMuted(false)
      setLocalVideoOn(true)

      const participants = new Map<string, GroupCallParticipant>()
      participants.set(myUserIdRef.current, {
        user_id: myUserIdRef.current,
        display_name: 'Bạn',
        avatar_uri: '',
        muted: false,
        video_enabled: true,
        is_active: true,
      })

      const activeCall: ActiveGroupCall = {
        callId: '',
        chatId,
        callerId: myUserIdRef.current,
        isVideo: true,
        participants,
        pendingRequests: [],
      }
      setCallState(activeCall)
      participantsRef.current = participants
      setPhaseBoth('connecting')
      setDuration(0)

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
    [socket, toast, t, setCallState, resetToIdle],
  )

  const joinGroupCall = useCallback(
    async (callId: string) => {
      if (phaseRef.current !== 'idle' && phaseRef.current !== 'ringing') return
      if (socket.status !== 'open') {
        toast({ type: 'error', title: t('groupCall.noConnection') })
        return
      }

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        })
      } catch {
        toast({ type: 'error', title: t('groupCall.permissionDenied') })
        return
      }

      stopRingtone()
      localStreamRef.current = stream
      setLocalStream(stream)
      setLocalMuted(false)
      setLocalVideoOn(true)
      setPhaseBoth('connecting')

      socket.send('group:call:request-join', { call_id: callId })
    },
    [socket, toast, t],
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
    showEnded()
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
      const p = participantsRef.current.get(userId)
      if (!p) return
      socket.send('group:call:toggle-mute', {
        call_id: active.callId,
        target_user_id: userId,
        muted: !p.muted,
      })
    },
    [socket],
  )

  const minimize = useCallback(() => {
    if (phaseRef.current === 'active') {
      setPhaseBoth('minimized')
    }
  }, [])

  const expand = useCallback(() => {
    if (phaseRef.current === 'minimized') {
      setPhaseBoth('active')
    }
  }, [])

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
        pendingRequests: call?.pendingRequests ?? [],
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
