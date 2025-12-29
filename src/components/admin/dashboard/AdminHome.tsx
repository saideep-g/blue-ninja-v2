import React from 'react';
import { Users, BookOpen, AlertCircle, TrendingUp, Clock, Activity } from 'lucide-react';

const StatCard = ({ title, value, trend, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <div className="flex justify-between items-start">
            <div>
                <div className="text-blue-600/70 text-xs font-black uppercase tracking-wider mb-1">{title}</div>
                <div className="text-3xl font-black text-blue-900 tracking-tight">{value}</div>
            </div>
            <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
                <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
            </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-emerald-500 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md">
                <TrendingUp className="w-3 h-3" /> {trend}
            </span>
            <span className="text-blue-300 font-medium text-xs">vs last week</span>
        </div>
    </div>
);

export default function AdminHome() {
    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
            {/* Welcome */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black italic text-blue-900 uppercase tracking-tighter">Admin Control Center</h1>
                    <p className="text-blue-500 font-medium mt-1">System Overview & Performance Metrics</p>
                </div>
                <div className="hidden md:flex gap-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wide">v2.4.0 Live</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Active Students"
                    value="1,248"
                    trend="+12%"
                    icon={Users}
                    color="bg-blue-600"
                />
                <StatCard
                    title="Questions Published"
                    value="45,392"
                    trend="+5%"
                    icon={BookOpen}
                    color="bg-indigo-600"
                />
                <StatCard
                    title="Daily Engagement"
                    value="85%"
                    trend="+3%"
                    icon={Activity}
                    color="bg-violet-600"
                />
                <StatCard
                    title="Flagged Responses"
                    value="12"
                    trend="-25%"
                    icon={AlertCircle}
                    color="bg-rose-500"
                />
            </div>

            {/* Charts / Data Quality */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-blue-100 shadow-lg shadow-blue-900/5">
                    <h3 className="font-black text-blue-900 text-lg mb-6 uppercase tracking-tight flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-500" />
                        Student Activity Trends
                    </h3>
                    <div className="h-64 bg-slate-50/50 rounded-2xl border border-dashed border-blue-200 flex items-center justify-center text-blue-300 font-medium italic">
                        [Chart Visualization Placeholder]
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-blue-100 shadow-lg shadow-blue-900/5 flex flex-col h-full">
                    <h3 className="font-black text-blue-900 text-lg mb-6 uppercase tracking-tight">System Health</h3>
                    <div className="space-y-6 flex-1">
                        <div>
                            <div className="flex justify-between text-xs font-bold uppercase tracking-wide mb-2">
                                <span className="text-blue-400">V3 Compliance</span>
                                <span className="text-emerald-500">98%</span>
                            </div>
                            <div className="w-full bg-blue-50 rounded-full h-2 overflow-hidden">
                                <div className="bg-emerald-500 w-[98%] h-full rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]"></div>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-xs font-bold uppercase tracking-wide mb-2">
                                <span className="text-blue-400">Curriculum Coverage</span>
                                <span className="text-blue-600">85%</span>
                            </div>
                            <div className="w-full bg-blue-50 rounded-full h-2 overflow-hidden">
                                <div className="bg-blue-600 w-[85%] h-full rounded-full shadow-[0_0_10px_rgba(37,99,235,0.4)]"></div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-xl border border-blue-100 mt-auto">
                            <span className="text-blue-500 text-xs font-bold uppercase">Avg. Response Time</span>
                            <span className="font-black text-blue-900 text-xl font-mono">1.2s</span>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-blue-50">
                        <h4 className="font-bold text-xs text-blue-400 uppercase tracking-widest mb-4">Recent Alerts</h4>
                        <div className="space-y-3">
                            <div className="flex gap-3 text-sm p-3 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer group border border-transparent hover:border-amber-100">
                                <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                                <span className="text-slate-600 font-medium group-hover:text-amber-700">High latency detected in Grade 7 module.</span>
                            </div>
                            <div className="flex gap-3 text-sm p-3 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer group border border-transparent hover:border-rose-100">
                                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                                <span className="text-slate-600 font-medium group-hover:text-rose-700">3 failed uploads in last hour.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
