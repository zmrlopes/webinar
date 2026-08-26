import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/consultor/backoffice/webinares", destination: "/consultor/webinares", permanent: true },
      { source: "/consultor/backoffice", destination: "/consultor", permanent: true },
    ];
  },
};

export default nextConfig;
