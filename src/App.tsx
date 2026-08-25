import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import AuthScreen from '@/components/AuthScreen';
import ResetPasswordScreen from '@/components/ResetPasswordScreen';
import Home from '@/pages/Home';
import SetEditor from '@/components/SetEditor';
import { Toaster } from '@/components/ui/sonner';
import type { VocabSet } from '@/types/vocab';

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured());
  const [activeSet, setActiveSet] = useState<VocabSet | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = getSupabaseClient();
    let cancelled = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      if (cancelled) return;
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
      setSession(next);
      if (!next) setActiveSet(null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  if (authLoading) {
    return (
      <>
        <LoadingScreen />
        <Toaster position="top-center" />
      </>
    );
  }

  if (isPasswordRecovery) {
    return (
      <>
        <ResetPasswordScreen onDone={() => setIsPasswordRecovery(false)} />
        <Toaster position="top-center" />
      </>
    );
  }

  if (!session) {
    return (
      <>
        <AuthScreen />
        <Toaster position="top-center" />
      </>
    );
  }

  return (
    <>
      {activeSet ? (
        <SetEditor
          set={activeSet}
          userId={session.user.id}
          onBack={() => setActiveSet(null)}
        />
      ) : (
        <Home userId={session.user.id} onOpenSet={setActiveSet} />
      )}
      <Toaster position="top-center" />
    </>
  );
}
