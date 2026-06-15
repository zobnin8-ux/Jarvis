import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "openweathermap.org",
      },
    ],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      const ignored = config.watchOptions?.ignored;
      const base = (Array.isArray(ignored) ? ignored : ignored ? [ignored] : [])
        .filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [...base, "**/.data/**"],
      };
    }
    return config;
  },
};

export default nextConfig;
