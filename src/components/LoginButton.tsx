'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { useToast } from './Toast';

export default function LoginButton() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const handleLogout = async () => {
    await logout();
    showToast('Logged out', 'info');
    router.refresh();
  };

  if (isLoading) {
    return (
      <span className="px-3 py-2 text-sm text-netflix-light-gray">
        ...
      </span>
    );
  }

  if (isAuthenticated) {
    return (
      <button
        onClick={handleLogout}
        className="px-3 py-2 rounded-md text-sm font-medium text-netflix-light-gray hover:text-white hover:bg-netflix-gray/50 transition-colors"
      >
        Logout
      </button>
    );
  }

  return (
    <Link
      href="/login"
      className="px-3 py-2 rounded-md text-sm font-medium text-netflix-light-gray hover:text-white hover:bg-netflix-gray/50 transition-colors"
    >
      Login
    </Link>
  );
}
