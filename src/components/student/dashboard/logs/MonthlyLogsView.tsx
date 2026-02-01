import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../../../services/db/firebase';
import { useNinja } from '../../../../context/NinjaContext';
import { ChevronLeft, ChevronRight, Calculator, CheckCircle2, XCircle, FileText, Calendar, BookOpen, BarChart3, Target, AlertCircle, Wrench, RefreshCw } from 'lucide-react';

const SUBJECTS = [
    { id: 'all', label: 'All Subjects', color: 'slate' },
    { id: 'math', label: 'Math', color: 'blue' },
    { id: 'science', label: 'Science', color: 'emerald' },
    { id: 'vocabulary', label: 'Words', color: 'purple' },
    { id: 'gk', label: 'World', color: 'amber' },
    { id: 'geography', label: 'Geography', color: 'cyan' },
    { id: 'tables', label: 'Tables', color: 'rose' },
    { id: 'diagnostic', label: 'Diagnostic', color: 'slate' }
];

const getTimestamp = (ts: any) => {
    if (!ts) return Date.now();
    // Handle Firestore Timestamp
    if (ts.toDate) return ts.toDate().getTime();
    if (ts.seconds) return ts.seconds * 1000;
    // Handle JS Date object or ISO String
    if (ts instanceof Date) return ts.getTime();

    const parsed = new Date(ts).getTime();
    return isNaN(parsed) ? Date.now() : parsed;
};

