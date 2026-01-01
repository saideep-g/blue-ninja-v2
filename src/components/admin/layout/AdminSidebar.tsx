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
    Package,
    FlaskConical,
    Library,
    GitPullRequest,
    Layers
} from 'lucide-react';

export default function AdminSidebar() {
    const [collapsed, setCollapsed] = useState(false);

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', to: '/admin', end: true },
        { icon: UploadCloud, label: 'Questions', to: '/admin/questions' },
        { icon: Layers, label: 'Creator Studio', to: '/admin/question-bundles' },
        { icon: Library, label: 'Schemas (QLMS)', to: '/admin/templates' },
        { icon: GitPullRequest, label: 'Migration', to: '/admin/migration' },
        { icon: Package, label: 'Bundles', to: '/admin/bundles' },
        { icon: Activity, label: 'Live Logs', to: '/admin/logs' },
        { icon: BarChart2, label: 'Analytics', to: '/admin/analytics' },
        { icon: Users, label: 'Users', to: '/admin/users' },
        { icon: FlaskConical, label: 'Test Lab', to: '/admin/test-lab' },
    ];

    return (
        <div
            className={`bg-[#0f172a] text-slate-300 flex flex-col transition-all duration-300 border-r border-slate-800/50 relative shadow-2xl z-20 ${collapsed ? 'w-20' : 'w-72'
                } h-screen sticky top-0`}
        >
            {/* Brand */}
            <div className="h-20 flex items-center px-6 border-b border-slate-800/50 bg-[#0f172a]/50 backdrop-blur-sm">
                <div className={`flex items-center gap-3 transition-all overflow-hidden whitespace-nowrap ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black italic shadow-lg shadow-blue-500/30">
                        B
                    </div>
                    <span className="font-bold text-lg text-white tracking-tight">
                        Blue<span className="text-blue-400 font-normal">Ninja</span>
                    </span>
                </div>
                {collapsed && (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 mx-auto flex items-center justify-center text-white font-black italic shadow-lg shadow-blue-500/30">
                        B
                    </div>
                )}
            </div>

            {/* Toggle Button - Floating Style with Border to separate from main content */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute -right-3 top-24 bg-blue-600 text-white p-1.5 rounded-full shadow-lg shadow-blue-900/50 hover:bg-blue-500 hover:scale-110 transition-all border-2 border-[#f8faff] z-50 cursor-pointer flex items-center justify-center"
            >
                {collapsed ? <ChevronRight size={14} strokeWidth={3} /> : <ChevronLeft size={14} strokeWidth={3} />}
            </button>

            {/* Nav */}
            <nav className="flex-1 py-8 flex flex-col gap-2 px-4 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) => `
              flex items-center gap-3 px-3 py-3.5 rounded-xl transition-all duration-200 group relative
              ${isActive
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/40 font-semibold'
                                : 'text-slate-400 hover:bg-slate-800/50 hover:text-blue-200 hover:pl-4'}
              ${collapsed ? 'justify-center hover:pl-3' : ''}
            `}
                    >
                        <item.icon size={20} className={`${collapsed ? '' : 'shrink-0'} ${!collapsed && 'group-hover:scale-110 transition-transform'}`} strokeWidth={item.label === 'Dashboard' ? 2.5 : 2} />
                        {!collapsed && <span className="text-sm tracking-wide">{item.label}</span>}

                        {/* Tooltip for collapsed state */}
                        {collapsed && (
                            <div className="absolute left-full ml-4 px-3 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 animate-in slide-in-from-left-2 fade-in duration-200">
                                {item.label}
                                {/* Little triangle arrow */}
                                <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                            </div>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800/50 bg-slate-900/30">
                <button className={`flex items-center gap-3 w-full px-3 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all group ${collapsed ? 'justify-center' : ''}`}>
                    <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                    {!collapsed && <span className="font-medium text-sm">Sign Out</span>}
                </button>
            </div>
        </div>
    );
}
