import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://mrmynzeymwgzevxyxnln.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ybXluemV5bXdnemV2eHl4bmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwNTYxMzksImV4cCI6MjA4MDYzMjEzOX0.ipPI2c2UxjpNybf5VK57E2Tqkqr92Su0oznDPktr5u4",
    NEXT_PUBLIC_SITE_URL: "https://kachow.app",
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'mrmynzeymwgzevxyxnln.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
      },
      {
        protocol: 'https',
        hostname: '*.amazon.com',
      },
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
      },
      {
        protocol: 'https',
        hostname: '*.cloudinary.com',
      },
    ],
  },
};

export default nextConfig;