export function MonthlyLogsView() {
    const { user } = useNinja();
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [selectedSubject, setSelectedSubject] = useState('all');
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchLogs = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const monthKey = selectedMonth.toISOString().slice(0, 7); // "YYYY-MM"
            const docRef = doc(db, 'students', user.uid, 'session_logs', monthKey);
            const snap = await getDoc(docRef);

            if (snap.exists()) {
                const data = snap.data();
                const entries = data.entries || [];

                // Phase 4: Sort reverse chronological
                entries.sort((a: any, b: any) => {
                    return getTimestamp(b.timestamp) - getTimestamp(a.timestamp); // Newest first
                });
                setLogs(entries);
            } else {
                setLogs([]);
            }
        } catch (e) {
            console.error("Failed to fetch logs", e);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [user, selectedMonth]);


    const statsBySubject = useMemo(() => {
        const summary: Record<string, { answered: number, correct: number, incorrect: number, timeSeconds: number }> = {};

        logs.forEach(log => {
            let subj = (log.subject || 'era').toLowerCase();
            // Map aliases
            // Map aliases
            if (subj === 'eng' || subj === 'english') subj = 'vocabulary';
            if (subj === 'world') subj = 'gk';
            if (subj === 'geo') subj = 'geography';

            if (!summary[subj]) {
                summary[subj] = { answered: 0, correct: 0, incorrect: 0, timeSeconds: 0 };
            }
            summary[subj].answered++;
            summary[subj].timeSeconds += log.timeSpent || 0;
            if (log.isCorrect) summary[subj].correct++;
            else summary[subj].incorrect++;
        });

        // Add totals
        const total = { answered: 0, correct: 0, incorrect: 0, timeSeconds: 0 };
        Object.values(summary).forEach(s => {
            total.answered += s.answered;
            total.correct += s.correct;
            total.incorrect += s.incorrect;
            total.timeSeconds += s.timeSeconds;
        });
        summary.all = total;

        return summary;
    }, [logs]);

    const changeMonth = (delta: number) => {
        const newDate = new Date(selectedMonth);
        newDate.setMonth(newDate.getMonth() + delta);
        setSelectedMonth(newDate);
    };

    const filteredLogs = selectedSubject === 'all'
        ? logs
        : logs.filter(log => {
            let subj = (log.subject || 'era').toLowerCase();
            if (subj === 'eng' || subj === 'english') subj = 'vocabulary';
            if (subj === 'world') subj = 'gk';
            if (subj === 'geo') subj = 'geography';
            return subj === selectedSubject;
        });

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6 p-4 md:p-0 animate-in fade-in duration-500">

            {/* Header / Month Navigation */}
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[2rem] shadow-sm border border-white dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">Practice History</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Tracking your ninja journey</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-1.5 pl-4 rounded-full border border-slate-200 dark:border-slate-700 shadow-inner">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => changeMonth(-1)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-400"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-2 font-black text-slate-700 dark:text-slate-200 min-w-[100px] text-center select-none text-sm uppercase tracking-tight">
                            {selectedMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </span>
                        <button
                            onClick={() => changeMonth(1)}
                            disabled={new Date(selectedMonth).getMonth() === new Date().getMonth() && new Date(selectedMonth).getFullYear() === new Date().getFullYear()}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />

                    <div className="relative flex items-center pr-2">
                        <select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="appearance-none bg-transparent pl-2 pr-8 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-indigo-600 dark:text-indigo-400 outline-none cursor-pointer relative z-10"
                        >
                            {SUBJECTS.map((sub) => (
                                <option key={sub.id} value={sub.id}>{sub.label}</option>
                            ))}
                        </select>
                        <ChevronRight className="w-3.5 h-3.5 absolute right-2 text-indigo-400 pointer-events-none rotate-90" />
                    </div>
                </div>
            </div>

            {/* Monthly Summary Section */}
            {
                !loading && logs.length > 0 && (
                    <div className="animate-in slide-in-from-top-4 duration-700 delay-100">
                        {selectedSubject === 'all' ? (
                            /* Pivot Table for All Subjects */
                            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[2rem] border border-white dark:border-slate-700 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 flex items-center gap-3">
                                    <BarChart3 className="w-5 h-5 text-indigo-500" />
                                    <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-sm">Monthly Performance Pivot</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-[10px] uppercase font-black tracking-widest text-slate-400">
                                                <th className="px-6 py-4">Subject</th>
                                                <th className="px-6 py-4">Answered</th>
                                                <th className="px-6 py-4">Correct</th>
                                                <th className="px-6 py-4">Incorrect</th>
                                                <th className="px-6 py-4">Time (min)</th>
                                                <th className="px-6 py-4 text-right">Accuracy</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/30">
                                            {SUBJECTS.filter(s => s.id !== 'all').map(sub => {
                                                const s = statsBySubject[sub.id] || { answered: 0, correct: 0, incorrect: 0, timeSeconds: 0 };
                                                const accuracy = s.answered > 0 ? Math.round((s.correct / s.answered) * 100) : 0;
                                                const timeMins = Math.round(s.timeSeconds / 60);
                                                if (s.answered === 0) return null;

                                                return (
                                                    <tr key={sub.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/30 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-2 h-2 rounded-full bg-${sub.color}-500 shadow-sm`} />
                                                                <span className="font-bold text-slate-700 dark:text-slate-200">{sub.label}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 font-mono font-bold text-slate-600 dark:text-slate-400">{s.answered}</td>
                                                        <td className="px-6 py-4 font-mono font-bold text-emerald-600 dark:text-emerald-500">{s.correct}</td>
                                                        <td className="px-6 py-4 font-mono font-bold text-rose-500 dark:text-rose-400">{s.incorrect}</td>
                                                        <td className="px-6 py-4 font-mono font-bold text-slate-500 underline decoration-slate-200 underline-offset-4">
                                                            {s.timeSeconds < 60 ? `${Math.round(s.timeSeconds)}s` : `${Math.floor(s.timeSeconds / 60)}m ${Math.round(s.timeSeconds % 60)}s`}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className={`px-2 py-1 rounded-md text-xs font-black ${accuracy >= 80 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : accuracy >= 50 ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
                                                                {accuracy}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {/* Grand Total Row */}
                                            <tr className="bg-indigo-50/30 dark:bg-indigo-900/10 font-black">
                                                <td className="px-6 py-4 text-indigo-600 dark:text-indigo-400 italic">Grand Total</td>
                                                <td className="px-6 py-4 font-mono text-slate-800 dark:text-white">{statsBySubject.all?.answered || 0}</td>
                                                <td className="px-6 py-4 font-mono text-emerald-600 dark:text-emerald-400">{statsBySubject.all?.correct || 0}</td>
                                                <td className="px-6 py-4 font-mono text-rose-500 dark:text-rose-400">{statsBySubject.all?.incorrect || 0}</td>
                                                <td className="px-6 py-4 font-mono text-indigo-600 dark:text-indigo-400">
                                                    {statsBySubject.all?.timeSeconds < 60 ? `${Math.round(statsBySubject.all?.timeSeconds || 0)}s` : `${Math.floor((statsBySubject.all?.timeSeconds || 0) / 60)}m`}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-indigo-600 dark:text-indigo-400">
                                                        {statsBySubject.all?.answered ? Math.round((statsBySubject.all.correct / statsBySubject.all.answered) * 100) : 0}%
                                                    </span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            /* Grid Stats for Specific Subject */
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: 'Questions', value: statsBySubject[selectedSubject]?.answered || 0, icon: BookOpen, color: 'indigo' },
                                    { label: 'Correct', value: statsBySubject[selectedSubject]?.correct || 0, icon: CheckCircle2, color: 'emerald' },
                                    { label: 'Incorrect', value: statsBySubject[selectedSubject]?.incorrect || 0, icon: XCircle, color: 'rose' },
                                    {
                                        label: 'Correct %',
                                        value: `${statsBySubject[selectedSubject]?.answered ? Math.round((statsBySubject[selectedSubject].correct / statsBySubject[selectedSubject].answered) * 100) : 0}%`,
                                        icon: Target,
                                        color: 'amber'
                                    },
                                    {
                                        label: 'Total Time',
                                        value: (() => {
                                            const sec = statsBySubject[selectedSubject]?.timeSeconds || 0;
                                            return sec < 60 ? `${Math.round(sec)}s` : `${Math.floor(sec / 60)}m`;
                                        })(),
                                        icon: Calculator,
                                        color: 'indigo'
                                    }
                                ].map((stat, i) => (
                                    <div key={i} className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-5 rounded-3xl border border-white dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center space-y-2 group hover:scale-[1.02] transition-transform">
                                        <div className={`p-2 bg-${stat.color}-100 dark:bg-${stat.color}-900/30 rounded-xl text-${stat.color}-600 dark:text-${stat.color}-400 group-hover:rotate-12 transition-transform`}>
                                            <stat.icon className="w-5 h-5" />
                                        </div>
                                        <div className="font-black text-2xl text-slate-800 dark:text-white leading-none tracking-tight">{stat.value}</div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )
            }

            {/* List View */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-20 text-slate-400">Loading history...</div>
                ) : filteredLogs.length === 0 ? (
                    <div className="text-center py-20 bg-white/40 dark:bg-slate-800/40 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
                        <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                        <p className="text-slate-500 dark:text-slate-400 font-medium">No activity recorded for this period.</p>
                        <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">Go solve some mysteries! 🕵️‍♂️</p>
                    </div>
                ) : (
                    filteredLogs.map((log, idx) => (
                        <div
                            key={idx}
                            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-6 rounded-[1.5rem] shadow-sm border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all group"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md">
                                            {(() => {
                                                const ts = log.timestamp;
                                                const date = new Date(getTimestamp(ts));
                                                return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                                            })()}
                                        </span>
                                        <span className="text-[10px] uppercase font-black tracking-wider text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-md">
                                            {log.subject || (log.mode === 'DIAGNOSTIC' ? 'Diagnostic' : 'Daily Quest')}
                                        </span>
                                        {log.questionType && (
                                            <span className="text-[10px] uppercase font-black tracking-wider text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-md">
                                                {log.questionType.replace('_', ' ')}
                                            </span>
                                        )}
                                        <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md">
                                            {log.questionId}
                                        </span>
                                    </div>
                                    <p className="font-bold text-slate-800 dark:text-slate-200 line-clamp-2">
                                        {/* Fallback if question text wasn't logged, but typically it is via enriched logic */}
                                        {log.questionText || "Question Content"}
                                    </p>

                                    {/* Answer Display */}
                                    <div className="mt-3 space-y-2 text-sm">
                                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                                            <span>Your Answer:</span>
                                            <span className={`font-mono px-2 py-0.5 rounded-md ${log.isCorrect ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20' : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/20'}`}>
                                                {log.studentAnswer || "-"}
                                            </span>
                                        </div>
                                        {!log.isCorrect && log.correctAnswer && (
                                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                                                <span>Correct:</span>
                                                <span className="font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md">
                                                    {log.correctAnswer}
                                                </span>
                                            </div>
                                        )}
                                        {log.explanation && (
                                            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                                <span className="font-bold uppercase tracking-wider opacity-70 block mb-1 text-[10px]">Reasoning</span>
                                                <span className="leading-relaxed">{log.explanation}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Status Icon */}
                                <div className="shrink-0 flex flex-col items-end gap-2">
                                    {log.isCorrect ? (
                                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-sm bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-800/30">
                                            <CheckCircle2 className="w-4 h-4" /> Correct
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-rose-500 dark:text-rose-400 font-black text-sm bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 rounded-full border border-rose-100 dark:border-rose-800/30">
                                            <XCircle className="w-4 h-4" /> Incorrect
                                        </div>
                                    )}

                                    {log.masteryDelta ? (
                                        <span className={`text-xs font-bold ${log.masteryDelta > 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                                            {log.masteryDelta > 0 ? '+' : ''}{log.masteryDelta} XP
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div >
    );
}
