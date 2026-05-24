import React, { useState } from 'react';
import { Eye, EyeOff, Lock, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthProvider';
import { USER_ROLES } from '../constants';

const PasswordChangePage = () => {
  const navigate = useNavigate();
  const { changePassword, loading, user, logout } = useAuth();
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (formData.new_password.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (formData.new_password !== formData.confirm_password) {
      setError('New passwords do not match.');
      return;
    }

    try {
      const updatedUser = await changePassword({
        current_password: formData.current_password,
        new_password: formData.new_password,
      });
      setSuccess('Password updated successfully. Redirecting...');
      setTimeout(() => {
        if (updatedUser.role === USER_ROLES.ADMIN || updatedUser.role === USER_ROLES.SUPER_ADMIN) {
          navigate('/admin', { replace: true });
          return;
        }
        navigate('/dashboard', { replace: true });
      }, 900);
    } catch (err) {
      setError(err.message || 'Failed to update password.');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--gc-page)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="rounded-[32px] bg-[linear-gradient(145deg,_#032a55,_#0057b7_58%,_#16b8dc)] p-8 text-white shadow-[0_34px_110px_-55px_rgba(0,87,183,0.95)] sm:p-10">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-8 w-8 text-cyan-100" />
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-100">Security Update</p>
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Change your temporary password</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-100 sm:text-lg">
              This account is using a temporary password. Update it now before continuing to your dashboard.
            </p>
            <div className="mt-8 space-y-3">
              {[
                'Choose a password only you know',
                'You will use the new password the next time you sign in',
                'You can sign out if you need to continue later',
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium text-slate-100 backdrop-blur">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_30px_90px_-55px_rgba(15,23,42,0.45)] sm:p-8">
            <div className="mb-6 text-center">
              <img src="/gulf.png" alt="Gulf Consultant logo" className="mx-auto h-16 w-16 rounded-2xl border border-slate-200 bg-white p-1 object-contain" />
              <h2 className="mt-4 text-2xl font-bold text-slate-950">Update Password</h2>
              <p className="mt-2 text-sm text-slate-600">{user?.email || user?.phone_number}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              {success && <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

              {[
                { name: 'current_password', label: 'Current Password', autoComplete: 'current-password' },
                { name: 'new_password', label: 'New Password', autoComplete: 'new-password' },
                { name: 'confirm_password', label: 'Confirm New Password', autoComplete: 'new-password' },
              ].map((field) => (
                <div key={field.name}>
                  <label htmlFor={field.name} className="mb-2 block text-sm font-semibold text-slate-700">
                    {field.label}
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                    <input
                      id={field.name}
                      name={field.name}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={field.autoComplete}
                      value={formData[field.name]}
                      onChange={handleChange}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 pl-10 pr-12 text-sm text-slate-900 outline-none transition focus:border-[var(--gc-cyan-strong)] focus:ring-2 focus:ring-cyan-100"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-3 top-3 text-slate-400 transition hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-[var(--gc-blue)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--gc-blue-dark)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Updating password...' : 'Save New Password'}
              </button>
            </form>

            <button
              type="button"
              onClick={logout}
              className="mt-4 w-full rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordChangePage;
