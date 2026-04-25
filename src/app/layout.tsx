import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";


// src/app/layout.tsx  ← add this at the very top, outside the component
if (typeof window !== 'undefined') {
  const _log = window.console.log;
  const _warn = window.console.warn;
  const _info = window.console.info;
  const silence = (fn: (...a: unknown[]) => void) => (...args: unknown[]) => {
    const msg = args.join(' ');
    if (msg.includes('XNNPACK') || msg.includes('gl_context') || msg.includes('face_landmarker') || msg.includes('inference_feedback')) return;
    fn.apply(window.console, args);
  };
  window.console.log = silence(_log);
  window.console.warn = silence(_warn);
  window.console.info = silence(_info);
}




const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AiProctor",
  description: "Secure online exam proctoring and assessment management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
