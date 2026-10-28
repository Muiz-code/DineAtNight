import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Full Content-Security-Policy. Shipped as Report-Only first: violations show
 * in the browser console without blocking anything. Once the live site shows
 * no violations, rename the header below to "Content-Security-Policy".
 *
 * 'unsafe-inline' on scripts is required by Next.js inline bootstrapping and
 * the JSON-LD blocks in app/layout.tsx (a nonce setup would force every page
 * to render dynamically).
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://cdn.lordicon.com https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://images.unsplash.com https://res.cloudinary.com https://firebasestorage.googleapis.com https://*.pinimg.com",
  "media-src 'self' blob: https://res.cloudinary.com https://firebasestorage.googleapis.com",
  "font-src 'self' data:",
  // Firestore, Auth (identitytoolkit/securetoken), Storage, Lordicon animations, Vercel Analytics
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://cdn.lordicon.com https://va.vercel-scripts.com https://vitals.vercel-insights.com",
  "frame-src 'self' https://*.firebaseapp.com",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  // Enforced: these cannot break page content
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Camera is needed by the admin ticket scanner (html5-qrcode)
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
  // Report-only until verified on the live site (see comment above)
  { key: "Content-Security-Policy-Report-Only", value: csp },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  reactStrictMode: false,
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "**.pinimg.com" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
