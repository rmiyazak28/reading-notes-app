import type { NextConfig } from "next";

const securityHeaders = [
  // クリックジャッキング対策: iframe 埋め込みを全面禁止
  { key: "X-Frame-Options", value: "DENY" },
  // MIME スニッフィング対策
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Referer ヘッダーをオリジン情報に限定し、パス・クエリの漏洩を防ぐ
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 不要なブラウザ機能（カメラ・マイク等）へのアクセスを禁止
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
]

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ]
  },
};

export default nextConfig;
