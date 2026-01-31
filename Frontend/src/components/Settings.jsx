import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Lock, Save } from 'lucide-react';

const Settings = () => {
    const { user, updateProfile, changePassword } = useAuth();
    const [profileData, setProfileData] = useState({
        name: '',
        email: '',
    });
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setProfileData({
                name: user.name,
                email: user.email,
            });
        }
    }, [user]);

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccessMessage('');
        setErrorMessage('');

        try {
            await updateProfile(profileData.name, profileData.email);
            setSuccessMessage('Profile updated successfully!');
        } catch (error) {
            setErrorMessage(error.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccessMessage('');
        setErrorMessage('');

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setErrorMessage('New passwords do not match');
            setLoading(false);
            return;
        }

        if (passwordData.newPassword.length < 4) {
            setErrorMessage('Password must be at least 4 characters');
            setLoading(false);
            return;
        }

        try {
            await changePassword(passwordData.currentPassword, passwordData.newPassword);
            setSuccessMessage('Password changed successfully!');
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });
        } catch (error) {
            setErrorMessage(error.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Settings</h2>

            {/* Success/Error Messages */}
            {successMessage && (
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 text-green-300">
                    {successMessage}
                </div>
            )}
            {errorMessage && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-red-300">
                    {errorMessage}
                </div>
            )}

            {/* Profile Settings */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-xl">
                <form onSubmit={handleProfileSubmit}>
                    <div className="p-6 border-b border-white/20">
                        <div className="flex items-center gap-2">
                            <User className="w-5 h-5 text-purple-300" />
                            <h3 className="text-lg font-medium text-white">Profile Settings</h3>
                        </div>
                        <p className="mt-1 text-sm text-purple-200">Update your account information</p>
                    </div>

                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-purple-200 mb-2">Name</label>
                            <input
                                type="text"
                                name="name"
                                value={profileData.name}
                                onChange={handleProfileChange}
                                className="block w-full rounded-md bg-white/5 border border-white/20 text-white placeholder-purple-300 focus:border-purple-500 focus:ring-purple-500 px-4 py-2"
                                placeholder="Your name"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-purple-200 mb-2">Email</label>
                            <input
                                type="email"
                                name="email"
                                value={profileData.email}
                                onChange={handleProfileChange}
                                className="block w-full rounded-md bg-white/5 border border-white/20 text-white placeholder-purple-300 focus:border-purple-500 focus:ring-purple-500 px-4 py-2"
                                placeholder="your@email.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="px-6 py-4 bg-white/5 rounded-b-xl border-t border-white/10 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {loading ? 'Saving...' : 'Save Profile'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Change Password */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-xl">
                <form onSubmit={handlePasswordSubmit}>
                    <div className="p-6 border-b border-white/20">
                        <div className="flex items-center gap-2">
                            <Lock className="w-5 h-5 text-purple-300" />
                            <h3 className="text-lg font-medium text-white">Change Password</h3>
                        </div>
                        <p className="mt-1 text-sm text-purple-200">Update your password to keep your account secure</p>
                    </div>

                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-purple-200 mb-2">Current Password</label>
                            <input
                                type="password"
                                name="currentPassword"
                                value={passwordData.currentPassword}
                                onChange={handlePasswordChange}
                                className="block w-full rounded-md bg-white/5 border border-white/20 text-white placeholder-purple-300 focus:border-purple-500 focus:ring-purple-500 px-4 py-2"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-purple-200 mb-2">New Password</label>
                            <input
                                type="password"
                                name="newPassword"
                                value={passwordData.newPassword}
                                onChange={handlePasswordChange}
                                className="block w-full rounded-md bg-white/5 border border-white/20 text-white placeholder-purple-300 focus:border-purple-500 focus:ring-purple-500 px-4 py-2"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-purple-200 mb-2">Confirm New Password</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={passwordData.confirmPassword}
                                onChange={handlePasswordChange}
                                className="block w-full rounded-md bg-white/5 border border-white/20 text-white placeholder-purple-300 focus:border-purple-500 focus:ring-purple-500 px-4 py-2"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <div className="px-6 py-4 bg-white/5 rounded-b-xl border-t border-white/10 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all disabled:opacity-50"
                        >
                            <Lock className="w-4 h-4" />
                            {loading ? 'Changing...' : 'Change Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Settings;
