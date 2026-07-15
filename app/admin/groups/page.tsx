"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "../../../hooks/useTranslation";
import { useToast } from "../../../contexts/ToastContext";
import {
  getGroups,
  hideGroup,
  unhideGroup,
  archiveGroup,
  warnGroup,
  deleteGroup,
} from "../../../api/admin";
import styles from "./Groups.module.css";

export default function GroupsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [warnModalOpen, setWarnModalOpen] = useState(false);
  const [warnReason, setWarnReason] = useState("");
  const [groupToWarn, setGroupToWarn] = useState<string | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getGroups(page, pageSize, debouncedSearch);
      setGroups(response.groups || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [page, debouncedSearch]);

  const handleToggleStatus = async (group: any) => {
    setActionLoading(true);
    try {
      const isHidden = group.status === "hidden";
      if (isHidden) {
        await unhideGroup(group.id as string, {
          reason: "Hiển thị lại nhóm chat",
        });
      } else {
        await hideGroup(group.id as string, {
          reason: "Ẩn nhóm chat do vi phạm",
        });
      }
      toast({
        title: t("common.save") || "Cập nhật thành công",
        type: "success",
      });
      fetchGroups();
      if (selectedGroup?.id === group.id) {
        setSelectedGroup({
          ...selectedGroup,
          status: isHidden ? "active" : "hidden",
        });
      }
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : t("common.error"),
        type: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchiveGroup = async (group: any) => {
    if (!window.confirm(`Bạn có chắc chắn muốn lưu trữ nhóm "${group.name}"?`))
      return;
    setActionLoading(true);
    try {
      await archiveGroup(group.id as string, {
        reason: "Lưu trữ nhóm theo yêu cầu",
      });
      toast({ title: "Đã lưu trữ nhóm thành công", type: "success" });
      fetchGroups();
      if (selectedGroup?.id === group.id) {
        setSelectedGroup({ ...selectedGroup, status: "archived" });
      }
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : t("common.error"),
        type: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const openWarnModal = (id: string) => {
    setGroupToWarn(id);
    setWarnReason("");
    setWarnModalOpen(true);
  };

  const handleConfirmWarn = async () => {
    if (!groupToWarn || !warnReason.trim()) return;

    setActionLoading(true);
    try {
      await warnGroup(groupToWarn, { reason: warnReason } as any);

      toast({
        title: "Gửi cảnh báo đến nhóm chat thành công",
        type: "success",
      });
      setWarnModalOpen(false);
      fetchGroups();
      if (selectedGroup?.id === groupToWarn) {
        setSelectedGroup({ ...selectedGroup, status: "warned" });
      }
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : t("common.error"),
        type: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const openDeleteModal = (id: string) => {
    setGroupToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!groupToDelete) return;
    setActionLoading(true);
    try {
      await deleteGroup(groupToDelete!, {
        reason: "Xóa vĩnh viễn do vi phạm điều khoản hệ thống",
      });
      toast({ title: "Đã xóa nhóm chat vĩnh viễn", type: "success" });
      setDeleteModalOpen(false);
      setSelectedGroup(null);
      fetchGroups();
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : t("common.error"),
        type: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const formatDateTime = (iso: string): string => {
    try {
      const d = new Date(iso);
      return `${d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })}`;
    } catch {
      return iso;
    }
  };

  const getStatusClass = (status: string) => {
    const map: Record<string, string> = {
      active: styles.badgeActive,
      archived: styles.badgeArchived,
      hidden: styles.badgeHidden,
      warned: styles.badgeWarned,
    };
    return map[status] ?? styles.badgeActive;
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      active: "Hoạt động",
      archived: "Lưu trữ",
      hidden: "Đã ẩn",
      warned: "Cảnh báo",
    };
    return map[status] ?? status;
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Quản lý nhóm chat</h1>
        <div className={styles.searchBar}>
          <i className="bx bx-search" />
          <input
            type="text"
            placeholder={t("common.search") || "Tìm kiếm nhóm..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      {error && (
        <div className={styles.errorCard}>
          <i className="bx bx-error-circle" />
          <p>{error}</p>
        </div>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.mainTable}>
          <thead>
            <tr>
              <th>Nhóm chat</th>
              <th>Người tạo (Creator)</th>
              <th>Thành viên</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className={styles.skeletonRow}>
                  <td colSpan={6}>
                    <div className={styles.skeletonBar} />
                  </td>
                </tr>
              ))
            ) : groups.length > 0 ? (
              groups.map((group) => (
                <tr key={group.id}>
                  {/* CỘT 1: Nhóm chat */}
                  <td>
                    <div className={styles.groupInfoCell}>
                      <div className={styles.groupAvatar}>
                        {group.avatar_url ? (
                          <img src={group.avatar_url} alt={group.name} />
                        ) : (
                          <div className={styles.avatarPlaceholder}>
                            <i className="bx bx-group" />
                          </div>
                        )}
                      </div>
                      <div className={styles.groupMeta}>
                        <span className={styles.groupName}>
                          {group.name || "Nhóm chưa đặt tên"}
                        </span>
                        <span className={styles.groupId}>
                          ID: {group.id?.substring(0, 8)}...
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* CỘT 2: Người tạo */}
                  <td>
                    <div className={styles.creatorCell}>
                      <span className={styles.creatorName}>
                        {group.creator_name || "Hệ thống"}
                      </span>
                      <span className={styles.creatorId}>
                        ID: {group.creator_id?.substring(0, 6)}...
                      </span>
                    </div>
                  </td>

                  {/* CỘT 3: Thành viên */}
                  <td>
                    <div className={styles.memberCount}>
                      <i className="bx bx-user" /> {group.members_count ?? 0}
                    </div>
                  </td>

                  {/* CỘT 4: Trạng thái */}
                  <td>
                    <div className={styles.badgeWrapper}>
                      <span
                        className={`${styles.badge} ${getStatusClass(
                          group.status
                        )}`}>
                        {getStatusLabel(group.status)}
                      </span>
                    </div>
                  </td>

                  {/* CỘT 5: Ngày tạo */}
                  <td>
                    <div className={styles.dateCell}>
                      {formatDateTime(group.created_at)}
                    </div>
                  </td>

                  {/* CỘT 6: Hành động */}
                  <td>
                    <div className={styles.actionButtons}>
                      <button
                        className={styles.btnView}
                        onClick={() => setSelectedGroup(group)}
                        title="Xem chi tiết">
                        <i className="bx bx-show" />
                      </button>
                      <button
                        className={
                          group.status === "hidden"
                            ? styles.btnUnhide
                            : styles.btnHide
                        }
                        onClick={() => handleToggleStatus(group)}
                        disabled={actionLoading}
                        title={
                          group.status === "hidden" ? "Hiện nhóm" : "Ẩn nhóm"
                        }>
                        <i
                          className={
                            group.status === "hidden"
                              ? "bx bx-lock-open-alt"
                              : "bx bx-lock-alt"
                          }
                        />
                      </button>
                      <button
                        className={styles.btnArchive}
                        onClick={() => handleArchiveGroup(group)}
                        disabled={group.status === "archived" || actionLoading}
                        title="Lưu trữ nhóm">
                        <i className="bx bx-archive" />
                      </button>
                      <button
                        className={styles.btnWarn}
                        onClick={() => openWarnModal(group.id)}
                        disabled={actionLoading}
                        title="Cảnh báo vi phạm">
                        <i className="bx bx-error-circle" />
                      </button>
                      <button
                        className={styles.btnDelete}
                        onClick={() => openDeleteModal(group.id)}
                        disabled={actionLoading}
                        title="Xóa vĩnh viễn">
                        <i className="bx bx-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className={styles.emptyCell}>
                  Không tìm thấy nhóm chat nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <button
          disabled={page === 1 || loading}
          onClick={() => setPage((p) => Math.max(p - 1, 1))}>
          <i className="bx bx-chevron-left" /> Previous
        </button>
        <span className={styles.pageIndicator}>Trang {page}</span>
        <button
          disabled={groups.length < pageSize || loading}
          onClick={() => setPage((p) => p + 1)}>
          Next <i className="bx bx-chevron-right" />
        </button>
      </div>

      {selectedGroup && (
        <div className={styles.overlay} onClick={() => setSelectedGroup(null)}>
          <div
            className={styles.modalDetail}
            onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Chi tiết nhóm chat</h3>
              <button
                className={styles.modalClose}
                onClick={() => setSelectedGroup(null)}>
                <i className="bx bx-x" />
              </button>
            </div>

            <div className={styles.modalBodyGrid}>
              <div className={styles.modalColLeft}>
                <div className={styles.groupHeaderDetail}>
                  <div className={styles.groupAvatarLarge}>
                    {selectedGroup.avatar_url ? (
                      <img
                        src={selectedGroup.avatar_url}
                        alt={selectedGroup.name}
                      />
                    ) : (
                      <i className="bx bx-group" />
                    )}
                  </div>
                  <div>
                    <h2 className={styles.detailTitle}>
                      {selectedGroup.name || "Nhóm chưa đặt tên"}
                    </h2>
                    <p className={styles.detailDesc}>
                      {selectedGroup.description ||
                        "Không có mô tả cho nhóm chat này."}
                    </p>
                  </div>
                </div>

                <div className={styles.sectionDivider} />

                <h4 className={styles.sectionSubTitle}>
                  Thành viên quản trị nhóm
                </h4>
                <div className={styles.adminList}>
                  <div className={styles.adminMemberItem}>
                    <i className="bx bx-crown" style={{ color: "#ffb300" }} />
                    <div>
                      <strong>
                        {selectedGroup.creator_name || "Hệ thống"}
                      </strong>{" "}
                      (Người tạo nhóm)
                      <div>ID: {selectedGroup.creator_id}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.modalColRight}>
                <div className={styles.infoCard}>
                  <h4>
                    <i className="bx bx-info-circle" /> Thông tin hệ thống
                  </h4>
                  <div className={styles.infoRow}>
                    <span>Nhóm ID:</span>
                    <code>{selectedGroup.id}</code>
                  </div>
                  <div className={styles.infoRow}>
                    <span>Ngày khởi tạo:</span>
                    <span>{formatDateTime(selectedGroup.created_at)}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span>Trạng thái:</span>
                    <span
                      className={`${styles.badge} ${getStatusClass(
                        selectedGroup.status
                      )}`}>
                      {getStatusLabel(selectedGroup.status)}
                    </span>
                  </div>
                </div>

                <div className={styles.infoCard}>
                  <h4>
                    <i className="bx bx-bar-chart-alt-2" /> Thống kê hoạt động
                  </h4>
                  <div className={styles.statsMetricsGrid}>
                    <div className={styles.metricItem}>
                      <i
                        className="bx bx-user"
                        style={{ color: "var(--color-primary)" }}
                      />
                      <div className={styles.metricVal}>
                        {selectedGroup.members_count ?? 0}
                      </div>
                      <div className={styles.metricLabel}>Thành viên</div>
                    </div>
                    <div className={styles.metricItem}>
                      <i
                        className="bx bx-message-rounded-dots"
                        style={{ color: "#2db7f5" }}
                      />
                      <div className={styles.metricVal}>
                        {selectedGroup.messages_count ?? 0}
                      </div>
                      <div className={styles.metricLabel}>Tin nhắn</div>
                    </div>
                    <div className={styles.metricItem}>
                      <i className="bx bx-file" style={{ color: "#722ed1" }} />
                      <div className={styles.metricVal}>
                        {selectedGroup.files_count ?? 0}
                      </div>
                      <div className={styles.metricLabel}>Tài liệu chia sẻ</div>
                    </div>
                    <div className={styles.metricItem}>
                      <i className="bx bx-error" style={{ color: "#ff4d4f" }} />
                      <div className={styles.metricVal}>
                        {selectedGroup.reports_count ?? 0}
                      </div>
                      <div className={styles.metricLabel}>Báo cáo vi phạm</div>
                    </div>
                  </div>
                </div>

                <div className={styles.quickActions}>
                  <button
                    className={
                      selectedGroup.status === "hidden"
                        ? styles.btnActionActive
                        : styles.btnActionWarning
                    }
                    onClick={() => handleToggleStatus(selectedGroup)}
                    disabled={actionLoading}>
                    <i
                      className={
                        selectedGroup.status === "hidden"
                          ? "bx bx-lock-open-alt"
                          : "bx bx-lock-alt"
                      }
                    />
                    {selectedGroup.status === "hidden"
                      ? "Hiển thị lại nhóm chat"
                      : "Ẩn nhóm chat này"}
                  </button>
                  <button
                    className={styles.btnActionArchive}
                    onClick={() => handleArchiveGroup(selectedGroup)}
                    disabled={
                      selectedGroup.status === "archived" || actionLoading
                    }>
                    <i className="bx bx-archive" />
                    Lưu trữ nhóm chat
                  </button>
                  <div className={styles.actionSplitGrid}>
                    <button
                      className={styles.btnActionWarn}
                      onClick={() => openWarnModal(selectedGroup.id)}
                      disabled={actionLoading}>
                      <i className="bx bx-bell" /> Cảnh cáo
                    </button>
                    <button
                      className={styles.btnActionDanger}
                      onClick={() => openDeleteModal(selectedGroup.id)}
                      disabled={actionLoading}>
                      <i className="bx bx-trash" /> Xóa vĩnh viễn
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {warnModalOpen && (
        <div className={styles.overlay} onClick={() => setWarnModalOpen(false)}>
          <div
            className={styles.actionFormModal}
            onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Cảnh báo vi phạm nhóm chat</h3>
              <button
                className={styles.modalClose}
                onClick={() => setWarnModalOpen(false)}>
                <i className="bx bx-x" />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalDescText}>
                Nhập lý do gửi cảnh báo vi phạm. Hệ thống sẽ gửi thông báo trực
                tiếp đến các thành viên trong nhóm chat.
              </p>
              <textarea
                placeholder="Ví dụ: Nhóm chat của bạn chứa nội dung spam, quảng cáo trái phép..."
                className={styles.modalTextarea}
                value={warnReason}
                onChange={(e) => setWarnReason(e.target.value)}
                rows={4}
              />
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.btnCancel}
                onClick={() => setWarnModalOpen(false)}
                disabled={actionLoading}>
                Quay lại
              </button>
              <button
                className={styles.btnSubmitWarn}
                onClick={handleConfirmWarn}
                disabled={!warnReason.trim() || actionLoading}>
                {actionLoading ? "Đang gửi..." : "Gửi cảnh báo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModalOpen && (
        <div
          className={styles.overlay}
          onClick={() => setDeleteModalOpen(false)}>
          <div
            className={styles.actionFormModal}
            onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 style={{ color: "var(--color-danger)" }}>
                ⚠️ Xác nhận xóa vĩnh viễn
              </h3>
              <button
                className={styles.modalClose}
                onClick={() => setDeleteModalOpen(false)}>
                <i className="bx bx-x" />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalDescText}>
                Hành động này <strong>không thể khôi phục</strong>. Toàn bộ lịch
                sử tin nhắn, hình ảnh và thành viên trong nhóm chat này sẽ bị
                xóa sạch khỏi hệ thống LinkUp.
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.btnCancel}
                onClick={() => setDeleteModalOpen(false)}
                disabled={actionLoading}>
                Hủy bỏ
              </button>
              <button
                className={styles.btnConfirmDelete}
                onClick={handleConfirmDelete}
                disabled={actionLoading}>
                {actionLoading ? "Đang xóa..." : "Đồng ý xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
