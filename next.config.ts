import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The exam maker reads the chapter notes at request time, so ship them with that function.
  outputFileTracingIncludes: {
    "/api/exam/generate": ["./content/**/*.md"],
  },
};

export default nextConfig;
