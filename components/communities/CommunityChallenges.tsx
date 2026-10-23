'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import Modal from '../Modal'
import ExternalImage from '../ExternalImage'
import { useTranslation } from '../../hooks/useTranslation'
import { useToast } from '../../contexts/ToastContext'
import {
  createChallenge,
  getChallengeParticipants,
  joinChallenge,
  listChallenges,
  updateChallenge,
} from '../../api/contribution'
import styles from './CommunityChallenges.module.css'
import type {
  ChallengeParticipant,
  ChallengeState,
  ChallengeStatus,
  CommunityChallenge,
} from '../../types'

interface CommunityChallengesProps {
  communityID: string
  isMember: boolean
  canManage: boolean
}

type FilterKey = 'active' | 'upcoming' | 'ended'

const STATE_CLASS: Record<ChallengeState, string> = {
  active: styles.stateActive,
  upcoming: styles.stateUpcoming,
  ended: styles.stateEnded,
  cancelled: styles.stateCancelled,
}

const STATE_LABEL: Record<ChallengeState, string> = {
  active: 'contribution.stateActive',
  upcoming: 'contribution.stateUpcoming',
  ended: 'contribution.stateEnded',
  cancelled: 'contribution.stateCancelled',
}

function localeOf(language: string) {
  return language === 'en' ? 'en-GB' : 'vi-VN'
}

function formatDate(iso: string, language: string, short = false) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(
    localeOf(language),
    short ? { day: '2-digit', month: '2-digit' } : { day: '2-digit', month: '2-digit', year: 'numeric' },
  )
}

/** Chuyển ISO string → giá trị cho <input type="datetime-local"> theo giờ máy người dùng. */
function toDateTimeInput(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function defaultStart() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(9, 0, 0, 0)
  return toDateTimeInput(date.toISOString())
}

function defaultEnd() {
  const date = new Date()
  date.setDate(date.getDate() + 8)
  date.setHours(21, 0, 0, 0)
  return toDateTimeInput(date.toISOString())
}

function SkeletonCard() {
  return (
    <div className={styles.skeletonCard} aria-hidden>
      <div className={styles.skeletonPill} />
      <div className={styles.skeletonLine} style={{ width: '72%', height: 20 }} />
      <div className={styles.skeletonLine} style={{ width: '100%' }} />
      <div className={styles.skeletonLine} style={{ width: '54%' }} />
      <div className={styles.skeletonFooter}>
        <div className={styles.skeletonBtn} />
        <div className={styles.skeletonBtn} />
      </div>
    </div>
  )
}

