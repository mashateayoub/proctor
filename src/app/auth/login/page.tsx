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
      <main className="flex min-h-screen items-center justify-center bg-apple-gray dark:bg-black pt-12 px-6">
        <motion.div
          {...scaleIn}
          className="w-full max-w-[400px]"
        >
          <motion.div {...fadeUp} className="text-center mb-10">
            <h1 className="text-section-heading text-apple-dark dark:text-white mb-2">Sign In.</h1>
            <p className="text-body-standard text-black/80 dark:text-white/80">Access your proctoring dashboard.</p>
          </motion.div>

          <motion.form
            onSubmit={handleLogin}
            className="flex flex-col gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] as const }}
          >
            {error && (
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-center text-red-500 text-caption"
              >
                {error}
              </motion.p>
            )}

            <div className="flex flex-col gap-4">
              <motion.input
                {...fadeIn}
                transition={{ ...fadeIn.transition, delay: 0.2 }}
                type="email"
                required
                placeholder="Email ID"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white dark:bg-[#272729] border border-black/10 dark:border-white/10 rounded-[11px] px-[16px] py-[15px] text-body-standard focus:outline-none focus:border-apple-blue focus:ring-1 focus:ring-apple-blue transition-colors"
              />
              <motion.input
                {...fadeIn}
                transition={{ ...fadeIn.transition, delay: 0.3 }}
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white dark:bg-[#272729] border border-black/10 dark:border-white/10 rounded-[11px] px-[16px] py-[15px] text-body-standard focus:outline-none focus:border-apple-blue focus:ring-1 focus:ring-apple-blue transition-colors"
              />
            </div>

            <Button type="submit" variant="primary-blue" disabled={loading} className="w-full mt-2 h-[48px]">
              {loading ? 'Authenticating...' : 'Sign In'}
            </Button>

            <motion.div
              {...fadeIn}
              transition={{ ...fadeIn.transition, delay: 0.4 }}
              className="text-center mt-2 border-t border-black/10 pt-6"
            >
              <p className="text-caption text-black/80 dark:text-white/80">
                New to the platform?{' '}
                <Link href="/auth/register" className="text-apple-link hover:underline">
                  Create an account
                </Link>
                .
              </p>
            </motion.div>
          </motion.form>
        </motion.div>
      </main>
    </>
  );
}
