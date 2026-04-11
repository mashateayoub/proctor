import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExamManagementPage from '../src/app/teacher/exams/page';

// 1. Mock Next Router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// 2. Build Fake Database Payload
const mockExams = [
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    exam_name: 'Advanced System Design',
    duration_minutes: 120,
    total_questions: 10,
    live_date: new Date().toISOString(),
    dead_date: new Date(Date.now() + 86400000).toISOString(),
    pin_code: 'XYZ987'
  }
];

// 3. Mock Supabase Client injection
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'teacher-123' } } })
    },
    from: (table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: table === 'exams' ? mockExams : null, error: null })
    })
  })
}));

describe('Teacher Exam Sequence Tests', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Hydrates database payload and generates correct PIN cards for active sessions', async () => {
    render(<ExamManagementPage />);

    // Assert the structural layout loaded
    expect(screen.getByText('Loading registry...')).toBeInTheDocument();

    // Await database component hydration
    await waitFor(() => {
       expect(screen.getByText('Advanced System Design')).toBeInTheDocument();
    });

    // Check data integrity parsing
    expect(screen.getByText('Questions:')).toBeInTheDocument();
    expect(screen.getByText('120m')).toBeInTheDocument();

    // Critical Assertion: Verify the generated PIN string matches backend mock visually
    expect(screen.getByText('Access PIN')).toBeInTheDocument();
    expect(screen.getByText('XYZ987')).toBeInTheDocument();
  });
});
