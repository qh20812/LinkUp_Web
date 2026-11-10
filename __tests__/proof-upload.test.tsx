import React, { useState } from 'react'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders, screen, userEvent, mockLocalStorage } from './test-utils'
import ProofUpload from '@/components/wallet/ProofUpload'

function Harness() {
  const [file, setFile] = useState<File | null>(null)
  return <ProofUpload value={file} onChange={setFile} />
}

function fileInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[type="file"]') as HTMLInputElement
}

beforeAll(() => {
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: jest.fn(() => 'blob:receipt-preview'),
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: jest.fn(),
  })
})

beforeEach(() => {
  mockLocalStorage()
})

describe('ProofUpload', () => {
  it('chọn ảnh hợp lệ thì hiện preview và tên file', async () => {
    const user = userEvent.setup()
    const { container } = renderWithProviders(<Harness />)

    await user.upload(
      fileInput(container),
      new File(['receipt'], 'bill.png', { type: 'image/png' }),
    )

    expect(screen.getByText('bill.png')).toBeInTheDocument()
    expect(screen.getByAltText('Ảnh biên lai chuyển khoản')).toHaveAttribute(
      'src',
      'blob:receipt-preview',
    )
  })

  it('báo lỗi định dạng không phải ảnh', () => {
    const { container } = renderWithProviders(<Harness />)
    const pdf = new File(['receipt'], 'bill.pdf', { type: 'application/pdf' })

    fireEvent.change(fileInput(container), { target: { files: [pdf] } })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.',
    )
    expect(screen.queryByText('bill.pdf')).not.toBeInTheDocument()
  })

  it('báo lỗi ảnh vượt quá 10MB', () => {
    const { container } = renderWithProviders(<Harness />)
    const big = new File(['receipt'], 'bill.png', { type: 'image/png' })
    Object.defineProperty(big, 'size', { value: 10 * 1024 * 1024 + 1 })

    fireEvent.change(fileInput(container), { target: { files: [big] } })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Ảnh vượt quá 10MB. Vui lòng chọn ảnh nhỏ hơn.',
    )
  })

  it('xoá ảnh quay lại trạng thái chọn file', async () => {
    const user = userEvent.setup()
    const { container } = renderWithProviders(<Harness />)

    await user.upload(
      fileInput(container),
      new File(['receipt'], 'bill.png', { type: 'image/png' }),
    )
    await user.click(screen.getByRole('button', { name: /Xoá ảnh/ }))

    expect(screen.queryByText('bill.png')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Chọn ảnh biên lai/ })).toBeInTheDocument()
  })
})
