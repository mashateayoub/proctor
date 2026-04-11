import { Sidebar } from '@/components/ui/Sidebar';
import { GlobalHeader } from '@/components/ui/GlobalHeader';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const links = [
    { label: 'Overview', href: '/teacher/dashboard' },
    { label: 'Exams', href: '/teacher/exams' },
    { label: 'Analytics', href: '/teacher/analytics' },
    { label: 'Results', href: '/teacher/results' },
  ];

  return (
    <div className="flex h-screen bg-apple-gray dark:bg-black text-apple-dark dark:text-white overflow-hidden">
       <Sidebar roleTitle="Teacher" links={links} />
       <div className="flex-1 flex flex-col overflow-hidden">
          <GlobalHeader />
          <main className="flex-1 overflow-y-auto p-6 md:p-10">
             <div className="max-w-[1200px] mx-auto pb-20">
               {children}
             </div>
          </main>
       </div>
    </div>
  );
}
