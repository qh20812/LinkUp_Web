import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <div className="flex flex-col gap-6 px-4 py-10 lg:flex-row lg:items-center">
          <div
            className="w-full bg-center bg-no-repeat aspect-square bg-cover rounded-xl shadow-lg lg:w-1/2 overflow-hidden border border-outline-variant lg:aspect-auto lg:min-h-[400px]"
            style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBLeWXN5XNLhLhiM_dEaJNAkE3LMH0dKBbicFk3AeRqJogaGO6r0Se2S7zlqpM-QBRoYfOltGoR9Jfu8zphH5akXGYx7YzvrCjZsBDtCor-QRq9EobdgRG6yWxGoguXpI6HXPNQLxC-fe2JW0BoxrzY8GB3WF-xW1aPQx8EY446pS7iz_WPZ-r48rCw1Ffg-qPbDdxNWoVto1nmJPwe49wFymgYihRbCIPGIPgRJvoGIKZu_R0q-LxaoFsf9UN-ZtfYSoaL83JrOgM")' }}
          />
          <div className="flex flex-col gap-6 lg:w-1/2 lg:justify-center">
            <div className="flex flex-col gap-4 text-left">
              <span className="font-label text-xs font-bold uppercase tracking-widest text-primary bg-primary-fixed px-3 py-1 rounded-full w-fit">
                Sống câu chuyện của bạn
              </span>
              <h1 className="text-on-background text-4xl font-black leading-tight tracking-[-0.033em] sm:text-5xl font-display">
                Kết nối với bạn bè và thế giới quanh bạn.
              </h1>
              <h2 className="text-on-surface-variant text-lg font-normal leading-relaxed sm:text-xl">
                Chia sẻ những điều mới mẻ và khoảnh khắc cuộc sống với bạn bè. Tham gia cộng đồng coi trọng kết nối chân thực và không gian số an toàn.
              </h2>
            </div>
            <div className="flex-wrap gap-4 flex">
              <button className="flex min-w-[160px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-primary text-on-primary text-base font-bold leading-normal tracking-[0.015em] shadow-md hover:translate-y-[-1px] transition-all active:scale-95 font-display">
                <span className="truncate">Tham gia cộng đồng</span>
              </button>
              <button className="flex min-w-[160px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-surface-container-high text-on-surface text-base font-bold leading-normal tracking-[0.015em] border border-outline-variant hover:bg-surface-container-highest transition-all active:scale-95 font-display">
                <span className="truncate">Tải cho Android</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-10 px-4 py-16 bg-surface-container-lowest rounded-3xl mt-8">
          <div className="flex flex-col gap-4 text-center items-center">
            <h2 className="text-on-background text-3xl font-bold leading-tight sm:text-5xl sm:font-black max-w-[720px] font-display">
              Dành cho tất cả mọi người
            </h2>
            <p className="text-on-surface-variant text-lg font-normal leading-normal max-w-[720px]">
              Trải nghiệm nền tảng xã hội được thiết kế để gắn kết mọi người qua chia sẻ liền mạch và trò chuyện riêng tư.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-1 gap-6 rounded-xl border border-outline-variant bg-surface p-8 flex-col shadow-sm hover:shadow-md transition-shadow">
              <div className="text-primary bg-primary-fixed p-3 rounded-lg w-fit">
                <span className="material-symbols-outlined" style={{ fontSize: 32 }}>group</span>
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="text-on-background text-xl font-bold leading-tight font-display">Kết nối mọi lúc</h3>
                <p className="text-on-surface-variant text-base font-normal leading-relaxed">Theo dõi bạn bè trong thời gian thực qua cập nhật và thông báo. Không bao giờ bỏ lỡ lời chúc sinh nhật hay khoảnh khắc từ những người thân yêu.</p>
              </div>
            </div>
            <div className="flex flex-1 gap-6 rounded-xl border border-outline-variant bg-surface p-8 flex-col shadow-sm hover:shadow-md transition-shadow">
              <div className="text-secondary bg-secondary-fixed p-3 rounded-lg w-fit">
                <span className="material-symbols-outlined" style={{ fontSize: 32 }}>photo_library</span>
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="text-on-background text-xl font-bold leading-tight font-display">Chia sẻ cuộc sống</h3>
                <p className="text-on-surface-variant text-base font-normal leading-relaxed">Đăng ảnh và video về những kỷ niệm yêu thích, buổi họp mặt gia đình và thú cưng. Chia sẻ độ phân giải cao làm sống động từng khoảnh khắc.</p>
              </div>
            </div>
            <div className="flex flex-1 gap-6 rounded-xl border border-outline-variant bg-surface p-8 flex-col shadow-sm hover:shadow-md transition-shadow">
              <div className="text-tertiary bg-tertiary-fixed p-3 rounded-lg w-fit">
                <span className="material-symbols-outlined" style={{ fontSize: 32 }}>encrypted</span>
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="text-on-background text-xl font-bold leading-tight font-display">Nhắn tin bảo mật</h3>
                <p className="text-on-surface-variant text-base font-normal leading-relaxed">Trò chuyện an toàn với mã hóa đầu cuối dành cho nhóm thân thiết. Mọi cuộc trò chuyện riêng tư đều thuộc về bạn.</p>
              </div>
            </div>
          </div>
        </div>

        {/* <div className="py-16 px-4">
          <h2 className="text-on-background text-3xl font-bold leading-tight tracking-[-0.015em] mb-10 font-display text-center">Người dùng nói gì về chúng tôi</h2>
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-col gap-6 bg-surface-container-low p-8 rounded-xl border border-outline-variant">
              <div className="flex items-center gap-4">
                <div
                  className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-14 border-2 border-primary shadow-sm shrink-0"
                  style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDmLsAvbW6W1XR_CLGgipHiN_6s9CZjp0iMm--W0C3-kkvMBGIASPVPme3gdsWbduHXLG4VtaNVkpk6EbFogmb2Q1dtYccn32r8fjjD-tm0muiVRHXb_rESOpC7z6DZUH5jVD6Pae1AmlIs1Ej_2BAMfkTNbHuVq4dwHr72d4oJvxavzdc2ZEDA9hw3LDc9AqXUnUjnRgc4ItADb615Pxip1o8SUfsO30zBDqXLz_CG_P4vpqFwSfqLUehOM-QxDqdmlChtTEEtywM")' }}
                />
                <div className="flex-1">
                  <p className="text-on-background text-lg font-bold leading-normal font-display">Nguyễn Văn Tèo</p>
                  <p className="text-on-surface-variant text-sm font-medium leading-normal font-label uppercase">Người dùng</p>
                </div>
                <div className="hidden sm:flex gap-1 shrink-0">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                </div>
              </div>
              <p className="text-on-background text-xl font-medium italic leading-relaxed">
                &ldquo;Kết nối với bạn bè và gia đình một cách dễ dàng và an toàn.&rdquo;
              </p>
              <div className="flex justify-between items-center pt-4 border-t border-outline-variant">
                <div className="flex gap-6 text-on-surface-variant">
                  <button className="flex items-center gap-2 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">thumb_up</span>
                    <span className="text-sm font-bold">124</span>
                  </button>
                  <button className="flex items-center gap-2 hover:text-error transition-colors">
                    <span className="material-symbols-outlined">thumb_down</span>
                    <span className="text-sm font-bold">2</span>
                  </button>
                </div>
                <p className="text-on-surface-variant text-xs font-label">ĐÃ ĐĂNG {new Date().getFullYear() - 1}</p>
              </div>
            </div>
          </div>
        </div> */}

        <div className="px-4 py-16 bg-primary-container rounded-3xl mb-20 text-on-primary-container overflow-hidden relative mx-4">
          <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-primary opacity-20 blur-3xl rounded-full" />
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
            <div className="flex flex-col gap-6 md:w-1/2">
              <h2 className="text-4xl md:text-5xl font-black font-display leading-tight">Sẵn sàng tham gia?</h2>
              <p className="text-lg opacity-90">Trải nghiệm mạng xã hội đúng nghĩa&mdash;tập trung vào con người, không phải thuật toán. Tải ứng dụng ngay hôm nay và bắt đầu kết nối.</p>
              <div className="flex gap-4 flex-wrap">
                <button className="bg-on-primary-container text-primary-container px-8 py-3 rounded-lg font-bold shadow-lg hover:bg-white transition-all flex items-center gap-2 active:scale-95 font-display">
                  <span className="material-symbols-outlined">android</span>
                  Tải cho Android
                </button>
                <button className="bg-transparent border-2 border-on-primary-container text-on-primary-container px-8 py-3 rounded-lg font-bold hover:bg-on-primary-container hover:text-primary-container transition-all active:scale-95 font-display">
                  Tìm hiểu thêm
                </button>
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <div className="w-64 h-[500px] bg-[#1a1a2e] rounded-[3rem] border-[8px] border-[#2d2d44] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#2d2d44] rounded-b-2xl z-20" />
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCJy8QxvcjdQsc5dyqrML-OEfFZ3tKA59zGMqcQBPlfXILbWOB6IK4PkYWJCP_IrYeV-gOGWGdt3dFfNf72Lpj2ndyqLk647rwL3TXEsXKQgzD_c6NjR6ybKwpmmKpSN5dMv_6fB6gRmlFdzcslSXNYyFXhDPcuvhHPRAdVMGfrD6YfNRMKpkrYOi1WlsDP3CDaWntr6ufx7dtgg5IZGBzPew1D9976N-BWuUFUZDEYtSjc7uAqgyqQRbDyoPF4jUKpUoQPY5tdahI")' }}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default HomePage;
