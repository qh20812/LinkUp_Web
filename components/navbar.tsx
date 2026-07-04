"use client";

import Link from "next/link";
import Button from "./ui/button";

function Navbar() {
  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-outline-variant/50 px-4 md:px-10 py-3 bg-surface">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2 text-on-surface">
          <svg
            className="size-6 text-primary"
            fill="none"
            viewBox="0 0 48 48"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M44 11.2727C44 14.0109 39.8386 16.3957 33.69 17.6364C39.8386 18.877 44 21.2618 44 24C44 26.7382 39.8386 29.123 33.69 30.3636C39.8386 31.6043 44 33.9891 44 36.7273C44 40.7439 35.0457 44 24 44C12.9543 44 4 40.7439 4 36.7273C4 33.9891 8.16144 31.6043 14.31 30.3636C8.16144 29.123 4 26.7382 4 24C4 21.2618 8.16144 18.877 14.31 17.6364C8.16144 16.3957 4 14.0109 4 11.2727C4 7.25611 12.9543 4 24 4C35.0457 4 44 7.25611 44 11.2727Z"
              fill="currentColor"
            />
          </svg>
          <h2 className="text-on-surface text-lg font-bold leading-tight tracking-[-0.015em] font-display">
            LinkUp
          </h2>
        </div>
        <div className="hidden md:flex items-center gap-9">
          <Link
            href="/"
            className="text-on-surface text-sm font-medium leading-normal hover:text-primary transition-colors"
          >
            Trang chủ
          </Link>
          <Link
            href="/features"
            className="text-on-surface text-sm font-medium leading-normal hover:text-primary transition-colors"
          >
            Tính năng
          </Link>
          <Link
            href="/community"
            className="text-on-surface text-sm font-medium leading-normal hover:text-primary transition-colors"
          >
            Cộng đồng
          </Link>
          <Link
            href="/about"
            className="text-on-surface text-sm font-medium leading-normal hover:text-primary transition-colors"
          >
            Giới thiệu
          </Link>
        </div>
      </div>
      <div className="flex flex-1 justify-end gap-4 md:gap-8">
        {/* <label className="hidden lg:flex flex-col min-w-40 max-w-64 h-10">
          <div className="flex w-full flex-1 items-stretch rounded-lg h-full">
            <div className="text-on-surface-variant flex bg-surface-container items-center justify-center pl-4 rounded-l-lg">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </div>
            <input
              className="flex w-full min-w-0 flex-1 rounded-r-lg text-on-surface bg-surface-container h-full placeholder:text-on-surface-variant/50 px-4 text-base font-normal leading-normal border-none focus:outline-none"
              placeholder="Search friends"
            />
          </div>
        </label> */}
        <Button variant="primary" children="Tải ngay" />
        <Link href="/login"><Button variant="outline" children="Đăng nhập" /></Link>
      </div>
    </header>
  );
}

export default Navbar;
