import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: 'TransitOps — Smart Transport Operations Platform',
  description:
    'Enterprise fleet logistics, vehicle telemetry, driver safety scoring, and trip dispatch control centre.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#F5F2E9] text-[#193C49]">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
