jest.mock('@/api/api', () => ({
  request: jest.fn(),
}))

import { request } from '@/api/api'
import { deleteMedia, uploadMedia } from '@/api/media'

const requestMock = request as jest.Mock

beforeEach(() => {
  requestMock.mockReset()
})

describe('media API', () => {
  it('uploadMedia gửi file qua FormData và trả data', async () => {
    const file = new File(['receipt'], 'bill.png', { type: 'image/png' })
    requestMock.mockResolvedValue({
      data: {
        id: 'media-1',
        file_uri: 'https://cdn.test/bill.png',
        file_type: 'image/png',
        file_size: 7,
        status: 'approved',
      },
    })

    const result = await uploadMedia(file)

    expect(result.file_uri).toBe('https://cdn.test/bill.png')
    expect(requestMock).toHaveBeenCalledTimes(1)
    const [path, options] = requestMock.mock.calls[0]
    expect(path).toBe('/media/upload')
    expect(options.method).toBe('POST')
    const body = options.body as FormData
    expect(body.get('file')).toBe(file)
  })

  it('deleteMedia gọi DELETE đúng id', async () => {
    requestMock.mockResolvedValue({ message: 'ok', media_id: 'media-1' })

    await deleteMedia('media-1')

    expect(requestMock).toHaveBeenCalledWith('/media/media-1', { method: 'DELETE' })
  })
})
