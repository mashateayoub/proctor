'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FeedbackBanner } from '@/components/ui/FeedbackBanner';
import { useToast } from '@/components/ui/ToastProvider';
import { fadeUp, fadeIn } from '@/lib/motion';
import { normalizeErrorMessage } from '@/lib/errors';
import { EnvironmentMode } from '@/types/sandbox';

type StepId = 'details' | 'coding' | 'tests' | 'review';

interface TestCase {
  label: string;
  input: string;
  expectedOutput: string;
}

const steps: { id: StepId; label: string }[] = [
  { id: 'details', label: 'Exam Details' },
  { id: 'coding', label: 'Coding Challenge' },
  { id: 'tests', label: 'Test Cases' },
  { id: 'review', label: 'Review & Publish' },
];

function getScheduleStatus(liveDate: string, deadDate: string) {
  if (!liveDate || !deadDate) return { tone: 'neutral', label: 'Incomplete schedule' };
  const live = new Date(liveDate);
  const dead = new Date(deadDate);
  if (Number.isNaN(live.getTime()) || Number.isNaN(dead.getTime()) || dead <= live) {
    return { tone: 'error', label: 'Invalid schedule' };
  }
  const now = new Date();
  if (now < live) return { tone: 'upcoming', label: 'Upcoming' };
  if (now > dead) return { tone: 'ended', label: 'Ended' };
  return { tone: 'live', label: 'Live window' };
}

