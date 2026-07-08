import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // อนุญาตให้เปิด dev server ผ่าน IP วงแลน (เทส UI จากมือถือ) — ใช้เฉพาะตอน dev เท่านั้น
  // ถ้า IP เครื่องเปลี่ยน (เช็คด้วย ipconfig) ให้แก้ค่านี้ตาม
  allowedDevOrigins: ["10.54.179.100", "*.devtunnels.ms"],
  // Proxy หน้า Firebase auth handler มาอยู่โดเมนเดียวกับแอป (/__/ เป็น namespace สงวนของ Firebase Hosting)
  // ทำให้ล็อกอินไม่พึ่ง sessionStorage ข้ามโดเมน ซึ่งพังใน in-app browser (LINE ฯลฯ)
  async rewrites() {
    return [
      {
        source: "/__/:path*",
        destination: "https://money-tracker-80edb.firebaseapp.com/__/:path*",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Link",
            value: [
              "<https://apis.google.com>; rel=preconnect",
              "<https://identitytoolkit.googleapis.com>; rel=preconnect",
              "<https://firestore.googleapis.com>; rel=preconnect",
              "<https://money-tracker-80edb.firebaseapp.com>; rel=preconnect",
            ].join(", "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
