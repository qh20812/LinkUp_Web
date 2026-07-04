function Footer() {
  const year = new Date().getFullYear();

  return (
    <>
      <footer className="border-t border-outline-variant py-12 px-4 flex flex-col md:flex-row justify-between gap-10">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <svg className="size-5 text-primary" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M44 11.2727C44 14.0109 39.8386 16.3957 33.69 17.6364C39.8386 18.877 44 21.2618 44 24C44 26.7382 39.8386 29.123 33.69 30.3636C39.8386 31.6043 44 33.9891 44 36.7273C44 40.7439 35.0457 44 24 44C12.9543 44 4 40.7439 4 36.7273C4 33.9891 8.16144 31.6043 14.31 30.3636C8.16144 29.123 4 26.7382 4 24C4 21.2618 8.16144 18.877 14.31 17.6364C8.16144 16.3957 4 14.0109 4 11.2727C4 7.25611 12.9543 4 24 4C35.0457 4 44 7.25611 44 11.2727Z" fill="currentColor" />
            </svg>
            <span className="text-xl font-bold font-display text-on-surface">LinkUp</span>
          </div>
          <p className="text-on-surface-variant text-sm">
            Trao quyền cho mọi người xây dựng những kết nối ý nghĩa qua công nghệ minh bạch và đầy niềm vui.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-10">
          <div className="flex flex-col gap-4">
            <h4 className="font-bold text-sm uppercase font-label text-primary">Sản phẩm</h4>
            <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#">Tính năng</a>
            <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#">An toàn</a>
            <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#">Ứng dụng</a>
          </div>
          <div className="flex flex-col gap-4">
            <h4 className="font-bold text-sm uppercase font-label text-primary">Công ty</h4>
            <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#">Về chúng tôi</a>
            <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#">Tuyển dụng</a>
            <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#">Blog</a>
          </div>
          <div className="flex flex-col gap-4">
            <h4 className="font-bold text-sm uppercase font-label text-primary">Pháp lý</h4>
            <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#">Riêng tư</a>
            <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#">Điều khoản</a>
            <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#">Hướng dẫn</a>
          </div>
        </div>
      </footer>
      <div className="text-center py-6 border-t border-outline-variant text-xs text-on-surface-variant font-label">
        &copy; {year} LinkUp Inc. ĐÃ ĐĂNG KÝ BẢN QUYỀN.
      </div>
    </>
  );
}

export default Footer;
