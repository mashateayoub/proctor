/**
 * @file page.tsx
 * @description Root page of the AI Proctoring System. Renders the ProctorCamera
 *              component centered on screen with a title and version badge.
 */

import ProctorCamera from "@/components/ProctorCamera";

/**
 * Root page component for the AI Proctoring System MVP.
 *
 * @returns The root page with the proctoring interface
 */
export default function Home() {
  return (
    <main className="relative min-h-screen bg-white text-ink">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-hairline bg-white">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rausch text-white">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h1 className="text-[16px] font-bold text-ink">
              AiProctor
            </h1>
          </div>
          <span className="rounded-full border border-hairline bg-soft-cloud px-3 py-1 text-[11px] font-semibold text-ash">
            MVP v0.1
          </span>
        </div>
      </header>

      <div className="mx-auto flex min-h-screen max-w-[1280px] flex-col items-center justify-center gap-8 px-5 pt-24 sm:px-8">
        <section className="max-w-[720px] text-center">
          <p className="mb-3 text-[12px] font-bold tracking-[0.32px] text-rausch">SECURE PROCTORING</p>
          <h2 className="text-display-hero mb-4">Camera-first integrity, clean by default.</h2>
          <p className="text-body-standard text-ash">
            A focused monitoring surface with the visual system from <code>docs/DESIGN.md</code>: white canvas,
            precise borders, circular controls, and scarce Rausch actions.
          </p>
        </section>
        <div className="w-full max-w-[700px] rounded-[20px] border border-hairline bg-white p-4 airbnb-card-shadow">
          <ProctorCamera />
        </div>
      </div>
    </main>
  );
}
