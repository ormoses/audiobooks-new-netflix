import type { Metadata, Viewport } from 'next';
import './globals.css';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';
import { ToastProvider } from '@/components/Toast';
import { AuthProvider } from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: 'AudioBooks Catalog',
  description: 'Browse and manage your audiobook library',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
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
            <main className="pt-4 md:pt-20 px-4 md:px-12 pb-24 md:pb-12">
              {children}
            </main>
            <BottomNav />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
