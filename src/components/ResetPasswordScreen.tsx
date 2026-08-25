import { useState } from 'react';
import { CheckCircle2, LoaderCircle, LockKeyhole } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ResetPasswordScreenProps {
  onDone: () => void;
}

export default function ResetPasswordScreen({ onDone }: ResetPasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const { error } = await getSupabaseClient().auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de mettre à jour le mot de passe.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top,#312e81_0%,#1e1b4b_45%,#0f0f23_100%)] px-6 py-10">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/8 p-8 text-white backdrop-blur-xl shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
            <LockKeyhole className="h-8 w-8 text-indigo-200" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
          <p className="mt-2 text-sm text-indigo-100/70">Choisis un nouveau mot de passe pour ton compte.</p>
        </div>

        {done ? (
          <div className="space-y-5 text-center">
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
              <CheckCircle2 className="h-4 w-4" />
              Mot de passe mis à jour.
            </div>
            <Button className="h-12 w-full bg-indigo-400 text-indigo-950 hover:bg-indigo-300" onClick={onDone}>
              Continuer
            </Button>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label className="text-white/75">
                <LockKeyhole className="mr-2 inline h-4 w-4" />
                Nouveau mot de passe
              </Label>
              <Input
                autoComplete="new-password"
                autoFocus
                className="border-white/15 bg-white/10 text-white placeholder:text-white/35"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="8 caractères minimum"
                type="password"
                value={password}
              />
            </div>

            {errorMessage && (
              <div className="rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
                {errorMessage}
              </div>
            )}

            <Button
              className="h-12 w-full bg-indigo-400 text-indigo-950 hover:bg-indigo-300"
              disabled={isSubmitting || password.length < 8}
              type="submit"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                'Mettre à jour le mot de passe'
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
