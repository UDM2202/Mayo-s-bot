export default function MetricPill({ label, value, trend, positive }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
      <span className="text-[10px] text-slate-600 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-semibold text-slate-200">{value}</span>
      <span className={`text-[10px] font-medium ${positive ? 'text-emerald-500' : 'text-red-400'}`}>
        {trend}
      </span>
    </div>
  );
}