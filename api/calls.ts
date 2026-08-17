import { request } from './api'
import type {
  CallHistoryListResponse,
  CallType,
  IceServersResponse,
} from '../types'

const FALLBACK_STUN = 'stun:stun.l.google.com:19302'

export async function getIceServers(): Promise<RTCIceServer[]> {
  try {
    const res = await request<IceServersResponse>('/calls/ice-servers')
    const servers = (res.ice_servers ?? []).map((s) => ({
      urls: s.urls,
      ...(s.username ? { username: s.username } : {}),
      ...(s.credential ? { credential: s.credential } : {}),
    }))
    if (servers.length === 0) {
      return [{ urls: FALLBACK_STUN }]
    }
    return servers
  } catch {
    return [{ urls: FALLBACK_STUN }]
  }
}

export interface InitiateCallResponse {
  data: {
    id: string
    caller_id: string
    callee_id: string
    call_type: CallType
    status: string
    is_group: boolean
  }
}

export const initiateCall = (calleeId: string, callType: CallType) =>
  request<InitiateCallResponse>('/calls/initiate', {
    method: 'POST',
    body: JSON.stringify({ callee_id: calleeId, call_type: callType }),
  })

export const acceptCallHTTP = (callId: string) =>
  request<{ message: string }>(`/calls/${callId}/accept`, { method: 'POST' })

export const rejectCallHTTP = (callId: string) =>
  request<{ message: string }>(`/calls/${callId}/reject`, { method: 'POST' })

export const toggleMuteHTTP = (callId: string, muted: boolean) =>
  request<{ message: string }>(`/calls/${callId}/mute`, {
    method: 'POST',
    body: JSON.stringify({ muted }),
  })

export const toggleVideoHTTP = (callId: string, videoEnabled: boolean) =>
  request<{ message: string }>(`/calls/${callId}/video`, {
    method: 'POST',
    body: JSON.stringify({ video_enabled: videoEnabled }),
  })

export const getCallHistory = (
  params: { limit?: number; offset?: number; type?: CallType; status?: string } = {},
) => {
  const query = new URLSearchParams()
  if (params.limit) query.set('limit', String(params.limit))
  if (params.offset) query.set('offset', String(params.offset))
  if (params.type) query.set('type', params.type)
  if (params.status) query.set('status', params.status)
  const qs = query.toString()
  return request<CallHistoryListResponse>(`/calls/history${qs ? `?${qs}` : ''}`)
}