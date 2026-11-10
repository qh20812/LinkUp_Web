export type AdTemplateFormat = 'image' | 'video' | 'carousel'

export interface AdTemplate {
  id: string
  emoji: string
  title: Record<'vi' | 'en', string>
  content: Record<'vi' | 'en', string>
  suggestedFormat: AdTemplateFormat
}

/**
 * Mẫu nội dung theo ngành cho người mới. Chỉ điền tiêu đề + nội dung; người
 * dùng vẫn tự chọn ảnh và ngân sách. Copy phải có cả vi và en.
 */
export const AD_TEMPLATES: AdTemplate[] = [
  {
    id: 'cafe',
    emoji: '☕',
    title: {
      vi: 'Cà phê mới rang — giảm 20% tuần này',
      en: 'Freshly roasted coffee — 20% off this week',
    },
    content: {
      vi: 'Thưởng thức ly cà phê rang mới mỗi sáng. Giảm 20% cho tất cả đồ uống từ 7h–10h, áp dụng tại cửa hàng.',
      en: 'Start your morning with freshly roasted coffee. 20% off all drinks from 7–10am, in store only.',
    },
    suggestedFormat: 'image',
  },
  {
    id: 'restaurant',
    emoji: '🍜',
    title: {
      vi: 'Combo trưa chỉ 59.000đ',
      en: 'Lunch combo only 59,000 VND',
    },
    content: {
      vi: 'Một món chính, một món phụ và trà đá cho bữa trưa trọn vị. Áp dụng từ thứ Hai đến thứ Sáu.',
      en: 'One main, one side and iced tea for a complete lunch. Available Monday to Friday.',
    },
    suggestedFormat: 'image',
  },
  {
    id: 'fashion',
    emoji: '👗',
    title: {
      vi: 'Bộ sưu tập mới đã về',
      en: 'The new collection has landed',
    },
    content: {
      vi: 'Khám phá bộ sưu tập mới với chất liệu nhẹ, phù hợp mọi ngày. Miễn phí đổi size trong 7 ngày.',
      en: 'Explore the new collection in lightweight fabrics made for every day. Free size exchange within 7 days.',
    },
    suggestedFormat: 'carousel',
  },
  {
    id: 'beauty',
    emoji: '💄',
    title: {
      vi: 'Mua 1 tặng 1 son dưỡng',
      en: 'Buy one lip balm, get one free',
    },
    content: {
      vi: 'Dưỡng môi ẩm mịn suốt 12 giờ. Mua 1 tặng 1 cho khách hàng mới, số lượng có hạn.',
      en: 'Keep lips hydrated for 12 hours. Buy one get one free for new customers, while stocks last.',
    },
    suggestedFormat: 'image',
  },
  {
    id: 'course',
    emoji: '🎓',
    title: {
      vi: 'Học thử miễn phí lớp tiếng Anh giao tiếp',
      en: 'Free trial class for conversational English',
    },
    content: {
      vi: 'Lớp nhỏ 8 học viên, giáo viên theo sát từng người. Đăng ký hôm nay để nhận buổi học thử miễn phí.',
      en: 'Small classes of 8 with close teacher support. Sign up today for a free trial lesson.',
    },
    suggestedFormat: 'video',
  },
  {
    id: 'event',
    emoji: '🎉',
    title: {
      vi: 'Sự kiện cuối tuần — vé sớm giảm 30%',
      en: 'Weekend event — early bird tickets 30% off',
    },
    content: {
      vi: 'Âm nhạc, ẩm thực và khu vui chơi cho cả gia đình. Vé sớm giảm 30% đến hết thứ Sáu.',
      en: 'Music, food and a kids’ zone for the whole family. Early bird tickets are 30% off until Friday.',
    },
    suggestedFormat: 'image',
  },
  {
    id: 'hiring',
    emoji: '💼',
    title: {
      vi: 'Tuyển nhân viên bán hàng — làm ngay',
      en: 'Hiring sales staff — start immediately',
    },
    content: {
      vi: 'Lương cứng 7 triệu + thưởng doanh số, đào tạo từ đầu. Ứng tuyển online, phỏng vấn trong 48 giờ.',
      en: '7M base salary + sales bonus, full training provided. Apply online and interview within 48 hours.',
    },
    suggestedFormat: 'image',
  },
]

export interface LocalizedAdTemplate {
  id: string
  emoji: string
  title: string
  content: string
  suggestedFormat: AdTemplateFormat
}

export function getAdTemplates(language: 'vi' | 'en'): LocalizedAdTemplate[] {
  return AD_TEMPLATES.map((template) => ({
    id: template.id,
    emoji: template.emoji,
    title: template.title[language],
    content: template.content[language],
    suggestedFormat: template.suggestedFormat,
  }))
}
