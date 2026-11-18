import './globals.css';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin', 'vietnamese'],
  weight: ['600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata = {
  title: 'DERMACARE — Phòng khám và trợ lý da liễu',
  description:
    'Đặt lịch thăm khám và hỏi đáp da liễu trực tuyến tại DERMACARE.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="vi"
      className={`${plusJakartaSans.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body
        className="antialiased bg-[#F8FAFC] text-slate-900 font-body"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
