'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { fadeUp, fadeIn } from '@/lib/motion';

interface Exam {
  id: string;
  exam_name: string;
  total_questions: number;
}

interface QuestionOption {
  optionText: string;
  isCorrect: boolean;
}

interface QuestionRow {
  id: string;
  question_text: string;
  options: QuestionOption[];
  created_at: string;
}

function getDefaultOptions(): QuestionOption[] {
  return [
    { optionText: '', isCorrect: true },
    { optionText: '', isCorrect: false },
    { optionText: '', isCorrect: false },
    { optionText: '', isCorrect: false },
  ];
}

function validateQuestion(questionText: string, options: QuestionOption[]) {
  if (!questionText.trim()) return 'Question prompt is required.';
  if (options.length !== 4) return 'Exactly 4 options are required.';
  if (options.some((opt) => !opt.optionText.trim())) return 'All options must be filled.';
  const correctCount = options.filter((opt) => opt.isCorrect).length;
  if (correctCount !== 1) return 'Exactly one option must be marked as correct.';
  return null;
}

function normalizeOption(option: unknown): QuestionOption | null {
  if (!option || typeof option !== 'object') return null;
  const value = option as { optionText?: unknown; isCorrect?: unknown };
  if (typeof value.optionText !== 'string' || typeof value.isCorrect !== 'boolean') return null;
  return {
    optionText: value.optionText.trim(),
    isCorrect: value.isCorrect,
  };
}

type ImportCandidate = {
  question_text: string;
  options: QuestionOption[];
};

function parseImportPayload(payload: string) {
  const errors: string[] = [];
  const validRows: ImportCandidate[] = [];

  if (!payload.trim()) {
    return { errors: ['Import payload is empty.'], validRows };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return { errors: ['Import payload is not valid JSON.'], validRows };
  }

  if (!Array.isArray(parsed)) {
    return { errors: ['Import JSON must be an array of questions.'], validRows };
  }

  parsed.forEach((item, index) => {
    const label = `Row ${index + 1}`;
    if (!item || typeof item !== 'object') {
      errors.push(`${label}: must be an object.`);
      return;
    }

    const record = item as { question_text?: unknown; options?: unknown };
    if (typeof record.question_text !== 'string' || !record.question_text.trim()) {
      errors.push(`${label}: question_text must be a non-empty string.`);
      return;
    }

    if (!Array.isArray(record.options) || record.options.length !== 4) {
      errors.push(`${label}: options must be an array of exactly 4 items.`);
      return;
    }

    const normalized = record.options.map((option) => normalizeOption(option));
    if (normalized.some((option) => option === null)) {
      errors.push(`${label}: each option must include { optionText: string, isCorrect: boolean }.`);
      return;
    }

    const questionOptions = normalized as QuestionOption[];
    const validationError = validateQuestion(record.question_text, questionOptions);
    if (validationError) {
      errors.push(`${label}: ${validationError}`);
      return;
    }

    validRows.push({
      question_text: record.question_text.trim(),
      options: questionOptions.map((option) => ({
        optionText: option.optionText.trim(),
        isCorrect: option.isCorrect,
      })),
    });
  });

  return { errors, validRows };
}

const listContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.04 },
  },
};

const listItemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.16 } },
};

export default function AddQuestionsPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full">
          <div className="mx-auto max-w-[1320px] py-16 text-center text-[13px] font-medium text-ash">
            Loading question bank...
          </div>
        </div>
      }
    >
      <AddQuestionsPageContent />
    </Suspense>
  );
}

function AddQuestionsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryExamId = searchParams.get('exam');

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);

  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<QuestionOption[]>(getDefaultOptions);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [importPayload, setImportPayload] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedExam = exams.find((exam) => exam.id === selectedExamId) || null;

  const resetForm = () => {
    setQuestionText('');
    setOptions(getDefaultOptions());
    setEditingQuestionId(null);
  };

  const syncExamQuestionCount = async (examId: string) => {
    const { count, error: countError } = await supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('exam_id', examId);

    if (countError || count === null) {
      console.error('Failed to count questions', countError);
      return null;
    }

    const { error: updateError } = await supabase
      .from('exams')
      .update({ total_questions: count })
      .eq('id', examId);

    if (updateError) {
      console.error('Failed to sync total_questions', updateError);
      return count;
    }

    setExams((prev) =>
      prev.map((exam) => (exam.id === examId ? { ...exam, total_questions: count } : exam)),
    );

    return count;
  };

  const loadQuestions = async (examId: string) => {
    setLoadingQuestions(true);

    const { data, error } = await supabase
      .from('questions')
      .select('id, question_text, options, created_at')
      .eq('exam_id', examId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to load questions', error);
      setQuestions([]);
      setFormError('Failed to load questions for this exam.');
    } else {
      setQuestions((data as unknown as QuestionRow[]) || []);
    }

    await syncExamQuestionCount(examId);
    setLoadingQuestions(false);
  };

  useEffect(() => {
    const loadExams = async () => {
      setLoadingExams(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setExams([]);
        setSelectedExamId('');
        setLoadingExams(false);
        return;
      }

      const { data, error } = await supabase
        .from('exams')
        .select('id, exam_name, total_questions')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error || !data) {
        console.error('Failed to load exams', error);
        setExams([]);
        setSelectedExamId('');
        setFormError('Failed to load your exams.');
        setLoadingExams(false);
        return;
      }

      const teacherExams = data as Exam[];
      setExams(teacherExams);

      if (teacherExams.length === 0) {
        setSelectedExamId('');
      } else {
        const queryExamMatch = queryExamId && teacherExams.some((exam) => exam.id === queryExamId);
        setSelectedExamId(queryExamMatch ? queryExamId! : teacherExams[0].id);
      }

      setLoadingExams(false);
    };

    loadExams();
  }, [queryExamId, supabase]);

  useEffect(() => {
    if (!selectedExamId) {
      setQuestions([]);
      return;
    }

    setFormError(null);
    setImportError(null);
    setNotice(null);
    setEditingQuestionId(null);
    loadQuestions(selectedExamId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExamId]);

  const handleOptionChange = (index: number, text: string) => {
    setOptions((prev) =>
      prev.map((option, optionIndex) =>
        optionIndex === index ? { ...option, optionText: text } : option,
      ),
    );
  };

  const handleSetCorrect = (index: number) => {
    setOptions((prev) =>
      prev.map((option, optionIndex) => ({
        ...option,
        isCorrect: optionIndex === index,
      })),
    );
  };

  const handleEditQuestion = (question: QuestionRow) => {
    const normalizedOptions = (question.options || []).slice(0, 4);
    if (normalizedOptions.length !== 4) {
      setFormError('This question has invalid option data and cannot be edited safely.');
      return;
    }

    setQuestionText(question.question_text);
    setOptions(
      normalizedOptions.map((option) => ({
        optionText: option.optionText || '',
        isCorrect: Boolean(option.isCorrect),
      })),
    );
    setEditingQuestionId(question.id);
    setFormError(null);
    setNotice(null);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!selectedExamId) return;
    const confirmed = window.confirm('Delete this question from the bank?');
    if (!confirmed) return;

    setFormError(null);
    setImportError(null);
    setNotice(null);

    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', questionId);

    if (error) {
      setFormError(error.message);
      return;
    }

    await loadQuestions(selectedExamId);
    setNotice('Question deleted.');

    if (editingQuestionId === questionId) {
      resetForm();
    }
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId) {
      setFormError('Please select a valid exam.');
      return;
    }

    setFormError(null);
    setImportError(null);
    setNotice(null);

    const validationError = validateQuestion(questionText, options);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSubmitting(true);

    const payload = {
      exam_id: selectedExamId,
      question_text: questionText.trim(),
      options: options.map((option) => ({
        optionText: option.optionText.trim(),
        isCorrect: option.isCorrect,
      })),
    };

    let error: { message: string } | null = null;
    if (editingQuestionId) {
      const response = await supabase
        .from('questions')
        .update({
          question_text: payload.question_text,
          options: payload.options,
        })
        .eq('id', editingQuestionId);
      error = response.error;
    } else {
      const response = await supabase
        .from('questions')
        .insert(payload);
      error = response.error;
    }

    if (error) {
      setSubmitting(false);
      setFormError(error.message);
      return;
    }

    await loadQuestions(selectedExamId);
    setNotice(editingQuestionId ? 'Question updated successfully.' : 'Question added to bank.');
    resetForm();
    setSubmitting(false);
  };

  const handleBulkImport = async () => {
    if (!selectedExamId) {
      setImportError('Please select an exam before importing.');
      return;
    }

    setFormError(null);
    setImportError(null);
    setNotice(null);

    const { errors, validRows } = parseImportPayload(importPayload);
    if (validRows.length === 0) {
      setImportError(errors.slice(0, 6).join(' '));
      return;
    }

    setImporting(true);

    const rowsToInsert = validRows.map((row) => ({
      exam_id: selectedExamId,
      question_text: row.question_text,
      options: row.options,
    }));

    const { error } = await supabase
      .from('questions')
      .insert(rowsToInsert);

    if (error) {
      setImporting(false);
      setImportError(error.message);
      return;
    }

    await loadQuestions(selectedExamId);

    const rejectedCount = errors.length;
    if (rejectedCount > 0) {
      setNotice(`Imported ${validRows.length} question(s). Skipped ${rejectedCount} invalid row(s).`);
      setImportError(errors.slice(0, 6).join(' '));
    } else {
      setNotice(`Imported ${validRows.length} question(s).`);
      setImportError(null);
    }

    setImporting(false);
    setImportPayload('');
  };

  return (
    <div className="w-full">
      <div className="mx-auto max-w-[1320px]">
        <motion.div {...fadeUp} className="mb-8 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-section-heading tracking-tight text-ink">Question Bank.</h1>
            {selectedExam && (
              <span className="inline-flex h-7 items-center rounded-[999px] border border-hairline bg-soft-cloud px-3 text-[11px] font-semibold uppercase tracking-wide text-ash">
                {selectedExam.total_questions} Questions
              </span>
            )}
          </div>
          <p className="text-body-standard text-ash">
            {selectedExam
              ? `Manage question bank for ${selectedExam.exam_name}.`
              : 'Select an exam to manage its question bank.'}
          </p>
        </motion.div>

        {loadingExams ? (
          <motion.p {...fadeIn} className="py-16 text-center text-[13px] font-medium text-ash">
            Loading your exams...
          </motion.p>
        ) : exams.length === 0 ? (
          <Card elevated className="rounded-[12px] bg-white p-10 text-center">
            <p className="text-body-standard text-ash">No exams found. Create an exam before managing questions.</p>
            <div className="mt-5">
              <Button variant="primary" onClick={() => router.push('/teacher/create-exam')}>
                Create Exam
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <Card elevated className="rounded-[12px] bg-white p-6" delay={0}>
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="text-card-title text-ink">Question List</h2>
                <div className="relative min-w-[260px]">
                  <select
                    className="h-9 w-full appearance-none rounded-[8px] border border-hairline bg-soft-cloud px-3 pr-8 text-[12px] font-medium text-ink outline-none focus:border-rausch"
                    value={selectedExamId}
                    onChange={(e) => setSelectedExamId(e.target.value)}
                  >
                    {exams.map((exam) => (
                      <option key={exam.id} value={exam.id}>
                        {exam.exam_name}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-ash">▼</span>
                </div>
              </div>

              {loadingQuestions ? (
                <div className="space-y-3 py-1">
                  {[0, 1, 2, 3].map((skeleton) => (
                    <div
                      key={skeleton}
                      className="animate-pulse rounded-[10px] border border-hairline bg-soft-cloud/40 p-3"
                    >
                      <div className="mb-2 h-3 w-12 rounded bg-hairline/70" />
                      <div className="mb-2 h-4 w-3/4 rounded bg-hairline/70" />
                      <div className="space-y-1.5">
                        <div className="h-3 w-11/12 rounded bg-hairline/60" />
                        <div className="h-3 w-10/12 rounded bg-hairline/60" />
                        <div className="h-3 w-9/12 rounded bg-hairline/60" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : questions.length === 0 ? (
                <div className="rounded-[10px] border border-dashed border-hairline bg-soft-cloud/30 p-8 text-center">
                  <p className="text-[13px] font-medium text-ash">No questions in this bank yet.</p>
                </div>
              ) : (
                <motion.div
                  variants={listContainerVariants}
                  initial="hidden"
                  animate="visible"
                  className="flex max-h-[640px] flex-col gap-3 overflow-y-auto pr-1"
                >
                  <AnimatePresence mode="popLayout">
                    {questions.map((question, idx) => (
                    <motion.div
                      layout
                      variants={listItemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      key={question.id}
                      className="rounded-[10px] border border-hairline bg-soft-cloud/35 p-3"
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div>
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-mute">Q{idx + 1}</p>
                          <p className="text-[13px] font-semibold leading-snug text-ink">{question.question_text}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="filter" size="xs" onClick={() => handleEditQuestion(question)}>
                            Edit
                          </Button>
                          <Button variant="danger" size="xs" onClick={() => handleDeleteQuestion(question.id)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5">
                        {(question.options || []).map((option, optionIndex) => (
                          <div key={`${question.id}-${optionIndex}`} className="flex items-center gap-2 text-[12px] text-ash">
                            <span
                              className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full text-[9px] font-bold ${
                                option.isCorrect ? 'bg-emerald-500 text-white' : 'bg-hairline text-mute'
                              }`}
                            >
                              {String.fromCharCode(65 + optionIndex)}
                            </span>
                            <span className={option.isCorrect ? 'font-semibold text-ink' : ''}>{option.optionText}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </Card>

            <div className="flex flex-col gap-6">
              <Card elevated className="rounded-[12px] bg-white p-6" delay={0}>
                <h2 className="mb-2 text-card-title text-ink">{editingQuestionId ? 'Edit Question' : 'Add Question'}</h2>
                <p className="mb-5 text-[12px] text-ash">
                  {editingQuestionId
                    ? 'Update prompt/options and save changes.'
                    : 'Create a new MCQ with exactly one correct answer.'}
                </p>
                <div aria-live="polite" className="mb-4 space-y-2">
                  {formError && (
                    <p className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600">
                      {formError}
                    </p>
                  )}
                  {notice && (
                    <p className="rounded-[8px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-700">
                      {notice}
                    </p>
                  )}
                </div>

                <form className="flex flex-col gap-5" onSubmit={handleSubmitQuestion}>
                  <div>
                    <label className="mb-1 block text-caption text-ash">Question Prompt</label>
                    <textarea
                      rows={3}
                      className="w-full resize-none rounded-[8px] border border-hairline bg-soft-cloud px-3 py-2.5 text-[13px] text-ink outline-none focus:border-rausch"
                      value={questionText}
                      onChange={(e) => setQuestionText(e.target.value)}
                      placeholder="Write the question prompt..."
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    {options.map((option, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleSetCorrect(index)}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                            option.isCorrect
                              ? 'border-rausch bg-rausch'
                              : 'border-hairline bg-white hover:border-rausch/60'
                          }`}
                          aria-label={`Mark option ${index + 1} as correct`}
                        >
                          {option.isCorrect && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </button>
                        <input
                          type="text"
                          className={`h-9 w-full rounded-[8px] border px-3 text-[12px] outline-none transition-colors ${
                            option.isCorrect
                              ? 'border-rausch/40 bg-rausch/5 text-ink focus:border-rausch'
                              : 'border-hairline bg-soft-cloud focus:border-rausch'
                          }`}
                          placeholder={`Option ${index + 1}`}
                          value={option.optionText}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          required
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button type="submit" variant="primary" disabled={submitting || !selectedExamId}>
                      {submitting ? 'Saving...' : editingQuestionId ? 'Save Changes' : 'Add to Bank'}
                    </Button>
                    {editingQuestionId && (
                      <Button type="button" variant="secondary" onClick={resetForm}>
                        Cancel Edit
                      </Button>
                    )}
                  </div>
                </form>
              </Card>

              <Card elevated className="rounded-[12px] bg-white p-6" delay={0}>
                <h3 className="mb-2 text-card-title text-ink">Bulk Import (JSON)</h3>
                <p className="mb-4 text-[12px] text-ash">
                  Expected shape: array of objects with `question_text` and 4 `options` containing `optionText` + `isCorrect`.
                </p>
                <div aria-live="polite" className="mb-4 space-y-2">
                  {importError && (
                    <p className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600">
                      {importError}
                    </p>
                  )}
                </div>
                <textarea
                  rows={8}
                  className="w-full resize-y rounded-[8px] border border-hairline bg-soft-cloud px-3 py-2.5 font-mono text-[11px] text-ink outline-none focus:border-rausch"
                  placeholder='[{"question_text":"...","options":[{"optionText":"A","isCorrect":true},{"optionText":"B","isCorrect":false},{"optionText":"C","isCorrect":false},{"optionText":"D","isCorrect":false}]}]'
                  value={importPayload}
                  onChange={(e) => setImportPayload(e.target.value)}
                />
                <div className="mt-3">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={importing || !selectedExamId}
                    onClick={handleBulkImport}
                  >
                    {importing ? 'Importing...' : 'Import JSON'}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        <motion.div
          {...fadeIn}
          transition={{ ...fadeIn.transition, delay: 0.2 }}
          className="mt-8 border-t border-hairline pt-5"
        >
          <Button type="button" variant="pill-link" onClick={() => router.push('/teacher/exams')}>
            Back to Exams
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
