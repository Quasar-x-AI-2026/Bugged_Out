import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UserDropdown = () => {
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!user) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-3 focus:outline-none hover:bg-purple-800 px-3 py-2 rounded-lg transition-colors"
            >
                <img
                    src={user.avatar}
                    alt=""
                    className="w-8 h-8 rounded-full border-2 border-purple-300"
                />
                <span className="text-sm font-medium text-white hidden md:block">{user.name}</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-indigo-900 border border-purple-700 rounded-lg shadow-xl py-1 z-50">
                    <div className="px-4 py-2 border-b border-purple-700">
                        <p className="text-sm font-medium text-white">{user.name}</p>
                        <p className="text-sm text-purple-300">{user.email}</p>
                    </div>

                    <button
                        onClick={() => {
                            navigate('/settings');
                            setIsOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-purple-200 hover:bg-purple-800 hover:text-white flex items-center transition-colors"
                    >
                        <SettingsIcon className="w-4 h-4 mr-2" />
                        Settings
                    </button>

                    <button
                        onClick={() => {
                            logout();
                            setIsOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-purple-200 hover:bg-purple-800 hover:text-white flex items-center transition-colors"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign out
                    </button>
                </div>
            )}
        </div>
    );
}

export default UserDropdown;
