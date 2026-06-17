interface ProgressIndicatorProps {
  status: string;
  label: string;
}

export function ProgressIndicator({ status, label }: ProgressIndicatorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="relative w-16 h-16 mb-6">
        <div className="absolute inset-0 rounded-full border-2 border-white/[0.06]" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-500 animate-spin" />
        <div className="absolute inset-2 rounded-full border border-white/[0.04]" />
        <div className="absolute inset-2 rounded-full border border-transparent border-t-teal-400 animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
      </div>
      <h3 className="text-sm font-semibold text-white mb-1">{label}</h3>
      <p className="text-xs text-neutral-500 uppercase tracking-wider">{status}</p>
    </div>
  );
}
