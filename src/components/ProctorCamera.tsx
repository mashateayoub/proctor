'use client';

import { useState, useEffect, useRef } from "react";
import { useMediaPipe } from "@/hooks/useMediaPipe";
import { createBrowserClient } from '@supabase/ssr';

interface ProctorCameraProps {
  width?: number;
  height?: number;
  examId?: string;
}

export default function ProctorCamera({ width = 640, height = 480, examId }: ProctorCameraProps) {
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
            } catch (err) {
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
        if (!anomalyEvent || !examId) return;
        
        const pushAnomaly = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch current cheating_logs row (or create)
            const { data: currentLog, error: fetchErr } = await supabase
              .from('cheating_logs')
              .select('*')
              .eq('exam_id', examId)
              .eq('student_id', user.id)
              .single();

            if (fetchErr && fetchErr.code !== 'PGRST116') {
               console.error(fetchErr);
               return; // Unexpected error
            }

            let newPayload: any = {
               exam_id: examId,
               student_id: user.id,
               no_face_count: 0,
               multiple_face_count: 0,
               cell_phone_count: 0,
               prohibited_object_count: 0,
               screenshots: []
            };

            if (currentLog) {
               newPayload = { ...currentLog };
            }

            // 2. Increment Counters
            if (anomalyEvent.type === 'eye_off_screen') newPayload.no_face_count += 1;
            if (anomalyEvent.type === 'multiple_persons') newPayload.multiple_face_count += 1;
            if (anomalyEvent.type === 'phone_detected') newPayload.cell_phone_count += 1;

            // 3. Append Screenshot 
            // In a production environment, we upload the raw base64 to Supabase Storage and push a secure URL.
            // For MVP velocity and lack of Storage bucket setup configuration, we bundle the raw string into JSONB.
            newPayload.screenshots.push({
               url: `data:image/jpeg;base64,${anomalyEvent.snapshotBase64}`,
               type: anomalyEvent.type,
               detectedAt: new Date(anomalyEvent.timestamp).toISOString()
            });

            // 4. Update or Insert
            if (currentLog) {
               await supabase.from('cheating_logs').update(newPayload).eq('id', currentLog.id);
            } else {
               await supabase.from('cheating_logs').insert(newPayload);
            }
        };

        pushAnomaly();
    }, [anomalyEvent, examId, supabase]);

    return (
        <div style={{ width, height }} className="relative bg-black overflow-hidden object-cover rounded-sm">
           {cameraError && <div className="absolute inset-0 flex items-center justify-center bg-red-900/50 text-white text-[10px] p-2 text-center">{cameraError}</div>}
           <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
           <canvas ref={canvasRef} className="hidden" />
           {!isReady && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center text-white font-mono text-[10px] animate-pulse">AI Wait</div>
           )}
        </div>
    );
}
