'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { fadeUp, scaleIn, staggerContainer, staggerItem, overlayVariants, modalVariants, tableRowVariant } from '@/lib/motion';

interface CheatingLog {
  id: string;
  result_id: string;
  exam_id: string;
  no_face_count: number;
  multiple_face_count: number;
  cell_phone_count: number;
  prohibited_object_count: number;
  screenshots: { url: string; type: string; detectedAt: string }[];
  exams: { exam_name: string };
  users: { name: string; email: string };
  created_at: string;
  submitted_at: string;
}

interface ResultRow {
  id: string;
  exam_id: string;
  student_id: string;
  created_at: string;
  exams: { exam_name: string };
  users: { name: string; email: string };
}

interface LogRow {
  id: string;
  result_id: string | null;
  exam_id: string;
  student_id: string;
  no_face_count: number | null;
  multiple_face_count: number | null;
  cell_phone_count: number | null;
  prohibited_object_count: number | null;
  screenshots: { url: string; type: string; detectedAt: string }[] | null;
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

    const { data: resultsData, error: resultsError } = await supabase
      .from('results')
      .select(`
        id, exam_id, student_id, created_at,
        exams ( exam_name ),
        users ( name, email )
      `)
      .order('created_at', { ascending: false });

    if (resultsError || !resultsData) {
      console.error('Failed to fetch analytics source results', resultsError);
      setLogs([]);
      setLoading(false);
      return;
    }

    const results = resultsData as unknown as ResultRow[];
    const resultIds = results.map((result) => result.id);
    const logsByResultId = new Map<string, LogRow>();

    if (resultIds.length > 0) {
      const { data: logData, error: logError } = await supabase
        .from('cheating_logs')
        .select('id, result_id, exam_id, student_id, no_face_count, multiple_face_count, cell_phone_count, prohibited_object_count, screenshots, created_at')
        .in('result_id', resultIds);

      if (logError) {
        console.error('Failed to fetch proctoring logs', logError);
      } else {
        ((logData || []) as unknown as LogRow[]).forEach((log) => {
          if (log.result_id) logsByResultId.set(log.result_id, log);
        });
      }
    }

    setLogs(results.map((result) => {
      const log = logsByResultId.get(result.id);
      return {
        id: log?.id || result.id,
        result_id: result.id,
        exam_id: result.exam_id,
        no_face_count: log?.no_face_count || 0,
        multiple_face_count: log?.multiple_face_count || 0,
        cell_phone_count: log?.cell_phone_count || 0,
        prohibited_object_count: log?.prohibited_object_count || 0,
        screenshots: log?.screenshots || [],
        exams: result.exams,
        users: result.users,
        created_at: log?.created_at || result.created_at,
        submitted_at: result.created_at,
      };
    }) as CheatingLog[]);

