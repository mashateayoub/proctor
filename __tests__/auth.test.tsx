import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LoginPage from '../src/app/auth/login/page';
import RegisterPage from '../src/app/auth/register/page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        refresh: vi.fn(),
    }),
}));

// Mock @supabase/ssr
vi.mock('@supabase/ssr', () => ({
    createBrowserClient: () => ({
        auth: {
            signInWithPassword: vi.fn().mockResolvedValue({
                data: { user: { user_metadata: { role: 'student' } } },
                error: null
            }),
            signUp: vi.fn().mockResolvedValue({ error: null })
        }
    })
}));

describe('Auth Pages Integration', () => {
    it('renders login page correctly and includes email/password fields', () => {
        render(<LoginPage />);
        expect(screen.getByText('Sign in to AiProctor')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    });

    it('renders register page correctly with role selection', () => {
        render(<RegisterPage />);
        expect(screen.getByText('Create an AiProctor Account')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Full Name')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
        expect(screen.getByRole('combobox')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument();
    });
});
