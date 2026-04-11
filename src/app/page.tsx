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
    <main className="relative min-h-screen bg-gray-50">
      {/* Header Bar */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <svg
                className="h-4 w-4 text-white"
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
            <h1 className="text-lg font-bold text-gray-900">
              AI Proctoring System
            </h1>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-500">
            MVP v0.1
          </span>
        </div>
      </header>

      {/* ProctorCamera Component */}
      <div className="pt-14">
        <ProctorCamera />
      </div>
    </main>
  );
}
