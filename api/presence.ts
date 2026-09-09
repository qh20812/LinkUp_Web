import { request } from './api'
import type { PresenceBatchResponse } from '../types'

export function batchGetPresence(userIDs: string[]) {
  return request<PresenceBatchResponse>('/presence/batch', {
    method: 'POST',
    body: JSON.stringify({ user_ids: userIDs }),
  })
}
