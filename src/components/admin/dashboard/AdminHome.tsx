import React from 'react';
import { Users, BookOpen, AlertCircle, TrendingUp, Clock, Activity } from 'lucide-react';

const StatCard = ({ title, value, trend, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition">
        <div className="flex justify-between items-start">
            <div>
                <div className="text-slate-500 text-sm font-medium mb-1">{title}</div>
                <div className="text-3xl font-bold text-slate-900">{value}</div>
            </div>
            <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
                <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
            </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-green-600 font-semibold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> {trend}
            </span>
            <span className="text-slate-400">vs last week</span>
        </div>
    </div>
);

export default function AdminHome() {
    return (
        <div className="p-8 space-y-8">
            {/* Welcome */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
                <p className="text-slate-500">Overview of system health and student performance.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Active Students"
                    value="1,248"
                    trend="+12%"
                    icon={Users}
                    color="bg-blue-500"
                />
                <StatCard
                    title="Questions Published"
                    value="45,392"
                    trend="+5%"
                    icon={BookOpen}
                    color="bg-purple-500"
                />
                <StatCard
                    title="Daily Engagement"
                    value="85%"
                    trend="+3%"
                    icon={Activity}
                    color="bg-green-500"
                />
                <StatCard
                    title="Flagged Responses"
                    value="12"
                    trend="-25%"
                    icon={AlertCircle}
                    color="bg-red-500"
                />
            </div>

            {/* Charts / Data Quality */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-6">Student Activity Trends</h3>
                    <div className="h-64 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                        [Chart Placeholder: Student Login & Submissions]
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-6">Data Quality Health</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-600">V3 Compliance</span>
                            <span className="font-semibold text-green-600">98%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-green-500 w-[98%] h-full rounded-full"></div>
                        </div>

                        <div className="flex justify-between text-sm mt-4">
                            <span className="text-slate-600">Misconception Coverage</span>
                            <span className="font-semibold text-blue-600">85%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-blue-500 w-[85%] h-full rounded-full"></div>
                        </div>

                        <div className="flex justify-between text-sm mt-4">
                            <span className="text-slate-600">Avg. Response Time</span>
                            <span className="font-semibold text-slate-900">1.2s</span>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t">
                        <h4 className="font-semibold text-sm text-slate-900 mb-3">Recent Alerts</h4>
                        <div className="space-y-3">
                            <div className="flex gap-3 text-sm">
                                <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <span className="text-slate-600">High latency detected in Grade 7 module.</span>
                            </div>
                            <div className="flex gap-3 text-sm">
                                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                <span className="text-slate-600">3 failed uploads in last hour.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
