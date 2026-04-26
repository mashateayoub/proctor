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
        id, exam_id, student_id, started_at, status, created_at,
        exams ( exam_name ),
        users ( name, email )
      `)
      .order('started_at', { ascending: false });

    if (resultsError || !resultsData) {
      setLogs([]);
      setLoading(false);
      return;
    }

    const results = resultsData as any[];
    const resultIds = results.map((result) => result.id);
    const logsByResultId = new Map<string, LogRow>();

    if (resultIds.length > 0) {
      const { data: logData, error: logError } = await supabase
        .from('cheating_logs')
        .select('id, result_id, exam_id, student_id, no_face_count, multiple_face_count, cell_phone_count, prohibited_object_count, screenshots, created_at')
        .in('result_id', resultIds);

      if (logData) {
        (logData as any[]).forEach((log) => {
          if (log.result_id) logsByResultId.set(log.result_id, log);
        });
      }
    }

    setLogs(results.map((result) => {
      const log = logsByResultId.get(result.id);
      return {
        id: log?.id || `temp-${result.id}`,
        result_id: result.id,
        exam_id: result.exam_id,
        no_face_count: log?.no_face_count || 0,
        multiple_face_count: log?.multiple_face_count || 0,
        cell_phone_count: log?.cell_phone_count || 0,
        prohibited_object_count: log?.prohibited_object_count || 0,
        screenshots: log?.screenshots || [],
        exams: result.exams,
        users: result.users,
        created_at: result.started_at,
        submitted_at: result.created_at,
        status: result.status
      } as any;
    }));

    setLoading(false);
  };

  const getIntensityColor = (log: CheatingLog) => {
    const total = log.no_face_count + log.multiple_face_count + log.cell_phone_count + log.prohibited_object_count;
    if (total === 0) return 'bg-soft-cloud text-stone';
    if (total < 5) return 'bg-yellow-50 text-yellow-700 border-yellow-100';
    return 'bg-red-50 text-red-700 border-red-100';
  };

  const getIntensityLabel = (log: CheatingLog) => {
    const total = log.no_face_count + log.multiple_face_count + log.cell_phone_count + log.prohibited_object_count;
    if (total === 0) return 'Clean';
    if (total < 5) return 'Low Intensity';
    return 'High Intensity';
  };

  return (
    <>
      <div className="w-full px-8">
        <div className="max-w-[1440px] mx-auto">
          
          <motion.div {...fadeUp} className="mb-10">
             <h1 className="text-display-hero text-ink mb-2 tracking-tight text-[32px]">Proctoring Analytics.</h1>
             <p className="text-body-standard text-ash max-w-[600px]">
               Audit anomaly patterns and visual evidence across all examination sessions.
             </p>
          </motion.div>

          <motion.div {...scaleIn} transition={{ ...scaleIn.transition, delay: 0.1 }}>
            <Card elevated className="bg-white overflow-hidden border-hairline">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-hairline bg-soft-cloud/30">
                      <th className="px-6 py-3 text-[11px] font-bold text-ash uppercase tracking-wider">Session Info</th>
                      <th className="px-6 py-3 text-[11px] font-bold text-ash uppercase tracking-wider">Exam Attempt</th>
                      <th className="px-6 py-3 text-[11px] font-bold text-ash uppercase tracking-wider text-center">Intensity</th>
                      <th className="px-6 py-3 text-[11px] font-bold text-ash uppercase tracking-wider text-center">Anomaly Mix</th>
                      <th className="px-6 py-3 text-[11px] font-bold text-ash uppercase tracking-wider text-right">Evidence</th>
                    </tr>
                  </thead>
                  <tbody className="text-[13px] text-ink">
                    {loading ? (
                      <tr><td colSpan={5} className="text-center py-12 text-ash">Loading analytics...</td></tr>
                    ) : logs.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-12 text-ash font-mono text-[12px]">No proctoring logs found.</td></tr>
                    ) : (
                      logs.map((log, idx) => (
                        <motion.tr
                          key={log.result_id}
                          {...tableRowVariant}
                          transition={{ ...tableRowVariant.transition, delay: idx * 0.03 }}
                          className="border-b border-hairline hover:bg-soft-cloud/40 transition-colors group"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col">
                                <span className="font-semibold text-ink leading-tight">{log.users?.name || 'Unknown'}</span>
                                <span className="text-[11px] text-ash font-mono mt-0.5">Take ID: {log.result_id.slice(0, 8)}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">{log.exams?.exam_name}</span>
                              <div className="flex items-center gap-2">
                                {(log as any).status === 'in_progress' ? (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 uppercase tracking-tighter">
                                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                    Live
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-ash uppercase tracking-tighter">Archived</span>
                                )}
                                <span className="text-[11px] text-ash/60">{new Date(log.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase border ${getIntensityColor(log)}`}>
                              {getIntensityLabel(log)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-1.5">
                              {[
                                { count: log.no_face_count, label: 'NF' },
                                { count: log.multiple_face_count, label: 'MF' },
                                { count: log.cell_phone_count, label: 'PH' },
                                { count: log.prohibited_object_count, label: 'OBJ' }
                              ].map((stat, i) => (
                                <div key={i} className={`flex flex-col items-center justify-center w-[32px] h-[32px] rounded-[4px] border ${stat.count > 0 ? 'bg-ink text-white border-transparent' : 'bg-soft-cloud text-stone border-hairline opacity-40'}`}>
                                  <span className="text-[9px] font-bold leading-none">{stat.label}</span>
                                  <span className="text-[11px] font-bold leading-none mt-0.5">{stat.count}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button 
                              variant="filter" 
                              className="h-[32px] px-3 text-[11px]"
                              onClick={() => setSelectedScreenshots(log.screenshots || [])}
                              disabled={!log.screenshots || log.screenshots.length === 0}
                            >
                              Snapshots ({(log.screenshots || []).length})
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
              className="w-full max-w-[1000px] max-h-[85vh] bg-white rounded-[16px] overflow-hidden flex flex-col shadow-2xl"
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
                     className="grid grid-cols-1 md:grid-cols-3 gap-6"
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
