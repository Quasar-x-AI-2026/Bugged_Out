import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Users, UserPlus, Trash2, Shield, User as UserIcon, Mail, Calendar, Download } from 'lucide-react';
import axios from 'axios';
import * as XLSX from 'xlsx';

const AdminPanel = () => {
    const { token, user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newUser, setNewUser] = useState({
        email: '',
        password: '',
        name: '',
        role: 'user',
    });
    const [message, setMessage] = useState({ type: '', text: '' });

    // Likely this will fail if port 5000 is not running
    const API_URL = 'http://127.0.0.1:5000';

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchUsers();
        }
    }, [user]);

    const fetchUsers = async () => {
        try {
            const response = await axios.post(`${API_URL}/admin/users`, { token });
            setUsers(response.data.users);
        } catch (error) {
            console.error('Error fetching users:', error);
            // Mock data for display if API fails
            if (users.length === 0) {
                setUsers([
                    { id: 1, name: 'Demo User', email: 'demo@example.com', role: 'admin', created_at: new Date().toISOString(), last_login: new Date().toISOString() }
                ]);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        try {
            await axios.post(`${API_URL}/admin/create-user`, {
                token,
                ...newUser,
            });

            setMessage({ type: 'success', text: 'User created successfully!' });
            setNewUser({ email: '', password: '', name: '', role: 'user' });
            setShowCreateModal(false);
            fetchUsers();
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.error || 'Failed to create user'
            });
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm('Are you sure you want to delete this user?')) return;

        try {
            await axios.post(`${API_URL}/admin/delete-user`, {
                token,
                userId,
            });

            setMessage({ type: 'success', text: 'User deleted successfully!' });
            fetchUsers();
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.error || 'Failed to delete user'
            });
        }
    };

    const handleExportToExcel = () => {
        // Prepare data for export
        const exportData = users.map(u => ({
            'User ID': u.id,
            'Name': u.name,
            'Email': u.email,
            'Role': u.role,
            'Created Date': new Date(u.created_at).toLocaleDateString(),
            'Last Login': u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'
        }));

        // Create worksheet
        const worksheet = XLSX.utils.json_to_sheet(exportData);

        // Set column widths
        worksheet['!cols'] = [
            { wch: 10 },  // User ID
            { wch: 20 },  // Name
            { wch: 30 },  // Email
            { wch: 10 },  // Role
            { wch: 15 },  // Created Date
            { wch: 15 }   // Last Login
        ];

        // Create workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `KSP_Users_${timestamp}.xlsx`;

        // Download file
        XLSX.writeFile(workbook, filename);

        setMessage({ type: 'success', text: 'User list exported successfully!' });
    };

    if (user?.role !== 'admin') {
        return (
            <div className="space-y-6">
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-8 text-center">
                    <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
                    <p className="text-red-300">You don't have permission to access this page.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Admin Panel</h2>
                    <p className="text-purple-200 text-sm mt-1">Manage user accounts and permissions</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExportToExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg"
                    >
                        <Download className="w-5 h-5" />
                        Export to Excel
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg"
                    >
                        <UserPlus className="w-5 h-5" />
                        Create User
                    </button>
                </div>
            </div>

            {/* Messages */}
            {message.text && (
                <div className={`rounded-lg p-4 ${message.type === 'success'
                        ? 'bg-green-500/20 border border-green-500/30 text-green-300'
                        : 'bg-red-500/20 border border-red-500/30 text-red-300'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Users Table */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-white/20">
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-300" />
                        <h3 className="text-lg font-medium text-white">User Management</h3>
                    </div>
                    <p className="mt-1 text-sm text-purple-200">Total users: {users.length}</p>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-purple-200">Loading users...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">Created</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">Last Login</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {users.map((u) => (
                                    <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                                                    <UserIcon className="w-5 h-5 text-white" />
                                                </div>
                                                <span className="text-white font-medium">{u.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-purple-200">
                                                <Mail className="w-4 h-4" />
                                                {u.email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${u.role === 'admin'
                                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                                }`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-purple-200 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4" />
                                                {new Date(u.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-purple-200 text-sm">
                                            {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {u.id !== user?.id && (
                                                <button
                                                    onClick={() => handleDeleteUser(u.id)}
                                                    className="text-red-400 hover:text-red-300 transition-colors"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-xl border border-white/20 shadow-2xl max-w-md w-full">
                        <div className="p-6 border-b border-white/20">
                            <h3 className="text-xl font-bold text-white">Create New User</h3>
                        </div>

                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-purple-200 mb-2">Name</label>
                                <input
                                    type="text"
                                    value={newUser.name}
                                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                    className="block w-full rounded-md bg-white/5 border border-white/20 text-white placeholder-purple-300 focus:border-purple-500 focus:ring-purple-500 px-4 py-2"
                                    placeholder="John Doe"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-purple-200 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    className="block w-full rounded-md bg-white/5 border border-white/20 text-white placeholder-purple-300 focus:border-purple-500 focus:ring-purple-500 px-4 py-2"
                                    placeholder="user@example.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-purple-200 mb-2">Password</label>
                                <input
                                    type="password"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                    className="block w-full rounded-md bg-white/5 border border-white/20 text-white placeholder-purple-300 focus:border-purple-500 focus:ring-purple-500 px-4 py-2"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-purple-200 mb-2">Role</label>
                                <select
                                    value={newUser.role}
                                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                    className="block w-full rounded-md bg-white/5 border border-white/20 text-white focus:border-purple-500 focus:ring-purple-500 px-4 py-2"
                                >
                                    <option value="user" className="bg-indigo-900">User</option>
                                    <option value="admin" className="bg-indigo-900">Admin</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2 border border-white/20 rounded-md text-sm font-medium text-purple-200 hover:bg-white/10 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-md hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg"
                                >
                                    Create User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
