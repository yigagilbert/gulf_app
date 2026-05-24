import React, { useEffect, useState } from 'react';
import { KeyRound, Plus, Shield, ShieldCheck, UserCog, UserX } from 'lucide-react';
import APIService from '../services/APIService';

const defaultFormState = {
  email: '',
  password: '',
  role: 'admin'
};

const AdminUsersTab = ({ currentUser }) => {
  const [adminUsers, setAdminUsers] = useState([]);
  const [formData, setFormData] = useState(defaultFormState);
  const [resetPasswords, setResetPasswords] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadAdminUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const users = await APIService.getAdminUsers();
      setAdminUsers(users || []);
    } catch (err) {
      setError(err.message || 'Failed to load admin users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminUsers();
  }, []);

  const handleCreateAdmin = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await APIService.createAdminUser(formData);
      setFormData(defaultFormState);
      setSuccess('Admin account created successfully. The new user must change their password on first login.');
      await loadAdminUsers();
    } catch (err) {
      setError(err.message || 'Failed to create admin user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (user) => {
    setError('');
    setSuccess('');
    try {
      await APIService.updateAdminUser(user.id, { is_active: !user.is_active });
      setSuccess(`${user.email} has been ${user.is_active ? 'deactivated' : 'activated'}.`);
      await loadAdminUsers();
    } catch (err) {
      setError(err.message || 'Failed to update admin status.');
    }
  };

  const handleRoleChange = async (user, nextRole) => {
    setError('');
    setSuccess('');
    try {
      await APIService.updateAdminUser(user.id, { role: nextRole });
      setSuccess(`${user.email} is now assigned the ${nextRole.replace('_', ' ')} role.`);
      await loadAdminUsers();
    } catch (err) {
      setError(err.message || 'Failed to update admin role.');
    }
  };

  const handleResetPassword = async (userId) => {
    const newTemporaryPassword = resetPasswords[userId]?.trim();
    if (!newTemporaryPassword || newTemporaryPassword.length < 8) {
      setError('Temporary passwords must be at least 8 characters long.');
      return;
    }

    setError('');
    setSuccess('');
    try {
      await APIService.resetAdminUserPassword(userId, { new_temporary_password: newTemporaryPassword });
      setResetPasswords((current) => ({ ...current, [userId]: '' }));
      setSuccess('Temporary password reset successfully. The admin will be required to change it on next login.');
      await loadAdminUsers();
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    }
  };

  if (loading) {
    return <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">Loading admin users...</div>;
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
            <UserCog className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Admin Management</h2>
            <p className="text-sm text-gray-600">Create admin accounts, assign roles, control access, and reset temporary passwords.</p>
          </div>
        </div>

        <form onSubmit={handleCreateAdmin} className="grid gap-4 md:grid-cols-3">
          <input
            type="email"
            placeholder="Admin email"
            value={formData.email}
            onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            required
          />
          <input
            type="text"
            placeholder="Temporary password"
            value={formData.password}
            onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))}
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            required
          />
          <select
            value={formData.role}
            onChange={(event) => setFormData((current) => ({ ...current, role: event.target.value }))}
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 md:col-span-3 md:w-fit"
          >
            <Plus className="h-4 w-4" />
            {submitting ? 'Creating admin...' : 'Create Admin User'}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Current Admin Users</h3>
          <span className="text-sm text-gray-500">{adminUsers.length} accounts</span>
        </div>

        <div className="space-y-4">
          {adminUsers.map((adminUser) => {
            const isCurrentUser = currentUser?.id === adminUser.id;
            return (
              <div key={adminUser.id} className="rounded-2xl border border-gray-200 p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-base font-semibold text-gray-900">{adminUser.email}</p>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        adminUser.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {adminUser.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        adminUser.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {adminUser.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {adminUser.must_change_password && (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                          Must change password
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      Last login: {adminUser.last_login_at ? new Date(adminUser.last_login_at).toLocaleString() : 'Not yet signed in'}
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:min-w-[420px]">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleRoleChange(adminUser, adminUser.role === 'super_admin' ? 'admin' : 'super_admin')}
                        disabled={isCurrentUser}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {adminUser.role === 'super_admin' ? <Shield className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                        {adminUser.role === 'super_admin' ? 'Make Admin' : 'Make Super Admin'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(adminUser)}
                        disabled={isCurrentUser}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <UserX className="h-4 w-4" />
                        {adminUser.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={resetPasswords[adminUser.id] || ''}
                        onChange={(event) => setResetPasswords((current) => ({ ...current, [adminUser.id]: event.target.value }))}
                        placeholder="New temp password"
                        className="w-full rounded-full border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                      <button
                        type="button"
                        onClick={() => handleResetPassword(adminUser.id)}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        <KeyRound className="h-4 w-4" />
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default AdminUsersTab;
