'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FeedbackBanner } from '@/components/ui/FeedbackBanner';
import { ReportDrawerShell } from '@/components/ui/ReportDrawerShell';
import type { TakeAiReport, TakeDrawerDetails, TakeDrawerSnapshot } from '@/types/takeReport';

type DrawerTab = 'details' | 'ai' | 'snapshots';
type SnapshotTab = 'camera' | 'browser';

interface TakeReportDrawerProps {
  open: boolean;
  title: string;
  subtitle?: string;
  details: TakeDrawerDetails | null;
  report: TakeAiReport | null;
  snapshots: TakeDrawerSnapshot[];
  loading: boolean;
  error: string | null;
  regenerating?: boolean;
  onClose: () => void;
  onRegenerate: () => void;
}

function riskTone(risk: TakeAiReport['riskLevel']) {
  if (risk === 'high') return 'bg-red-100 text-red-700';
  if (risk === 'medium') return 'bg-amber-100 text-amber-700';
  return 'bg-emerald-100 text-emerald-700';
}

function formatEventType(type: string) {
  const normalized = type.replace(/^browser_/, '').replace(/_/g, ' ').trim();
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function TakeReportDrawer({
  open,
  title,
  subtitle,
  details,
  report,
  snapshots,
  loading,
  error,
  regenerating = false,
  onClose,
  onRegenerate,
}: TakeReportDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('details');
  const [activeSnapTab, setActiveSnapTab] = useState<SnapshotTab>('camera');

  useEffect(() => {
    if (open) {
      setActiveTab('details');
      setActiveSnapTab('camera');
    }
  }, [open, details?.takeIdShort]);

  const cameraSnapshots = useMemo(() => snapshots.filter((snap) => !snap.isBrowserEvent), [snapshots]);
  const browserSnapshots = useMemo(() => snapshots.filter((snap) => snap.isBrowserEvent), [snapshots]);

  return (
    <ReportDrawerShell
      open={open}
      title={title}
      subtitle={subtitle}
      onClose={onClose}
    >
      <div className="mt-1 flex flex-wrap gap-2">
        <Button variant={activeTab === 'details' ? 'primary-blue' : 'filter'} size="xs" onClick={() => setActiveTab('details')}>
          Details
        </Button>
        <Button variant={activeTab === 'ai' ? 'primary-blue' : 'filter'} size="xs" onClick={() => setActiveTab('ai')}>
          AI Report
        </Button>
        <Button variant={activeTab === 'snapshots' ? 'primary-blue' : 'filter'} size="xs" onClick={() => setActiveTab('snapshots')}>
          Snapshots ({snapshots.length})
        </Button>
      </div>

      {activeTab === 'details' && details && (
        <div className="mt-3 rounded-[10px] border border-hairline bg-white p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-mute">Take Details</span>
            <span className="font-mono text-[10px] text-ash">#{details.takeIdShort}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[8px] border border-hairline bg-soft-cloud/40 px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-mute">Status</p>
              <p className="mt-1 text-[12px] font-semibold text-ink">{details.status === 'completed' ? 'Completed' : 'In Progress'}</p>
            </div>
            <div className="rounded-[8px] border border-hairline bg-soft-cloud/40 px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-mute">Visibility</p>
              <p className="mt-1 text-[12px] font-semibold text-ink">{details.visibilityLabel}</p>
            </div>
            <div className="rounded-[8px] border border-hairline bg-soft-cloud/40 px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-mute">Start</p>
              <p className="mt-1 text-[12px] font-semibold text-ink">{details.startedAtLabel}</p>
            </div>
            <div className="rounded-[8px] border border-hairline bg-soft-cloud/40 px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-mute">End</p>
              <p className="mt-1 text-[12px] font-semibold text-ink">{details.endedAtLabel}</p>
            </div>
            <div className="rounded-[8px] border border-hairline bg-soft-cloud/40 px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-mute">Duration</p>
              <p className="mt-1 text-[12px] font-semibold text-ink">{details.durationLabel}</p>
            </div>
            <div className="rounded-[8px] border border-hairline bg-soft-cloud/40 px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-mute">MCQ Score</p>
              <p className="mt-1 text-[12px] font-semibold text-ink">{details.mcqScore}%</p>
            </div>
            <div className="col-span-2 rounded-[8px] border border-hairline bg-soft-cloud/40 px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-mute">Coding</p>
              <p className="mt-1 text-[12px] font-semibold text-ink">{details.codingLabel}</p>
            </div>
            <div className="col-span-2 rounded-[8px] border border-hairline bg-soft-cloud/40 px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-mute">Integrity</p>
              <p className="mt-1 text-[12px] font-semibold text-ink">
                Total {details.anomalyTotal} · No face {details.noFaceCount} · Multi-face {details.multipleFaceCount} · Phone {details.cellPhoneCount} · Object {details.prohibitedObjectCount}
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ai' && (
        <>
          <div className="mt-3 ">
            <Button variant="filter" size="xs" onClick={onRegenerate} disabled={regenerating}>
              {regenerating ? 'Regenerating...' : 'Regenerate'}
            </Button>
          </div>
          <FeedbackBanner message={error} variant="error" />
          {loading ? (
            <div className="mt-3 space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-[88%] animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-[72%] animate-pulse rounded bg-slate-200" />
              <div className="h-20 animate-pulse rounded-[10px] bg-slate-200" />
            </div>
          ) : !report ? (
            <p className="mt-3 text-[12px] font-medium text-ash">No report available yet.</p>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="rounded-[10px] border border-hairline bg-white p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-mute">Risk Verdict</span>
                  <span className={`rounded-[6px] px-2 py-0.5 text-[10px] font-semibold uppercase ${riskTone(report.riskLevel)}`}>
                    {report.riskLevel}
                  </span>
                </div>
                <p className="text-[12px] leading-relaxed text-ink">{report.reportText}</p>
              </div>
              <div className="rounded-[10px] border border-hairline bg-white p-3">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-mute">Key Flags</span>
                {report.keyFlags.length === 0 ? (
                  <p className="mt-2 text-[12px] font-medium text-ash">No major flags detected.</p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {report.keyFlags.map((flag, index) => (
                      <li key={`${flag}-${index}`} className="text-[12px] text-ink">
                        • {flag}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-[10px] border border-hairline bg-white p-3 text-[11px] text-ash">
                Generated {new Date(report.generatedAt).toLocaleString()} · {report.model} · Prompt {report.promptVersion}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'snapshots' && (
        <div className="mt-3">
          <div className="mb-3 flex gap-2">
            <Button variant={activeSnapTab === 'camera' ? 'primary-blue' : 'filter'} size="xs" onClick={() => setActiveSnapTab('camera')}>
              Camera ({cameraSnapshots.length})
            </Button>
            <Button variant={activeSnapTab === 'browser' ? 'primary-blue' : 'filter'} size="xs" onClick={() => setActiveSnapTab('browser')}>
              Browser ({browserSnapshots.length})
            </Button>
          </div>
          {activeSnapTab === 'camera' ? (
            cameraSnapshots.length === 0 ? (
              <p className="rounded-[10px] border border-hairline bg-white p-4 text-center text-[12px] font-medium text-ash">
                No camera violation snapshots captured.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {cameraSnapshots.map((snap) => (
                  <div key={snap.id} className="rounded-[10px] border border-hairline bg-white p-2.5">
                    <div className="relative aspect-video overflow-hidden rounded-[8px] bg-black/10">
                      {snap.imageUrl ? (
                        <img src={snap.imageUrl} alt={`Camera violation: ${snap.type}`} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[12px] font-medium text-ash">No image available</div>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-red-500">{formatEventType(snap.type)}</span>
                      <span className="font-mono text-[10px] text-ash">{new Date(snap.detectedAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : browserSnapshots.length === 0 ? (
            <p className="rounded-[10px] border border-hairline bg-white p-4 text-center text-[12px] font-medium text-ash">
              No browser event logs captured.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {browserSnapshots.map((snap) => (
                <div key={snap.id} className="flex items-center justify-between rounded-[10px] border border-hairline bg-white px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 items-center rounded-[999px] bg-slate-100 px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                      Browser
                    </span>
                    <span className="text-[12px] font-semibold text-ink">{formatEventType(snap.type)}</span>
                  </div>
                  <span className="font-mono text-[10px] text-ash">{new Date(snap.detectedAt).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
          {snapshots.length === 0 && (
            <p className="mt-3 rounded-[10px] border border-hairline bg-white p-4 text-center text-[12px] font-medium text-ash">
              No snapshots captured during this take.
            </p>
          )}
        </div>
      )}
    </ReportDrawerShell>
  );
}
