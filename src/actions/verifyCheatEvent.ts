/**
 * @file verifyCheatEvent.ts
 * @description Next.js Server Action that serves as the cloud verification
 *              pipeline for anomalies detected by the MediaPipe edge AI.
 *
 * Pipeline:
 *   1. Gemini 1.5 Flash — Analyze the webcam snapshot for academic dishonesty
 *   2. Parse & validate — JSON parse, threshold gate (confidence ≥ 0.70)
 *   3. Supabase — Insert cheat_event, increment session violation_count
 *   4. Resend — Send structured HTML email alert to admin (CC student)
 *   5. Return — { success, geminiResult } to the calling client component
 */

"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { Resend } from "resend";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/** Input parameters for the Server Action. */
interface VerifyCheatEventInput {
  /** UUID of the active proctoring session. */
  sessionId: string;
  /** Full name of the student being proctored. */
  studentName: string;
  /** Email address of the student. */
  studentEmail: string;
  /** Name of the exam being taken. */
  examName: string;
  /** Anomaly type detected by MediaPipe edge AI. */
  anomalyType: string;
  /** Raw base64-encoded JPEG snapshot (no data URI prefix). */
  snapshotBase64: string;
}

/** Parsed response from Gemini's analysis. */
interface GeminiVerificationResult {
  /** Whether Gemini believes cheating is occurring. */
  cheat_detected: boolean;
  /** Human-readable reason for the verdict. */
  reason: string;
  /** Confidence score between 0.0 and 1.0. */
  confidence_score: number;
  /** Severity level of the detected violation. */
  severity: "low" | "medium" | "high";
}

