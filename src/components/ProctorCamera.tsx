'use client';

import { useState, useEffect, useRef } from "react";
import { useMediaPipe } from "@/hooks/useMediaPipe";
import { createBrowserClient } from '@supabase/ssr';
import { persistProctoringLog } from "@/lib/proctoringLogs";

interface ProctorCameraProps {
  width?: number;
  height?: number;
  examId?: string;
  takeId?: string;
}

export default function ProctorCamera({ width = 640, height = 480, examId, takeId }: ProctorCameraProps) {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { videoRef, canvasRef, isReady, anomalyEvent } = useMediaPipe();
    const [cameraError, setCameraError] = useState<string | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Turn camera on
    useEffect(() => {
        let isCancelled = false;
        async function startCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 480 },
                    audio: false, // Phase 5 object tracking only requires video
                });
                if (isCancelled) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => videoRef.current?.play();
                }
            } catch {
                setCameraError("Camera access denied.");
            }
        }
        startCamera();
        return () => {
            isCancelled = true;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
            }
        };
    }, [videoRef]);

    // Handle anomaly capture & background async upload to cheating_logs
    useEffect(() => {
        if (!anomalyEvent || !examId || !takeId) return;
        
        const pushAnomaly = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await persistProctoringLog(supabase, {
              examId,
              studentId: user.id,
              takeId,
              increments: {
                noFace: anomalyEvent.type === 'eye_off_screen' ? 1 : 0,
                multipleFace: anomalyEvent.type === 'multiple_persons' ? 1 : 0,
                cellPhone: anomalyEvent.type === 'phone_detected' ? 1 : 0,
              },
              screenshots: [{
                url: `data:image/jpeg;base64,${anomalyEvent.snapshotBase64}`,
                type: anomalyEvent.type,
                detectedAt: new Date(anomalyEvent.timestamp).toISOString(),
              }],
            });
        };

        pushAnomaly();
    }, [anomalyEvent, examId, takeId, supabase]);

    return (
        <div style={{ width, height }} className="relative overflow-hidden rounded-[14px] bg-ink object-cover">
           {cameraError && <div className="absolute inset-0 flex items-center justify-center bg-error/90 p-2 text-center text-[12px] font-medium text-white">{cameraError}</div>}
           <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
           <canvas ref={canvasRef} className="hidden" />
           {!isReady && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center text-[12px] font-medium text-white animate-pulse">Initializing camera</div>
           )}
        </div>
    );
}
