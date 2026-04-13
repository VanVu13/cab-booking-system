import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { useAdminAuthStore } from './stores/useAdminAuthStore';

export default function AdminLayout() {
    const accessToken = useAdminAuthStore((state) => state.accessToken);

    if (!accessToken) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto w-full">
                <Outlet />
            </main>
        </div>
    );
}
