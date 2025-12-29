import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';

export default function AdminLayout() {
    return (
        <div className="flex bg-blue-50/50 min-h-screen">
            <AdminSidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <AdminHeader />
                <main className="flex-1 overflow-auto p-0">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
