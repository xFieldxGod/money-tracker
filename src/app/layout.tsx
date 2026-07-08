import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, IBM_Plex_Sans_Thai, Mali } from 'next/font/google';
import "./globals.css";
import { AuthProvider } from '@/contexts/AuthContext'

// Plus Jakarta เป็น variable font — ไม่ต้องระบุ weight ทำให้โหลดไฟล์เดียว
// ที่ครอบคลุมทุกน้ำหนัก (ใช้งานทันที) แทนที่จะ preload แยกทุกน้ำหนัก
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
  preload: false,
});

// IBM Plex Sans Thai ไม่มีเวอร์ชัน variable — ระบุเฉพาะน้ำหนักที่แอปใช้จริง (400–700)
// และปิด preload เพราะเป็นฟอนต์ fallback สำหรับอักษรไทย (โหลดผ่าน @font-face + display: swap)
const ibmPlexThai = IBM_Plex_Sans_Thai({
  subsets: ['thai'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-thai',
  display: 'swap',
  preload: false,
});

// Mali — ฟอนต์ลายมือไทย ใช้กับหัวข้อ (ธีมแมวมาลี) โหลดเฉพาะน้ำหนักที่ใช้
const mali = Mali({
  subsets: ['thai', 'latin'],
  weight: ['500', '600', '700'],
  variable: '--font-mali',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: "Money Tracker",
  description: "บันทึกรายรับรายจ่ายส่วนตัว",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#fdf5f8',
  // ล็อกซูม: กัน pinch-zoom โดยไม่ตั้งใจตอนเลื่อนหน้าจอ และกัน iOS ซูมเองตอนโฟกัสช่องกรอก
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${plusJakarta.variable} ${ibmPlexThai.variable} ${mali.variable}`}>
      <body className="bg-slate-50/50 min-h-screen antialiased text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
