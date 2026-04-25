import { Sidebar } from '@/components/ui/Sidebar';
import { GlobalHeader } from '@/components/ui/GlobalHeader';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const links = [
    { label: 'Dashboard', href: '/student/dashboard' },
    { label: 'Transcript', href: '/student/results' }
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-soft-cloud text-ink">
       <Sidebar roleTitle="Student" links={links} />
       <div className="flex-1 flex flex-col overflow-hidden">
          <GlobalHeader />
          <main className="flex-1 overflow-y-auto p-5 sm:p-8 md:p-10">
             <div className="max-w-[1280px] mx-auto pb-20">
               {children}
             </div>
          </main>
       </div>
    </div>
  );
}
