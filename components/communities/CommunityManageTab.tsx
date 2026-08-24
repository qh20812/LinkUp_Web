'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useTranslation } from '../../hooks/useTranslation'
import { useToast } from '../../contexts/ToastContext'
import {
  updateCommunity,
  listJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  listInviteCodes,
  createInviteCode,
  deactivateInviteCode,
  transferOwnership,
} from '../../api/communities'
import Modal from '../Modal'
import ExternalImage from '../ExternalImage'
import type { CommunityDetailResponse, CommunityJoinRequest, CommunityInviteCode } from '../../types'
import styles from './CommunityManageTab.module.css'

interface CommunityManageTabProps {
  communityID: string
  community: CommunityDetailResponse
  onUpdate: () => void
}

type ManageSection = 'settings' | 'requests' | 'codes' | 'transfer'

export default function CommunityManageTab({ communityID, community, onUpdate }: CommunityManageTabProps) {
  const { t } = useTranslation()

  const [activeSection, setActiveSection] = useState<ManageSection>('settings')

  const sections: { key: ManageSection; label: string; icon: string }[] = [
    { key: 'settings', label: t('communities.settings'), icon: 'bx-cog' },
    { key: 'requests', label: t('communities.joinRequests'), icon: 'bx-user-plus' },
    { key: 'codes', label: t('communities.inviteCodes'), icon: 'bx-key' },
    { key: 'transfer', label: t('communities.transferOwnership'), icon: 'bx-transfer' },
  ]

  return (
    <div className={styles.container}>
      <div className={styles.sectionNav}>
        {sections.map(section => (
          <button
            key={section.key}
            className={`${styles.sectionBtn} ${activeSection === section.key ? styles.sectionBtnActive : ''}`}
            onClick={() => setActiveSection(section.key)}
          >
            <i className={`bx ${section.icon}`} />
            {section.label}
          </button>
        ))}
      </div>

      <div className={styles.sectionContent}>
        {activeSection === 'settings' && (
          <SettingsSection communityID={communityID} community={community} onUpdate={onUpdate} />
        )}
        {activeSection === 'requests' && (
          <RequestsSection communityID={communityID} />
        )}
        {activeSection === 'codes' && (
          <CodesSection communityID={communityID} />
        )}
        {activeSection === 'transfer' && (
          <TransferSection communityID={communityID} onUpdate={onUpdate} />
        )}
      </div>
    </div>
  )
}

