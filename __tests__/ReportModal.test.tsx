import React from 'react'
import {
  renderWithProviders,
  screen,
  waitFor,
  userEvent,
  mockFetch,
  mockFetchSequence,
  getFetchCalls,
  restoreFetch,
} from './test-utils'
import ReportModal from '@/components/ReportModal'
import { SWRConfig } from 'swr'

const RULES = [
  {
    id: 'rule-spam',
    title: 'Spam / quảng cáo làm phiền',
    description: 'Nội dung rác',
    applicable_to: 'all',
    severity: 'low',
    sort_order: 1,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'rule-hate',
    title: 'Ngôn từ thù ghét',
    description: 'Kỳ thị',
    applicable_to: 'all',
    severity: 'high',
    sort_order: 2,
    is_active: true,
    created_at: new Date().toISOString(),
  },
]

function renderModal(props?: Partial<React.ComponentProps<typeof ReportModal>>) {
  return renderWithProviders(
    // Cache SWR riêng mỗi test để không rò rỉ dữ liệu giữa các test.
    <SWRConfig value={{ provider: () => new Map() }}>
      <ReportModal
        open
        targetType="post"
        targetId="post-1"
        onClose={jest.fn()}
        {...props}
      />
    </SWRConfig>,
  )
}

describe('ReportModal', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    restoreFetch()
  })

  it('loads violation rules filtered by target type', async () => {
    mockFetch({ body: { rules: RULES, total: RULES.length } })
    renderModal()

    expect(await screen.findByText('Spam / quảng cáo làm phiền')).toBeInTheDocument()
    expect(screen.getByText('Ngôn từ thù ghét')).toBeInTheDocument()

    const calls = getFetchCalls()
    const urls = calls.map(([url]) => String(url))
    expect(urls.some((u) => u.includes('/api/violation-rules?target_type=post'))).toBe(true)
  })

  it('requires selecting a reason before submitting', async () => {
    mockFetch({ body: { rules: RULES, total: RULES.length } })
    renderModal()
    await screen.findByText('Spam / quảng cáo làm phiền')

    // Locale nạp async trong test — dùng findBy để chờ chuỗi đã dịch.
    await userEvent.click(await screen.findByRole('button', { name: 'Gửi báo cáo' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Vui lòng chọn lý do vi phạm')
    expect(getFetchCalls().length).toBe(1) // chỉ có GET rules, chưa POST
  })

  it('submits the report with rule id and detail', async () => {
    mockFetchSequence([
      { body: { rules: RULES, total: RULES.length } },
      { status: 201, body: { message: 'Báo cáo đã được gửi thành công' } },
    ])
    const onClose = jest.fn()
    renderModal({ onClose })
    await screen.findByText('Spam / quảng cáo làm phiền')

    await userEvent.click(screen.getByText('Ngôn từ thù ghét'))
    await userEvent.type(
      await screen.findByPlaceholderText('Mô tả rõ nội dung vi phạm để quản trị viên xử lý nhanh hơn...'),
      'Nội dung xúc phạm',
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Gửi báo cáo' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    const calls = getFetchCalls()
    const postCall = calls.find(([url, opts]) => String(url).includes('/api/reports') && (opts as RequestInit)?.method === 'POST')
    expect(postCall).toBeDefined()
    const payload = JSON.parse(String((postCall![1] as RequestInit).body))
    expect(payload).toMatchObject({
      target_type: 'post',
      target_id: 'post-1',
      violation_rule_id: 'rule-hate',
      reason_detail: 'Nội dung xúc phạm',
    })
  })

  it('submits with an empty detail when a specific rule is chosen', async () => {
    mockFetchSequence([
      { body: { rules: RULES, total: RULES.length } },
      { status: 201, body: { message: 'ok' } },
    ])
    const onClose = jest.fn()
    renderModal({ onClose })
    await screen.findByText('Spam / quảng cáo làm phiền')

    await userEvent.click(screen.getByText('Ngôn từ thù ghét'))
    await userEvent.click(await screen.findByRole('button', { name: 'Gửi báo cáo' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    const calls = getFetchCalls()
    const postCall = calls.find(([url, opts]) => String(url).includes('/api/reports') && (opts as RequestInit)?.method === 'POST')
    expect(postCall).toBeDefined()
    const payload = JSON.parse(String((postCall![1] as RequestInit).body))
    expect(payload).toMatchObject({ violation_rule_id: 'rule-hate', reason_detail: '' })
  })

  it('requires a detail when "other reason" is chosen', async () => {
    mockFetch({ body: { rules: RULES, total: RULES.length } })
    renderModal()
    await screen.findByText('Spam / quảng cáo làm phiền')

    await userEvent.click(await screen.findByText('Lý do khác'))
    await userEvent.click(await screen.findByRole('button', { name: 'Gửi báo cáo' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Vui lòng nhập mô tả chi tiết')
    // chỉ có GET rules, chưa POST
    expect(getFetchCalls().length).toBe(1)
  })
})
