import type { Metadata } from 'next';
import './globals.css';
import TopNav from '@/components/TopNav';
import { ToastProvider } from '@/components/Toast';
import { AuthProvider } from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: 'AudioBooks Catalog',
  description: 'Browse and manage your audiobook library',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-netflix-black min-h-screen">
        <AuthProvider>
          <ToastProvider>
            <TopNav />
            <main className="pt-20 px-4 md:px-12 pb-12">
              {children}
            </main>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
