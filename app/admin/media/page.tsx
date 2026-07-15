"use client";

import React, { useEffect, useState } from "react";
import { useTranslation } from "../../../hooks/useTranslation";
import { useToast } from "../../../contexts/ToastContext";
import {
  cleanupRejectedMedia,
  getFlaggedMedia,
  getMediaGroupedByUser,
  reviewMedia,
} from "../../../api/admin";
import type { AdminMediaGroupItem, AdminMediaItem } from "../../../types";
import Pagination from "../../../components/Pagination";
import Modal from "../../../components/Modal";
import styles from "./Media.module.css";

type MediaStatusFilter = "all" | "flagged" | "rejected";
type ReviewAction = "approve" | "reject";
type MediaMode = "all" | "flagged" | "rejected" | "grouped";

export default function MediaPage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [items, setItems] = useState<AdminMediaItem[]>([]);
  const [groups, setGroups] = useState<AdminMediaGroupItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [mode, setMode] = useState<MediaMode>("grouped");
  const [statusFilter, setStatusFilter] = useState<MediaStatusFilter>("all");
  const [previewMedia, setPreviewMedia] = useState<AdminMediaItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selectedMedia, setSelectedMedia] = useState<AdminMediaItem | null>(
    null,
  );
  const [reviewAction, setReviewAction] = useState<ReviewAction>("reject");
  const [reviewReason, setReviewReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadMedia = async () => {
      setLoading(true);
      setError(null);

      try {
        const normalizedStatus = statusFilter === "all" ? "" : statusFilter;

        if (mode === "grouped") {
          const res = await getMediaGroupedByUser(page, pageSize, statusFilter);
          if (!cancelled) {
            setGroups(res.groups ?? []);
            setTotal(res.total ?? 0);
          }
        } else {
          const res = await getFlaggedMedia(
            page,
            pageSize,
            mode === "all" ? normalizedStatus : mode,
          );
          if (!cancelled) {
            setItems(res.items ?? []);
            setTotal(res.total ?? 0);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("common.error"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadMedia();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, mode, statusFilter, refreshKey, t]);

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

  const resetReview = () => {
    setSelectedMedia(null);
    setReviewAction("reject");
    setReviewReason("");
    setSubmitting(false);
  };

  const handleReview = async () => {
    if (!selectedMedia) return;

    setSubmitting(true);
    try {
      await reviewMedia(selectedMedia.id, {
        action: reviewAction,
        reason: reviewReason || t("media.reviewDefaultReason"),
      });

      toast({
        title:
          reviewAction === "approve"
            ? t("media.approveSuccess")
            : t("media.rejectSuccess"),
        type: "success",
      });

      resetReview();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : t("common.error"),
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCleanup = async () => {
    setCleaning(true);
    try {
      const res = await cleanupRejectedMedia();
      toast({
        title: t("media.cleanupSuccess", { count: res.cleaned }),
        type: "success",
      });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : t("common.error"),
        type: "error",
      });
    } finally {
      setCleaning(false);
    }
  };

  const skeletonRows = () =>
    Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className={styles.skeletonRow}>
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
          <p className={styles.subtitle}>{t("media.subtitle")}</p>
        </div>

        <div className={styles.toolbar}>
          <select
            className={styles.filterSelect}
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as MediaMode);
              setPage(1);
              setError(null);
            }}>
            <option value="all">{t("media.all")}</option>
            <option value="flagged">{t("media.flagged")}</option>
            <option value="rejected">{t("media.rejected")}</option>
            <option value="grouped">{t("media.groupByUser")}</option>
          </select>

          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as MediaStatusFilter);
              setPage(1);
              setError(null);
            }}>
            <option value="all">{t("media.all")}</option>
            <option value="flagged">{t("media.flagged")}</option>
            <option value="rejected">{t("media.rejected")}</option>
          </select>

          <button
            className={styles.buttonSecondary}
            onClick={() => setRefreshKey((k) => k + 1)}>
            {t("Tải lại trang")}
          </button>

          <button
            className={styles.buttonSecondary}
            onClick={handleCleanup}
            disabled={cleaning}>
            {cleaning ? t("common.loading") : t("media.cleanupRejected")}
          </button>
        </div>
      </div>

      <div className={styles.card}>
        {loading ? (
          <div className={styles.skeletonWrap}>{skeletonRows()}</div>
        ) : error ? (
          <div className={styles.empty}>
            <i className="bx bx-error-circle" />
            <p>{error}</p>
          </div>
        ) : mode === "grouped" ? (
          groups.length === 0 ? (
            <div className={styles.empty}>
              <i className="bx bx-image-alt" />
              <p>{t("media.empty")}</p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.user_id} className={styles.groupCard}>
                <div className={styles.groupHeader}>
                  <div>
                    <strong>{group.display_name || group.username}</strong>
                    <div className={styles.groupMeta}>{group.user_id}</div>
                  </div>
                  <div className={styles.groupMeta}>
                    {t("media.totalMedia", { count: group.media.length })}
                  </div>
                </div>

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
                      {group.media.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <button
                              type="button"
                              className={styles.previewButton}
                              onClick={() => setPreviewMedia(item)}
                              aria-label={t("media.preview")}>
                              {isImage(item) ? (
                                <img
                                  src={item.file_uri}
                                  alt={item.id}
                                  className={styles.previewImage}
                                />
                              ) : isVideo(item) ? (
                                <video
                                  src={item.file_uri}
                                  className={styles.previewVideo}
                                  muted
                                  playsInline
                                  preload="metadata"
                                />
                              ) : (
                                <div className={styles.previewPlaceholder}>
                                  <i className="bx bx-file" />
                                </div>
                              )}
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
                              className={`${styles.badge} ${getStatusClass(
                                item.status,
                              )}`}>
                              {getStatusLabel(item.status)}
                            </span>
                          </td>
                          <td>{formatDate(item.created_at)}</td>
                          <td>
                            <div className={styles.actions}>
                              <button
                                className={styles.buttonPrimary}
                                onClick={() => {
                                  setSelectedMedia(item);
                                  setReviewAction("approve");
                                  setReviewReason("");
                                }}>
                                {t("media.approve")}
                              </button>
                              <button
                                className={styles.buttonDanger}
                                onClick={() => {
                                  setSelectedMedia(item);
                                  setReviewAction("reject");
                                  setReviewReason("");
                                }}>
                                {t("media.reject")}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
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
                    <th>{t("media.status")}</th>
                    <th>{t("media.createdAt")}</th>
                    <th>{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className={styles.previewCell}>
                          {isImage(item) ? (
                            <img
                              src={item.file_uri}
                              alt={item.id}
                              className={styles.previewImage}
                            />
                          ) : isVideo(item) ? (
                            <video
                              src={item.file_uri}
                              className={styles.previewVideo}
                              controls
                            />
                          ) : (
                            <div className={styles.previewPlaceholder}>
                              <i className="bx bx-file" />
                            </div>
                          )}
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
                        <span
                          className={`${styles.badge} ${getStatusClass(
                            item.status,
                          )}`}>
                          {getStatusLabel(item.status)}
                        </span>
                      </td>
                      <td>{formatDate(item.created_at)}</td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            className={styles.buttonPrimary}
                            onClick={() => {
                              setSelectedMedia(item);
                              setReviewAction("approve");
                              setReviewReason("");
                            }}>
                            {t("media.approve")}
                          </button>
                          <button
                            className={styles.buttonDanger}
                            onClick={() => {
                              setSelectedMedia(item);
                              setReviewAction("reject");
                              setReviewReason("");
                            }}>
                            {t("media.reject")}
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
            </div>
          </>
        )}
      </div>

      <Modal
        open={Boolean(previewMedia)}
        onClose={() => setPreviewMedia(null)}
        title={t("media.preview")}>
        <div className={styles.previewModalContent}>
          {previewMedia && isImage(previewMedia) ? (
            <img
              src={previewMedia.file_uri}
              alt={previewMedia.id}
              className={styles.previewModalImage}
            />
          ) : previewMedia && isVideo(previewMedia) ? (
            <video
              src={previewMedia.file_uri}
              className={styles.previewModalVideo}
              controls
              playsInline
            />
          ) : (
            <div className={styles.previewPlaceholderLarge}>
              <i className="bx bx-file" />
            </div>
          )}

          {previewMedia && (
            <div className={styles.previewMetaCard}>
              <div className={styles.previewMetaRow}>
                <span>{t("media.fileType")}</span>
                <strong>{previewMedia.file_type || "unknown"}</strong>
              </div>
              <div className={styles.previewMetaRow}>
                <span>{t("media.status")}</span>
                <strong>{getStatusLabel(previewMedia.status)}</strong>
              </div>
              <div className={styles.previewMetaRow}>
                <span>{t("media.createdAt")}</span>
                <strong>{formatDate(previewMedia.created_at)}</strong>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={Boolean(selectedMedia)}
        onClose={resetReview}
        title={t("media.reviewTitle")}>
        <div className={styles.modalBody}>
          <p className={styles.modalHint}>{t("media.reviewHint")}</p>

          <div className={styles.radioGroup}>
            <label
              className={`${styles.radio} ${
                reviewAction === "approve" ? styles.radioActive : ""
              }`}>
              <input
                type="radio"
                name="reviewAction"
                checked={reviewAction === "approve"}
                onChange={() => setReviewAction("approve")}
              />
              <span>{t("media.approve")}</span>
            </label>

            <label
              className={`${styles.radio} ${
                reviewAction === "reject" ? styles.radioActive : ""
              }`}>
              <input
                type="radio"
                name="reviewAction"
                checked={reviewAction === "reject"}
                onChange={() => setReviewAction("reject")}
              />
              <span>{t("media.reject")}</span>
            </label>
          </div>

          <textarea
            className={styles.textarea}
            rows={5}
            value={reviewReason}
            onChange={(e) => setReviewReason(e.target.value)}
            placeholder={t("media.reasonPlaceholder")}
          />

          <div className={styles.modalActions}>
            <button className={styles.buttonSecondary} onClick={resetReview}>
              {t("common.cancel")}
            </button>
            <button
              className={styles.buttonPrimary}
              onClick={handleReview}
              disabled={submitting}>
              {submitting ? t("common.loading") : t("media.confirmReview")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
