'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { getCommunityMembers, getCommunityRules } from '../../api/communities'
import ExternalImage from '../ExternalImage'
import { useTranslation } from '../../hooks/useTranslation'
import styles from './CommunityAboutRail.module.css'
import type { CommunityDetailResponse, CommunityMember, CommunityRule } from '../../types'

export type CommunityDetailTab = 'posts' | 'members' | 'rules' | 'manage'

interface CommunityAboutRailProps {
  community: CommunityDetailResponse
  onGoTab: (tab: CommunityDetailTab) => void
}

export default function CommunityAboutRail({ community, onGoTab }: CommunityAboutRailProps) {
  const { t } = useTranslation()

  const { data: membersData } = useSWR<{ members: CommunityMember[] }>(
    `/communities/${community.id}/members`,
    () => getCommunityMembers(community.id),
  )
  const { data: rulesData } = useSWR<{ rules: CommunityRule[] }>(
    `/communities/${community.id}/rules`,
    () => getCommunityRules(community.id),
  )

  const members = membersData?.members ?? []
  const preview = members.slice(0, 5)
  const extra = Math.max(0, community.member_count - preview.length)
  const rules = (rulesData?.rules ?? []).slice(0, 3)
  const totalRules = rulesData?.rules.length ?? 0

  return (
    <aside className={styles.rail} aria-label={t('communities.about')}>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>{t('communities.about')}</h2>
        {community.description && <p className={styles.desc}>{community.description}</p>}
        <dl className={styles.facts}>
          <div className={styles.fact}>
            <dt>{t('communities.privacy')}</dt>
            <dd>{t(community.privacy === 'public' ? 'communities.privacyPublic' : 'communities.privacyInvitation')}</dd>
          </div>
          <div className={styles.fact}>
            <dt>{t('communities.memberCount')}</dt>
            <dd>{community.member_count.toLocaleString('vi-VN')}</dd>
          </div>
          <div className={styles.fact}>
            <dt>{t('communities.createdBy')}</dt>
            <dd>
              <Link href={`/profile/${community.creator_id}`} className={styles.link}>
                @{community.creator_name}
              </Link>
            </dd>
          </div>
        </dl>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>{t('communities.memberList')}</h2>
          <button type="button" className={styles.linkBtn} onClick={() => onGoTab('members')}>
            {t('communities.viewAll')}
          </button>
        </div>
        {preview.length > 0 ? (
          <div className={styles.avatarStack}>
            {preview.map((m) => (
              <ExternalImage
                key={m.user_id}
                src={m.avatar_uri}
                alt={m.display_name}
                title={m.display_name}
                className={styles.stackAvatar}
              />
            ))}
            {extra > 0 && <span className={styles.stackMore}>+{extra}</span>}
          </div>
        ) : (
          <p className={styles.muted}>{t('communities.noMembers')}</p>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>{t('communities.rules')}</h2>
          <button type="button" className={styles.linkBtn} onClick={() => onGoTab('rules')}>
            {t('communities.viewAll')}
          </button>
        </div>
        {rules.length > 0 ? (
          <ol className={styles.rulesPreview}>
            {rules.map((r) => (
              <li key={r.id}>{r.title}</li>
            ))}
          </ol>
        ) : (
          <p className={styles.muted}>{t('communities.noRules')}</p>
        )}
        {totalRules > rules.length && (
          <p className={styles.muted}>
            {t('communities.moreRules', { count: totalRules - rules.length })}
          </p>
        )}
      </section>
    </aside>
  )
}
