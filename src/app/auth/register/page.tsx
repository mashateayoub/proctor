'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/Button';
import { GlassNav } from '@/components/ui/Navigation';

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

  return (
    <>
      {/* <GlassNav links={[]} rightAction={
        <Link href="/auth/login">
          <Button variant="pill-link">Sign In</Button>
        </Link>
      } /> */}
      <main className="flex min-h-screen items-center justify-center bg-apple-gray dark:bg-black pt-12 px-6">
        <div className="w-full max-w-[400px]">
          <div className="text-center mb-10">
            <h1 className="text-section-heading text-apple-dark dark:text-white mb-2">Create Account.</h1>
            <p className="text-body-standard text-black/80 dark:text-white/80">Get started with AiProctor today.</p>
          </div>

          <form onSubmit={handleRegister} className="flex flex-col gap-6">
            {error && <p className="text-center text-red-500 text-caption">{error}</p>}

            <div className="flex flex-col gap-4">
              <input
                type="text"
                required
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white dark:bg-[#272729] border border-black/10 dark:border-white/10 rounded-[11px] px-[16px] py-[15px] text-body-standard focus:outline-none focus:border-apple-blue focus:ring-1 focus:ring-apple-blue transition-colors"
              />
              <input
                type="email"
                required
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white dark:bg-[#272729] border border-black/10 dark:border-white/10 rounded-[11px] px-[16px] py-[15px] text-body-standard focus:outline-none focus:border-apple-blue focus:ring-1 focus:ring-apple-blue transition-colors"
              />
              <input
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white dark:bg-[#272729] border border-black/10 dark:border-white/10 rounded-[11px] px-[16px] py-[15px] text-body-standard focus:outline-none focus:border-apple-blue focus:ring-1 focus:ring-apple-blue transition-colors"
              />
              <div className="relative">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full appearance-none bg-white dark:bg-[#272729] border border-black/10 dark:border-white/10 rounded-[11px] px-[16px] py-[15px] text-body-standard focus:outline-none focus:border-apple-blue focus:ring-1 focus:ring-apple-blue cursor-pointer"
                >
                  <option value="student">I am a Student</option>
                  <option value="teacher">I am a Teacher</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-black/50 dark:text-white/50">
                  ▼
                </div>
              </div>
            </div>

            <Button type="submit" variant="primary-blue" disabled={loading} className="w-full mt-2 h-[48px]">
              {loading ? 'Creating...' : 'Register'}
            </Button>

            <div className="text-center mt-2 border-t border-black/10 pt-6">
              <p className="text-caption text-black/80 dark:text-white/80">
                Already registered?{' '}
                <Link href="/auth/login" className="text-apple-link hover:underline">
                  Sign in
                </Link>
                .
              </p>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
