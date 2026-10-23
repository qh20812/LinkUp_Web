"use client";

import React, { useMemo, useState } from "react";
import useSWR from 'swr'
import { swrFetcher, invalidate } from '../../../api/swr'
import { useTranslation } from "../../../hooks/useTranslation";
import { useToast } from "../../../contexts/ToastContext";
import { cleanupRejectedMedia } from "../../../api/admin";
import type { AdminMediaItem, AdminMediaGroupedResponse, AdminMediaListResponse } from "../../../types";
import Pagination from "../../../components/Pagination";
import Modal from "../../../components/Modal";
import ExternalImage from '../../../components/ExternalImage'
import styles from "./Media.module.css";
import { toErrorMessage } from '../../../utils/errorMessage'

// Chỉ còn 2 tab: xem theo người dùng và media đã bị từ chối. Tab "bị gắn cờ"
// đã bỏ cùng với luồng AI moderation — nội dung vi phạm giờ xử lý qua report.
type TabType = "grouped" | "rejected";

export default function MediaPage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>("grouped");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [previewMedia, setPreviewMedia] = useState<AdminMediaItem | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [cleaning, setCleaning] = useState(false);
  const [brokenMedia, setBrokenMedia] = useState<Set<string>>(new Set());

  const mediaParams = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (searchKeyword) mediaParams.set('keyword', searchKeyword)
  let swrKey: string
  if (activeTab === 'grouped') {
    swrKey = `/admin/media/grouped?${mediaParams}`
  } else {
    mediaParams.set('status', 'rejected')
    swrKey = `/admin/media/flagged?${mediaParams}`
  }
  const { data: res, error, isLoading: loading } = useSWR(swrKey, (url: string) => swrFetcher<AdminMediaGroupedResponse | AdminMediaListResponse>(url))
  const groups = activeTab === 'grouped' ? (res as AdminMediaGroupedResponse | undefined)?.groups ?? [] : []
  const items = activeTab !== 'grouped' ? (res as AdminMediaListResponse | undefined)?.items ?? [] : []
  const total = res?.total ?? 0

  const tabs: { key: TabType; label: string }[] = useMemo(() => [
    { key: "grouped", label: t("media.tabGrouped") },
    { key: "rejected", label: t("media.tabRejected") },
  ], [t]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const formatDate = (value: string) => {
    try {
      return new Date(value).toLocaleString("vi-VN");
    } catch {
      return value;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "flagged":
        return styles.badgeFlagged;
      case "rejected":
        return styles.badgeRejected;
      case "approved":
        return styles.badgeApproved;
      default:
        return "";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "flagged":
        return t("media.flagged");
      case "rejected":
        return t("media.rejected");
      case "approved":
        return t("media.approved");
      default:
        return status;
    }
  };

  const isImage = (item: AdminMediaItem) =>
    item.file_type?.startsWith("image/");
  const isVideo = (item: AdminMediaItem) =>
    item.file_type?.startsWith("video/");

  const handleMediaError = (id: string) => {
    setBrokenMedia(prev => new Set(prev).add(id));
  };

  const renderPreview = (item: AdminMediaItem, className?: string) => {
    if (brokenMedia.has(item.id)) {
      return (
        <div className={className || styles.previewError}>
          <i className="bx bx-image-alt" />
          <span>{t("media.loadFailed")}</span>
        </div>
      );
    }
    if (isImage(item)) {
      return (
        <ExternalImage
          src={item.file_uri}
          alt=""
          onError={() => handleMediaError(item.id)}
          className={styles.previewImage}
        />
      );
    }
    if (isVideo(item)) {
      return (
        <video
          src={item.file_uri}
          className={styles.previewVideo}
          muted
          playsInline
          preload="metadata"
          onError={() => handleMediaError(item.id)}
        />
      );
    }
    return (
      <div className={styles.previewPlaceholder}>
        <i className="bx bx-file" />
      </div>
    );
  };

  const handleCleanup = async () => {
    if (!window.confirm(t("media.cleanupConfirm"))) return;
    setCleaning(true);
    try {
      const res = await cleanupRejectedMedia();
      toast({
        title: t("media.cleanupSuccess", { count: res.cleaned }),
        type: "success",
      });
      invalidate('/admin/media');
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : t("common.error"),
        type: "error",
      });
    } finally {
      setCleaning(false);
    }
  };

  const handleTabChange = (tab: TabType) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setPage(1);
  };

  const skeletonRows = () =>
    Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className={styles.skeletonRow}>
        <div className={styles.skeletonCheck} />
        <div className={styles.skeletonPreview} />
        <div className={styles.skeletonText} />
        <div className={styles.skeletonText} />
        <div className={styles.skeletonText} />
        <div className={styles.skeletonText} />
        <div className={styles.skeletonText} />
      </div>
    ));

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t("media.title")}</h1>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <i className="bx bx-search" />
            <input
              type="text"
              className={styles.searchInput}
              placeholder={activeTab === "grouped" ? t("media.searchByUser") : t("common.search")}
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ""}`}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.card}>
        {loading ? (
          <div className={styles.skeletonWrap}>{skeletonRows()}</div>
        ) : error ? (
          <div className={styles.empty}>
            <i className="bx bx-error-circle" />
            <p>{toErrorMessage(error)}</p>
          </div>
        ) : activeTab === "grouped" ? (
          groups.length === 0 ? (
            <div className={styles.empty}>
              <i className="bx bx-image-alt" />
              <p>{t("media.empty")}</p>
            </div>
          ) : (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{t("media.preview")}</th>
                      <th>{t("media.fileType")}</th>
                      <th>{t("media.status")}</th>
                      <th>{t("media.createdAt")}</th>
                      <th>{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((group) => (
                      <React.Fragment key={group.user_id}>
                        <tr className={styles.groupSeparatorRow}>
                          <td colSpan={5}>
                            <strong>{group.display_name || group.username}</strong>
                            <span className={styles.groupBadge}>
                              {t("media.totalMedia", { count: group.media.length })}
                            </span>
                          </td>
                        </tr>
                        {group.media.map((item) => (
                          <tr key={item.id} className={styles.clickableRow} onClick={() => setPreviewMedia(item)}>
                            <td>
                              <button
                                type="button"
                                className={styles.previewButton}
                                onClick={(e) => { e.stopPropagation(); setPreviewMedia(item); }}
                                aria-label={t("media.preview")}
                              >
                                {renderPreview(item)}
                              </button>
                            </td>
                            <td>
                              <div className={styles.fileMeta}>
                                <strong>{item.file_type || "unknown"}</strong>
                                <span>
                                  {(item.file_size / (1024 * 1024)).toFixed(2)} MB
                                </span>
                              </div>
                            </td>
                            <td>
                              <span
                                className={`${styles.badge} ${getStatusClass(item.status)}`}
                              >
                                {getStatusLabel(item.status)}
                              </span>
                            </td>
                            <td>{formatDate(item.created_at)}</td>
                            <td>
                              <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
                                <button
                                  className={styles.buttonSecondary}
                                  onClick={() => setPreviewMedia(item)}
                                >
                                  <i className="bx bx-show" />
                                  {t("media.preview")}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.footer}>
                <span className={styles.meta}>
                  {t("media.total", { count: total })}
                </span>
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onChange={setPage}
                />
              </div>
            </>
          )
        ) : items.length === 0 ? (
          <div className={styles.empty}>
            <i className="bx bx-image-alt" />
            <p>{t("media.empty")}</p>
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("media.preview")}</th>
                    <th>{t("media.fileType")}</th>
                    <th>{t("media.uploader")}</th>
                    <th>{t("media.status")}</th>
                    <th>{t("media.createdAt")}</th>
                    <th>{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className={styles.clickableRow} onClick={() => setPreviewMedia(item)}>
                      <td>
                        <div className={styles.previewCell}>
                          {renderPreview(item)}
                        </div>
                      </td>
                      <td>
                        <div className={styles.fileMeta}>
                          <strong>{item.file_type || "unknown"}</strong>
                          <span>
                            {(item.file_size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        </div>
                      </td>
                      <td>
                        {item.display_name || item.username || item.user_id || "—"}
                      </td>
                      <td>
                        <span
                          className={`${styles.badge} ${getStatusClass(item.status)}`}
                        >
                          {getStatusLabel(item.status)}
                        </span>
                      </td>
                      <td>{formatDate(item.created_at)}</td>
                      <td>
                        <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
                          <button
                            className={styles.buttonSecondary}
                            onClick={() => setPreviewMedia(item)}
                          >
                            <i className="bx bx-show" />
                            {t("media.preview")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.footer}>
              <span className={styles.meta}>
                {t("media.total", { count: total })}
              </span>
              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={setPage}
              />
              <button
                className={styles.buttonDanger}
                onClick={handleCleanup}
                disabled={cleaning}
              >
                <i className="bx bx-trash" />
                {cleaning ? t("common.loading") : t("media.cleanupRejected")}
              </button>
            </div>
          </>
        )}
      </div>

      <Modal
        open={Boolean(previewMedia)}
        onClose={() => setPreviewMedia(null)}
        title={t("media.preview")}
      >
        <div className={styles.previewModalContent}>
          {previewMedia && (
            previewMedia.id && brokenMedia.has(previewMedia.id) ? (
              <div className={styles.previewErrorLarge}>
                <i className="bx bx-image-alt" />
                <span>{t("media.loadFailed")}</span>
              </div>
            ) : isImage(previewMedia) ? (
              <ExternalImage
                src={previewMedia.file_uri}
                alt=""
                className={styles.previewModalImage}
                onError={() => handleMediaError(previewMedia.id)}
              />
            ) : isVideo(previewMedia) ? (
              <video
                src={previewMedia.file_uri}
                className={styles.previewModalVideo}
                controls
                playsInline
                onError={() => handleMediaError(previewMedia.id)}
              />
            ) : (
              <div className={styles.previewPlaceholderLarge}>
                <i className="bx bx-file" />
              </div>
            )
          )}

          {activeTab !== "grouped" && previewMedia && (
            <div className={styles.previewNav}>
              <button
                className={styles.previewNavButton}
                disabled={items.findIndex(i => i.id === previewMedia.id) <= 0}
                onClick={() => {
                  const idx = items.findIndex(i => i.id === previewMedia.id);
                  if (idx > 0) setPreviewMedia(items[idx - 1]);
                }}
              >
                <i className="bx bx-chevron-left" />
                {t("media.prev")}
              </button>
              <button
                className={styles.previewNavButton}
                disabled={items.findIndex(i => i.id === previewMedia.id) >= items.length - 1}
                onClick={() => {
                  const idx = items.findIndex(i => i.id === previewMedia.id);
                  if (idx < items.length - 1) setPreviewMedia(items[idx + 1]);
                }}
              >
                {t("media.next")}
                <i className="bx bx-chevron-right" />
              </button>
            </div>
          )}

          {previewMedia && (
            <div className={styles.previewMetaCard}>
              <div className={styles.previewMetaRow}>
                <span>{t("media.fileType")}</span>
                <strong>{previewMedia.file_type || "unknown"}</strong>
              </div>
              <div className={styles.previewMetaRow}>
                <span>{t("media.uploader")}</span>
                <strong>{previewMedia.display_name || previewMedia.username || previewMedia.user_id}</strong>
              </div>
              <div className={styles.previewMetaRow}>
                <span>{t("media.status")}</span>
                <strong>{getStatusLabel(previewMedia.status)}</strong>
              </div>
              <div className={styles.previewMetaRow}>
                <span>{t("media.createdAt")}</span>
                <strong>{formatDate(previewMedia.created_at)}</strong>
              </div>
              <div className={styles.previewMetaRow}>
                <span>{t("media.fileType")}</span>
                <strong>{(previewMedia.file_size / (1024 * 1024)).toFixed(2)} MB</strong>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
