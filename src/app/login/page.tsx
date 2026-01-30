'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      showToast('Please enter a password', 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const result = await response.json();

      if (result.ok) {
        showToast('Logged in successfully', 'success');
        // Redirect to library after short delay for toast to show
        setTimeout(() => {
          router.push('/library');
          router.refresh();
        }, 500);
      } else {
        showToast(result.error || 'Login failed', 'error');
        setPassword('');
      }
    } catch (error) {
      showToast('Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-netflix-dark rounded-lg p-8 shadow-xl">
          <h1 className="text-2xl font-bold text-white mb-2 text-center">
            Login
          </h1>
          <p className="text-netflix-light-gray text-sm text-center mb-6">
            Enter password to edit books and ratings
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-netflix-light-gray mb-1"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-netflix-gray border border-netflix-gray rounded-md text-white placeholder-netflix-light-gray focus:outline-none focus:ring-2 focus:ring-netflix-red focus:border-transparent"
                placeholder="Enter password"
                disabled={loading}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-netflix-red hover:bg-netflix-red-hover text-white font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Logging in...
                </span>
              ) : (
                'Login'
              )}
            </button>
          </form>

          <p className="text-netflix-light-gray text-xs text-center mt-6">
            Viewing is public. Login is only required to make changes.
          </p>
        </div>
      </div>
    </div>
  );
}
