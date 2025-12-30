
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { getTableMasteryStats } from '../services/tablesDb';

interface TableStat {
    table: number;
    accuracy: number;
    totalAttempts: number;
    status: 'MASTERED' | 'IN_PROGRESS' | 'STRUGGLING' | 'NOT_STARTED';
    avgTime?: number;
}

export default function ParentDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<TableStat[]>([]);

    useEffect(() => {
        getTableMasteryStats().then(data => {
            // Fill in 2-12
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
    }, []);

    // Calculate Aggregates
    const totalAttempts = stats.reduce((acc, s) => acc + s.totalAttempts, 0);
    // Calculate weighted average accuracy
    const weightedAccuracySum = stats.reduce((acc, s) => acc + (s.accuracy * s.totalAttempts), 0);
    const avgAccuracy = totalAttempts > 0 ? Math.round(weightedAccuracySum / totalAttempts) : 0;

    const struggling = stats.filter(s => s.status === 'STRUGGLING').map(s => s.table);

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8 flex items-center gap-4">
                    <button onClick={() => navigate('/tables')} className="p-2 rounded-full hover:bg-slate-200 bg-white shadow-sm">
                        <ChevronLeft className="w-6 h-6 text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Parent Dashboard</h1>
                        <p className="text-slate-500">Monitor progress and configure settings</p>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-2 text-indigo-600">
                            <TrendingUp className="w-5 h-5" />
                            <h3 className="font-bold">Overall Accuracy</h3>
                        </div>
                        <div className="text-4xl font-black text-slate-800">{avgAccuracy}%</div>
                        <div className="text-slate-400 text-sm font-medium">Across all tables</div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-2 text-blue-600">
                            <Clock className="w-5 h-5" />
                            <h3 className="font-bold">Total Questions</h3>
                        </div>
                        <div className="text-4xl font-black text-slate-800">{totalAttempts}</div>
                        <div className="text-slate-400 text-sm font-medium">Questions answered</div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-2 text-orange-600">
                            <AlertCircle className="w-5 h-5" />
                            <h3 className="font-bold">Focus Areas</h3>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {struggling.length > 0 ? struggling.map(t => (
                                <span key={t} className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-bold">Table of {t}</span>
                            )) : (
                                <span className="text-slate-400 text-sm italic">No specific struggling areas yet!</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h2 className="text-xl font-bold text-slate-800">Per-Table Performance</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-4 font-bold">Table</th>
                                    <th className="px-6 py-4 font-bold">Status</th>
                                    <th className="px-6 py-4 font-bold">Accuracy</th>
                                    <th className="px-6 py-4 font-bold">Attempts</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {stats.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-slate-400">Loading stats...</td>
                                    </tr>
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
    );
}
