'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { FeedbackBanner } from '@/components/ui/FeedbackBanner';
import { fadeUp, fadeIn, scaleIn } from '@/lib/motion';
import { normalizeErrorMessage } from '@/lib/errors';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          role: role,
        },
      },
    });

    if (error) {
      setError(normalizeErrorMessage(error, 'Unable to register right now.'));
      setLoading(false);
    } else {
      router.push(role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard');
      router.refresh();
    }
  };

  const inputClass = "airbnb-input w-full px-4 py-2.5 text-[14px] font-medium transition-all";

  return (
    <>
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-soft-cloud)] px-6 py-12 text-[var(--color-ink)]">
        <motion.div {...scaleIn} className="w-full max-w-[400px] rounded-[16px] border border-[var(--color-hairline)] bg-white p-6 airbnb-card-shadow">
          <motion.div {...fadeUp} className="text-center mb-6">
            <h1 className="text-[24px] font-display font-bold text-[var(--color-ink)] tracking-tight mb-1">Create account</h1>
            <p className="text-[14px] text-[var(--color-ash)] font-medium">Get started with AiProctor today.</p>
          </motion.div>

          <motion.form
            onSubmit={handleRegister}
            className="flex flex-col gap-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] as const }}
          >
            <AnimatePresence mode="wait">
              <FeedbackBanner message={error} variant="error" />
            </AnimatePresence>

            <div className="flex flex-col gap-3">
              <motion.input
                {...fadeIn}
                transition={{ ...fadeIn.transition, delay: 0.15 }}
                type="text"
                required
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
              <motion.input
                {...fadeIn}
                transition={{ ...fadeIn.transition, delay: 0.2 }}
                type="email"
                required
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
              <motion.input
                {...fadeIn}
                transition={{ ...fadeIn.transition, delay: 0.25 }}
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
              <motion.div
                {...fadeIn}
                transition={{ ...fadeIn.transition, delay: 0.3 }}
                className="relative"
              >
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="airbnb-input w-full cursor-pointer appearance-none px-4 py-2.5 text-[14px] font-medium"
                >
                  <option value="student">I am a Student</option>
                  <option value="teacher">I am a Teacher</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[var(--color-ash)] text-[10px]">
                  ▼
                </div>
              </motion.div>
            </div>

            <Button type="submit" variant="primary" disabled={loading} className="w-full mt-2">
              {loading ? 'Creating...' : 'Register'}
            </Button>

            <motion.div
              {...fadeIn}
              transition={{ ...fadeIn.transition, delay: 0.4 }}
              className="text-center mt-2 border-t border-[var(--color-hairline)] pt-4"
            >
              <p className="text-[13px] text-[var(--color-ash)] font-medium">
                Already registered?{' '}
                <Link href="/auth/login" className="font-bold text-[var(--color-rausch)] hover:underline underline-offset-4">
                  Sign in
                </Link>
              </p>
            </motion.div>
          </motion.form>
        </motion.div>
      </main>
    </>
  );
}