/** Return type of the Server Action. */
interface VerifyCheatEventResult {
  /** Whether the entire pipeline completed successfully. */
  success: boolean;
  /** Gemini's parsed result (only present when cheat was confirmed). */
  geminiResult?: GeminiVerificationResult;
  /** Error message if the pipeline failed at any step. */
  error?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Minimum Gemini confidence score required to confirm a violation. */
const CONFIDENCE_THRESHOLD = 0.7;

/**
 * System prompt for Gemini 1.5 Flash — instructs it to act as an impartial
 * exam proctor and respond with structured JSON only.
 */
const GEMINI_SYSTEM_PROMPT = `You are a strict, impartial online exam proctor. Your only job is to analyze the provided webcam frame and determine if academic dishonesty is occurring. Look for: a visible mobile phone, tablet, or secondary screen; a second person in the frame; the student looking significantly away from the screen for a suspicious duration; unauthorized notes or books visible. Be lenient with minor head movements (sneezing, drinking water). Respond STRICTLY in raw JSON only (no markdown, no backticks): { "cheat_detected": boolean, "reason": string, "confidence_score": number, "severity": "low"|"medium"|"high" }`;

// =============================================================================
// SERVER ACTION
// =============================================================================

/**
 * Verifies a potential cheat event detected by MediaPipe using Gemini 1.5 Flash,
 * logs confirmed violations in Supabase, and sends email alerts via Resend.
 *
 * @param input - The cheat event data including session info and snapshot
 * @returns Result object indicating success/failure with optional Gemini result
 *
 * @example
 * ```ts
 * const result = await verifyCheatEvent({
 *   sessionId: "uuid-here",
 *   studentName: "John Doe",
 *   studentEmail: "john@example.com",
 *   examName: "Final Exam",
 *   anomalyType: "eye_off_screen",
 *   snapshotBase64: "base64-jpeg-data..."
 * });
 * ```
 */
export async function verifyCheatEvent(
  input: VerifyCheatEventInput
): Promise<VerifyCheatEventResult> {
  const {
    sessionId,
    studentName,
    studentEmail,
    examName,
    anomalyType,
    snapshotBase64,
  } = input;

  try {
    // =========================================================================
    // STEP 1: GEMINI 1.5 FLASH — IMAGE VERIFICATION
    // =========================================================================
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const model = genAI.getGenerativeModel({ model: modelName });

    const result = await model.generateContent([
      GEMINI_SYSTEM_PROMPT,
      {
        inlineData: {
          data: snapshotBase64,
          mimeType: "image/jpeg",
        },
      },
    ]);

    const responseText = result.response.text();

    // =========================================================================
    // STEP 2: PARSE & VALIDATE GEMINI RESPONSE
    // =========================================================================
    let geminiResult: GeminiVerificationResult;

    try {
      geminiResult = JSON.parse(responseText) as GeminiVerificationResult;
    } catch {
      console.error(
        "[verifyCheatEvent] Failed to parse Gemini response:",
        responseText
      );
      return { success: false, error: "AI parse error" };
    }

    // Gate: Only proceed if Gemini confirms cheating with sufficient confidence
    if (
      !geminiResult.cheat_detected ||
      geminiResult.confidence_score < CONFIDENCE_THRESHOLD
    ) {
      return {
        success: true,
        geminiResult,
        error: undefined,
      };
    }

    // =========================================================================
    // STEP 3: SUPABASE — LOG CHEAT EVENT & INCREMENT VIOLATION COUNT
    // =========================================================================
    const supabase = await createSupabaseServerClient();

    // Insert the confirmed cheat event
    // TODO: MIGRATE TO BACKEND — Move to Spring Boot API in Phase 2
    const { error: insertError } = await supabase
      .from("cheat_events")
      .insert({
        session_id: sessionId,
        type: anomalyType,
        source: "gemini_cloud",
        confidence: geminiResult.confidence_score,
        gemini_reason: geminiResult.reason,
        snapshot_url: null, // MVP: no Storage upload yet
      });

    if (insertError) {
      console.error(
        "[verifyCheatEvent] Supabase insert cheat_event error:",
        insertError
      );
    }

    // Increment violation_count on the session
    // TODO: MIGRATE TO BACKEND — Move to Spring Boot API in Phase 2
    // First, read current violation_count
    const { data: sessionData, error: sessionReadError } = await supabase
      .from("proctoring_sessions")
      .select("violation_count")
      .eq("id", sessionId)
      .single();

    if (sessionReadError) {
      console.error(
        "[verifyCheatEvent] Supabase read session error:",
        sessionReadError
      );
    } else {
      const newCount = (sessionData?.violation_count ?? 0) + 1;
      const { error: updateError } = await supabase
        .from("proctoring_sessions")
        .update({ violation_count: newCount })
        .eq("id", sessionId);

      if (updateError) {
        console.error(
          "[verifyCheatEvent] Supabase update violation_count error:",
          updateError
        );
      }
    }

    // =========================================================================
    // STEP 4: RESEND — EMAIL ALERT
    // =========================================================================
    try {
      const resend = new Resend(process.env.RESEND_API_KEY!);

      const violationTime = new Date().toLocaleString("en-US", {
        dateStyle: "full",
        timeStyle: "medium",
        timeZone: "UTC",
      });

      const confidencePercent = Math.round(
        geminiResult.confidence_score * 100
      );

      const severityColor =
        geminiResult.severity === "high"
          ? "#dc2626"
          : geminiResult.severity === "medium"
            ? "#f97316"
            : "#eab308";

      const severityLabel = geminiResult.severity.toUpperCase();

      const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
    <!-- Header -->
    <tr>
      <td style="background-color:#dc2626;padding:20px 24px;">
        <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">
          ⚠️ PROCTORING ALERT
        </h1>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding:24px;">
        <p style="margin:0 0 20px 0;color:#374151;font-size:15px;line-height:1.6;">
          A violation has been detected during a proctored exam session. Details below:
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
          <tr style="background-color:#f9fafb;">
            <td style="padding:10px 14px;font-weight:600;color:#374151;font-size:14px;border-bottom:1px solid #e5e7eb;width:40%;">Session ID</td>
            <td style="padding:10px 14px;color:#6b7280;font-size:14px;border-bottom:1px solid #e5e7eb;">${sessionId}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;font-weight:600;color:#374151;font-size:14px;border-bottom:1px solid #e5e7eb;">Student Name</td>
            <td style="padding:10px 14px;color:#6b7280;font-size:14px;border-bottom:1px solid #e5e7eb;">${studentName}</td>
          </tr>
          <tr style="background-color:#f9fafb;">
            <td style="padding:10px 14px;font-weight:600;color:#374151;font-size:14px;border-bottom:1px solid #e5e7eb;">Exam Name</td>
            <td style="padding:10px 14px;color:#6b7280;font-size:14px;border-bottom:1px solid #e5e7eb;">${examName}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;font-weight:600;color:#374151;font-size:14px;border-bottom:1px solid #e5e7eb;">Violation Time (UTC)</td>
            <td style="padding:10px 14px;color:#6b7280;font-size:14px;border-bottom:1px solid #e5e7eb;">${violationTime}</td>
          </tr>
          <tr style="background-color:#f9fafb;">
            <td style="padding:10px 14px;font-weight:600;color:#374151;font-size:14px;border-bottom:1px solid #e5e7eb;">Anomaly Type (Edge AI)</td>
            <td style="padding:10px 14px;color:#6b7280;font-size:14px;border-bottom:1px solid #e5e7eb;">${anomalyType}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;font-weight:600;color:#374151;font-size:14px;border-bottom:1px solid #e5e7eb;">AI Reason</td>
            <td style="padding:10px 14px;color:#6b7280;font-size:14px;border-bottom:1px solid #e5e7eb;">${geminiResult.reason}</td>
          </tr>
          <tr style="background-color:#f9fafb;">
            <td style="padding:10px 14px;font-weight:600;color:#374151;font-size:14px;border-bottom:1px solid #e5e7eb;">AI Confidence</td>
            <td style="padding:10px 14px;color:#374151;font-size:14px;font-weight:700;border-bottom:1px solid #e5e7eb;">${confidencePercent}%</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;font-weight:600;color:#374151;font-size:14px;">Severity</td>
            <td style="padding:10px 14px;">
              <span style="display:inline-block;padding:3px 10px;border-radius:9999px;font-size:12px;font-weight:700;color:#ffffff;background-color:${severityColor};">
                ${severityLabel}
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding:16px 24px;border-top:1px solid #e5e7eb;background-color:#f9fafb;">
        <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">
          This alert was auto-generated by the AI Proctoring System. Please review the session recording for full context before taking action.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

      const { error: emailError } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: [process.env.ADMIN_ALERT_EMAIL!],
        cc: [studentEmail],
        subject: `[PROCTORING ALERT] Violation Detected — ${examName}`,
        html: htmlBody,
      });

      if (emailError) {
        console.error(
          "[verifyCheatEvent] Resend email error:",
          emailError
        );
      }
    } catch (emailErr) {
      // Email failure should not break the pipeline
      console.error("[verifyCheatEvent] Email send failed:", emailErr);
    }

    // =========================================================================
    // STEP 5: RETURN SUCCESS
    // =========================================================================
    return {
      success: true,
      geminiResult,
    };
  } catch (err) {
    console.error("[verifyCheatEvent] Unexpected pipeline error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown server error",
    };
  }
}
