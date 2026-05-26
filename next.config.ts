import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
