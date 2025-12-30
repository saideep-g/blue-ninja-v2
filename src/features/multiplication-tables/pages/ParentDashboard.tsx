
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, TrendingUp, Clock, AlertCircle, Save, Check } from 'lucide-react';
import { useNinja } from '../../../context/NinjaContext';
import { getStudentTableStats, getTableSettings, saveTableSettings, TableSettings } from '../services/tablesFirestore';

interface TableStat {
    table: number;
    accuracy: number;
    totalAttempts: number;
    status: 'MASTERED' | 'IN_PROGRESS' | 'STRUGGLING' | 'NOT_STARTED';
    avgTime?: number;
}

export default function ParentDashboard() {
    const navigate = useNavigate();
    const { user } = useNinja();
    const [stats, setStats] = useState<TableStat[]>([]);
    const [settings, setSettings] = useState<TableSettings>({
        selectedTables: [],
        targetAccuracy: 90,
        dailyGoalMinutes: 10
    });
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        if (!user) return;

        // Load Stats
        getStudentTableStats(user.uid).then(data => {
            const fullStats: TableStat[] = [];
            for (let i = 2; i <= 12; i++) {
                const found = data.find(d => d.table === i);
                if (found) {
                    let status: TableStat['status'] = 'IN_PROGRESS';
                    if (found.accuracy >= 90 && found.totalAttempts > 20) status = 'MASTERED';
                    else if (found.accuracy < 70 && found.totalAttempts > 5) status = 'STRUGGLING';

                    fullStats.push({
                        table: i,
                        accuracy: found.accuracy,
                        totalAttempts: found.totalAttempts,
                        status
                    });
                } else {
                    fullStats.push({ table: i, accuracy: 0, totalAttempts: 0, status: 'NOT_STARTED' });
                }
            }
            setStats(fullStats);
        });

        // Load Settings
        getTableSettings(user.uid).then(loadedSettings => {
            if (loadedSettings) setSettings(loadedSettings);
            else setSettings(prev => ({ ...prev, selectedTables: [2, 3, 4, 5] })); // Defaults
        });

    }, [user]);

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
                            <p className="text-slate-500">Monitor progress and configure settings</p>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Configuration */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                            <h2 className="text-xl font-bold text-slate-800 mb-4">Practice Configuration</h2>
                            <p className="text-sm text-slate-500 mb-6">Select the tables your child should practice during their sessions.</p>

                            <div className="grid grid-cols-3 gap-2 mb-8">
                                {Array.from({ length: 11 }, (_, i) => i + 2).map(num => (
                                    <button
                                        key={num}
                                        onClick={() => toggleTable(num)}
                                        className={`h-12 rounded-xl font-bold transition-all border-2
                                    ${settings.selectedTables.includes(num)
                                                ? 'bg-indigo-100 border-indigo-500 text-indigo-700'
                                                : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'
                                            }
                                `}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-white
                            ${saveSuccess ? 'bg-green-500' : 'bg-indigo-600 hover:bg-indigo-700'}
                        `}
                            >
                                {saveSuccess ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                                {saveSuccess ? 'Saved!' : 'Save Settings'}
                            </button>
                        </div>

                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                            <h3 className="font-bold text-slate-800 mb-2">Insights</h3>
                            {struggling.length > 0 ? (
                                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm mb-2">
                                    Child is struggling with tables {struggling.join(', ')}. Try selecting only these for a few days.
                                </div>
                            ) : (
                                <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm">
                                    Progress looks good! Consider adding a new table to the mix.
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
                                    <h3 className="font-bold">Accuracy</h3>
                                </div>
                                <div className="text-4xl font-black text-slate-800">{avgAccuracy}%</div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                <div className="flex items-center gap-3 mb-2 text-blue-600">
                                    <Clock className="w-5 h-5" />
                                    <h3 className="font-bold">Total Answers</h3>
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
                                                    {stat.avgTime && stat.avgTime > 0 ? `${stat.avgTime}s` : '-'}
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
                    </div>
                </div>
            </div>
        </div>
    );
}