    setLoading(false);
  };

  const getSeverityPill = (count: number) => {
    if (count === 0) return <span className="text-[11px] text-[var(--color-mute)] font-bold px-2">0</span>;
    if (count < 3) return <span className="bg-yellow-50 text-yellow-700 text-[11px] px-2 py-1 rounded-[4px] font-bold border border-yellow-100">{count}</span>;
    return <span className="bg-red-50 text-[var(--color-error)] text-[11px] px-2 py-1 rounded-[4px] font-bold border border-red-100">{count}</span>;
  };

  return (
    <>
      <div className="w-full">
        <div className="max-w-[1200px] mx-auto">
          
          <motion.div {...fadeUp} className="mb-8">
             <h1 className="text-[28px] font-display font-bold text-[var(--color-ink)] mb-2 tracking-tight">Analytics.</h1>
             <p className="text-[14px] text-[var(--color-ash)] font-medium max-w-[600px]">
               Review anomaly detection events fired during active assessments.
             </p>
          </motion.div>

          <motion.div {...scaleIn} transition={{ ...scaleIn.transition, delay: 0.1 }}>
            <Card elevated className="bg-white rounded-[16px]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--color-hairline)] bg-[var(--color-soft-cloud)]/50">
                      <th className="px-5 py-3 text-[11px] font-bold text-[var(--color-ash)] uppercase tracking-wider">Student</th>
                      <th className="px-5 py-3 text-[11px] font-bold text-[var(--color-ash)] uppercase tracking-wider">Assessment</th>
                      <th className="px-5 py-3 text-[11px] font-bold text-[var(--color-ash)] uppercase tracking-wider">No Face</th>
                      <th className="px-5 py-3 text-[11px] font-bold text-[var(--color-ash)] uppercase tracking-wider">Multi Face</th>
                      <th className="px-5 py-3 text-[11px] font-bold text-[var(--color-ash)] uppercase tracking-wider">Mobile</th>
                      <th className="px-5 py-3 text-[11px] font-bold text-[var(--color-ash)] uppercase tracking-wider">Object</th>
                      <th className="px-5 py-3 text-[11px] font-bold text-[var(--color-ash)] uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-[14px] text-[var(--color-ink)] font-medium">
                    {loading ? (
                      <tr><td colSpan={7} className="text-center py-12 text-[var(--color-ash)]">Scanning logs...</td></tr>
                    ) : logs.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-12 text-[var(--color-ash)]">No activity logs recorded.</td></tr>
                    ) : (
                      logs.map((log, idx) => (
                        <motion.tr
                          key={log.id}
                          {...tableRowVariant}
                          transition={{ ...tableRowVariant.transition, delay: idx * 0.04 }}
                          className="border-b border-[var(--color-hairline)] hover:bg-[var(--color-soft-cloud)]/40 transition-colors"
                        >
                          <td className="px-5 py-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-[14px] text-[var(--color-ink)]">{log.users?.name || 'Candidate'}</span>
                              <span className="text-[12px] text-[var(--color-ash)] font-medium">{log.users?.email}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-[13px] font-bold">{log.exams?.exam_name}</td>
                          <td className="px-5 py-3">{getSeverityPill(log.no_face_count)}</td>
                          <td className="px-5 py-3">{getSeverityPill(log.multiple_face_count)}</td>
                          <td className="px-5 py-3">{getSeverityPill(log.cell_phone_count)}</td>
                          <td className="px-5 py-3">{getSeverityPill(log.prohibited_object_count)}</td>
                          <td className="px-5 py-3 text-right">
                            <Button 
                              variant="pill" 
                              className="px-4 text-[11px]"
                              onClick={() => setSelectedScreenshots(log.screenshots || [])}
                              disabled={!log.screenshots || log.screenshots.length === 0}
                            >
                              Snaps ({(log.screenshots || []).length})
                            </Button>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>

        </div>
    </div>

      {/* Snapshot Modal */}
      <AnimatePresence>
        {selectedScreenshots !== null && (
          <motion.div
            {...overlayVariants}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--color-ink)]/60 backdrop-blur-md p-6"
            onClick={() => setSelectedScreenshots(null)}
          >
            <motion.div
              {...modalVariants}
              className="w-full max-w-[800px] max-h-[85vh] bg-white rounded-[16px] overflow-hidden flex flex-col shadow-2xl border border-[var(--color-hairline)]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center px-5 py-4 border-b border-[var(--color-hairline)]">
                <h2 className="text-[18px] font-display font-bold text-[var(--color-ink)] tracking-tight">Detection Archive</h2>
                <Button
                  variant="icon"
                  onClick={() => setSelectedScreenshots(null)}
                >
                  ✕
                </Button>
              </div>
              <div className="p-5 overflow-y-auto bg-[var(--color-soft-cloud)] h-full">
                 {selectedScreenshots.length === 0 ? (
                    <p className="text-center text-[14px] text-[var(--color-ash)] font-medium pt-12">Archive is empty.</p>
                 ) : (
                    <motion.div
                      variants={staggerContainer}
                      initial="initial"
                      animate="animate"
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      {selectedScreenshots.map((snap, i) => (
                        <motion.div key={i} variants={staggerItem} className="flex flex-col gap-3 bg-white p-3 rounded-[12px] border border-[var(--color-hairline)] shadow-sm">
                           <div className="aspect-video bg-black/5 rounded-[8px] overflow-hidden object-cover relative">
                             <img 
                               src={snap.url} 
                               alt={`Anomaly: ${snap.type}`} 
                               className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
                             />
                           </div>
                           <div className="flex justify-between items-center px-1">
                             <span className="text-[10px] font-bold text-[var(--color-rausch)] uppercase tracking-widest">{snap.type.replace(/_/g, ' ')}</span>
                             <span className="text-[10px] text-[var(--color-mute)] font-mono font-bold">{new Date(snap.detectedAt).toLocaleTimeString()}</span>
                           </div>
                        </motion.div>
                      ))}
                    </motion.div>
                 )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
