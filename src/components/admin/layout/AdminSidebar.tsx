import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    UploadCloud,
    Activity,
    Users,
    BarChart2,
    ChevronLeft,
    ChevronRight,
    Settings,
    LogOut,
    Package
} from 'lucide-react';

export default function AdminSidebar() {
    const [collapsed, setCollapsed] = useState(false);

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', to: '/admin', end: true },
        { icon: UploadCloud, label: 'Questions', to: '/admin/questions' },
        { icon: Package, label: 'Bundles', to: '/admin/bundles' },
        { icon: Activity, label: 'Live Logs', to: '/admin/logs' },
        { icon: BarChart2, label: 'Analytics', to: '/admin/analytics' },
        { icon: Users, label: 'Users', to: '/admin/users' },
    ];

    return (
        <div
            className={`bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 border-r border-slate-800 ${collapsed ? 'w-20' : 'w-64'
                } h-screen sticky top-0`}
        >
            {/* Brand */}
            <div className="h-16 flex items-center px-6 border-b border-slate-800">
                <div className={`font-bold text-white transition-all overflow-hidden whitespace-nowrap ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                    <span className="text-blue-500">Blue</span>Ninja Admin
                </div>
                {collapsed && <div className="w-8 h-8 bg-blue-600 rounded-lg mx-auto flex items-center justify-center font-bold text-white">B</div>}
            </div>

            {/* Toggle */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute -right-3 top-20 bg-slate-800 text-slate-400 p-1 rounded-full border border-slate-700 hover:text-white transition"
            >
                {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {/* Nav */}
            <nav className="flex-1 py-6 flex flex-col gap-1 px-3">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) => `
              flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative
              ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}
              ${collapsed ? 'justify-center' : ''}
            `}
                    >
                        <item.icon size={20} className={collapsed ? '' : 'shrink-0'} />
                        {!collapsed && <span className="font-medium">{item.label}</span>}

                        {/* Tooltip for collapsed state */}
                        {collapsed && (
                            <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                                {item.label}
                            </div>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800">
                <button className={`flex items-center gap-3 w-full px-3 py-2 text-slate-400 hover:text-white transition ${collapsed ? 'justify-center' : ''}`}>
                    <LogOut size={20} />
                    {!collapsed && <span>Sign Out</span>}
                </button>
            </div>
        </div>
    );
}
