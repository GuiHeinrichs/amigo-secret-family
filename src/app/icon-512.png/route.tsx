import { ImageResponse } from "next/og";
import { BrandIcon } from "@/lib/brand-image";

/** Ícone do manifesto (PWA). */
export function GET() {
  return new ImageResponse(<BrandIcon size={512} />, { width: 512, height: 512 });
}
