import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  supportingText?: string;
}

export default function MetricCard({ icon: Icon, label, value, supportingText }: MetricCardProps) {
  return (
    <div className="rounded-card border border-border bg-card px-5 py-4">
      <div className="mb-3 flex items-center gap-2 text-text-secondary">
        <Icon size={15} />
        <span className="text-[13px]">{label}</span>
      </div>
      <div className="text-2xl font-semibold tracking-tight text-text">{value}</div>
      {supportingText && <div className="mt-1 text-xs text-text-muted">{supportingText}</div>}
    </div>
  );
}
