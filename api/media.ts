import { request } from './api'

export interface UploadedMedia {
  id: string
  file_uri: string
  file_type: string
  file_size: number
  status: string
}

/** Upload một file qua /media/upload (dùng FormData, request tự bỏ Content-Type). */
export const uploadMedia = async (file: File): Promise<UploadedMedia> => {
  const formData = new FormData()
  formData.append('file', file)
  const res = await request<{ data: UploadedMedia }>('/media/upload', {
    method: 'POST',
    body: formData,
  })
  return res.data
}

/** Xoá media vừa upload (best-effort, dùng khi bước sau thất bại). */
export const deleteMedia = (id: string) =>
  request<{ message: string; media_id: string }>(`/media/${id}`, { method: 'DELETE' })
