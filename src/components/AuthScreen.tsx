import { useState } from 'react';
import { BrainCircuit, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type AuthMode = 'signin' | 'signup';

interface AuthScreenProps {
  onEnter: () => void;
}

export default function AuthScreen({ onEnter }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');

  const isConfigured = isSupabaseConfigured();

  const handleForgotPassword = async () => {
    if (!isConfigured) {
      setErrorMessage('Ajoutez vos variables Supabase avant de continuer.');
      return;
    }
    if (!email) {
      setErrorMessage('Entrez votre e-mail ci-dessus, puis cliquez à nouveau.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setNoticeMessage('');

    try {
      const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setNoticeMessage('E-mail envoyé. Vérifiez votre boîte de réception (et les spams).');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible d\'envoyer l\'e-mail.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onEnter();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top,#312e81_0%,#1e1b4b_45%,#0f0f23_100%)] px-6 py-10">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/8 p-8 text-white backdrop-blur-xl shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
            <BrainCircuit className="h-8 w-8 text-indigo-200" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-bold">nanimemo</h1>
          <p className="mt-2 text-sm text-indigo-100/70">
            Connexion pour synchroniser tes listes sur tous tes appareils.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-2xl bg-black/20 p-1">
          <button
            className={`rounded-xl px-4 py-2 text-sm transition-colors ${
              mode === 'signin' ? 'bg-white text-stone-900' : 'text-white/70'
            }`}
            onClick={() => setMode('signin')}
            type="button"
          >
            Connexion
          </button>
          <button
            className={`rounded-xl px-4 py-2 text-sm transition-colors ${
              mode === 'signup' ? 'bg-white text-stone-900' : 'text-white/70'
            }`}
            onClick={() => setMode('signup')}
            type="button"
          >
            Inscription
          </button>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label className="text-white/75">
              <Mail className="mr-2 inline h-4 w-4" />
              E-mail
            </Label>
            <Input
              autoComplete="email"
              className="border-white/15 bg-white/10 text-white placeholder:text-white/35"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="vous@exemple.com"
              type="email"
              value={email}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-white/75">
                <LockKeyhole className="mr-2 inline h-4 w-4" />
                Mot de passe
              </Label>
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isSubmitting}
                  className="text-xs text-indigo-200/80 underline-offset-2 hover:underline"
                >
                  Mot de passe oublié ?
                </button>
              )}
            </div>
            <Input
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              className="border-white/15 bg-white/10 text-white placeholder:text-white/35"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="8 caractères minimum"
              type="password"
              value={password}
            />
          </div>

          {!isConfigured && (
            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
              Ajoutez `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` dans `.env.local`,
              puis dans Vercel.
            </div>
          )}

          {noticeMessage && (
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
              {noticeMessage}
            </div>
          )}

          {errorMessage && (
            <div className="rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
              {errorMessage}
            </div>
          )}

          <Button
            className="h-12 w-full bg-indigo-400 text-indigo-950 hover:bg-indigo-300"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Traitement...
              </>
            ) : mode === 'signin' ? (
              'Se connecter'
            ) : (
              'Créer le compte'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
