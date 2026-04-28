import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { ToastProvider } from "@/components/ui/ToastProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: 'swap',
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "AiProctor | AI-Driven Exam Integrity",
  description: "Experience the next generation of academic integrity with secure, automated AI proctoring and assessment management.",
  keywords: ["AI Proctoring", "Exam Integrity", "Online Assessment", "Secure Testing"],
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
      className={`${inter.variable} ${outfit.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col font-sans">
        <ToastProvider>{children}</ToastProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                const silence = (fn) => (...args) => {
                  const msg = args.join(' ');
                  if (msg.includes('XNNPACK') || msg.includes('gl_context') || msg.includes('face_landmarker')) return;
                  fn.apply(console, args);
                };
                console.log = silence(console.log);
                console.warn = silence(console.warn);
                console.info = silence(console.info);
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
