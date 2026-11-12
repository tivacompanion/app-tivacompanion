import React from 'react';

export function StatusBadge({ level, label, size = 'md' }) {
  const colorMap = {
    green: 'var(--tiva-mint)',
    amber: 'var(--tiva-amber)',
    red: 'var(--tiva-red)',
    lavender: 'var(--tiva-lavender)',
  };
  const sizes = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-heading font-semibold ${sizes[size]}`}
      style={{ backgroundColor: colorMap[level] || colorMap.lavender, color: 'var(--tiva-navy)' }}
    >
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--tiva-navy)' }} />
      {label}
    </span>
  );
}

export function StatusRing({ level, size = 48 }) {
  const colorMap = {
    green: 'var(--tiva-mint-mid)',
    amber: '#E8D8A8',
    red: 'var(--tiva-red-mid)',
  };
  return (
    <div
      className="rounded-full flex items-center justify-center"
      style={{
        width: size,
        height: size,
        backgroundColor: colorMap[level] || colorMap.green,
        border: `3px solid ${level === 'green' ? 'var(--tiva-mint)' : level === 'amber' ? 'var(--tiva-amber)' : 'var(--tiva-red)'}`,
      }}
    >
      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--tiva-navy)' }} />
    </div>
  );
}

export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h2 className="font-heading text-2xl font-bold" style={{ color: 'var(--tiva-navy)' }}>{title}</h2>
        {subtitle && <p className="text-sm mt-1" style={{ color: 'var(--tiva-navy)', opacity: 0.5 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-settle">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5" style={{ backgroundColor: 'var(--tiva-lavender-light)' }}>
        <Icon size={36} style={{ color: 'var(--tiva-navy)', opacity: 0.4 }} />
      </div>
      <h3 className="font-heading text-xl font-bold mb-2" style={{ color: 'var(--tiva-navy)' }}>{title}</h3>
      <p className="text-sm max-w-xs mb-6" style={{ color: 'var(--tiva-navy)', opacity: 0.5 }}>{description}</p>
      {action}
    </div>
  );
}

export function LoadingSpinner({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--tiva-lavender)', borderTopColor: 'var(--tiva-navy)' }} />
      {label && <p className="mt-4 text-sm" style={{ color: 'var(--tiva-navy)', opacity: 0.5 }}>{label}</p>}
    </div>
  );
}