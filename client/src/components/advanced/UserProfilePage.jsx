import { useEffect, useState } from 'react';
import { FiUser, FiLock, FiSave, FiLoader, FiShield } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getProfile, updateProfile, changePassword } from '../../api/advanced';
import { useAuth } from '../../context/AuthContext';

export default function UserProfilePage() {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [profileForm, setProfileForm] = useState({ name: '', organization: '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });

  const load = async () => {
    setLoading(true);
    try {
      const r = await getProfile();
      setProfile(r.data.user);
      setProfileForm({ name: r.data.user.name || '', organization: r.data.user.organization || '' });
    } catch (err) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const r = await updateProfile(profileForm);
      setProfile(r.data.user);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordForm.new_password.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      toast.success('Password changed successfully');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) return <div className="loading-screen"><FiLoader className="spin" /></div>;

  return (
    <div className="feature-page">
      <div className="feature-page-header">
        <div className="feature-page-title">
          <FiUser size={28} />
          <div>
            <h1>User Profile</h1>
            <p className="feature-page-desc">Manage your account settings and security.</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
        {/* Profile Details */}
        <div className="detail-card">
          <h2 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiUser size={20} /> Profile Information
          </h2>
          <div style={{ marginBottom: 16, padding: '12px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Email (cannot be changed)</div>
            <div style={{ fontWeight: 600 }}>{profile?.email}</div>
          </div>
          <div style={{ marginBottom: 16, padding: '12px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Member since</div>
            <div style={{ fontWeight: 600 }}>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</div>
          </div>
          <form onSubmit={handleProfileSave}>
            <div className="form-group">
              <label>Full Name *</label>
              <input
                className="form-input"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                placeholder="Your full name"
                required
              />
            </div>
            <div className="form-group">
              <label>Organization</label>
              <input
                className="form-input"
                value={profileForm.organization}
                onChange={(e) => setProfileForm({ ...profileForm, organization: e.target.value })}
                placeholder="Company or organization name"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <FiLoader className="spin" /> : <FiSave size={16} />}
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Password Change */}
        <div className="detail-card">
          <h2 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiLock size={20} /> Change Password
          </h2>
          <form onSubmit={handlePasswordChange}>
            <div className="form-group">
              <label>Current Password *</label>
              <input
                type="password"
                className="form-input"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>New Password *</label>
              <input
                type="password"
                className="form-input"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                placeholder="At least 8 characters"
                required
              />
            </div>
            <div className="form-group">
              <label>Confirm New Password *</label>
              <input
                type="password"
                className="form-input"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={changingPassword}>
              {changingPassword ? <FiLoader className="spin" /> : <FiShield size={16} />}
              {changingPassword ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
