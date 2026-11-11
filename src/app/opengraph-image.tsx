import { ImageResponse } from "next/og";
import { ShareCard } from "@/lib/brand-image";

export const alt = "Laço: amigo secreto no papelzinho, pelo link e sem senha";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(<ShareCard />, size);
}
