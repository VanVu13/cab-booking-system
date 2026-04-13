import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import AdminLayout from './AdminLayout';
import LoginPage from './pages/LoginPage';
import DriversPage from './pages/DriversPage';

// Placeholder element
const Placeholder = ({ title }: { title: string }) => (
    <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">{title}</h1>
        <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-500">
            Tính năng đang phát triển...
        </div>
    </div>
);

function App() {
    return (
        <BrowserRouter>
            <ToastContainer position="top-right" autoClose={3000} />
            <Routes>
                <Route path="/login" element={<LoginPage />} />

                <Route element={<AdminLayout />}>
                    <Route path="/" element={<Placeholder title="Tổng quan hệ thống (Dashboard)" />} />
                    <Route path="/drivers" element={<DriversPage />} />
                    <Route path="/customers" element={<Placeholder title="Quản lý khách hàng" />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
