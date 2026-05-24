import React from 'react';
import { Link } from 'react-router-dom';

const UnauthorizedPage = () => {
  return (
    <div className="min-h-screen bg-[var(--gc-page)] px-4 py-16">
      <div className="mx-auto max-w-2xl rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-[0_30px_90px_-55px_rgba(15,23,42,0.45)]">
        <img src="/gulf.png" alt="Gulf Consultant logo" className="mx-auto h-16 w-16 rounded-2xl border border-slate-200 bg-white p-1 object-contain" />
        <h1 className="mt-6 text-3xl font-bold text-slate-950">Access Restricted</h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Your account does not have permission to open this page. Please return to your dashboard or contact a super admin if you believe this is a mistake.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to="/" className="rounded-full bg-[var(--gc-blue)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--gc-blue-dark)]">
            Go To Dashboard
          </Link>
          <Link to="/login" className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900">
            Return To Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
