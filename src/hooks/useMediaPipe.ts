/**
 * @file useMediaPipe.ts
 * @description Custom React hook encapsulating all MediaPipe edge AI logic for
 *              real-time webcam analysis during proctoring sessions.
 *
 * This hook lazy-loads both FaceLandmarker (head pose estimation) and
 * ObjectDetector (phone/person detection) from the @mediapipe/tasks-vision
 * package, runs a continuous requestAnimationFrame analysis loop, and emits
 * debounced anomaly events with auto-captured JPEG snapshots.
 *
 * Detection pipeline:
 *   1. FaceLandmarker → 4×4 transformation matrix → yaw/pitch angles
 *      → if looking away > 3s consecutively → 'eye_off_screen'
 *   2. ObjectDetector → scan for 'cell phone' (score > 0.6) → 'phone_detected'
 *                     → count 'person' detections > 1 → 'multiple_persons'
 *   3. Per-type 12s debounce prevents duplicate triggers
 *   4. On trigger: capture video frame → base64 JPEG → set anomalyEvent state
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Type Imports (lazy-loaded at runtime, typed here for TS) ────────────────
import type {
    FaceLandmarker,
    ObjectDetector,
} from "@mediapipe/tasks-vision";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/** Anomaly event emitted when a cheating indicator is detected. */
export interface AnomalyEvent {
    /** The type of anomaly detected by MediaPipe edge AI. */
    type: "eye_off_screen" | "multiple_persons" | "phone_detected";
    /** Unix timestamp (ms) when the anomaly was triggered. */
    timestamp: number;
    /** Raw base64-encoded JPEG snapshot (no `data:` URI prefix). */
    snapshotBase64: string;
}

