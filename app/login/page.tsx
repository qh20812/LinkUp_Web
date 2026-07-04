"use client";

import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Label from "@/components/ui/label";

function LoginPage() {
  return (
    <>
      <div className="w-full max-w-[440px] rounded-xl p-xl shadow-lg relative z-10 animate-fade-in-up bg-surface-container-lowest/80 backdrop-blur-md border border-outline-variant/30">
        <div className="flex flex-col items-center text-center mb-xl">
          <div className="w-12 h-12 bg-primary-container rounded-lg flex items-center justify-center mb-md shadow-sm">
            <span
              className="material-symbols-outlined text-on-primary-container"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              admin_panel_settings
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">
            Chào mừng trở lại, Quản trị viên
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Đăng nhập an toàn vào hệ sinh thái LinkUp
          </p>
        </div>

        <form className="space-y-lg" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-xs">
            <Label htmlFor="email">Địa chỉ Email</Label>
            <Input
              id="email"
              type="email"
              leadingIcon="mail"
              placeholder="admin@linkup.io"
            />
          </div>

          <div className="space-y-xs">
            <div className="flex justify-between items-end">
              <Label htmlFor="password">Mật khẩu</Label>
              <a
                className="font-body-sm text-body-sm text-primary hover:underline"
                href="#"
              >
                Quên mật khẩu?
              </a>
            </div>
            <Input
              id="password"
              type="password"
              leadingIcon="lock"
              placeholder="••••••••••••"
            />
          </div>

          {/* <div className="flex items-center gap-sm">
            <input
              className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/20"
              id="remember"
              type="checkbox"
            />
            <label
              className="font-body-sm text-body-sm text-on-surface-variant select-none cursor-pointer"
              htmlFor="remember"
            >
              Duy trì đăng nhập 30 ngày
            </label>
          </div> */}

          <Button type="submit" fullWidth trailingIcon="arrow_forward" size="lg">
            Đăng nhập
          </Button>
        </form>

        <div className="mt-xl">
          <div className="relative flex items-center gap-md mb-lg">
            <div className="flex-grow h-px bg-outline-variant" />
            <span className="font-label-md text-label-md text-outline">
              HOẶC ĐĂNG NHẬP BẰNG
            </span>
            <div className="flex-grow h-px bg-outline-variant" />
          </div>
          <div className="grid grid-cols-1 gap-md">
            <Button variant="outline" size="lg">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </Button>
            
          </div>
        </div>
      </div>
    </>
  );
}

export default LoginPage;
