import { request } from './api'
import type { SearchResponse } from '../types'

export const search = (keyword: string, type: string = 'all') =>
  request<SearchResponse>(`/search?keyword=${encodeURIComponent(keyword)}&type=${type}`)