export default function CommunityChallenges({
  communityID,
  isMember,
  canManage,
}: CommunityChallengesProps) {
  const { t, language } = useTranslation()
  const { toast } = useToast()

  const { data, isLoading, error, mutate } = useSWR<{ data: CommunityChallenge[] }>(
    `/communities/${communityID}/challenges?include_ended=true`,
    () => listChallenges(communityID, true),
  )

  const [filter, setFilter] = useState<FilterKey>('active')
  const [joiningID, setJoiningID] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CommunityChallenge | null>(null)
  const [participantsFor, setParticipantsFor] = useState<CommunityChallenge | null>(null)

  const groups = useMemo(() => {
    const active: CommunityChallenge[] = []
    const upcoming: CommunityChallenge[] = []
    const ended: CommunityChallenge[] = []
    for (const challenge of data?.data ?? []) {
      if (challenge.state === 'active') active.push(challenge)
      else if (challenge.state === 'upcoming') upcoming.push(challenge)
      else ended.push(challenge)
    }
    return { active, upcoming, ended }
  }, [data])

  const filters: { key: FilterKey; label: string; count: number }[] = [
    { key: 'active', label: t('contribution.filterActive'), count: groups.active.length },
    { key: 'upcoming', label: t('contribution.filterUpcoming'), count: groups.upcoming.length },
    { key: 'ended', label: t('contribution.filterEnded'), count: groups.ended.length },
  ]

  const visible = groups[filter]

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (challenge: CommunityChallenge) => {
    setEditing(challenge)
    setFormOpen(true)
  }

  const handleJoin = async (challenge: CommunityChallenge) => {
    setJoiningID(challenge.id)
    try {
      await joinChallenge(communityID, challenge.id)
      toast({ type: 'success', title: t('contribution.joinSuccess') })
      mutate()
    } catch (err: unknown) {
      toast({
        type: 'error',
        title: err instanceof Error ? err.message : t('contribution.joinError'),
      })
    } finally {
      setJoiningID(null)
    }
  }

  const header = (
    <div className={styles.header}>
      <div className={styles.headerText}>
        <span className={styles.eyebrow}>
          <i className="bx bx-trophy" aria-hidden /> {t('contribution.challengesBadge')}
        </span>
        <h2 className={styles.title}>{t('contribution.challengesTitle')}</h2>
        <p className={styles.subtitle}>{t('contribution.challengesSubtitle')}</p>
      </div>
      {canManage && (
        <button type="button" className={styles.createBtn} onClick={openCreate}>
          <i className="bx bx-plus" aria-hidden /> {t('contribution.createChallenge')}
        </button>
      )}
    </div>
  )

  if (isLoading) {
    return (
      <div className={styles.wrap}>
        {header}
        <div className={styles.grid}>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.wrap}>
        {header}
        <div className={styles.empty} role="alert">
          <div className={styles.emptyIconWrap} aria-hidden>
            <i className="bx bx-error" />
          </div>
          <p className={styles.emptyTitle}>{t('contribution.loadError')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      {header}

      <div className={styles.filters} aria-label={t('contribution.challengesTitle')}>
        {filters.map(item => (
          <button
            key={item.key}
            type="button"
            aria-pressed={filter === item.key}
            className={`${styles.filterBtn} ${filter === item.key ? styles.filterBtnActive : ''}`}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
            <span className={styles.filterCount}>{item.count}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIconWrap} aria-hidden>
            <i className="bx bx-flag" />
          </div>
          <p className={styles.emptyTitle}>{t('contribution.noChallenges')}</p>
          <p className={styles.emptyHint}>
            {canManage ? t('contribution.noChallengesHint') : t('contribution.noChallengesMemberHint')}
          </p>
          {canManage && filter === 'active' && (
            <button type="button" className={styles.createBtn} onClick={openCreate}>
              <i className="bx bx-plus" aria-hidden /> {t('contribution.createChallenge')}
            </button>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {visible.map((challenge, index) => {
            const dailyLimit = challenge.daily_post_limit || 3
            const awarded = Math.min(challenge.daily_posts_awarded, dailyLimit)
            const quotaFull = awarded >= dailyLimit
            const maxParticipants = challenge.max_participants ?? 0
            const progress = maxParticipants > 0
              ? Math.min(100, Math.round((challenge.participants_count / maxParticipants) * 100))
              : 0

            return (
              <article
                key={challenge.id}
                className={styles.card}
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className={styles.cardTop}>
                  <span className={`${styles.statePill} ${STATE_CLASS[challenge.state]}`}>
                    {challenge.state === 'active' && <span className={styles.liveDot} aria-hidden />}
                    {t(STATE_LABEL[challenge.state])}
                  </span>
                  <span className={styles.pointsChip}>
                    <i className="bx bx-star" aria-hidden />
                    {t('contribution.pointsPerPost', { points: challenge.points_per_post })}
                  </span>
                </div>

                <h3 className={styles.cardTitle}>{challenge.title}</h3>
                {challenge.description && <p className={styles.cardDesc}>{challenge.description}</p>}

                <div className={styles.metaRow}>
                  <span className={styles.hashtag}>{challenge.hashtag}</span>
                  <span className={styles.metaItem}>
                    <i className="bx bx-calendar" aria-hidden />
                    {formatDate(challenge.start_date, language, true)} – {formatDate(challenge.end_date, language)}
                  </span>
                </div>

                <div className={styles.participantsRow}>
                  <span className={styles.metaItem}>
                    <i className="bx bx-group" aria-hidden />
                    {t('contribution.participantsCount', { count: challenge.participants_count })}
                  </span>
                  {maxParticipants > 0 ? (
                    <div
                      className={styles.progressTrack}
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={maxParticipants}
                      aria-valuenow={challenge.participants_count}
                    >
                      <div
                        className={styles.progressFill}
                        style={{ transform: `scaleX(${progress / 100})` }}
                      />
                    </div>
                  ) : (
                    <span className={styles.muted}>{t('contribution.unlimited')}</span>
                  )}
                </div>

                {challenge.joined && challenge.state !== 'cancelled' && (
                  <div className={styles.quota}>
                    <div className={styles.quotaDots} aria-hidden>
                      {Array.from({ length: dailyLimit }).map((_, dot) => (
                        <span
                          key={dot}
                          className={`${styles.quotaDot} ${dot < awarded ? styles.quotaDotOn : ''}`}
                        />
                      ))}
                    </div>
                    <span className={quotaFull ? styles.quotaFull : styles.quotaText}>
                      {quotaFull
                        ? t('contribution.dailyQuotaFull', { limit: dailyLimit })
                        : t('contribution.dailyQuota', { used: awarded, limit: dailyLimit })}
                    </span>
                  </div>
                )}

                {challenge.joined && challenge.state === 'active' && (
                  <span className={styles.hashtagHint}>
                    {t('contribution.hashtagHint', { hashtag: challenge.hashtag })}
                  </span>
                )}

                <div className={styles.cardActions}>
                  {challenge.state === 'active' && !challenge.joined && (
                    <button
                      type="button"
                      className={styles.joinBtn}
                      disabled={!isMember || joiningID === challenge.id}
                      title={isMember ? undefined : t('contribution.joinRequiresMember')}
                      onClick={() => handleJoin(challenge)}
                    >
                      {joiningID === challenge.id ? t('contribution.joining') : t('contribution.join')}
                    </button>
                  )}
                  {challenge.joined && (
                    <span className={styles.joinedBadge}>
                      <i className="bx bx-check" aria-hidden /> {t('contribution.joined')}
                    </span>
                  )}
                  {challenge.state === 'upcoming' && !challenge.joined && (
                    <span className={styles.metaItem}>
                      <i className="bx bx-time-five" aria-hidden />
                      {t('contribution.startsAt', { date: formatDate(challenge.start_date, language) })}
                    </span>
                  )}
                  <span className={styles.spacer} />
                  <button
                    type="button"
                    className={styles.ghostBtn}
                    onClick={() => setParticipantsFor(challenge)}
                  >
                    <i className="bx bx-group" aria-hidden /> {t('contribution.viewParticipants')}
                  </button>
                  {canManage && (
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => openEdit(challenge)}
                      aria-label={t('contribution.editChallenge')}
                      title={t('contribution.editChallenge')}
                    >
                      <i className="bx bx-edit-alt" aria-hidden />
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {!isMember && (
        <p className={styles.memberHint}>
          <i className="bx bx-info-circle" aria-hidden /> {t('contribution.joinRequiresMember')}
        </p>
      )}

      {formOpen && (
        <ChallengeFormModal
          communityID={communityID}
          challenge={editing}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false)
            mutate()
          }}
        />
      )}

      {participantsFor && (
        <ParticipantsModal
          communityID={communityID}
          challenge={participantsFor}
          onClose={() => setParticipantsFor(null)}
        />
      )}
    </div>
  )
}

interface ChallengeFormModalProps {
  communityID: string
  challenge: CommunityChallenge | null
  onClose: () => void
  onSaved: () => void
}

function ChallengeFormModal({ communityID, challenge, onClose, onSaved }: ChallengeFormModalProps) {
  const { t, language } = useTranslation()
  const { toast } = useToast()
  const isEdit = challenge !== null

  const [title, setTitle] = useState(challenge?.title ?? '')
  const [description, setDescription] = useState(challenge?.description ?? '')
  const [hashtag, setHashtag] = useState(challenge?.hashtag ?? '#')
  const [points, setPoints] = useState(challenge ? String(challenge.points_per_post) : '10')
  const [start, setStart] = useState(challenge ? toDateTimeInput(challenge.start_date) : defaultStart())
  const [end, setEnd] = useState(challenge ? toDateTimeInput(challenge.end_date) : defaultEnd())
  const [maxParticipants, setMaxParticipants] = useState(
    challenge?.max_participants ? String(challenge.max_participants) : '',
  )
  const [status, setStatus] = useState<ChallengeStatus>(() => {
    const current = challenge?.status
    return current === 'completed' || current === 'cancelled' ? current : 'active'
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const startDate = start ? new Date(start) : null
  const endDate = end ? new Date(end) : null
  const pointsNumber = Number(points)
  const maxNumber = maxParticipants.trim() === '' ? 0 : Number(maxParticipants)

  const titleValid = title.trim().length >= 5
  const hashtagValid = hashtag.trim().replace(/^#+/, '').length > 0
  const pointsValid = Number.isInteger(pointsNumber) && pointsNumber >= 1 && pointsNumber <= 1000
  const datesValid = !!startDate && !!endDate && endDate.getTime() > startDate.getTime()
  const maxValid = maxNumber === 0 || (Number.isInteger(maxNumber) && maxNumber >= 1 && maxNumber <= 100000)
  const canSubmit =
    titleValid && hashtagValid && pointsValid && datesValid && maxValid && !saving

  const handleSubmit = async () => {
    if (!canSubmit || !startDate || !endDate) return
    if (!isEdit && startDate.getTime() <= Date.now()) {
      setFormError(t('contribution.startMustBeFuture'))
      return
    }
    setFormError('')
    setSaving(true)

    const normalizedHashtag = `#${hashtag.trim().replace(/^#+/, '')}`
    try {
      if (isEdit && challenge) {
        await updateChallenge(communityID, challenge.id, {
          title: title.trim(),
          description: description.trim(),
          hashtag: normalizedHashtag,
          points_per_post: pointsNumber,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          max_participants: maxNumber,
          status,
        })
        toast({ type: 'success', title: t('contribution.updateSuccess') })
      } else {
        await createChallenge(communityID, {
          title: title.trim(),
          description: description.trim(),
          hashtag: normalizedHashtag,
          points_per_post: pointsNumber,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          ...(maxNumber > 0 ? { max_participants: maxNumber } : {}),
        })
        toast({ type: 'success', title: t('contribution.createSuccess') })
      }
      onSaved()
    } catch (err: unknown) {
      setFormError(
        err instanceof Error
          ? err.message
          : isEdit
            ? t('contribution.updateError')
            : t('contribution.createError'),
      )
    } finally {
      setSaving(false)
    }
  }

  const footer = (
    <div className={styles.modalFooter}>
      <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={saving}>
        {t('common.cancel')}
      </button>
      <button
        type="button"
        className={styles.submitBtn}
        onClick={handleSubmit}
        disabled={!canSubmit}
      >
        {saving
          ? isEdit
            ? t('contribution.saving')
            : t('contribution.creating')
          : isEdit
            ? t('contribution.save')
            : t('contribution.createChallenge')}
      </button>
    </div>
  )

  return (
    <Modal
      open
      onClose={saving ? () => undefined : onClose}
      title={isEdit ? t('contribution.editTitle') : t('contribution.createTitle')}
      footer={footer}
    >
      <div className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="challenge-title">
            {t('contribution.fieldTitle')}
          </label>
          <input
            id="challenge-title"
            className={styles.input}
            type="text"
            value={title}
            maxLength={255}
            placeholder={t('contribution.fieldTitlePlaceholder')}
            onChange={e => setTitle(e.target.value)}
            disabled={saving}
          />
          <span className={styles.hint}>{title.length}/255</span>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="challenge-desc">
            {t('contribution.fieldDescription')}
          </label>
          <textarea
            id="challenge-desc"
            className={styles.textarea}
            value={description}
            maxLength={2000}
            rows={3}
            placeholder={t('contribution.fieldDescriptionPlaceholder')}
            onChange={e => setDescription(e.target.value)}
            disabled={saving}
          />
          <span className={styles.hint}>{description.length}/2000</span>
        </div>

        <div className={styles.twoCol}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="challenge-hashtag">
              {t('contribution.fieldHashtag')}
            </label>
            <input
              id="challenge-hashtag"
              className={styles.input}
              type="text"
              value={hashtag}
              maxLength={100}
              placeholder="#MuaHeXanh"
              onChange={e => setHashtag(e.target.value)}
              disabled={saving}
            />
            <span className={styles.hint}>{t('contribution.fieldHashtagHint')}</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="challenge-points">
              {t('contribution.fieldPoints')}
            </label>
            <input
              id="challenge-points"
              className={styles.input}
              type="number"
              min={1}
              max={1000}
              value={points}
              onChange={e => setPoints(e.target.value)}
              disabled={saving}
            />
            <span className={styles.hint}>{t('contribution.fieldPointsHint')}</span>
          </div>
        </div>

        <div className={styles.twoCol}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="challenge-start">
              {t('contribution.fieldStart')}
            </label>
            <input
              id="challenge-start"
              className={styles.input}
              type="datetime-local"
              value={start}
              onChange={e => setStart(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="challenge-end">
              {t('contribution.fieldEnd')}
            </label>
            <input
              id="challenge-end"
              className={styles.input}
              type="datetime-local"
              value={end}
              onChange={e => setEnd(e.target.value)}
              disabled={saving}
            />
            {!datesValid && <span className={styles.fieldError}>{t('contribution.endAfterStart')}</span>}
          </div>
        </div>

        <div className={styles.twoCol}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="challenge-max">
              {t('contribution.fieldMax')}
            </label>
            <input
              id="challenge-max"
              className={styles.input}
              type="number"
              min={0}
              max={100000}
              value={maxParticipants}
              placeholder="0"
              onChange={e => setMaxParticipants(e.target.value)}
              disabled={saving}
            />
            <span className={styles.hint}>{t('contribution.fieldMaxHint')}</span>
          </div>

          {isEdit && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="challenge-status">
                {t('contribution.fieldStatus')}
              </label>
              <select
                id="challenge-status"
                className={styles.input}
                value={status}
                onChange={e => setStatus(e.target.value as ChallengeStatus)}
                disabled={saving}
              >
                <option value="active">{t('contribution.statusActive')}</option>
                <option value="completed">{t('contribution.statusCompleted')}</option>
                <option value="cancelled">{t('contribution.statusCancelled')}</option>
              </select>
            </div>
          )}
        </div>

        {isEdit && challenge && (
          <p className={styles.hint}>
            {t('contribution.createdAt', { date: formatDate(challenge.created_at, language) })}
          </p>
        )}

        {formError && (
          <p className={styles.formError} role="alert">
            {formError}
          </p>
        )}
      </div>
    </Modal>
  )
}

interface ParticipantsModalProps {
  communityID: string
  challenge: CommunityChallenge
  onClose: () => void
}

function ParticipantsModal({ communityID, challenge, onClose }: ParticipantsModalProps) {
  const { t, language } = useTranslation()
  const { data, isLoading } = useSWR<{ data: ChallengeParticipant[] }>(
    `/communities/${communityID}/challenges/${challenge.id}/participants`,
    () => getChallengeParticipants(communityID, challenge.id),
  )

  const participants = data?.data ?? []

  return (
    <Modal open onClose={onClose} title={t('contribution.participantsTitle')}>
      <div className={styles.participantHead}>
        <span className={styles.hashtag}>{challenge.hashtag}</span>
        <span className={styles.muted}>
          {t('contribution.pointsPerPost', { points: challenge.points_per_post })}
        </span>
      </div>

      {isLoading ? (
        <div className={styles.participantList}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.participantSkeleton}>
              <div className={styles.skeletonCircle} />
              <div className={styles.skeletonLine} style={{ flex: 1 }} />
            </div>
          ))}
        </div>
      ) : participants.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIconWrap} aria-hidden>
            <i className="bx bx-user-plus" />
          </div>
          <p className={styles.emptyTitle}>{t('contribution.participantsEmpty')}</p>
        </div>
      ) : (
        <ol className={styles.participantList}>
          {participants.map((participant, index) => (
            <li key={participant.user_id} className={styles.participantRow}>
              <span className={styles.participantRank}>{index + 1}</span>
              <ExternalImage
                src={participant.avatar_uri}
                alt={participant.display_name}
                className={styles.participantAvatar}
              />
              <div className={styles.participantInfo}>
                <span className={styles.participantName}>{participant.display_name}</span>
                <span className={styles.muted}>
                  {t('contribution.postsCount', { count: participant.posts_count })}
                  {' · '}
                  {t('contribution.pointsShort', { points: participant.total_points_earned })}
                </span>
              </div>
              <span className={styles.participantJoined}>
                {formatDate(participant.joined_at, language)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  )
}
