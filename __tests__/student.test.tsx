// @ts-nocheck
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StudentDashboard from '../src/app/student/dashboard/page';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));

// Mock Supabase to dynamically shift the Date injection
let fetchMockResponse = { data: null, error: null };
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({
    auth: { signOut: vi.fn() },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: vi.fn().mockImplementation(() => Promise.resolve(fetchMockResponse))
        })
      })
    })
  })
}));

describe('Student PIN Gateway Date Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const enterPinAndSubmit = async (pin: string) => {
    render(<StudentDashboard />);
    const input = screen.getByPlaceholderText('ENTER PIN (e.g. A9F2K1)');
    const button = screen.getByRole('button', { name: /Unlock/i });
    
    fireEvent.change(input, { target: { value: pin } });
    fireEvent.click(button);
  };

  it('Rejects an invalid PIN completely', async () => {
    fetchMockResponse = { data: null, error: { message: 'Not Found' } };
    await enterPinAndSubmit('WRONG1');
    await waitFor(() => {
       expect(screen.getByText('Invalid PIN code. Please check with your instructor.')).toBeInTheDocument();
    });
  });

  it('Displays Expired Exam with disabled Start button', async () => {
    const pastDate = new Date(Date.now() - 100000).toISOString(); // In the past
    fetchMockResponse = {
      data: {
        id: 'test-exam-1',
        exam_name: 'Expired Biology Final',
        live_date: new Date(Date.now() - 500000).toISOString(),
        dead_date: pastDate,
        total_questions: 5,
        duration_minutes: 30,
        users: { name: 'Dr. Jane' }
      },
      error: null
    };

    await enterPinAndSubmit('EXPIRE');
    
    await waitFor(() => {
       expect(screen.getByText('Assessment Unlocked.')).toBeInTheDocument();
    });

    // Check custom Gray-out Logic
    const disabledBtn = screen.getByRole('button', { name: 'Deadline Passed' });
    expect(disabledBtn).toBeInTheDocument();
    expect(disabledBtn).toBeDisabled();
    expect(screen.getByText('You can no longer start this exam.')).toBeInTheDocument();
  });

  it('Displays Unreleased Exam with disabled Start button', async () => {
    const futureDate = new Date(Date.now() + 100000).toISOString(); // In the future
    fetchMockResponse = {
      data: {
        id: 'test-exam-2',
        exam_name: 'Future Chemistry Midterm',
        live_date: futureDate,
        dead_date: new Date(Date.now() + 500000).toISOString(),
        total_questions: 10,
        duration_minutes: 60,
        users: { name: 'Dr. Smith' }
      },
      error: null
    };

    await enterPinAndSubmit('FUTURE');
    
    await waitFor(() => {
       expect(screen.getByText('Future Chemistry Midterm')).toBeInTheDocument();
    });

    const disabledBtn = screen.getByRole('button', { name: 'Not Live Yet' });
    expect(disabledBtn).toBeInTheDocument();
    expect(disabledBtn).toBeDisabled();
  });

  it('Displays Valid Live Exam and unlocks Secure Initialization', async () => {
    fetchMockResponse = {
      data: {
        id: 'real-exam-123',
        exam_name: 'Active Physics Assessment',
        live_date: new Date(Date.now() - 500000).toISOString(), // 5 mins ago
        dead_date: new Date(Date.now() + 500000).toISOString(), // 5 mins future
        total_questions: 20,
        duration_minutes: 120,
        users: { name: 'Prof. X' }
      },
      error: null
    };

    await enterPinAndSubmit('XYZ123');
    
    await waitFor(() => {
       expect(screen.getByText('Active Physics Assessment')).toBeInTheDocument();
    });

    const startBtn = screen.getByRole('button', { name: 'Initialize Secure Session' });
    expect(startBtn).toBeInTheDocument();
    expect(startBtn).not.toBeDisabled();

    // Verify Router gets triggered
    fireEvent.click(startBtn);
    expect(mockPush).toHaveBeenCalledWith('/student/test/real-exam-123');
  });

});
