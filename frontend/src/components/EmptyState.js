import React from 'react';

const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction, tone = 'default' }) => {
  const toneStyles = {
    default: 'border-slate-200 bg-white',
    soft: 'border-blue-100 bg-blue-50/60',
  };

  return (
    <div className={`rounded-2xl border p-8 text-center shadow-sm ${toneStyles[tone] || toneStyles.default}`}>
      {Icon ? <Icon className="mx-auto h-12 w-12 text-slate-300" /> : null}
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      {actionLabel && onAction ? (
        <button
          onClick={onAction}
          className="mt-5 rounded-full bg-[var(--gc-blue)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--gc-blue-deep)]"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
};

export default EmptyState;
