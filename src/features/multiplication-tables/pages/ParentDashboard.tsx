import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, TrendingUp, Clock, AlertCircle, Save, Check } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNinja } from '../../../context/NinjaContext';
import { getStudentTableStats, getTableSettings, saveTableSettings, getDailyActivity, TableSettings } from '../services/tablesFirestore';
import { DEFAULT_TABLES_CONFIG } from '../logic/types';

interface TableStat {
    table: number;
    accuracy: number;
    totalAttempts: number;
    status: 'MASTERED' | 'IN_PROGRESS' | 'STRUGGLING' | 'NOT_STARTED';
    avgTime?: number;
}

export default function ParentDashboard() {
    const navigate = useNavigate();
    const { user, ninjaStats } = useNinja();

    // State
    const [stats, setStats] = useState<TableStat[]>([]);
    const [chartData, setChartData] = useState<{ date: string, count: number }[]>([]);
    const [settings, setSettings] = useState<TableSettings>(DEFAULT_TABLES_CONFIG);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Determine Grade Level / Mode
    const statsAny = ninjaStats as any;
    const userAny = user as any;

    const rawClass =
        statsAny?.class ||
        statsAny?.grade ||
        statsAny?.profile?.class ||
        userAny?.profile?.class ||
        userAny?.class ||
        2;

    const userClass = parseInt(String(rawClass), 10);
    const isAdvanced = userClass >= 7;
    const maxTable = isAdvanced ? 20 : 12;

    useEffect(() => {
        if (!user) return;

        console.log(`[ParentDashboard] Loaded user class: ${userClass} (Raw: ${rawClass}), Max Table: ${maxTable}`);

        // 1. Load Activity Chart Data
        getDailyActivity(user.uid, 15).then(data => setChartData(data));

        // 2. Load Settings (Mastery Ledger)
        getTableSettings(user.uid).then(loadedSettings => {
            if (loadedSettings) {
                setSettings(loadedSettings);

                // Derive Stats from tables_config.tableStats
                const ledger = loadedSettings.tableStats || {};
                const fullStats: TableStat[] = [];

                for (let i = 2; i <= maxTable; i++) {
                    const s = ledger[i];
                    if (s) {
                        fullStats.push({
                            table: i,
                            accuracy: Math.round(s.accuracy),
                            totalAttempts: s.totalAttempts,
                            status: s.status as any,
                            avgTime: s.avgTime ? parseFloat((s.avgTime / 1000).toFixed(1)) : 0
                        });
                    } else {
                        fullStats.push({ table: i, accuracy: 0, totalAttempts: 0, status: 'NOT_STARTED' });
                    }
                }
                setStats(fullStats);
            } else {
                // Initial Default
                setSettings(prev => ({ ...prev, selectedTables: [2, 3, 4, 5] }));
            }
        });

    }, [user, maxTable, userClass, rawClass]);

    const toggleTable = (num: number) => {
        setSettings(prev => ({
            ...prev,
            selectedTables: prev.selectedTables.includes(num)
                ? prev.selectedTables.filter(n => n !== num)
                : [...prev.selectedTables, num]
        }));
    };

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        await saveTableSettings(user.uid, settings);
        setSaving(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
    };

    // Calculate Aggregates
    const totalAttempts = stats.reduce((acc, s) => acc + s.totalAttempts, 0);
    const weightedAccuracySum = stats.reduce((acc, s) => acc + (s.accuracy * s.totalAttempts), 0);
    const avgAccuracy = totalAttempts > 0 ? Math.round(weightedAccuracySum / totalAttempts) : 0;
    const struggling = stats.filter(s => s.status === 'STRUGGLING').map(s => s.table);

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-5xl mx-auto">
                <header className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/tables')} className="p-2 rounded-full hover:bg-slate-200 bg-white shadow-sm">
                            <ChevronLeft className="w-6 h-6 text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Parent Dashboard</h1>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm font-bold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full border border-indigo-200">
                                    Current Stage: x{settings.currentPathStage || 2}
                                </span>
                                {isAdvanced && <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded">Grade {userClass} Mode</span>}
                            </div>
                            <p className="text-slate-500 mt-2">
                                Monitor student progress and mastery.
                            </p>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Configuration */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Insights Block */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                            <h3 className="font-bold text-slate-800 mb-2">Insights</h3>
                            {struggling.length > 0 ? (
                                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm mb-2">
                                    Child is struggling with tables {struggling.join(', ')}. These will be prioritized in review.
                                </div>
                            ) : (
                                <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm">
                                    Progress looks good! The Mastery Path is adapting automatically.
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Right Column: Stats */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                <div className="flex items-center gap-3 mb-2 text-indigo-600">
                                    <TrendingUp className="w-5 h-5" />
                                    <h3 className="font-bold">Avg Accuracy</h3>
                                </div>
                                <div className="text-4xl font-black text-slate-800">{avgAccuracy}%</div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                <div className="flex items-center gap-3 mb-2 text-blue-600">
                                    <Clock className="w-5 h-5" />
                                    <h3 className="font-bold">Total Attempts</h3>
                                </div>
                                <div className="text-4xl font-black text-slate-800">{totalAttempts}</div>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-6 border-b border-slate-100">
                                <h2 className="text-xl font-bold text-slate-800">Detailed Performance</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                                        <tr>
                                            <th className="px-6 py-4 font-bold">Table</th>
                                            <th className="px-6 py-4 font-bold">Status</th>
                                            <th className="px-6 py-4 font-bold">Accuracy</th>
                                            <th className="px-6 py-4 font-bold">Avg Speed</th>
                                            <th className="px-6 py-4 font-bold">Count</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {stats.length === 0 ? (
                                            <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Loading stats...</td></tr>
                                        ) : stats.map((stat) => (
                                            <tr key={stat.table} className="hover:bg-slate-50">
                                                <td className="px-6 py-4 font-black text-lg text-slate-700">x{stat.table}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold 
                                    ${stat.status === 'MASTERED' ? 'bg-green-100 text-green-700' : ''}
                                    ${stat.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : ''}
                                    ${stat.status === 'STRUGGLING' ? 'bg-red-100 text-red-700' : ''}
                                    ${stat.status === 'NOT_STARTED' ? 'bg-slate-100 text-slate-500' : ''}
                                `}>
                                                        {stat.status.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-600">
                                                    {stat.totalAttempts > 0 ? `${stat.accuracy}%` : '-'}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-slate-500">
                                                    {stat.avgTime !== undefined ? `${stat.avgTime}s` : '-'}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-slate-500">
                                                    {stat.totalAttempts}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Activity Chart */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-indigo-500" /> Consistency (Last 15 Days)
                            </h2>
                            <div className="h-64 w-full min-w-0">
                                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="count"
                                            stroke="#6366f1"
                                            strokeWidth={4}
                                            dot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                                            activeDot={{ r: 8 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
