import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="flex-grow flex items-center justify-center relative overflow-hidden px-margin-mobile py-xl pt-32">
        {children}
      </main>
      <Footer />
    </>
  );
}
