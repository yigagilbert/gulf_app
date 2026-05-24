import React from 'react';

const COLOR_MAP = {
  draft: 'bg-slate-100 text-slate-700',
  pending_profile_completion: 'bg-amber-100 text-amber-800',
  pending_documents: 'bg-orange-100 text-orange-800',
  submitted: 'bg-blue-100 text-blue-800',
  under_review: 'bg-indigo-100 text-indigo-800',
  needs_update: 'bg-rose-100 text-rose-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  processing: 'bg-cyan-100 text-cyan-800',
  completed: 'bg-emerald-100 text-emerald-800',
  new_lead: 'bg-slate-100 text-slate-700',
  applicant: 'bg-blue-100 text-blue-800',
  under_processing: 'bg-cyan-100 text-cyan-800',
  selected: 'bg-violet-100 text-violet-800',
  visa_processing: 'bg-sky-100 text-sky-800',
  ready_to_travel: 'bg-emerald-100 text-emerald-800',
  traveled: 'bg-lime-100 text-lime-800',
  active_abroad: 'bg-green-100 text-green-800',
  returned: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-rose-100 text-rose-800',
  inactive: 'bg-slate-200 text-slate-700',
  pending: 'bg-amber-100 text-amber-800',
  verified: 'bg-emerald-100 text-emerald-800',
  archived: 'bg-slate-200 text-slate-700',
  client_visible: 'bg-blue-50 text-blue-700',
  admin_only: 'bg-slate-100 text-slate-700',
  view_only: 'bg-indigo-50 text-indigo-700',
  download_allowed: 'bg-green-50 text-green-700',
};

const toLabel = (value) => {
  if (!value) return 'Unknown';
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const StatusBadge = ({ value, label, className = '' }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${COLOR_MAP[value] || 'bg-slate-100 text-slate-700'} ${className}`}>
    {label || toLabel(value)}
  </span>
);

export default StatusBadge;
