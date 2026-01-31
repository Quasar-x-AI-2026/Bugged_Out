import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();
const API_URL = 'http://127.0.0.1:5000';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('auth_token'));

    // Verify token on mount (Mock implementation for now since backend is missing)
    useEffect(() => {
        if (token) {
            // In a real app, verify token with backend.
            // Here we just restore a mock session if token exists.
            setUser({
                id: '1',
                name: 'Demo User',
                email: 'demo@example.com',
                avatar: 'https://ui-avatars.com/api/?name=Demo+User',
                role: 'admin'
            });
        }
    }, []);

    const login = async (email, password) => {
        try {
            // Try real backend first
            const response = await axios.post(`${API_URL}/login`, { email, password });
            const { token: newToken, user: userData } = response.data;

            setToken(newToken);
            setUser(userData);
            localStorage.setItem('auth_token', newToken);
        } catch (error) {
            console.warn("Backend login failed, using mock auth for development.");
            
            // Mock Users Database
            const mockUsers = {
                'admin@kar.gov.in': {
                    password: 'admin123',
                    user: {
                        id: '1',
                        name: 'Administrator',
                        email: 'admin@kar.gov.in',
                        avatar: 'https://ui-avatars.com/api/?name=Administrator&background=8b5cf6&color=fff',
                        role: 'admin',
                        department: 'Karnataka State Police',
                        designation: 'System Administrator'
                    }
                },
                'demo@example.com': {
                    password: 'demo',
                    user: {
                        id: '3',
                        name: 'Demo User',
                        email: 'demo@example.com',
                        avatar: 'https://ui-avatars.com/api/?name=Demo+User&background=10b981&color=fff',
                        role: 'user',
                        department: 'Demo Department',
                        designation: 'Demo User'
                    }
                }
            };

            // Check credentials
            const userCredentials = mockUsers[email];
            if (userCredentials && userCredentials.password === password) {
                const mockToken = `mock-jwt-token-${userCredentials.user.id}`;
                setToken(mockToken);
                setUser(userCredentials.user);
                localStorage.setItem('auth_token', mockToken);
                return;
            }
            
            throw new Error('Invalid email or password');
        }
    };

    const logout = async () => {
        if (token) {
            try {
                await axios.post(`${API_URL}/logout`, { token });
            } catch (error) {
                console.error('Logout error:', error);
            }
        }

        setUser(null);
        setToken(null);
        localStorage.removeItem('auth_token');
    };

    const updateProfile = async (name, email) => {
        if (!token) throw new Error('Not authenticated');

        // Mock update
        setUser(prev => prev ? { ...prev, name, email } : null);
    };

    const changePassword = async (currentPassword, newPassword) => {
        if (!token) throw new Error('Not authenticated');
        // Mock change password
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, updateProfile, changePassword }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
