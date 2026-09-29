import { useState } from 'react';
import Home from '@/pages/Home';
import SetEditor from '@/components/SetEditor';
import { Toaster } from '@/components/ui/sonner';
import { FIXED_USER_ID } from '@/lib/constants';
import type { VocabSet } from '@/types/vocab';
import type { FolderId } from '@/pages/Home';

export default function App() {
  const [activeSet, setActiveSet] = useState<VocabSet | null>(null);
  const [openFolder, setOpenFolder] = useState<FolderId | null>(null);

  return (
    <>
      {activeSet ? (
        <SetEditor
          set={activeSet}
          userId={FIXED_USER_ID}
          onBack={() => setActiveSet(null)}
        />
      ) : (
        <Home
          userId={FIXED_USER_ID}
          onOpenSet={setActiveSet}
          openFolder={openFolder}
          onOpenFolderChange={setOpenFolder}
        />
      )}
      <Toaster position="top-center" />
    </>
  );
}
