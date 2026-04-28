'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type CameraDiagnosticsStatus = 'good' | 'warning' | 'poor' | 'pending';

interface CameraDiagnosticsProps {
  stream: MediaStream | null;
  sampleIntervalMs?: number;
  compact?: boolean;
  title?: string;
}

interface Metrics {
  brightness: number;
  sharpness: number;
  resolution: string;
}

function getStatusClass(status: CameraDiagnosticsStatus) {
  if (status === 'good') return 'bg-emerald-100 text-emerald-700';
  if (status === 'warning') return 'bg-amber-100 text-amber-700';
  if (status === 'poor') return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-700';
}

function scoreBrightness(level: number): CameraDiagnosticsStatus {
  if (level >= 95 && level <= 180) return 'good';
  if ((level >= 75 && level < 95) || (level > 180 && level <= 205)) return 'warning';
  return 'poor';
}

function scoreSharpness(level: number): CameraDiagnosticsStatus {
  if (level >= 22) return 'good';
  if (level >= 14) return 'warning';
  return 'poor';
}

function formatLabel(status: CameraDiagnosticsStatus) {
  if (status === 'pending') return 'Checking';
  if (status === 'good') return 'Good';
  if (status === 'warning') return 'Needs Attention';
  return 'Poor';
}

export function CameraDiagnostics({
  stream,
  sampleIntervalMs = 1200,
  compact = false,
  title = 'Camera Quality Check',
}: CameraDiagnosticsProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    video.srcObject = stream;
    if (stream) {
      void video.play().catch(() => undefined);
    }
  }, [stream]);

  useEffect(() => {
    if (!stream || !videoRef.current || !canvasRef.current) {
      setMetrics(null);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const sample = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (!width || !height) return;

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(video, 0, 0, width, height);
      const image = ctx.getImageData(0, 0, width, height).data;

      let brightnessTotal = 0;
      let edgeTotal = 0;
      let edgeCount = 0;
      const stride = 4 * 6;
      const rowStride = width * 4;

      for (let i = 0; i + rowStride + 8 < image.length; i += stride) {
        const r = image[i] ?? 0;
        const g = image[i + 1] ?? 0;
        const b = image[i + 2] ?? 0;
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        brightnessTotal += lum;

        const nr = image[i + 4] ?? 0;
        const ng = image[i + 5] ?? 0;
        const nb = image[i + 6] ?? 0;
        const br = image[i + rowStride] ?? 0;
        const bg = image[i + rowStride + 1] ?? 0;
        const bb = image[i + rowStride + 2] ?? 0;

        const nextLum = 0.2126 * nr + 0.7152 * ng + 0.0722 * nb;
        const belowLum = 0.2126 * br + 0.7152 * bg + 0.0722 * bb;
        edgeTotal += Math.abs(lum - nextLum) + Math.abs(lum - belowLum);
        edgeCount += 2;
      }

      const sampledPixels = Math.max(1, Math.floor(image.length / stride / 4));
      const brightness = brightnessTotal / sampledPixels;
      const sharpness = edgeCount > 0 ? edgeTotal / edgeCount : 0;

      setMetrics({
        brightness,
        sharpness,
        resolution: `${width}x${height}`,
      });
    };

    sample();
    timer = setInterval(sample, sampleIntervalMs);
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [sampleIntervalMs, stream]);

  const brightnessStatus = useMemo<CameraDiagnosticsStatus>(() => {
    if (!stream || !metrics) return 'pending';
    return scoreBrightness(metrics.brightness);
  }, [metrics, stream]);

  const qualityStatus = useMemo<CameraDiagnosticsStatus>(() => {
    if (!stream || !metrics) return 'pending';
    return scoreSharpness(metrics.sharpness);
  }, [metrics, stream]);

  return (
    <div className={`rounded-[10px] border border-hairline bg-white ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[12px] font-semibold text-ink">{title}</h3>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-ash">
          {metrics?.resolution ?? 'No signal'}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-[8px] border border-hairline bg-soft-cloud/30 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-mute">Brightness</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className={`rounded-[6px] px-2 py-0.5 text-[10px] font-semibold ${getStatusClass(brightnessStatus)}`}>
              {formatLabel(brightnessStatus)}
            </span>
            <span className="text-[11px] font-semibold text-ink">
              {metrics ? `${Math.round(metrics.brightness)}/255` : '--'}
            </span>
          </div>
        </div>

        <div className="rounded-[8px] border border-hairline bg-soft-cloud/30 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-mute">Image Quality</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className={`rounded-[6px] px-2 py-0.5 text-[10px] font-semibold ${getStatusClass(qualityStatus)}`}>
              {formatLabel(qualityStatus)}
            </span>
            <span className="text-[11px] font-semibold text-ink">
              {metrics ? metrics.sharpness.toFixed(1) : '--'}
            </span>
          </div>
        </div>
      </div>

      <p className="mt-3 text-[11px] font-medium text-ash">
        {!stream
          ? 'Allow camera access to start diagnostics.'
          : brightnessStatus === 'poor'
            ? 'Lighting is too low or too harsh. Face a light source and reduce backlight.'
            : qualityStatus === 'poor'
              ? 'Image looks blurry. Clean lens and keep device stable.'
              : 'Camera signal looks acceptable for proctoring.'}
      </p>

      <video ref={videoRef} className="hidden" autoPlay playsInline muted />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
