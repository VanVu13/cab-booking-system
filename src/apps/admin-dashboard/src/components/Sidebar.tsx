import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAdminAuthStore } from '../stores/useAdminAuthStore';
import { LayoutDashboard, Users, UserCheck, LogOut } from 'lucide-react';
import { cn } from '../utils/cn';

export default function Sidebar() {
    const logout = useAdminAuthStore((state) => state.logout);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuItems = [
        { name: 'Tổng quan', path: '/', icon: LayoutDashboard },
        { name: 'Quản lý Tài xế', path: '/drivers', icon: UserCheck },
        { name: 'Quản lý Hành khách', path: '/customers', icon: Users },
    ];

    return (
        <div className="w-64 bg-gray-900 text-white flex flex-col h-screen">
            <div className="p-6">
                <h1 className="text-2xl font-bold tracking-wider">CAB ADMIN</h1>
                <p className="text-xs text-gray-400 mt-1">Hệ thống QL & Vận hành</p>
            </div>

            <nav className="flex-1 mt-6 space-y-2 px-4">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            cn(
                                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium',
                                isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                            )
                        }
                    >
                        <item.icon className="w-5 h-5" />
                        {item.name}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-gray-800">
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-gray-800 hover:text-red-300 transition-colors font-medium"
                >
                    <LogOut className="w-5 h-5" />
                    Đăng xuất
                </button>
            </div>
        </div>
    );
}
