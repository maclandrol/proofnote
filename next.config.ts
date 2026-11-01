import type { NextConfig } from "next";
const mirror = process.env.NEXT_PUBLIC_BASE_PATH === "/proofnote";
const config: NextConfig = mirror ? {
  output: "export",
  basePath: "/proofnote",
  trailingSlash: true,
  images: { unoptimized: true },
} : {};
export default config;
