import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    BarChart2,
    MapPin,
    Map,
    ShieldCheck,
    TrendingUp,
    Menu,
    X,
    Shield
} from 'lucide-react';
import UserDropdown from './UserDropdown';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { user } = useAuth();

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: MapPin, label: 'Spatial Analysis', path: '/spatial-analysis' },
        { icon: Map, label: 'Location Performance', path: '/location-performance' },
        { icon: TrendingUp, label: 'Trends', path: '/trend-analysis' },
        { icon: ShieldCheck, label: 'Beat Comparison', path: '/beat-comparison' },
        { icon: BarChart2, label: 'Crime Prediction', path: '/crime-prediction' },
    ];

    if (user?.role === 'admin') {
        navItems.push(
            { icon: BarChart2, label: 'Data Management', path: '/data-management' },
            { icon: Shield, label: 'Admin Panel', path: '/admin' }
        );
    }

    return (
        <nav className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-800 shadow-lg sticky top-0 z-50">
            <div className="w-full px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    {/* Logo and Brand */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold text-white hidden sm:block">Intelligent Crime Analysis</span>
                    </div>

                    {/* Desktop Navigation - Centered */}
                    <div className="hidden lg:flex items-center justify-center flex-1 px-4">
                        <div className="flex items-center gap-1 flex-wrap justify-center">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        className={({ isActive }) => `
                      flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap
                      ${isActive
                                                ? 'bg-purple-700 text-white shadow-md'
                                                : 'text-purple-200 hover:bg-purple-800 hover:text-white'
                                            }
                    `}
                                    >
                                        <Icon className="w-4 h-4 flex-shrink-0" />
                                        <span className="hidden xl:inline">{item.label}</span>
                                    </NavLink>
                                );
                            })}
                        </div>
                    </div>

                    {/* User Dropdown - Right Side */}
                    <div className="hidden lg:flex items-center flex-shrink-0">
                        <UserDropdown />
                    </div>

                    {/* Mobile menu button */}
                    <div className="flex items-center gap-2 lg:hidden">
                        <UserDropdown />
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-md text-purple-200 hover:text-white hover:bg-purple-800 focus:outline-none"
                        >
                            {mobileMenuOpen ? (
                                <X className="block h-6 w-6" />
                            ) : (
                                <Menu className="block h-6 w-6" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileMenuOpen && (
                <div className="lg:hidden bg-indigo-900 border-t border-purple-700">
                    <div className="px-4 pt-2 pb-3 space-y-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors
                    ${isActive
                                            ? 'bg-purple-700 text-white'
                                            : 'text-purple-200 hover:bg-purple-800 hover:text-white'
                                        }
                  `}
                                >
                                    <Icon className="w-5 h-5 flex-shrink-0" />
                                    <span>{item.label}</span>
                                </NavLink>
                            );
                        })}
                        <div className="pt-4 pb-2 border-t border-purple-700">
                            <UserDropdown />
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
