'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface CheatingLog {
  id: string;
  exam_id: string;
  no_face_count: number;
  multiple_face_count: number;
  cell_phone_count: number;
  prohibited_object_count: number;
  screenshots: { url: string; type: string; detectedAt: string }[];
  exams: { exam_name: string };
  users: { name: string; email: string };
  created_at: string;
}

export default function AnalyticsPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [logs, setLogs] = useState<CheatingLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [selectedScreenshots, setSelectedScreenshots] = useState<{ url: string; type: string; detectedAt: string }[] | null>(null);

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    // Thanks to RLS, this will automatically only pull logs belonging to the currently logged in Teacher's exams!
    const { data, error } = await supabase
      .from('cheating_logs')
      .select(`
        id, exam_id, no_face_count, multiple_face_count, cell_phone_count, prohibited_object_count, screenshots, created_at,
        exams ( exam_name ),
        users ( name, email )
      `)
      .order('created_at', { ascending: false });

    if (data && !error) {
      setLogs(data as unknown as CheatingLog[]);
    }
    setLoading(false);
  };

  const getSeverityPill = (count: number) => {
    if (count === 0) return <span className="text-[12px] text-black/40 dark:text-white/40 font-semibold px-2">0</span>;
    if (count < 3) return <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200 text-[12px] px-2 py-1 rounded-[4px] font-semibold">{count}</span>;
    return <span className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 text-[12px] px-2 py-1 rounded-[4px] font-semibold">{count}</span>;
  };

  return (
    <>
      <div className="w-full">
        <div className="max-w-[1200px] mx-auto">
          
          <div className="mb-12">
             <h1 className="text-section-heading text-apple-dark dark:text-white mb-2 tracking-tight">Proctoring Analytics.</h1>
             <p className="text-body-standard text-black/80 dark:text-white/80 max-w-[600px]">
               Review anomaly detection events fired during active exams.
             </p>
          </div>

          <Card elevated className="bg-white dark:bg-[#1d1d1f]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-black/5 dark:border-white/5">
                    <th className="px-6 py-4 text-caption font-semibold text-black/50 dark:text-white/50">Student</th>
                    <th className="px-6 py-4 text-caption font-semibold text-black/50 dark:text-white/50">Exam</th>
                    <th className="px-6 py-4 text-caption font-semibold text-black/50 dark:text-white/50">No Face</th>
                    <th className="px-6 py-4 text-caption font-semibold text-black/50 dark:text-white/50">Multiple Faces</th>
                    <th className="px-6 py-4 text-caption font-semibold text-black/50 dark:text-white/50">Cell Phone</th>
                    <th className="px-6 py-4 text-caption font-semibold text-black/50 dark:text-white/50">Prohibited Item</th>
                    <th className="px-6 py-4 text-caption font-semibold text-black/50 dark:text-white/50 text-right">Snapshots</th>
                  </tr>
                </thead>
                <tbody className="text-body-standard text-apple-dark dark:text-white">
                  {loading ? (
                    <tr><td colSpan={7} className="text-center py-12 text-black/50">Loading logs...</td></tr>
                  ) : logs.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-black/50">No proctoring logs found for your exams yet.</td></tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="border-b border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-[14px]">{log.users?.name || 'Unknown User'}</span>
                            <span className="text-[12px] text-black/60 dark:text-white/60">{log.users?.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[14px]">{log.exams?.exam_name}</td>
                        <td className="px-6 py-4">{getSeverityPill(log.no_face_count)}</td>
                        <td className="px-6 py-4">{getSeverityPill(log.multiple_face_count)}</td>
                        <td className="px-6 py-4">{getSeverityPill(log.cell_phone_count)}</td>
                        <td className="px-6 py-4">{getSeverityPill(log.prohibited_object_count)}</td>
                        <td className="px-6 py-4 text-right">
                          <Button 
                            variant="filter" 
                            className="h-[30px] text-[12px]"
                            onClick={() => setSelectedScreenshots(log.screenshots || [])}
                            disabled={!log.screenshots || log.screenshots.length === 0}
                          >
                            View ({(log.screenshots || []).length})
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

        </div>
    </div>

      {/* Snapshot Modal */}
      {selectedScreenshots !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6" onClick={() => setSelectedScreenshots(null)}>
          <div 
            className="w-full max-w-[800px] max-h-[85vh] bg-white dark:bg-[#1d1d1f] rounded-[16px] overflow-hidden flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-black/10 dark:border-white/10">
              <h2 className="text-card-title text-apple-dark dark:text-white tracking-tight">Detection Snaps</h2>
              <button 
                onClick={() => setSelectedScreenshots(null)}
                className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-apple-dark dark:text-white hover:bg-black/10 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-apple-gray dark:bg-black h-full">
               {selectedScreenshots.length === 0 ? (
                 <p className="text-center text-body-standard text-black/60 pt-12">No images captured during this session.</p>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {selectedScreenshots.map((snap, i) => (
                     <div key={i} className="flex flex-col gap-2">
                        <div className="aspect-video bg-black/10 dark:bg-white/10 rounded-[8px] overflow-hidden object-cover relative">
                          {/* We will rely on raw Base64 injection for MVP or Supabase Public URLs later */}
                          <img 
                            src={snap.url} 
                            alt={`Cheating detection: ${snap.type}`} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[12px] font-semibold text-red-500 uppercase tracking-wider">{snap.type.replace(/_/g, ' ')}</span>
                          <span className="text-[11px] text-black/60 dark:text-white/60 font-mono">{new Date(snap.detectedAt).toLocaleTimeString()}</span>
                        </div>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