function formatDateTime(value: string) {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function CreateExamPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const [currentStep, setCurrentStep] = useState<StepId>('details');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [examData, setExamData] = useState({
    exam_name: '',
    duration_minutes: 60,
    total_questions: 10,
    live_date: '',
    dead_date: '',
    environment_mode: 'standard' as EnvironmentMode,
    sandbox_profile_name: 'Linux Shell Lab',
    sandbox_url: '/v86/images/buildroot-bzimage68.bin',
    execution_provider: 'remote' as 'local' | 'remote',
    preferred_languages: 'javascript,python,java,go,rust,c,cpp,bash',
  });

  const [codingQuestion, setCodingQuestion] = useState({
    question_text: '',
    description: '',
  });

  const [testCases, setTestCases] = useState<TestCase[]>([]);

  const stepIndex = steps.findIndex((step) => step.id === currentStep);
  const scheduleStatus = getScheduleStatus(examData.live_date, examData.dead_date);
  const codingEnabled = Boolean(codingQuestion.question_text.trim());
  const completedCaseCount = testCases.filter(
    (tc) => tc.input.trim() && tc.expectedOutput.trim(),
  ).length;

  const reviewChecks = useMemo(() => {
    const checks = [];
    checks.push({ ok: Boolean(examData.exam_name.trim()), label: 'Exam title provided' });
    checks.push({ ok: examData.duration_minutes > 0, label: 'Duration is valid' });
    checks.push({ ok: examData.total_questions >= 0, label: 'MCQ target is valid' });
    checks.push({ ok: scheduleStatus.tone !== 'error' && scheduleStatus.tone !== 'neutral', label: 'Schedule is valid' });
    checks.push({
      ok:
        examData.environment_mode === 'standard' ||
        Boolean(examData.sandbox_url.trim()),
      label: 'Kernel image URL configured for terminal/hybrid mode',
    });
    return checks;
  }, [examData, scheduleStatus.tone]);

  const addTestCase = () => {
    setTestCases((prev) => [...prev, { label: '', input: '', expectedOutput: '' }]);
  };

  const removeTestCase = (idx: number) => {
    setTestCases((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateTestCase = (idx: number, field: keyof TestCase, value: string) => {
    setTestCases((prev) => prev.map((tc, i) => (i === idx ? { ...tc, [field]: value } : tc)));
  };

  const validateDetailsStep = () => {
    if (!examData.exam_name.trim()) return 'Course or assessment name is required.';
    if (examData.duration_minutes <= 0) return 'Duration must be greater than 0.';
    if (examData.total_questions < 0) return 'Total MCQ count cannot be negative.';
    if (!examData.live_date || !examData.dead_date) return 'Live and dead dates are required.';

    const live = new Date(examData.live_date);
    const dead = new Date(examData.dead_date);
    if (Number.isNaN(live.getTime()) || Number.isNaN(dead.getTime())) return 'Please provide valid dates.';
    if (dead <= live) return 'Dead date must be after live date.';
    if (examData.environment_mode !== 'standard' && !examData.sandbox_url.trim()) {
      return 'Kernel image URL is required for terminal/hybrid environments.';
    }
    return null;
  };

  const validateStep = (step: StepId) => {
    if (step === 'details') return validateDetailsStep();
    return null;
  };

  const goNextStep = () => {
    const validationError = validateStep(currentStep);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    if (stepIndex < steps.length - 1) {
      setCurrentStep(steps[stepIndex + 1].id);
    }
  };

  const goPrevStep = () => {
    setError(null);
    if (stepIndex > 0) {
      setCurrentStep(steps[stepIndex - 1].id);
    }
  };

  const goToStep = (target: StepId) => {
    const targetIndex = steps.findIndex((step) => step.id === target);
    if (targetIndex <= stepIndex) {
      setCurrentStep(target);
    }
  };

  const handlePublish = async (event: React.FormEvent) => {
    event.preventDefault();
    const detailsValidation = validateDetailsStep();
    if (detailsValidation) {
      setError(detailsValidation);
      setCurrentStep('details');
      return;
    }

    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('Not authenticated.');
      setLoading(false);
      return;
    }

    const generatedPin = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .insert({
        teacher_id: user.id,
        exam_name: examData.exam_name.trim(),
        duration_minutes: examData.duration_minutes,
        total_questions: examData.total_questions,
        live_date: new Date(examData.live_date).toISOString(),
        dead_date: new Date(examData.dead_date).toISOString(),
        pin_code: generatedPin,
        environment_mode: examData.environment_mode,
        vm_profile: {
          provider: 'v86',
          profile_name: examData.sandbox_profile_name.trim() || 'Linux Lab',
          boot_mode: 'kernel',
          wasm_path: '/v86/build/v86.wasm',
          bios_url: '/v86/bios/seabios.bin',
          vga_bios_url: '/v86/bios/vgabios.bin',
          bzimage_url: examData.sandbox_url.trim(),
          memory_mb: 256,
          vga_memory_mb: 8,
          cmdline: 'rw root=/dev/ram0 console=ttyS0 mitigations=off random.trust_cpu=on',
          network_mode: 'restricted_fetch_wisp',
        },
        execution_policy: {
          provider: examData.execution_provider,
          terminal_enabled: examData.environment_mode !== 'standard',
          preferred_languages: examData.preferred_languages
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
        },
      })
      .select()
      .single();

    if (examError || !exam) {
      setError(normalizeErrorMessage(examError, 'Failed to create exam setup.'));
      setLoading(false);
      return;
    }

    if (codingEnabled) {
      const { error: codeError } = await supabase
        .from('coding_questions')
        .insert({
          exam_id: exam.id,
          question_text: codingQuestion.question_text.trim(),
          description: codingQuestion.description.trim(),
          test_cases: testCases.filter((tc) => tc.input.trim() || tc.expectedOutput.trim()),
        });

      if (codeError) {
        console.error('Failed to append coding question', codeError);
        showToast({
          variant: 'warning',
          title: 'Exam created',
          message: 'Coding challenge could not be attached. You can add it later.',
        });
      }
    }

    showToast({
      variant: 'success',
      title: 'Exam created',
      message: 'Continue by adding questions to this exam.',
    });
    setLoading(false);
    router.push(`/teacher/add-questions?exam=${exam.id}`);
  };

  const inputStyles =
    'w-full rounded-[8px] border border-hairline bg-soft-cloud px-3 py-2.5 text-[13px] font-medium text-ink outline-none transition-colors focus:border-rausch';
  const areaStyles =
    'w-full resize-none rounded-[8px] border border-hairline bg-soft-cloud px-3 py-2.5 text-[13px] font-medium text-ink outline-none transition-colors focus:border-rausch';

  return (
    <div className="w-full">
      <div className="mx-auto max-w-[1320px]">
        <motion.div {...fadeUp} className="mb-7 flex flex-col gap-2">
          <h1 className="text-section-heading tracking-tight text-ink">Create Assessment.</h1>
          <p className="text-body-standard text-ash">
            Build exam configuration in guided steps, then publish and continue directly to the question bank.
          </p>
        </motion.div>

        <div className="mb-4">
          <FeedbackBanner message={error} variant="error" />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <Card elevated className="rounded-[12px] bg-white p-5 md:p-6" delay={0}>
            <div className="mb-5">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {steps.map((step, index) => {
                  const isActive = step.id === currentStep;
                  const isComplete = index < stepIndex;
                  return (
                    <button
                      type="button"
                      key={step.id}
                      onClick={() => goToStep(step.id)}
                      className={`rounded-[8px] border px-2 py-2 text-left transition-colors ${
                        isActive
                          ? 'border-rausch bg-rausch/5'
                          : isComplete
                            ? 'border-hairline bg-soft-cloud/50 hover:border-rausch/40'
                            : 'border-hairline bg-white'
                      }`}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-mute">
                        Step {index + 1}
                      </p>
                      <p className={`mt-0.5 text-[12px] font-semibold ${isActive ? 'text-rausch' : 'text-ink'}`}>
                        {step.label}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handlePublish} className="flex flex-col gap-5">
              {currentStep === 'details' && (
                <div className="flex flex-col gap-4">
                  <h2 className="text-card-title text-ink">Exam Details</h2>
                  <div>
                    <label className="mb-1 block text-caption font-semibold uppercase tracking-wider text-ash">
                      Course or Assessment Name
                    </label>
                    <input
                      required
                      type="text"
                      className={inputStyles}
                      placeholder="e.g. CS-101 Final Exam"
                      value={examData.exam_name}
                      onChange={(e) => setExamData((prev) => ({ ...prev, exam_name: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-caption font-semibold uppercase tracking-wider text-ash">
                        Duration (Minutes)
                      </label>
                      <input
                        required
                        type="number"
                        min={1}
                        className={inputStyles}
                        value={examData.duration_minutes}
                        onChange={(e) =>
                          setExamData((prev) => ({ ...prev, duration_minutes: Number(e.target.value) }))
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-caption font-semibold uppercase tracking-wider text-ash">
                        Total MCQ Target
                      </label>
                      <input
                        required
                        type="number"
                        min={0}
                        className={inputStyles}
                        value={examData.total_questions}
                        onChange={(e) =>
                          setExamData((prev) => ({ ...prev, total_questions: Number(e.target.value) }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-caption font-semibold uppercase tracking-wider text-ash">
                        Live Date
                      </label>
                      <input
                        required
                        type="datetime-local"
                        className={inputStyles}
                        value={examData.live_date}
                        onChange={(e) => setExamData((prev) => ({ ...prev, live_date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-caption font-semibold uppercase tracking-wider text-ash">
                        Dead Date
                      </label>
                      <input
                        required
                        type="datetime-local"
                        className={inputStyles}
                        value={examData.dead_date}
                        onChange={(e) => setExamData((prev) => ({ ...prev, dead_date: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-caption font-semibold uppercase tracking-wider text-ash">
                        Environment Mode
                      </label>
                      <select
                        className={inputStyles}
                        value={examData.environment_mode}
                        onChange={(e) =>
                          setExamData((prev) => ({
                            ...prev,
                            environment_mode: e.target.value as EnvironmentMode,
                          }))
                        }
                      >
                        <option value="standard">Standard (MCQ + coding)</option>
                        <option value="terminal_lab">Terminal/Linux Lab only</option>
                        <option value="hybrid">Hybrid (coding + terminal lab)</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-caption font-semibold uppercase tracking-wider text-ash">
                        Execution Provider
                      </label>
                      <select
                        className={inputStyles}
                        value={examData.execution_provider}
                        onChange={(e) =>
                          setExamData((prev) => ({
                            ...prev,
                            execution_provider: e.target.value as 'local' | 'remote',
                          }))
                        }
                      >
                        <option value="remote">Remote universal sandbox</option>
                        <option value="local">Local fallback (dev only)</option>
                      </select>
                    </div>
                  </div>

                  {examData.environment_mode !== 'standard' && (
                    <div className="rounded-[10px] border border-hairline bg-soft-cloud/40 p-3">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-mute">
                        Terminal/Linux Lab Profile
                      </p>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ash">
                            Profile Name
                          </label>
                          <input
                            className={inputStyles}
                            value={examData.sandbox_profile_name}
                            onChange={(e) =>
                              setExamData((prev) => ({
                                ...prev,
                                sandbox_profile_name: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ash">
                            Kernel image URL
                          </label>
                          <input
                            className={inputStyles}
                            placeholder="/v86/images/buildroot-bzimage68.bin"
                            value={examData.sandbox_url}
                            onChange={(e) =>
                              setExamData((prev) => ({
                                ...prev,
                                sandbox_url: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div className="mt-3">
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ash">
                          Preferred Languages (comma-separated)
                        </label>
                        <input
                          className={inputStyles}
                          value={examData.preferred_languages}
                          onChange={(e) =>
                            setExamData((prev) => ({
                              ...prev,
                              preferred_languages: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {currentStep === 'coding' && (
                <div className="flex flex-col gap-4">
                  <h2 className="text-card-title text-ink">Coding Challenge</h2>
                  <p className="text-[12px] font-medium text-ash">
                    Optional. Leave title empty if this exam has only MCQs.
                  </p>
                  <div>
                    <label className="mb-1 block text-caption font-semibold uppercase tracking-wider text-ash">
                      Challenge Title
                    </label>
                    <input
                      type="text"
                      className={inputStyles}
                      placeholder="e.g. Binary Tree Inversion"
                      value={codingQuestion.question_text}
                      onChange={(e) =>
                        setCodingQuestion((prev) => ({ ...prev, question_text: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-caption font-semibold uppercase tracking-wider text-ash">
                      Extended Description
                    </label>
                    <textarea
                      rows={5}
                      className={areaStyles}
                      placeholder="Specify boundaries, constraints, and requirements..."
                      value={codingQuestion.description}
                      onChange={(e) =>
                        setCodingQuestion((prev) => ({ ...prev, description: e.target.value }))
                      }
                    />
                  </div>
                </div>
              )}

              {currentStep === 'tests' && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-card-title text-ink">Test Cases</h2>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-mute">
                      {testCases.length} case{testCases.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  {!codingEnabled && (
                    <FeedbackBanner
                      message="Add a coding challenge title first if you want to configure test cases."
                      variant="info"
                      compact
                    />
                  )}

                  <AnimatePresence>
                    {codingEnabled && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="flex flex-col gap-3"
                      >
                        {testCases.map((tc, idx) => (
                          <div
                            key={`case-${idx}`}
                            className="rounded-[10px] border border-hairline bg-soft-cloud/40 p-3"
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-[11px] font-semibold uppercase tracking-wide text-mute">
                                Case #{idx + 1}
                              </span>
                              <button
                                type="button"
                                className="text-[11px] font-semibold uppercase tracking-wide text-rausch"
                                onClick={() => removeTestCase(idx)}
                              >
                                Remove
                              </button>
                            </div>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                              <div>
                                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ash">
                                  Input
                                </label>
                                <textarea
                                  rows={2}
                                  className={areaStyles}
                                  placeholder="stdin"
                                  value={tc.input}
                                  onChange={(e) => updateTestCase(idx, 'input', e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ash">
                                  Expected Output
                                </label>
                                <textarea
                                  rows={2}
                                  className={areaStyles}
                                  placeholder="stdout"
                                  value={tc.expectedOutput}
                                  onChange={(e) => updateTestCase(idx, 'expectedOutput', e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={addTestCase}
                          className="rounded-[10px] border border-dashed border-hairline bg-white py-2 text-[12px] font-semibold text-mute transition-colors hover:border-rausch hover:text-rausch"
                        >
                          + Add Case
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {currentStep === 'review' && (
                <div className="flex flex-col gap-4">
                  <h2 className="text-card-title text-ink">Review & Publish</h2>
                  <p className="text-[12px] font-medium text-ash">
                    Confirm this setup, publish the assessment, then continue to the question bank manager.
                  </p>
                  <div className="rounded-[10px] border border-hairline bg-soft-cloud/40 p-3">
                    <div className="flex flex-col gap-2">
                      {reviewChecks.map((check) => (
                        <div key={check.label} className="flex items-center gap-2 text-[12px]">
                          <span className={check.ok ? 'text-emerald-600' : 'text-red-500'}>
                            {check.ok ? '✓' : '•'}
                          </span>
                          <span className={check.ok ? 'text-ink' : 'text-ash'}>{check.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <motion.div
                {...fadeIn}
                transition={{ ...fadeIn.transition, delay: 0.1 }}
                className="mt-1 flex items-center justify-between border-t border-hairline pt-4"
              >
                <Button type="button" variant="secondary" onClick={goPrevStep} disabled={stepIndex === 0 || loading}>
                  Previous
                </Button>

                <div className="flex items-center gap-2">
                  <Button type="button" variant="pill-link" onClick={() => router.back()} disabled={loading}>
                    Cancel
                  </Button>
                  {currentStep === 'review' ? (
                    <Button type="submit" variant="primary" disabled={loading}>
                      {loading ? 'Publishing...' : 'Publish & Continue'}
                    </Button>
                  ) : (
                    <Button type="button" variant="primary" onClick={goNextStep} disabled={loading}>
                      Next Step
                    </Button>
                  )}
                </div>
              </motion.div>
            </form>
          </Card>

          <Card elevated className="rounded-[12px] bg-white p-5 md:p-6" delay={0.04}>
            <div className="xl:sticky xl:top-5">
              <h2 className="text-card-title text-ink">Live Preview</h2>
              <p className="mt-1 text-[12px] font-medium text-ash">
                Compact summary of the assessment that will be published.
              </p>

              <div className="mt-4 flex flex-col gap-3">
                <div className="rounded-[10px] border border-hairline bg-soft-cloud/40 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-mute">Assessment</p>
                  <p className="mt-1 text-[14px] font-semibold text-ink">
                    {examData.exam_name.trim() || 'Untitled assessment'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[10px] border border-hairline bg-soft-cloud/40 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-mute">Duration</p>
                    <p className="mt-1 text-[13px] font-semibold text-ink">{examData.duration_minutes} minutes</p>
                  </div>
                  <div className="rounded-[10px] border border-hairline bg-soft-cloud/40 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-mute">MCQ Target</p>
                    <p className="mt-1 text-[13px] font-semibold text-ink">{examData.total_questions}</p>
                  </div>
                </div>

                <div className="rounded-[10px] border border-hairline bg-soft-cloud/40 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-mute">Schedule</p>
                    <span
                      className={`rounded-[6px] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        scheduleStatus.tone === 'live'
                          ? 'bg-emerald-100 text-emerald-700'
                          : scheduleStatus.tone === 'upcoming'
                            ? 'bg-blue-100 text-blue-700'
                            : scheduleStatus.tone === 'ended'
                              ? 'bg-neutral-100 text-neutral-600'
                              : scheduleStatus.tone === 'error'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {scheduleStatus.label}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 text-[12px]">
                    <p className="text-ash">
                      Start: <span className="font-semibold text-ink">{formatDateTime(examData.live_date)}</span>
                    </p>
                    <p className="text-ash">
                      End: <span className="font-semibold text-ink">{formatDateTime(examData.dead_date)}</span>
                    </p>
                  </div>
                </div>

                <div className="rounded-[10px] border border-hairline bg-soft-cloud/40 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-mute">Coding Section</p>
                  <p className="mt-1 text-[12px] text-ash">
                    {codingEnabled
                      ? `${codingQuestion.question_text.trim()} (${completedCaseCount}/${testCases.length} cases complete)`
                      : 'No coding challenge attached'}
                  </p>
                </div>

                <div className="rounded-[10px] border border-hairline bg-soft-cloud/40 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-mute">Runtime Environment</p>
                  <p className="mt-1 text-[12px] text-ash">
                    Mode: <span className="font-semibold text-ink">{examData.environment_mode}</span>
                  </p>
                  <p className="mt-1 text-[12px] text-ash">
                    Executor: <span className="font-semibold text-ink">{examData.execution_provider}</span>
                  </p>
                  {examData.environment_mode !== 'standard' && (
                    <p className="mt-1 text-[12px] text-ash break-all">
                      Kernel: <span className="font-semibold text-ink">{examData.sandbox_url || 'not set'}</span>
                    </p>
                  )}
                </div>

                <div className="rounded-[10px] border border-hairline bg-soft-cloud/40 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-mute">PIN Generation</p>
                  <p className="mt-1 text-[12px] text-ash">
                    A 6-character exam PIN is generated automatically when you publish.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