function SettingsSection({ communityID, community, onUpdate }: { communityID: string; community: CommunityDetailResponse; onUpdate: () => void }) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [name, setName] = useState(community.name)
  const [description, setDescription] = useState(community.description)
  const [privacy, setPrivacy] = useState(community.privacy)
  const [autoApprove, setAutoApprove] = useState(community.auto_approve)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!name.trim() || name.trim().length < 3) return

    setLoading(true)
    try {
      await updateCommunity(communityID, {
        name: name.trim(),
        description: description.trim(),
        privacy,
        auto_approve: autoApprove,
      })
      toast({ type: 'success', title: t('communities.settingsSaved') })
      onUpdate()
    } catch (err: unknown) {
      toast({
        type: 'error',
        title: err instanceof Error ? err.message : t('communities.settingsError'),
      })
    } finally {
      setLoading(false)
    }
  }

  const privacyOptions: { value: string; icon: string; labelKey: string }[] = [
    { value: 'public', icon: 'bx-globe', labelKey: 'communities.privacyPublic' },
    { value: 'invitation_only', icon: 'bx-lock-alt', labelKey: 'communities.privacyInvitation' },
  ]

  return (
    <div className={styles.settingsForm}>
      <div className={styles.field}>
        <label className={styles.label}>{t('communities.settingsName')}</label>
        <input
          className={styles.input}
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={100}
          disabled={loading}
        />
        <span className={styles.hint}>{name.length}/100</span>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>{t('communities.settingsDesc')}</label>
        <textarea
          className={styles.textarea}
          value={description}
          onChange={e => setDescription(e.target.value)}
          maxLength={500}
          rows={3}
          disabled={loading}
        />
        <span className={styles.hint}>{description.length}/500</span>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>{t('communities.settingsPrivacy')}</label>
        <div className={styles.privacyOptions}>
          {privacyOptions.map(opt => (
            <button
              key={opt.value}
              className={`${styles.privacyOption} ${privacy === opt.value ? styles.privacyOptionActive : ''}`}
              onClick={() => setPrivacy(opt.value as 'public' | 'code' | 'invitation_only')}
              disabled={loading}
              type="button"
            >
              <i className={`bx ${opt.icon}`} />
              <span>{t(opt.labelKey)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>{t('communities.settingsAutoApprove')}</label>
        <div className={styles.toggleRow}>
          <button
            className={`${styles.toggle} ${autoApprove ? styles.toggleActive : ''}`}
            onClick={() => setAutoApprove(!autoApprove)}
            disabled={loading}
            type="button"
          >
            <div className={styles.toggleKnob} />
          </button>
          <span className={styles.toggleLabel}>
            {autoApprove ? t('communities.autoApproveOn') : t('communities.autoApproveOff')}
          </span>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.submitBtn}
          onClick={handleSave}
          disabled={loading || !name.trim() || name.trim().length < 3}
        >
          {loading ? t('common.saving') : t('communities.settingsSave')}
        </button>
      </div>
    </div>
  )
}

function RequestsSection({ communityID }: { communityID: string }) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const { data, isLoading, mutate } = useSWR<{ requests: CommunityJoinRequest[] }>(
    `/communities/${communityID}/join-requests`,
    () => listJoinRequests(communityID),
  )

  const handleApprove = async (requestID: string) => {
    try {
      await approveJoinRequest(communityID, requestID)
      toast({ type: 'success', title: t('communities.approved') })
      mutate()
    } catch (err: unknown) {
      toast({
        type: 'error',
        title: err instanceof Error ? err.message : t('communities.requestError'),
      })
    }
  }

  const handleReject = async (requestID: string) => {
    try {
      await rejectJoinRequest(communityID, requestID)
      toast({ type: 'success', title: t('communities.rejected') })
      mutate()
    } catch (err: unknown) {
      toast({
        type: 'error',
        title: err instanceof Error ? err.message : t('communities.requestError'),
      })
    }
  }

  if (isLoading) {
    return (
      <div className={styles.list}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={styles.skeletonItem}>
            <div className={styles.skeletonCircle} />
            <div className={styles.skeletonLine} style={{ flex: 1 }} />
          </div>
        ))}
      </div>
    )
  }

  const requests = data?.requests ?? []

  if (requests.length === 0) {
    return (
      <div className={styles.empty}>
        <i className={`bx bx-user-plus ${styles.emptyIcon}`} />
        <p>{t('communities.noJoinRequests')}</p>
      </div>
    )
  }

  return (
    <div className={styles.list}>
      {requests.map(req => (
        <div key={req.id} className={styles.requestItem}>
          <ExternalImage
            src={req.avatar_uri}
            alt={req.display_name}
            className={styles.avatar}
          />
          <div className={styles.info}>
            <div className={styles.name}>{req.display_name}</div>
            <div className={styles.meta}>
              {new Date(req.created_at).toLocaleDateString()}
            </div>
          </div>
          <div className={styles.requestActions}>
            <button
              className={styles.approveBtn}
              onClick={() => handleApprove(req.id)}
              title={t('communities.approve')}
            >
              <i className="bx bx-check" />
            </button>
            <button
              className={styles.rejectBtn}
              onClick={() => handleReject(req.id)}
              title={t('communities.reject')}
            >
              <i className="bx bx-x" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function CodesSection({ communityID }: { communityID: string }) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const { data, isLoading, mutate } = useSWR<{ invite_codes: CommunityInviteCode[] }>(
    `/communities/${communityID}/invite-codes`,
    () => listInviteCodes(communityID),
  )

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [maxUses, setMaxUses] = useState(0)
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    setCreating(true)
    try {
      await createInviteCode(communityID, maxUses || undefined)
      toast({ type: 'success', title: t('communities.codeCreated') })
      setShowCreateModal(false)
      setMaxUses(0)
      mutate()
    } catch (err: unknown) {
      toast({
        type: 'error',
        title: err instanceof Error ? err.message : t('communities.codeError'),
      })
    } finally {
      setCreating(false)
    }
  }

  const handleDeactivate = async (codeID: string) => {
    try {
      await deactivateInviteCode(communityID, codeID)
      toast({ type: 'success', title: t('communities.codeDeactivated') })
      mutate()
    } catch (err: unknown) {
      toast({
        type: 'error',
        title: err instanceof Error ? err.message : t('communities.codeError'),
      })
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast({ type: 'success', title: t('communities.codeCopied') })
  }

  if (isLoading) {
    return (
      <div className={styles.list}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={styles.skeletonItem}>
            <div className={styles.skeletonLine} style={{ width: '100px' }} />
            <div className={styles.skeletonLine} style={{ flex: 1 }} />
          </div>
        ))}
      </div>
    )
  }

  const codes = data?.invite_codes ?? []

  return (
    <div className={styles.codesSection}>
      <div className={styles.codesHeader}>
        <button className={styles.addBtn} onClick={() => setShowCreateModal(true)}>
          <i className="bx bx-plus" />
          {t('communities.createCode')}
        </button>
      </div>

      {codes.length === 0 ? (
        <div className={styles.empty}>
          <i className={`bx bx-key ${styles.emptyIcon}`} />
          <p>{t('communities.noCodes')}</p>
        </div>
      ) : (
        <div className={styles.list}>
          {codes.map(code => (
            <div key={code.id} className={styles.codeItem}>
              <div className={styles.codeInfo}>
                <div className={styles.codeValue}>{code.code}</div>
                <div className={styles.codeMeta}>
                  {code.used_count}/{code.max_uses || '∞'} · {new Date(code.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className={styles.codeActions}>
                <button
                  className={styles.copyBtn}
                  onClick={() => handleCopyCode(code.code)}
                  title={t('communities.copyCode')}
                >
                  <i className="bx bx-copy" />
                </button>
                {code.is_active && (
                  <button
                    className={styles.deactivateBtn}
                    onClick={() => handleDeactivate(code.id)}
                    title={t('communities.deactivate')}
                  >
                    <i className="bx bx-block" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setMaxUses(0)
        }}
        title={t('communities.createCode')}
        footer={
          <div className={styles.modalFooter}>
            <button
              className={styles.cancelBtn}
              onClick={() => {
                setShowCreateModal(false)
                setMaxUses(0)
              }}
              disabled={creating}
            >
              {t('common.cancel')}
            </button>
            <button
              className={styles.submitBtn}
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? t('common.creating') : t('communities.createCode')}
            </button>
          </div>
        }
      >
        <div className={styles.field}>
          <label className={styles.label}>{t('communities.codeMaxUses')}</label>
          <input
            className={styles.input}
            type="number"
            min={0}
            value={maxUses}
            onChange={e => setMaxUses(Number(e.target.value))}
            disabled={creating}
          />
        </div>
      </Modal>
    </div>
  )
}

function TransferSection({ communityID, onUpdate }: { communityID: string; onUpdate: () => void }) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [targetUserID, setTargetUserID] = useState('')
  const [keepAdmin, setKeepAdmin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleTransfer = async () => {
    if (!targetUserID.trim()) return

    setLoading(true)
    try {
      await transferOwnership(communityID, targetUserID.trim(), keepAdmin)
      toast({ type: 'success', title: t('communities.transferSuccess') })
      setShowConfirm(false)
      setTargetUserID('')
      onUpdate()
    } catch (err: unknown) {
      toast({
        type: 'error',
        title: err instanceof Error ? err.message : t('communities.transferError'),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.transferSection}>
      <div className={styles.transferWarning}>
        <i className="bx bx-error" />
        <p>{t('communities.transferConfirm')}</p>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>{t('communities.transferTo')}</label>
        <input
          className={styles.input}
          type="text"
          value={targetUserID}
          onChange={e => setTargetUserID(e.target.value)}
          placeholder={t('communities.transferToPlaceholder')}
          disabled={loading}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>{t('communities.keepAdmin')}</label>
        <div className={styles.toggleRow}>
          <button
            className={`${styles.toggle} ${keepAdmin ? styles.toggleActive : ''}`}
            onClick={() => setKeepAdmin(!keepAdmin)}
            disabled={loading}
            type="button"
          >
            <div className={styles.toggleKnob} />
          </button>
          <span className={styles.toggleLabel}>
            {keepAdmin ? t('communities.yes') : t('communities.no')}
          </span>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.dangerBtn}
          onClick={() => setShowConfirm(true)}
          disabled={loading || !targetUserID.trim()}
        >
          {t('communities.transferOwnership')}
        </button>
      </div>

      <Modal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title={t('communities.transferOwnership')}
        footer={
          <div className={styles.modalFooter}>
            <button
              className={styles.cancelBtn}
              onClick={() => setShowConfirm(false)}
              disabled={loading}
            >
              {t('common.cancel')}
            </button>
            <button
              className={styles.dangerBtn}
              onClick={handleTransfer}
              disabled={loading}
            >
              {loading ? t('common.saving') : t('communities.transferOwnership')}
            </button>
          </div>
        }
      >
        <p className={styles.confirmText}>{t('communities.transferWarning')}</p>
      </Modal>
    </div>
  )
}
