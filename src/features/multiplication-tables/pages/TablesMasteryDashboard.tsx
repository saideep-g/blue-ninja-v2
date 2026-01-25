import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Activity, Zap, Timer, AlertCircle, Play, ChevronRight, Grid, TrendingUp } from 'lucide-react';
import { useNinja } from '../../../context/NinjaContext';
import { getStudentTableStats, getDetailedTableStats, getTableSettings } from '../services/tablesFirestore';
import { TablesConfig, DEFAULT_TABLES_CONFIG } from '../logic/types';

interface DashboardStat {
    table: number;
    accuracy: number;
    totalAttempts: number;
    avgTime: number;
    status: 'MASTERED' | 'PRACTICING' | 'FOCUS_NEEDED' | 'NOT_STARTED';
}

export default function TablesMasteryDashboard() {
    const navigate = useNavigate();
    const { user, ninjaStats } = useNinja();

    // State
    const [config, setConfig] = useState<TablesConfig>(DEFAULT_TABLES_CONFIG);
    const [stats, setStats] = useState<DashboardStat[]>([]);
    const [detailedStats, setDetailedStats] = useState<Record<number, Record<number, any>>>({});
    const [loading, setLoading] = useState(true);
    const [activeFact, setActiveFact] = useState<{ t: number, m: number, avgTime: number } | null>(null);

    // Theme Logic
    const statsAny = ninjaStats as any;
    const userAny = user as any;
    const rawClass = statsAny?.class || statsAny?.grade || statsAny?.profile?.class || userAny?.profile?.class || userAny?.class || 2;
    const userClass = parseInt(String(rawClass), 10);
    const isAdvanced = userClass >= 7;
    const maxTable = isAdvanced ? 20 : 12;

    const theme = isAdvanced ? {
        bg: "bg-[#FAF9F6]",
        text: "text-[#4A4A4A]",
        accent: "text-[#FF8DA1]",
        card: "bg-white/80 backdrop-blur-xl border border-white shadow-sm",
        button: "bg-[#FF8DA1] hover:bg-[#ff7b93] text-white shadow-lg shadow-pink-200",
        progress: "bg-[#FF8DA1]"
    } : {
        bg: "bg-slate-50",
        text: "text-slate-800",
        accent: "text-indigo-600",
        card: "bg-white shadow-sm border border-slate-100",
        button: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200",
        progress: "bg-indigo-500"
    };

    // Data Fetching
    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // Parallel Fetch
                const [fetchedConfig, tableStats, detailed] = await Promise.all([
                    getTableSettings(user.uid),
                    getStudentTableStats(user.uid),
                    getDetailedTableStats(user.uid)
                ]);

                if (fetchedConfig) setConfig(fetchedConfig);

                // Process Table Stats for Dashboard
                const processedStats: DashboardStat[] = [];
                for (let i = 2; i <= maxTable; i++) {
                    const found = tableStats.find(s => s.table === i);
                    if (found) {
                        let status: DashboardStat['status'] = 'PRACTICING';
                        if (found.accuracy >= 90 && found.avgTime < 4 && found.totalAttempts > 20) status = 'MASTERED';
                        else if (found.accuracy < 75 || found.avgTime > 10) status = 'FOCUS_NEEDED';

                        processedStats.push({
                            table: i,
                            accuracy: found.accuracy,
                            totalAttempts: found.totalAttempts,
                            avgTime: found.avgTime,
                            status
                        });
                    } else {
                        processedStats.push({ table: i, accuracy: 0, totalAttempts: 0, avgTime: 0, status: 'NOT_STARTED' });
                    }
                }
                setStats(processedStats);
                setDetailedStats(detailed);

            } catch (e) {
                console.error("Failed to load dashboard data", e);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, maxTable]);


    // Derived Metrics
    const activeStats = stats.filter(s => s.status !== 'NOT_STARTED');
    const topTable = activeStats.sort((a, b) => b.accuracy - a.accuracy)[0];
    const focusTable = activeStats.sort((a, b) => a.accuracy - b.accuracy)[0]; // Lowest accuracy
    const totalQuestions = activeStats.reduce((sum, s) => sum + s.totalAttempts, 0);
    const globalAvgSpeed = activeStats.length > 0
        ? (activeStats.reduce((sum, s) => sum + s.avgTime, 0) / activeStats.length).toFixed(1)
        : "0.0";

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'MASTERED': return 'text-green-600 bg-green-50 border-green-100';
            case 'FOCUS_NEEDED': return 'text-orange-600 bg-orange-50 border-orange-100';
            case 'PRACTICING': return 'text-blue-600 bg-blue-50 border-blue-100';
            default: return 'text-slate-400 bg-slate-50 border-slate-100';
        }
    };

    const getHeatmapColor = (avgTime: number) => {
        if (!avgTime || avgTime === 0) return 'bg-slate-100';
        if (avgTime < 2000) return 'bg-emerald-400';
        if (avgTime < 4000) return 'bg-green-300';
        if (avgTime < 10000) return 'bg-amber-300';
        return 'bg-red-300';
    };


    if (loading) {
        return (
            <div className={`min-h-screen ${theme.bg} flex items-center justify-center`}>
                <div className={`${theme.accent} animate-bounce font-bold text-xl flex items-center gap-2`}>
                    <Zap className="w-6 h-6 animate-pulse" /> Loading Mastery Path...
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen ${theme.bg} ${theme.text} p-4 md:p-8`}>
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black mb-1">Mastery Path</h1>
                            <p className="opacity-60 font-medium">Identify gaps, build speed, and conquer the tables.</p>
                        </div>
                        <button
                            onClick={() => navigate('/tables/parent')}
                            className="p-2 bg-white/50 hover:bg-white rounded-xl transition-colors text-slate-500 hover:text-indigo-600"
                            title="Parent Dashboard / Analytics"
                        >
                            <TrendingUp className="w-6 h-6" />
                        </button>
                    </div>
                    <div className={`${theme.card} px-6 py-3 rounded-2xl flex items-center gap-4`}>
                        <div className="flex flex-col items-end">
                            <span className="text-xs font-bold uppercase tracking-wider opacity-50">Current Stage</span>
                            <span className={`text-2xl font-black ${theme.accent}`}>x{config.currentPathStage || 2}</span>
                        </div>
                        <div className={`h-10 w-px bg-slate-200 mx-2`}></div>
                        <div className="flex flex-col items-start">
                            <span className="text-xs font-bold uppercase tracking-wider opacity-50">Total Solved</span>
                            <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4 opacity-50" />
                                <span className="text-xl font-bold">{totalQuestions}</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Quick Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`${theme.card} p-5 rounded-2xl flex items-center gap-4`}>
                        <div className="p-3 bg-green-100 text-green-600 rounded-xl"><Trophy className="w-6 h-6" /></div>
                        <div>
                            <p className="text-xs font-bold opacity-50 uppercase">Top Strength</p>
                            <p className="text-xl font-bold">{topTable ? `Table ${topTable.table}` : 'None Yet'}</p>
                            <p className="text-xs text-green-600 font-bold">{topTable ? `${topTable.accuracy}% Accuracy` : ''}</p>
                        </div>
                    </div>
                    <div className={`${theme.card} p-5 rounded-2xl flex items-center gap-4`}>
                        <div className="p-3 bg-orange-100 text-orange-600 rounded-xl"><AlertCircle className="w-6 h-6" /></div>
                        <div>
                            <p className="text-xs font-bold opacity-50 uppercase">Focus Area</p>
                            <p className="text-xl font-bold">{focusTable && focusTable.status !== 'NOT_STARTED' ? `Table ${focusTable.table}` : 'None'}</p>
                            <p className="text-xs text-orange-600 font-bold">{focusTable ? `${focusTable.accuracy}% Accuracy` : ''}</p>
                        </div>
                    </div>
                    <div className={`${theme.card} p-5 rounded-2xl flex items-center gap-4`}>
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><Timer className="w-6 h-6" /></div>
                        <div>
                            <p className="text-xs font-bold opacity-50 uppercase">Avg Speed</p>
                            <p className="text-xl font-bold">{globalAvgSpeed}s</p>
                            <p className="text-xs opacity-50">GLOBAL AVERAGE</p>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Columns 1 & 2: Action + Mastery Table */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Action Banner */}
                        <div className={`relative overflow-hidden rounded-3xl p-8 ${isAdvanced ? 'bg-gradient-to-r from-pink-400 to-rose-400' : 'bg-gradient-to-r from-indigo-500 to-blue-500'} text-white shadow-xl`}>
                            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                <div>
                                    <h2 className="text-2xl font-black mb-2">Ready to Level Up?</h2>
                                    <p className="text-white/80 max-w-sm">
                                        Continue your journey on Table {config.currentPathStage || 2}.
                                        {activeStats.length > 0 ? " Keep that streak alive!" : " Let's get started!"}
                                    </p>
                                </div>
                                <button
                                    onClick={() => navigate('/tables/practice')}
                                    className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-lg flex items-center gap-3 hover:scale-105 transition-transform shadow-lg"
                                >
                                    <Play className="w-6 h-6 fill-current" />
                                    Continue My Path
                                </button>
                            </div>
                            {/* Decorative Blobs */}
                            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-3xl"></div>
                            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-black/10 blur-3xl"></div>
                        </div>

                        {/* Mastery Detail Table */}
                        <div className={`${theme.card} rounded-3xl overflow-hidden`}>
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="text-xl font-bold">Table Mastery</h3>
                                <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-500">
                                    Grade {userClass} {isAdvanced ? '(ADVANCED)' : ''}
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/50 text-xs uppercase text-slate-400 font-bold border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4">Table</th>
                                            <th className="px-6 py-4">Progress</th>
                                            <th className="px-6 py-4">Speed</th>
                                            <th className="px-6 py-4 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {stats.map(s => (
                                            <tr key={s.table} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 font-black text-lg opacity-80">x{s.table}</td>
                                                <td className="px-6 py-4 w-1/3">
                                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${s.accuracy > 90 ? 'bg-green-500' : s.accuracy > 70 ? 'bg-blue-500' : 'bg-orange-500'}`}
                                                            style={{ width: `${s.accuracy}%` }}
                                                        ></div>
                                                    </div>
                                                    <div className="mt-1 text-xs font-bold opacity-50">{s.accuracy}% Accuracy</div>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-sm font-bold opacity-60">
                                                    {s.avgTime > 0 ? `${s.avgTime}s` : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider border ${getStatusColor(s.status)}`}>
                                                        {s.status.replace('_', ' ')}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Column 3: Heatmap & Side Widgets */}
                    <div className="lg:col-span-1 space-y-8">
                        <div className={`${theme.card} p-6 rounded-3xl`}>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <Grid className="w-5 h-5 opacity-50" />
                                    <h3 className="font-bold text-lg">Fact Heatmap</h3>
                                </div>
                                {activeFact && (
                                    <div className="text-xs font-bold bg-slate-800 text-white px-3 py-1 rounded-full animate-pulse shadow-lg">
                                        {activeFact.t} × {activeFact.m} : {activeFact.avgTime > 0 ? (activeFact.avgTime / 1000).toFixed(1) + 's' : 'N/A'}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-6 gap-1" onMouseLeave={() => setActiveFact(null)}>
                                {Array.from({ length: maxTable }, (_, i) => i + 1).map(r => ( // Rows (Multipliers)
                                    Array.from({ length: maxTable }, (_, j) => j + 1).map(c => { // Cols (Tables)
                                        const factStat = detailedStats[c]?.[r]; // Table c, Multiplier r
                                        const avgT = factStat?.avgTime || 0;
                                        const tooltip = `${c} x ${r}: ${avgT > 0 ? (avgT / 1000).toFixed(1) + 's' : 'N/A'}`;

                                        return (
                                            <div
                                                key={`${c}x${r}`}
                                                title={tooltip}
                                                onClick={() => setActiveFact({ t: c, m: r, avgTime: avgT })}
                                                onMouseEnter={() => setActiveFact({ t: c, m: r, avgTime: avgT })}
                                                className={`aspect-square rounded-sm ${getHeatmapColor(avgT)} hover:scale-150 transition-transform cursor-pointer ${activeFact?.t === c && activeFact?.m === r ? 'ring-2 ring-slate-800 z-10 scale-125' : ''}`}
                                            ></div>
                                        )
                                    })
                                ))}
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold opacity-50">
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-emerald-400"></div> &lt;2s</span>
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-green-300"></div> 2-4s</span>
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-amber-300"></div> 4-10s</span>
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-red-300"></div> &gt;10s</span>
                            </div>
                        </div>

                        {/* Legend / Tips */}
                        <div className={`${theme.card} p-6 rounded-3xl opacity-80`}>
                            <h4 className="font-bold text-sm mb-2 opacity-50 uppercase">Pro Tip</h4>
                            <p className="text-sm font-medium">
                                Focus on consistent speed. Defeating the "Ghost" builds strong muscle memory!
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
