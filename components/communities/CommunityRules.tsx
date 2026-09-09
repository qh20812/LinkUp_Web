'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { getCommunityRules, deleteCommunityRule } from '../../api/communities'
import { useTranslation } from '../../hooks/useTranslation'
import { useToast } from '../../contexts/ToastContext'
import CommunityRuleForm from './CommunityRuleForm'
import type { CommunityRule } from '../../types'
import styles from './CommunityRules.module.css'

interface CommunityRulesProps {
  communityID: string
  isAdmin?: boolean
}

export default function CommunityRules({ communityID, isAdmin = false }: CommunityRulesProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { data, isLoading, mutate } = useSWR(
    `/communities/${communityID}/rules`,
    () => getCommunityRules(communityID),
  )

  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<CommunityRule | undefined>()

  const rules = data?.rules ?? []

  const categoryLabelMap: Record<string, string> = {
    conduct: 'communities.ruleConduct',
    prohibited: 'communities.ruleProhibited',
    guidelines: 'communities.ruleGuidelines',
  }

  const grouped = rules.reduce<Record<string, CommunityRule[]>>((acc, rule) => {
    const key = rule.category || 'other'
    if (!acc[key]) acc[key] = []
    acc[key].push(rule)
    return acc
  }, {})

  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    const posA = grouped[a][0]?.position ?? 0
    const posB = grouped[b][0]?.position ?? 0
    return posA - posB
  })

  let number = 0

  const handleDelete = async (ruleID: string) => {
    if (!confirm(t('communities.ruleDeleteConfirm'))) return
    try {
      await deleteCommunityRule(communityID, ruleID)
      toast({ type: 'success', title: t('communities.ruleDeleteSuccess') })
      mutate()
    } catch (err: unknown) {
      toast({
        type: 'error',
        title: err instanceof Error ? err.message : t('communities.ruleError'),
      })
    }
  }

  const handleEdit = (rule: CommunityRule) => {
    setEditingRule(rule)
    setShowForm(true)
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingRule(undefined)
    mutate()
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingRule(undefined)
  }

  if (isLoading) {
    return (
      <div className={styles.rules}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={styles.skeletonItem}>
            <div className={styles.skeletonCircle} />
            <div className={styles.skeletonLine} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={styles.rules}>
      {isAdmin && (
        <div className={styles.adminHeader}>
          {showForm ? (
            <CommunityRuleForm
              communityID={communityID}
              rule={editingRule}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          ) : (
            <button className={styles.addBtn} onClick={() => setShowForm(true)}>
              <i className="bx bx-plus" />
              {t('communities.addRule')}
            </button>
          )}
        </div>
      )}

      {rules.length === 0 && !showForm ? (
        <div className={styles.empty}>
          <i className={`bx bx-shield-quarter ${styles.emptyIcon}`} />
          <p>{t('communities.noRules')}</p>
        </div>
      ) : (
        sortedCategories.map((category) => {
          const categoryRules = grouped[category].sort((a, b) => a.position - b.position)
          return (
            <div key={category} className={styles.category}>
              <div className={styles.categoryTitle}>{t(categoryLabelMap[category] || 'communities.ruleCategory')}</div>
              {categoryRules.map((rule) => {
                number++
                return (
                  <div key={rule.id} className={styles.ruleItem}>
                    <div className={styles.ruleNumber}>{number}</div>
                    <div className={styles.ruleContent}>
                      <div className={styles.ruleTitle}>{rule.title}</div>
                      {rule.content && (
                        <div className={styles.ruleText}>{rule.content}</div>
                      )}
                    </div>
                    {isAdmin && (
                      <div className={styles.ruleActions}>
                        <button
                          className={styles.ruleActionBtn}
                          onClick={() => handleEdit(rule)}
                          title={t('common.edit')}
                        >
                          <i className="bx bx-edit" />
                        </button>
                        <button
                          className={`${styles.ruleActionBtn} ${styles.ruleActionDanger}`}
                          onClick={() => handleDelete(rule.id)}
                          title={t('common.delete')}
                        >
                          <i className="bx bx-trash" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })
      )}
    </div>
  )
}
