interface StudyProgressProps {
  label: string;
  current: number;
  total: number;
}

export default function StudyProgress({ label, current, total }: StudyProgressProps) {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  return (
    <div className="w-full">
      <div className="mb-1.5 flex justify-between text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="bg-brand-gradient h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
