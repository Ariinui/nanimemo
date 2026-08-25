import { useMemo, useState } from 'react';
import { AlertTriangle, Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  DEFAULT_IMPORT_SETTINGS,
  detectImportSettings,
  parseImport,
  type ImportSettings,
} from '@/lib/import';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (cards: { term: string; definition: string }[]) => void;
}

export default function ImportDialog({ open, onOpenChange, onImport }: ImportDialogProps) {
  const [text, setText] = useState('');
  const [settings, setSettings] = useState<ImportSettings>(DEFAULT_IMPORT_SETTINGS);
  const [autoDetect, setAutoDetect] = useState(true);

  const result = useMemo(() => parseImport(text, settings), [text, settings]);

  const handleTextChange = (value: string) => {
    setText(value);
    if (autoDetect && value.trim()) {
      setSettings(detectImportSettings(value));
    }
  };

  const updateSettings = (patch: Partial<ImportSettings>) => {
    setAutoDetect(false);
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const reset = () => {
    setText('');
    setSettings(DEFAULT_IMPORT_SETTINGS);
    setAutoDetect(true);
  };

  const handleImport = () => {
    const cards = result.rows
      .filter((r) => r.status === 'valid')
      .map((r) => ({ term: r.term, definition: r.definition }));
    onImport(cards);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) reset(); onOpenChange(next); }}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Importer vos données
          </DialogTitle>
          <DialogDescription>
            Copiez et collez vos données ici (à partir de Word, Excel, Google Docs, etc.)
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={'Mot 1\tDéfinition 1\nMot 2\tDéfinition 2\nMot 3\tDéfinition 3'}
          className="min-h-40 font-mono text-sm"
        />

        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="mb-2 text-sm font-medium">Entre le terme et la définition</p>
            <RadioGroup
              value={settings.termDefSeparator}
              onValueChange={(v) => updateSettings({ termDefSeparator: v as ImportSettings['termDefSeparator'] })}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="tab" id="td-tab" />
                <Label htmlFor="td-tab">Tab</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="comma" id="td-comma" />
                <Label htmlFor="td-comma">Virgule</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="custom" id="td-custom" />
                <Input
                  id="td-custom"
                  className="h-8 w-28"
                  value={settings.termDefCustom}
                  placeholder="Personnalisé"
                  onFocus={() => updateSettings({ termDefSeparator: 'custom' })}
                  onChange={(e) => updateSettings({ termDefSeparator: 'custom', termDefCustom: e.target.value })}
                />
              </div>
            </RadioGroup>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Entre les cartes</p>
            <RadioGroup
              value={settings.cardSeparator}
              onValueChange={(v) => updateSettings({ cardSeparator: v as ImportSettings['cardSeparator'] })}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="newline" id="c-newline" />
                <Label htmlFor="c-newline">Nouvelle rangée</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="semicolon" id="c-semicolon" />
                <Label htmlFor="c-semicolon">Point-virgule</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="custom" id="c-custom" />
                <Input
                  id="c-custom"
                  className="h-8 w-28"
                  value={settings.cardCustom}
                  placeholder="Personnalisé"
                  onFocus={() => updateSettings({ cardSeparator: 'custom' })}
                  onChange={(e) => updateSettings({ cardSeparator: 'custom', cardCustom: e.target.value })}
                />
              </div>
            </RadioGroup>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">Aperçu</p>
            <p className="text-xs text-muted-foreground">
              {result.validCount} carte{result.validCount !== 1 ? 's' : ''} valide{result.validCount !== 1 ? 's' : ''}
              {result.issueCount > 0 && ` · ${result.issueCount} à vérifier`}
              {result.duplicateCount > 0 && ` · ${result.duplicateCount} doublon${result.duplicateCount !== 1 ? 's' : ''}`}
            </p>
          </div>

          {result.rows.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Rien à visualiser pour l'instant
            </p>
          ) : (
            <div className="max-h-52 space-y-1 overflow-y-auto rounded-md border p-2">
              {result.rows.map((row, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm ${
                    row.status !== 'valid'
                      ? 'bg-destructive/10 text-destructive'
                      : row.duplicate
                        ? 'bg-amber-500/10'
                        : ''
                  }`}
                >
                  {row.status !== 'valid' && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
                  {row.status === 'valid' ? (
                    <>
                      <span className="flex-1 truncate font-medium">{row.term}</span>
                      <span className="flex-1 truncate text-muted-foreground">{row.definition}</span>
                      {row.duplicate && <span className="text-xs">doublon</span>}
                    </>
                  ) : (
                    <span className="flex-1 truncate">
                      {row.raw}{' '}
                      <span className="text-xs opacity-70">
                        (
                        {row.status === 'no-separator' && 'aucun séparateur trouvé'}
                        {row.status === 'multiple-separators' && 'plusieurs séparateurs trouvés'}
                        {row.status === 'empty-field' && 'terme ou définition vide'}
                        )
                      </span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
            Annuler l'importation
          </Button>
          <Button disabled={result.validCount === 0} onClick={handleImport}>
            Importer {result.validCount > 0 && `(${result.validCount})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
