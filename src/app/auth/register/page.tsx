'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { fadeUp, fadeIn, scaleIn } from '@/lib/motion';

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
      setError(error.message);
      setLoading(false);
    } else {
      router.push(role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard');
      router.refresh();
    }
  };

  const inputClass = "airbnb-input w-full px-4 py-[14px] text-body-standard transition-colors";

  return (
    <>
      <main className="flex min-h-screen items-center justify-center bg-soft-cloud px-6 py-12 text-ink">
        <motion.div {...scaleIn} className="w-full max-w-[420px] rounded-[20px] border border-hairline bg-white p-8 airbnb-card-shadow">
          <motion.div {...fadeUp} className="text-center mb-10">
            <h1 className="text-section-heading mb-2">Create account</h1>
            <p className="text-body-standard text-ash">Get started with AiProctor today.</p>
          </motion.div>

          <motion.form
            onSubmit={handleRegister}
            className="flex flex-col gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] as const }}
          >
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="text-center text-error text-caption"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-4">
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
                  className="airbnb-input w-full cursor-pointer appearance-none px-4 py-[14px] text-body-standard"
                >
                  <option value="student">I am a Student</option>
                  <option value="teacher">I am a Teacher</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-ash">
                  ▼
                </div>
              </motion.div>
            </div>

            <Button type="submit" variant="primary-blue" disabled={loading} className="w-full mt-2 h-[48px]">
              {loading ? 'Creating...' : 'Register'}
            </Button>

            <motion.div
              {...fadeIn}
              transition={{ ...fadeIn.transition, delay: 0.4 }}
              className="text-center mt-2 border-t border-hairline pt-6"
            >
              <p className="text-caption text-ash">
                Already registered?{' '}
                <Link href="/auth/login" className="font-semibold text-ink underline-offset-4 hover:underline">
                  Sign in
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