/** Return type of the useMediaPipe hook. */
export interface MediaPipeHookReturn {
    /** Ref to attach to the <video> element for webcam feed. */
    videoRef: React.RefObject<HTMLVideoElement | null>;
    /** Ref to attach to a hidden <canvas> element for snapshot capture. */
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    /** Whether both MediaPipe models have finished loading. */
    isReady: boolean;
    /** The latest anomaly event, or null if no anomaly is active. */
    anomalyEvent: AnomalyEvent | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** CDN base URL for MediaPipe WASM runtime files. */
const WASM_CDN_URL =
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm";

/** CDN URL for the FaceLandmarker model (float16 variant). */
const FACE_LANDMARKER_MODEL_URL =
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

/** CDN URL for the ObjectDetector model (EfficientDet-Lite0, int8). */
const OBJECT_DETECTOR_MODEL_URL =
    "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite";

/** Maximum yaw angle (left/right) in degrees before flagging. */
const HEAD_YAW_THRESHOLD = 25;

/** Maximum pitch angle (up/down) in degrees before flagging. */
const HEAD_PITCH_THRESHOLD = 20;

/** Consecutive milliseconds looking away before emitting 'eye_off_screen'. */
const LOOK_AWAY_DURATION_MS = 3000;

/** Cooldown period (ms) per anomaly type to prevent duplicate triggers. */
const DEBOUNCE_MS = 12_000;

/** Minimum confidence score for phone detection. */
const PHONE_CONFIDENCE_THRESHOLD = 0.6;

/** Conversion factor from radians to degrees. */
const RAD_TO_DEG = 180 / Math.PI;

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Custom hook that initializes MediaPipe FaceLandmarker and ObjectDetector,
 * runs a continuous analysis loop on the webcam feed, and emits debounced
 * anomaly events with auto-captured snapshots.
 *
 * @returns {MediaPipeHookReturn} Refs for video/canvas elements, readiness
 *          state, and the latest anomaly event.
 *
 * @example
 * ```tsx
 * const { videoRef, canvasRef, isReady, anomalyEvent } = useMediaPipe();
 * // Attach videoRef to <video>, canvasRef to hidden <canvas>
 * // Watch anomalyEvent for detected anomalies
 * ```
 */
export function useMediaPipe(): MediaPipeHookReturn {
    // ─── Refs ──────────────────────────────────────────────────────────────────
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
    const objectDetectorRef = useRef<ObjectDetector | null>(null);
    const rafIdRef = useRef<number | null>(null);
    const lastVideoTimeRef = useRef<number>(-1);
    const lastInferenceTimeRef = useRef<number>(0);

    /** Timestamp when the user started looking away, or null if facing screen. */
    const lookAwayStartRef = useRef<number | null>(null);

    /** Per-type cooldown map: stores the last trigger timestamp for each type. */
    const cooldownMapRef = useRef<Map<string, number>>(new Map());

    // ─── State ─────────────────────────────────────────────────────────────────
    const [isReady, setIsReady] = useState<boolean>(false);
    const [anomalyEvent, setAnomalyEvent] = useState<AnomalyEvent | null>(null);

    // ─── Debounce Check ────────────────────────────────────────────────────────
    /**
     * Checks if an anomaly of the given type can be triggered based on the
     * per-type cooldown. If allowed, updates the cooldown timestamp.
     *
     * @param type - The anomaly type to check
     * @returns true if the anomaly can fire (cooldown has elapsed)
     */
    const canTrigger = useCallback((type: string): boolean => {
        const lastTrigger = cooldownMapRef.current.get(type) ?? 0;
        if (Date.now() - lastTrigger < DEBOUNCE_MS) return false;
        cooldownMapRef.current.set(type, Date.now());
        return true;
    }, []);

    // ─── Snapshot Capture ──────────────────────────────────────────────────────
    /**
     * Captures the current video frame to the hidden canvas and returns it
     * as a raw base64-encoded JPEG string (without the data URI prefix).
     *
     * @returns Raw base64 JPEG string, or empty string if capture fails
     */
    const captureSnapshot = useCallback((): string => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return "";

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) return "";

        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
        return dataUrl.replace(/^data:image\/jpeg;base64,/, "");
    }, []);

    // ─── Emit Anomaly ─────────────────────────────────────────────────────────
    /**
     * Emits an anomaly event if the per-type cooldown has elapsed.
     * Automatically captures a snapshot of the current video frame.
     *
     * @param type - The anomaly type detected
     */
    const emitAnomaly = useCallback(
        (type: AnomalyEvent["type"]) => {
            if (!canTrigger(type)) return;

            const snapshotBase64 = captureSnapshot();
            setAnomalyEvent({
                type,
                timestamp: Date.now(),
                snapshotBase64,
            });
        },
        [canTrigger, captureSnapshot]
    );

    // ─── Head Pose Extraction ─────────────────────────────────────────────────
    /**
     * Extracts yaw and pitch angles from a 4×4 facial transformation matrix.
     *
     * The matrix is a column-major Float32Array (16 elements) representing
     * the affine transform from canonical face space to camera space.
     *
     * Column-major layout:
     *   m[0]=R00  m[4]=R01  m[8]=R02   m[12]=Tx
     *   m[1]=R10  m[5]=R11  m[9]=R12   m[13]=Ty
     *   m[2]=R20  m[6]=R21  m[10]=R22  m[14]=Tz
     *   m[3]=0    m[7]=0    m[11]=0    m[15]=1
     *
     * Using ZYX Euler angle extraction:
     *   yaw   = atan2(R10, R00) = atan2(m[1], m[0])
     *   pitch = atan2(-R20, sqrt(R21² + R22²)) = atan2(-m[2], sqrt(m[6]² + m[10]²))
     *
     * @param matrix - The 4×4 column-major transformation matrix
     * @returns Object with yaw and pitch in degrees
     */
    const extractHeadPose = useCallback(
        (matrix: Float32Array): { yaw: number; pitch: number } => {
            const yaw = Math.atan2(matrix[1], matrix[0]) * RAD_TO_DEG;
            const pitch =
                Math.atan2(
                    -matrix[2],
                    Math.sqrt(matrix[6] * matrix[6] + matrix[10] * matrix[10])
                ) * RAD_TO_DEG;
            return { yaw, pitch };
        },
        []
    );

    // ─── Analysis Loop ─────────────────────────────────────────────────────────
    /**
     * The core requestAnimationFrame analysis loop. Runs both the FaceLandmarker
     * and ObjectDetector on each new video frame, checks thresholds, and emits
     * anomalies when conditions are met.
     */
    const analyzeFrame = useCallback(() => {
        const video = videoRef.current;
        const faceLandmarker = faceLandmarkerRef.current;
        const objectDetector = objectDetectorRef.current;

        if (
            !video ||
            !faceLandmarker ||
            !objectDetector ||
            video.paused ||
            video.ended ||
            video.readyState < 4 || // HAVE_ENOUGH_DATA
            video.videoWidth <= 0 ||
            video.videoHeight <= 0
        ) {
            rafIdRef.current = requestAnimationFrame(analyzeFrame);
            return;
        }

        // Skip if the video frame hasn't changed
        if (video.currentTime === lastVideoTimeRef.current) {
            rafIdRef.current = requestAnimationFrame(analyzeFrame);
            return;
        }
        lastVideoTimeRef.current = video.currentTime;

        const timestamp = performance.now();

        // ── PERFORMANCE BYPASS (THROTTLING) ──
        // Only run the heavy WebAssembly DOM extraction exactly once per 1000ms.
        if (timestamp - lastInferenceTimeRef.current < 1000) {
            rafIdRef.current = requestAnimationFrame(analyzeFrame);
            return;
        }
        lastInferenceTimeRef.current = timestamp;

        // Draw video frame to canvas for more stable analysis input
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(video, 0, 0);
            }
        }

        // ── FaceLandmarker: Head Pose Analysis ──
        try {
            // Using canvas as input for better stability
            const faceResult = faceLandmarker.detectForVideo(canvas || video, timestamp);

            if (
                faceResult.facialTransformationMatrixes &&
                faceResult.facialTransformationMatrixes.length > 0
            ) {
                const matrix = faceResult.facialTransformationMatrixes[0].data;
                const { yaw, pitch } = extractHeadPose(
                    new Float32Array(matrix)
                );

                const isLookingAway =
                    Math.abs(yaw) > HEAD_YAW_THRESHOLD ||
                    Math.abs(pitch) > HEAD_PITCH_THRESHOLD;

                if (isLookingAway) {
                    if (lookAwayStartRef.current === null) {
                        lookAwayStartRef.current = Date.now();
                    } else if (
                        Date.now() - lookAwayStartRef.current >
                        LOOK_AWAY_DURATION_MS
                    ) {
                        emitAnomaly("eye_off_screen");
                        lookAwayStartRef.current = null;
                    }
                } else {
                    lookAwayStartRef.current = null;
                }
            }
        } catch (err) {
            console.error("[useMediaPipe] FaceLandmarker error:", err);
        }

        // ── ObjectDetector: Phone & Multiple Persons ──
        try {
            // Using canvas as input for better stability
            const objectResult = objectDetector.detectForVideo(canvas || video, timestamp);

            let personCount = 0;

            for (const detection of objectResult.detections) {
                for (const category of detection.categories) {
                    const label = category.categoryName?.toLowerCase() ?? "";
                    const score = category.score ?? 0;

                    if (label === "cell phone" && score > PHONE_CONFIDENCE_THRESHOLD) {
                        emitAnomaly("phone_detected");
                    }

                    if (label === "person") {
                        personCount++;
                    }
                }
            }

            if (personCount > 1) {
                emitAnomaly("multiple_persons");
            }
        } catch (err) {
            console.error("[useMediaPipe] ObjectDetector error:", err);
        }

        // Schedule next frame
        rafIdRef.current = requestAnimationFrame(analyzeFrame);
    }, [extractHeadPose, emitAnomaly]);

    // ─── Initialization Effect ─────────────────────────────────────────────────
    useEffect(() => {

        let isCancelled = false;

        async function initializeMediaPipe() {
            try {
                const vision = await import("@mediapipe/tasks-vision");
                const { FilesetResolver, FaceLandmarker, ObjectDetector } = vision;

                const filesetResolver = await FilesetResolver.forVisionTasks(
                    WASM_CDN_URL
                );

                if (isCancelled) return;

                // Initialize FaceLandmarker
                const faceLandmarker = await FaceLandmarker.createFromOptions(
                    filesetResolver,
                    {
                        baseOptions: {
                            modelAssetPath: FACE_LANDMARKER_MODEL_URL,
                            delegate: "CPU", // Forced CPU for stability
                        },
                        numFaces: 1,
                        runningMode: "VIDEO",
                        outputFaceBlendshapes: false,
                        outputFacialTransformationMatrixes: true,
                    }
                );

                if (isCancelled) {
                    faceLandmarker.close();
                    return;
                }

                // Initialize ObjectDetector
                const objectDetector = await ObjectDetector.createFromOptions(
                    filesetResolver,
                    {
                        baseOptions: {
                            modelAssetPath: OBJECT_DETECTOR_MODEL_URL,
                            delegate: "CPU", // Forced CPU for stability
                        },
                        runningMode: "VIDEO",
                        scoreThreshold: 0.5,
                        maxResults: 5,
                    }
                );

                if (isCancelled) {
                    faceLandmarker.close();
                    objectDetector.close();
                    return;
                }

                faceLandmarkerRef.current = faceLandmarker;
                objectDetectorRef.current = objectDetector;
                setIsReady(true);
                rafIdRef.current = requestAnimationFrame(analyzeFrame);
            } catch (err) {
                console.error("[useMediaPipe] Initialization failed:", err);
            }
        }

        initializeMediaPipe();

        return () => {
            isCancelled = true;
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
            if (faceLandmarkerRef.current) {
                faceLandmarkerRef.current.close();
                faceLandmarkerRef.current = null;
            }
            if (objectDetectorRef.current) {
                objectDetectorRef.current.close();
                objectDetectorRef.current = null;
            }
        };
    }, [analyzeFrame]);

    return { videoRef, canvasRef, isReady, anomalyEvent };
}
