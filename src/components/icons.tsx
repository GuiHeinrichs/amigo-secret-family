import type { SVGProps } from "react";

const paths = {
  home: "M4 11.5 12 4l8 7.5M6.5 10v9.5h11V10",
  slip: "M6 3.5h12v17l-3-2-3 2-3-2-3 2zM9 8.5h6M9 12h6",
  list: "M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01",
  chat: "M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-6l-4.5 3.5V16.5H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5z",
  party: "M4 20 8.5 8.5 15.5 15.5zM14 4.5c1 1.5 1 3 0 4.5M18.5 9.5c-1.2-.4-2.4 0-3.3 1M19.5 4.5h.01M10 4h.01M20 14.5h.01",
  gear: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6",
  copy: "M9 8.5h9.5v11H9zM5.5 15.5v-11H15",
  check: "M5 12.5 10 17.5 19.5 7",
  trash: "M5 7h14M10 7V4.5h4V7M7 7l1 12.5h8L17 7M10 10.5v6M14 10.5v6",
  lock: "M7 10.5h10v9H7zM9 10.5V8a3 3 0 0 1 6 0v2.5",
  back: "M10 6 4 12l6 6M4 12h16",
  plus: "M12 5v14M5 12h14",
  menu: "M4.5 7h15M4.5 12h15M4.5 17h15",
  close: "M6 6l12 12M18 6 6 18",
  calendar: "M5 6.5h14v13H5zM5 10.5h14M8.5 4v4M15.5 4v4",
  clock: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8v4.5l3 2",
  chevronLeft: "M14.5 6 8.5 12l6 6",
  chevronRight: "M9.5 6l6 6-6 6",
  eyeOff: "M4 4l16 16M9.5 5.6A9.6 9.6 0 0 1 12 5.3c5 0 8.5 6.7 8.5 6.7a15 15 0 0 1-2.6 3.3M6.3 7.8A15 15 0 0 0 3.5 12s3.5 6.7 8.5 6.7c1 0 2-.2 2.9-.6M10 10a3 3 0 0 0 4 4",
  send: "M4 12 20 4.5 15 20l-3-6.5zM12 13.5 20 4.5",
  bow: "M12 12c-2.5-4-6.5-5-7.5-3s1 5 7.5 3zm0 0c2.5-4 6.5-5 7.5-3s-1 5-7.5 3zm0 0-3 7m3-7 3 7",
  share: "M12 15V4M8 7.5 12 4l4 3.5M5.5 12v7.5h13V12",
} as const;

export type IconName = keyof typeof paths;

export function Icon({
  name,
  size = 22,
  ...props
}: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}

/** Logotipo colorido do Google, como pedem as diretrizes do botão de login. */
export function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5a9.4 9.4 0 0 0-8 14.3L3 21.5l4.9-1.2A9.4 9.4 0 1 0 12 2.5zm0 1.8a7.6 7.6 0 1 1-3.9 14.1l-.3-.2-2.6.7.7-2.5-.2-.3A7.6 7.6 0 0 1 12 4.3zm-3 3.5c-.2 0-.5 0-.7.3-.3.3-1 1-1 2.300s1 2.700 1.200 2.900c.1.2 2 3.200 5 4.300 2.400.9 2.900.7 3.400.7.500-.1 1.700-.7 1.900-1.400.2-.6.2-1.200.2-1.300-.1-.1-.3-.2-.6-.4l-1.900-.9c-.3-.1-.5-.1-.7.2l-.8 1c-.2.2-.3.2-.6.1a6.300 6.300 0 0 1-3.100-2.700c-.2-.4.2-.4.6-1.200.1-.2 0-.3 0-.5l-.9-2c-.2-.5-.4-.4-.6-.4H9z" />
    </svg>
  );
}
