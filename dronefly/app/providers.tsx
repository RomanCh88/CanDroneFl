'use client';

import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { UserDataProvider } from '@/contexts/UserDataContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <UserDataProvider>{children}</UserDataProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
