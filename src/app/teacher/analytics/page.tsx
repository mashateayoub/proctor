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
    if (count === 0) return <span className="text-[12px] text-mute font-semibold px-2">0</span>;
    if (count < 3) return <span className="bg-yellow-100 text-yellow-800 text-[12px] px-2 py-1 rounded-[4px] font-semibold">{count}</span>;
    return <span className="bg-red-100 text-red-800 text-[12px] px-2 py-1 rounded-[4px] font-semibold">{count}</span>;
  };

  return (
    <>
      <div className="w-full">
        <div className="max-w-[1200px] mx-auto">
          
          <motion.div {...fadeUp} className="mb-12">
             <h1 className="text-section-heading text-ink mb-2 tracking-tight">Proctoring Analytics.</h1>
             <p className="text-body-standard text-ash max-w-[600px]">
               Review anomaly detection events fired during active exams.
             </p>
          </motion.div>

          <motion.div {...scaleIn} transition={{ ...scaleIn.transition, delay: 0.1 }}>
            <Card elevated className="bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-hairline">
                      <th className="px-6 py-4 text-caption font-semibold text-ash">Student</th>
                      <th className="px-6 py-4 text-caption font-semibold text-ash">Exam</th>
                      <th className="px-6 py-4 text-caption font-semibold text-ash">No Face</th>
                      <th className="px-6 py-4 text-caption font-semibold text-ash">Multiple Faces</th>
                      <th className="px-6 py-4 text-caption font-semibold text-ash">Cell Phone</th>
                      <th className="px-6 py-4 text-caption font-semibold text-ash">Prohibited Item</th>
                      <th className="px-6 py-4 text-caption font-semibold text-ash text-right">Snapshots</th>
                    </tr>
                  </thead>
                  <tbody className="text-body-standard text-ink">
                    {loading ? (
                      <tr><td colSpan={7} className="text-center py-12 text-ash">Loading logs...</td></tr>
                    ) : logs.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-12 text-ash">No proctoring logs found for your exams yet.</td></tr>
                    ) : (
                      logs.map((log, idx) => (
                        <motion.tr
                          key={log.id}
                          {...tableRowVariant}
                          transition={{ ...tableRowVariant.transition, delay: idx * 0.04 }}
                          className="border-b border-hairline hover:bg-soft-cloud transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-[14px]">{log.users?.name || 'Unknown User'}</span>
                              <span className="text-[12px] text-ash">{log.users?.email}</span>
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
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
            onClick={() => setSelectedScreenshots(null)}
          >
            <motion.div
              {...modalVariants}
              className="w-full max-w-[800px] max-h-[85vh] bg-white rounded-[16px] overflow-hidden flex flex-col shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-6 border-b border-hairline">
                <h2 className="text-card-title text-ink tracking-tight">Detection Snaps</h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedScreenshots(null)}
                  className="w-8 h-8 rounded-full bg-soft-cloud flex items-center justify-center text-ink hover:bg-black/10 transition-colors"
                >
                  ✕
                </motion.button>
              </div>
              <div className="p-6 overflow-y-auto bg-soft-cloud h-full">
                 {selectedScreenshots.length === 0 ? (
                   <p className="text-center text-body-standard text-ash pt-12">No images captured during this session.</p>
                 ) : (
                   <motion.div
                     variants={staggerContainer}
                     initial="initial"
                     animate="animate"
                     className="grid grid-cols-1 md:grid-cols-2 gap-6"
                   >
                     {selectedScreenshots.map((snap, i) => (
                       <motion.div key={i} variants={staggerItem} className="flex flex-col gap-2">
                          <div className="aspect-video bg-black/10 rounded-[8px] overflow-hidden object-cover relative">
                            <img 
                              src={snap.url} 
                              alt={`Cheating detection: ${snap.type}`} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex justify-between items-center px-1">
                            <span className="text-[12px] font-semibold text-red-500 uppercase tracking-wider">{snap.type.replace(/_/g, ' ')}</span>
                            <span className="text-[11px] text-ash font-mono">{new Date(snap.detectedAt).toLocaleTimeString()}</span>
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
