/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Vercel: set BACKEND_URL to your Render (or other) API origin, no trailing slash.
    // Local dev: omit it to use localhost; override with BACKEND_URL or NEXT_PUBLIC_API_URL.
    const raw =
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:5001";
    const backendUrl = String(raw).replace(/\/$/, "");
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
