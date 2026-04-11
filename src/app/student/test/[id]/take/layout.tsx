/**
 * Minimal layout that omits Sidebar + GlobalHeader so the exam
 * take page occupies the entire viewport in a locked-down state.
 */
export default function TakeExamLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
