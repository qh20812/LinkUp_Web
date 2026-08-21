'use client'

import { useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import { useToast } from '../../contexts/ToastContext'
import { createCommunityRule, updateCommunityRule } from '../../api/communities'
import type { CommunityRule } from '../../types'
import styles from './CommunityRuleForm.module.css'

type Category = 'conduct' | 'prohibited' | 'guidelines'

interface CommunityRuleFormProps {
  communityID: string
  rule?: CommunityRule
  onSuccess: () => void
  onCancel: () => void
}

export default function CommunityRuleForm({ communityID, rule, onSuccess, onCancel }: CommunityRuleFormProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const isEdit = !!rule

  const [category, setCategory] = useState<Category>((rule?.category as Category) || 'conduct')
  const [title, setTitle] = useState(rule?.title || '')
  const [content, setContent] = useState(rule?.content || '')
  const [loading, setLoading] = useState(false)

  const categories: { value: Category; labelKey: string }[] = [
    { value: 'conduct', labelKey: 'communities.ruleConduct' },
    { value: 'prohibited', labelKey: 'communities.ruleProhibited' },
    { value: 'guidelines', labelKey: 'communities.ruleGuidelines' },
  ]

  const handleSubmit = async () => {
    if (!title.trim() || title.trim().length < 5) return

    setLoading(true)
    try {
      if (isEdit) {
        await updateCommunityRule(communityID, rule.id, {
          category,
          title: title.trim(),
          content: content.trim() || undefined,
        })
      } else {
        await createCommunityRule(communityID, {
          category,
          title: title.trim(),
          content: content.trim() || undefined,
        })
      }
      toast({ type: 'success', title: t(isEdit ? 'communities.ruleUpdateSuccess' : 'communities.ruleCreateSuccess') })
      onSuccess()
    } catch (err: unknown) {
      toast({
        type: 'error',
        title: err instanceof Error ? err.message : t('communities.ruleError'),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.form}>
      <div className={styles.field}>
        <label className={styles.label}>{t('communities.ruleCategory')}</label>
        <div className={styles.categoryOptions}>
          {categories.map(cat => (
            <button
              key={cat.value}
              className={`${styles.categoryOption} ${category === cat.value ? styles.categoryOptionActive : ''}`}
              onClick={() => setCategory(cat.value)}
              disabled={loading}
              type="button"
            >
              {t(cat.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>{t('communities.ruleTitle')}</label>
        <input
          className={styles.input}
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={t('communities.ruleTitlePlaceholder')}
          maxLength={255}
          disabled={loading}
        />
        <span className={styles.hint}>{title.length}/255</span>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>{t('communities.ruleContent')}</label>
        <textarea
          className={styles.textarea}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={t('communities.ruleContentPlaceholder')}
          maxLength={2000}
          rows={3}
          disabled={loading}
        />
        <span className={styles.hint}>{content.length}/2000</span>
      </div>

      <div className={styles.actions}>
        <button className={styles.cancelBtn} onClick={onCancel} disabled={loading}>
          {t('common.cancel')}
        </button>
        <button
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={loading || !title.trim() || title.trim().length < 5}
        >
          {loading ? t('common.saving') : t(isEdit ? 'common.save' : 'common.add')}
        </button>
      </div>
    </div>
  )
}
