import { useState } from 'react';
import AuthScreen from '@/components/AuthScreen';
import Home from '@/pages/Home';
import SetEditor from '@/components/SetEditor';
import { Toaster } from '@/components/ui/sonner';
import { FIXED_USER_ID } from '@/lib/constants';
import type { VocabSet } from '@/types/vocab';

const ENTERED_KEY = 'nanimemo_entered';

export default function App() {
  const [entered, setEntered] = useState(() => localStorage.getItem(ENTERED_KEY) === 'true');
  const [activeSet, setActiveSet] = useState<VocabSet | null>(null);

  const handleEnter = () => {
    localStorage.setItem(ENTERED_KEY, 'true');
    setEntered(true);
  };

  if (!entered) {
    return (
      <>
        <AuthScreen onEnter={handleEnter} />
        <Toaster position="top-center" />
      </>
    );
  }

  return (
    <>
      {activeSet ? (
        <SetEditor
          set={activeSet}
          userId={FIXED_USER_ID}
          onBack={() => setActiveSet(null)}
        />
      ) : (
        <Home userId={FIXED_USER_ID} onOpenSet={setActiveSet} />
      )}
      <Toaster position="top-center" />
    </>
  );
}
