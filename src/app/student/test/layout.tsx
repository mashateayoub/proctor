// Blank layout allows the active proctoring test page to escape the general Student Dashboard
export default function TestOverrideLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-screen h-screen overflow-hidden">
      {children}
    </div>
  );
}
