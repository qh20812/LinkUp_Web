"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import useSWR from "swr";
import { useTranslation } from "../hooks/useTranslation";
import { useTheme } from "../hooks/useTheme";
import { useToast } from "../contexts/ToastContext";
  import { changePassword, logout } from "../api/auth";
  import { getAdminProfile } from "../api/admin";
  import { clearSession } from "../api/api";
import styles from "./AdminNavbar.module.css";
import { useNotification } from "../contexts/NotificationContext";
import NotificationDropdown from "./NotificationDropdown";

interface AdminNavbarProps {
  onMenuToggle: () => void;
}

export default function AdminNavbar({ onMenuToggle }: AdminNavbarProps) {
  const { t, language, setLanguage } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const pathname = usePathname();
  const [searchOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const { unreadCount } = useNotification();

  const [cachedProfile, setCachedProfile] = useState<Record<string, string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("admin_profile");
        if (cached) return JSON.parse(cached);
      } catch { /* ignore */ }
    }
    return {};
  });

  const { data: profile } = useSWR('/profile', getAdminProfile, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  useEffect(() => {
    if (profile?.avatar_uri) {
      const data = {
        avatar_uri: profile.avatar_uri,
        display_name: profile.display_name,
      };
      localStorage.setItem('admin_profile', JSON.stringify(data));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCachedProfile(data);
    }
  }, [profile?.avatar_uri, profile?.display_name]);

  const [tokenEmail] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const token = localStorage.getItem("token");
        if (token) {
          const payload = JSON.parse(atob(token.split(".")[1]));
          return payload.email || "";
        }
      } catch { /* ignore */ }
    }
    return "";
  });

  // đóng khi nhấn ra vùng ngoài (click outside) cho thông báo
  useEffect(() => {
    if (!notifOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [notifOpen]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setDropdownOpen(false);
    setNotifOpen(false);
    setShowPasswordModal(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [pathname]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [dropdownOpen]);

  const router = useRouter();

  const handleLogout = async () => {
    await logout().catch(() => {});
    clearSession();
    router.push('/login');
  };

  const handleSubmitPassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      toast({ title: t("common.error"), type: "error" });
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword(oldPassword, newPassword);
      toast({ title: t("common.passwordChanged"), type: "success" });
      setShowPasswordModal(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : t("common.error"),
        type: "error",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <nav className={styles.nav}>
      <i className={`bx bx-menu ${styles.menuBtn}`} onClick={onMenuToggle} />

      <form
        className={`${styles.searchForm}${searchOpen ? ` ${styles.show}` : ""}`}
        onSubmit={(e) => e.preventDefault()}>
        <div className={styles.formInput}>
          <input type="search" placeholder={t("common.search")} readOnly />
          <button className={styles.searchBtn} type="submit">
            <i className="bx bx-search" />
          </button>
        </div>
      </form>

      <div className={styles.toggleGroup} suppressHydrationWarning>
        <button
          className={`${styles.toggleBtn}${
            language === "vi" ? ` ${styles.toggleActive}` : ""
          }`}
          onClick={() => setLanguage("vi")}
          suppressHydrationWarning>
          VI
        </button>
        <button
          className={`${styles.toggleBtn}${
            language === "en" ? ` ${styles.toggleActive}` : ""
          }`}
          onClick={() => setLanguage("en")}
          suppressHydrationWarning>
          EN
        </button>
      </div>

      <button
        className={styles.iconBtn}
        onClick={toggleTheme}
        aria-label="Toggle theme">
        <i className={`bx ${theme === "light" ? "bx-moon" : "bx-sun"}`} />
      </button>

      <div className={styles.notifWrap} ref={notifRef}>
        <button
          className={styles.notif}
          aria-label="Notifications"
          onClick={() => {
            setNotifOpen(!notifOpen);
            setDropdownOpen(false); 
          }}>
          <i className="bx bx-bell" />
          {unreadCount > 0 && (
            <span className={styles.notifBadge}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
        {notifOpen && (
          <NotificationDropdown onClose={() => setNotifOpen(false)} />
        )}
      </div>

      <div className={styles.profileWrap} ref={dropdownRef}>
        <button
          className={styles.profile}
          aria-label="Profile"
          onClick={() => setDropdownOpen(!dropdownOpen)}>
          <Image
            src={profile?.avatar_uri || cachedProfile.avatar_uri || "/S-Logo.png"}
            alt="Profile"
            width={36}
            height={36}
            priority
          />
          <div className={styles.userInfo}>
            <span className={styles.userName}>{profile?.display_name || cachedProfile.display_name || "Admin"}</span>
            <span className={styles.userEmail}>{tokenEmail}</span>
          </div>
          <i className={`bx bx-chevron-down ${styles.profileChevron}`} />
        </button>

        {dropdownOpen && (
          <div className={styles.dropdown}>
            <Link href="/admin/profile" className={styles.dropdownItem}>
              <i className="bx bx-user-circle" />
              <span>{t("nav.profile")}</span>
            </Link>
            <button
              className={styles.dropdownItem}
              onClick={() => {
                setDropdownOpen(false);
                setShowPasswordModal(true);
              }}>
              <i className="bx bx-lock-alt" />
              <span>{t("nav.changePassword")}</span>
            </button>
            <div className={styles.dropdownDivider} />
            <button
              className={`${styles.dropdownItem} ${styles.dropdownDanger}`}
              onClick={handleLogout}>
              <i className="bx bx-log-out-circle" />
              <span>{t("nav.logout")}</span>
            </button>
          </div>
        )}
      </div>

      {showPasswordModal && (
        <div
          className={styles.overlay}
          onClick={() => setShowPasswordModal(false)}>
          <div
            className={styles.passwordModal}
            onClick={(e) => e.stopPropagation()}>
            <div className={styles.passwordModalHeader}>
              <h3>{t("nav.changePassword")}</h3>
              <button
                className={styles.passwordModalClose}
                onClick={() => setShowPasswordModal(false)}>
                <i className="bx bx-x" />
              </button>
            </div>
            <div className={styles.passwordModalBody}>
              <input
                type="password"
                className={styles.passwordInput}
                placeholder={t("common.oldPassword")}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
              <input
                type="password"
                className={styles.passwordInput}
                placeholder={t("common.newPassword")}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <input
                type="password"
                className={styles.passwordInput}
                placeholder={t("common.confirmPassword")}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <div className={styles.passwordModalFooter}>
              <button
                className={styles.passwordBtnCancel}
                onClick={() => setShowPasswordModal(false)}>
                {t("common.cancel")}
              </button>
              <button
                className={styles.passwordBtnSubmit}
                disabled={
                  !oldPassword ||
                  !newPassword ||
                  !confirmPassword ||
                  changingPassword
                }
                onClick={handleSubmitPassword}>
                {changingPassword ? t("common.loading") : t("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
