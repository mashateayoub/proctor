export function normalizeErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;

  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  if (typeof error === 'object') {
    const candidate = error as { message?: unknown; error_description?: unknown; details?: unknown };
    if (typeof candidate.message === 'string' && candidate.message.trim()) {
      return candidate.message.trim();
    }
    if (typeof candidate.error_description === 'string' && candidate.error_description.trim()) {
      return candidate.error_description.trim();
    }
    if (typeof candidate.details === 'string' && candidate.details.trim()) {
      return candidate.details.trim();
    }
  }

  return fallback;
}
