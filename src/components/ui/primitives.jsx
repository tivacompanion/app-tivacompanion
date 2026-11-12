import { cn } from '@/lib/utils';

export function RiskBadge({ level, size = 'sm' }) {
  const config = {
    green: { bg: 'bg-mint', text: 'text-mint-deep', dot: 'bg-mint-deep', label: 'Normal' },
    amber: { bg: 'bg-peach', text: 'text-peach-deep', dot: 'bg-peach-deep', label: 'Attention' },
    red: { bg: 'bg-destructive/15', text: 'text-red-300', dot: 'bg-destructive', label: 'Alert' },
  };
  const c = config[level] || config.green;
  const sizes = {
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-3 py-1.5 text-sm gap-2',
  };
  return (
    <span className={cn('inline-flex items-center rounded-full font-semibold', c.bg, c.text, sizes[size])}>
      <span className={cn('w-1.5 h-1.5 rounded-full', c.dot)} />
      {c.label}
    </span>
  );
}

export function StatCard({ icon: Icon, label, value, unit, accent = 'lavender', trend, onClick }) {
  const accents = {
    lavender: { bg: 'bg-lavender', text: 'text-lavender-deep', glow: 'hover:border-lavender-deep/30' },
    mint: { bg: 'bg-mint', text: 'text-mint-deep', glow: 'hover:border-mint-deep/30' },
    peach: { bg: 'bg-peach', text: 'text-peach-deep', glow: 'hover:border-peach-deep/30' },
    navy: { bg: 'bg-tiva-teal', text: 'text-[#0A0F0D]', glow: 'hover:border-tiva-teal/40' },
  };
  const a = accents[accent];
  return (
    <div
      onClick={onClick}
      className={`bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-white/10 transition-all duration-300 hover:-translate-y-0.5 ${a.glow} ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${a.bg} flex items-center justify-center`}>
          {Icon && <Icon className={`w-5 h-5 ${a.text}`} strokeWidth={2} />}
        </div>
        {trend && (
          <span className="text-xs font-medium text-muted-foreground">{trend}</span>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="font-heading font-bold text-2xl text-navy">{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h2 className="font-heading font-bold text-xl text-navy">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-lavender flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-lavender-deep" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="font-heading font-semibold text-lg text-navy mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}

export function LoadingState({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-8 h-8 rounded-full animate-spin mb-3" style={{ borderWidth: '3px', borderStyle: 'solid', borderColor: 'rgba(64,201,162,0.2)', borderTopColor: '#40C9A2' }} />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}