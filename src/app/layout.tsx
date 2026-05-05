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
                const MEDIA_PIPE_XNNPACK_INFO = 'Created TensorFlow Lite XNNPACK delegate for CPU.';
                const shouldSilenceOnlyKnownInfo = (args) =>
                  args.some((arg) => String(arg).includes(MEDIA_PIPE_XNNPACK_INFO));

                const patch = (fn) => (...args) => {
                  if (shouldSilenceOnlyKnownInfo(args)) return;
                  fn.apply(console, args);
                };

                console.info = patch(console.info.bind(console));
                console.warn = patch(console.warn.bind(console));
                console.error = patch(console.error.bind(console));
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
