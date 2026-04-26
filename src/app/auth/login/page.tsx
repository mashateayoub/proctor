'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { fadeUp, fadeIn, scaleIn } from '@/lib/motion';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: { user }, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (user) {
      const role = user.user_metadata?.role || 'student';
      router.push(role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard');
      router.refresh();
    }
  };

  return (
    <>
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-soft-cloud)] px-6 py-12 text-[var(--color-ink)]">
        <motion.div
          {...scaleIn}
          className="w-full max-w-[380px] rounded-[16px] border border-[var(--color-hairline)] bg-white p-6 airbnb-card-shadow"
        >
          <motion.div {...fadeUp} className="text-center mb-6">
            <h1 className="text-[24px] font-display font-bold text-[var(--color-ink)] tracking-tight mb-1">Welcome back</h1>
            <p className="text-[14px] text-[var(--color-ash)] font-medium">Access your secure dashboard.</p>
          </motion.div>

          <motion.form
            onSubmit={handleLogin}
            className="flex flex-col gap-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] as const }}
          >
            {error && (
              <motion.p
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-center text-[var(--color-error)] text-[12px] font-bold"
              >
                {error}
              </motion.p>
            )}

            <div className="flex flex-col gap-3">
              <motion.input
                {...fadeIn}
                transition={{ ...fadeIn.transition, delay: 0.2 }}
                type="email"
                required
                placeholder="Email ID"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="airbnb-input w-full px-4 py-2.5 text-[14px] font-medium transition-all"
              />
              <motion.input
                {...fadeIn}
                transition={{ ...fadeIn.transition, delay: 0.3 }}
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="airbnb-input w-full px-4 py-2.5 text-[14px] font-medium transition-all"
              />
            </div>

            <Button type="submit" variant="primary" disabled={loading} className="w-full mt-2">
              {loading ? 'Verifying...' : 'Sign In'}
            </Button>

            <motion.div
              {...fadeIn}
              transition={{ ...fadeIn.transition, delay: 0.4 }}
              className="text-center mt-2 border-t border-[var(--color-hairline)] pt-4"
            >
              <p className="text-[13px] text-[var(--color-ash)] font-medium">
                New to the platform?{' '}
                <Link href="/auth/register" className="font-bold text-[var(--color-rausch)] hover:underline underline-offset-4">
                  Create an account
                </Link>
              </p>
            </motion.div>
          </motion.form>
        </motion.div>
      </main>
    </>
  );
}
