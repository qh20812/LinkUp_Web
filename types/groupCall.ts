import type { CallSignalBody } from './index'

export type GroupCallPhase = 'idle' | 'ringing' | 'connecting' | 'active' | 'ended' | 'minimized'

export interface GroupCallParticipant {
  user_id: string
  display_name: string
  avatar_uri: string
  muted: boolean
  video_enabled: boolean
  is_active: boolean
  stream?: MediaStream
}

export interface ActiveGroupCall {
  callId: string
  chatId: string
  callerId: string
  isVideo: boolean
  participants: Map<string, GroupCallParticipant>
  pendingRequests: string[]
}

// WS payloads — server → client
export interface GroupCallIncomingPayload {
  call_id: string
  chat_id: string
  caller_id: string
  participants: string[]
  is_video: boolean
}

export interface GroupCallCreatedPayload {
  call_id: string
  chat_id: string
  caller_id: string
  participants: string[]
  is_video: boolean
}

export interface GroupCallJoinedPayload {
  call_id: string
  chat_id: string
  user_id: string
}

export interface GroupCallJoinRequestPayload {
  call_id: string
  chat_id: string
  user_id: string
}

export interface GroupCallJoinRequestSentPayload {
  call_id: string
}

export interface GroupCallJoinRejectedPayload {
  call_id: string
  user_id: string
  reason?: string
}

export interface GroupCallEndedPayload {
  call_id: string
  by?: string
  reason?: string
}

export interface GroupCallLeftPayload {
  call_id: string
  user_id: string
}

export interface GroupCallSignalPayload {
  call_id: string
  sender_id: string
  signal: CallSignalBody
}

export interface GroupCallMicPayload {
  call_id: string
  user_id: string
  muted: boolean
  changed_by: string
}

export interface GroupCallVideoPayload {
  call_id: string
  user_id: string
  video_enabled: boolean
}

export interface GroupCallParticipantsResponse {
  call_id: string
  participants: string[]
  joined: string[]
  active_participants: string[]
}

// WS payloads — client → server
export interface GroupCallCreatePayload {
  chat_id: string
  participant_ids?: string[]
  call_type?: string
}

export interface GroupCallRequestJoinPayload {
  call_id: string
}

export interface GroupCallApprovePayload {
  call_id: string
  user_id: string
}

export interface GroupCallEndPayload {
  call_id: string
}

export interface GroupCallSignalSendPayload {
  call_id: string
  signal: CallSignalBody
}

export interface GroupCallToggleMicPayload {
  call_id: string
  muted: boolean
}

export interface GroupCallToggleMutePayload {
  call_id: string
  target_user_id: string
  muted: boolean
}

export interface GroupCallToggleVideoPayload {
  call_id: string
  video_enabled: boolean
}

export interface GroupCallParticipantsRequestPayload {
  call_id: string
}

// Group call history item (returned via group:history WS event)
export interface GroupCallHistoryItem {
  call_id: string
  chat_id: string
  caller_id: string
  participants: string[]
  status: string
  created_at: string
  ended_at?: string
}

// Request join modal state
export interface GroupCallJoinRequestState {
  callId: string
  callerId: string
  participantCount: number
}
