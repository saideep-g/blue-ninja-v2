import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../../../services/db/firebase';
import { useNinja } from '../../../../context/NinjaContext';
import { ChevronLeft, ChevronRight, Calculator, CheckCircle2, XCircle, FileText, Calendar, BookOpen, BarChart3, Target, AlertCircle, Wrench, RefreshCw, Loader2 } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';

const LatexRenderer = ({ text }: { text: string | null }) => {
    if (!text) return null;
    // Match both $$...$$ and $...$ delimiters
    const parts = text.split(/(\$\$[^$]+\$\$|\$[^$]+\$)/g);
    return (
        <>
            {parts.map((part, i) => {
                if ((part.startsWith('$$') && part.endsWith('$$')) || (part.startsWith('$') && part.endsWith('$'))) {
                    const math = part.startsWith('$$') ? part.slice(2, -2) : part.slice(1, -1);
                    return <InlineMath key={i} math={math} />;
                }

                // Handle implicit power notation (e.g. 2^3, (a+b)^2, (-2)^3, 2.5^x)
                if (part.includes('^')) {
                    const subParts = part.split(/([a-zA-Z0-9\(\)\+\-\.\\,\/\=\<\>_]+(?:\^[a-zA-Z0-9\(\)\+\-\.\\,\/\=\<\>_\^]+)+)/g);
                    return (
                        <span key={i}>
                            {subParts.map((sub, j) => {
                                if (sub.includes('^')) {
                                    const fixedSub = sub.replace(/\^(\([^\)]+\))/g, '^{$1}');
                                    return <InlineMath key={`${i}-${j}`} math={fixedSub} />;
                                }
                                return <span key={`${i}-${j}`}>{sub}</span>;
                            })}
                        </span>
                    );
                }

                return <span key={i}>{part}</span>;
            })}
        </>
    );
};

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
        <div className="w-full max-w-4xl mx-auto space-y-4 p-2 md:p-0 animate-in fade-in duration-500 pb-24">

            {/* Header / Month Navigation */}
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-white dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0">
                        <Calendar className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg md:text-2xl font-black text-slate-800 dark:text-white leading-tight">Practice History</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-[9px] md:text-xs font-bold uppercase tracking-wider">Mistakes are the stairs to success 🪜</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 pl-3 rounded-full border border-slate-200 dark:border-slate-700 shadow-inner w-full sm:w-auto justify-between sm:justify-start">
                    <div className="flex items-center">
                        <button
                            onClick={() => changeMonth(-1)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-400"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-1 md:px-2 font-black text-slate-700 dark:text-slate-200 min-w-[80px] md:min-w-[100px] text-center select-none text-[10px] md:text-sm uppercase tracking-tight">
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

                    <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />

                    <div className="relative flex items-center pr-1 shrink-0">
                        <select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="appearance-none bg-transparent pl-1 pr-6 py-1 text-[9px] md:text-[10px] font-black uppercase tracking-[0.1em] text-indigo-600 dark:text-indigo-400 outline-none cursor-pointer relative z-10"
                        >
                            {SUBJECTS.map((sub) => (
                                <option key={sub.id} value={sub.id}>{sub.label}</option>
                            ))}
                        </select>
                        <ChevronRight className="w-3 h-3 absolute right-1 text-indigo-400 pointer-events-none rotate-90" />
                    </div>
                </div>
            </div>

            {/* Monthly Summary Section */}
            {
                !loading && logs.length > 0 && (
                    <div className="animate-in slide-in-from-top-4 duration-700 delay-100">
                        {selectedSubject === 'all' ? (
                            /* Pivot Table for All Subjects */
                            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[1.5rem] md:rounded-[2rem] border border-white dark:border-slate-700 shadow-sm overflow-hidden">
                                <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-700/50 flex items-center gap-3">
                                    <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-indigo-500" />
                                    <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-[10px] md:text-sm">Performance Pivot</h3>
                                </div>
                                <div className="overflow-x-auto scrollbar-hide">
                                    <table className="w-full text-left min-w-[380px]">
                                        <thead>
                                            <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-[8px] md:text-[10px] uppercase font-black tracking-widest text-slate-400">
                                                <th className="px-4 md:px-6 py-3 md:py-4">Subject</th>
                                                <th className="px-2 md:px-6 py-3 md:py-4">#</th>
                                                <th className="px-2 md:px-6 py-3 md:py-4 text-emerald-600">Correct</th>
                                                <th className="px-2 md:px-6 py-3 md:py-4 text-rose-500">Time</th>
                                                <th className="px-4 md:px-6 py-3 md:py-4 text-right">Score</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/30">
                                            {SUBJECTS.filter(s => s.id !== 'all').map(sub => {
                                                const s = statsBySubject[sub.id] || { answered: 0, correct: 0, incorrect: 0, timeSeconds: 0 };
                                                const accuracy = s.answered > 0 ? Math.round((s.correct / s.answered) * 100) : 0;
                                                const timeDisplay = s.timeSeconds < 60 ? `${Math.round(s.timeSeconds)}s` : `${Math.floor(s.timeSeconds / 60)}m`;
                                                if (s.answered === 0) return null;

                                                return (
                                                    <tr key={sub.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/30 transition-colors group">
                                                        <td className="px-4 md:px-6 py-2.5 md:py-3.5">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-1.5 h-1.5 rounded-full bg-${sub.color}-500 shadow-sm`} />
                                                                <span className="font-bold text-slate-700 dark:text-slate-200 text-xs md:text-sm">{sub.label}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-2 md:px-6 py-2.5 md:py-3.5 font-mono font-bold text-slate-600 dark:text-slate-400 text-xs md:text-sm">{s.answered}</td>
                                                        <td className="px-2 md:px-6 py-2.5 md:py-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-500 text-xs md:text-sm">{s.correct}</td>
                                                        <td className="px-2 md:px-6 py-2.5 md:py-3.5 font-mono font-bold text-slate-500 text-[10px] md:text-xs">
                                                            {timeDisplay}
                                                        </td>
                                                        <td className="px-4 md:px-6 py-2.5 md:py-3.5 text-right">
                                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${accuracy >= 80 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : accuracy >= 50 ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
                                                                {accuracy}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {/* Grand Total Row */}
                                            <tr className="bg-indigo-50/30 dark:bg-indigo-900/10 font-bold border-t border-indigo-100 dark:border-indigo-900/50">
                                                <td className="px-4 md:px-6 py-3 md:py-4 text-indigo-600 dark:text-indigo-400 italic text-[10px] md:text-sm">Summary</td>
                                                <td className="px-2 md:px-6 py-3 md:py-4 font-mono text-slate-800 dark:text-white text-xs md:text-sm">{statsBySubject.all?.answered || 0}</td>
                                                <td className="px-2 md:px-6 py-3 md:py-4 font-mono text-emerald-600 dark:text-emerald-400 text-xs md:text-sm">{statsBySubject.all?.correct || 0}</td>
                                                <td className="px-2 md:px-6 py-3 md:py-4 font-mono text-indigo-600 dark:text-indigo-400 text-[10px] md:text-xs">
                                                    {Math.floor((statsBySubject.all?.timeSeconds || 0) / 60)}m
                                                </td>
                                                <td className="px-4 md:px-6 py-3 md:py-4 text-right">
                                                    <span className="text-indigo-600 dark:text-indigo-400 font-black text-xs md:text-sm">
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
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">
                                {[
                                    { label: 'Total', value: statsBySubject[selectedSubject]?.answered || 0, icon: BookOpen, color: 'indigo' },
                                    { label: 'Correct', value: statsBySubject[selectedSubject]?.correct || 0, icon: CheckCircle2, color: 'emerald' },
                                    { label: 'Wrong', value: statsBySubject[selectedSubject]?.incorrect || 0, icon: XCircle, color: 'rose' },
                                    {
                                        label: 'Success',
                                        value: `${statsBySubject[selectedSubject]?.answered ? Math.round((statsBySubject[selectedSubject].correct / statsBySubject[selectedSubject].answered) * 100) : 0}%`,
                                        icon: Target,
                                        color: 'amber'
                                    },
                                    {
                                        label: 'Time',
                                        value: (() => {
                                            const sec = statsBySubject[selectedSubject]?.timeSeconds || 0;
                                            return sec < 60 ? `${Math.round(sec)}s` : `${Math.floor(sec / 60)}m`;
                                        })(),
                                        icon: Calculator,
                                        color: 'indigo'
                                    }
                                ].map((stat, i) => (
                                    <div key={i} className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-3 md:p-4 rounded-2xl border border-white dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center space-y-1 group hover:scale-[1.02] transition-transform">
                                        <div className={`p-1 bg-${stat.color}-100 dark:bg-${stat.color}-900/30 rounded-lg text-${stat.color}-600 dark:text-${stat.color}-400 group-hover:rotate-12 transition-transform`}>
                                            <stat.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                        </div>
                                        <div className="font-black text-lg md:text-xl text-slate-800 dark:text-white leading-none tracking-tight">{stat.value}</div>
                                        <div className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-slate-400">{stat.label}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )
            }

            {/* List View */}
            <div className="space-y-2 md:space-y-4">
                {loading ? (
                    <div className="text-center py-20 text-slate-400 font-black uppercase tracking-widest animate-pulse">Loading Logs...</div>
                ) : filteredLogs.length === 0 ? (
                    <div className="text-center py-16 bg-white/40 dark:bg-slate-800/40 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
                        <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">No activity recorded for this period.</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Go solve some mysteries! 🕵️‍♂️</p>
                    </div>
                ) : (
                    filteredLogs.map((log, idx) => (
                        <div
                            key={idx}
                            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-3.5 md:p-6 rounded-[1.25rem] md:rounded-[1.5rem] shadow-sm border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all group overflow-hidden"
                        >
                            <div className="flex items-start gap-3 md:gap-5">
                                {/* Status Indicator (No text on mobile) */}
                                <div className="shrink-0 flex flex-col items-center gap-1.5 pt-1">
                                    {log.isCorrect ? (
                                        <div className="w-8 h-8 md:w-11 md:h-11 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                                            <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" />
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 md:w-11 md:h-11 rounded-full bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/40 flex items-center justify-center text-rose-500 dark:text-rose-400 shadow-sm">
                                            <XCircle className="w-5 h-5 md:w-6 md:h-6" />
                                        </div>
                                    )}
                                    <div className="hidden md:block">
                                        <span className={`text-[10px] font-black uppercase tracking-tight ${log.isCorrect ? 'text-emerald-600' : 'text-rose-500'}`}>
                                            {log.isCorrect ? 'Correct' : 'Incorrect'}
                                        </span>
                                    </div>
                                    {log.masteryDelta ? (
                                        <span className={`text-[8px] md:text-[10px] font-black ${log.masteryDelta > 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-300'}`}>
                                            {log.masteryDelta > 0 ? `+${log.masteryDelta}` : log.masteryDelta} XP
                                        </span>
                                    ) : null}
                                </div>

                                {/* Content Section */}
                                <div className="flex-1 min-w-0">
                                    {/* Metadata Row */}
                                    <div className="flex flex-wrap items-center gap-1.5 mb-2 opacity-80">
                                        <span className="text-[7px] md:text-[9px] uppercase font-bold text-slate-500 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-900/50 rounded flex items-center gap-1">
                                            <Calendar className="w-2.5 h-2.5" />
                                            {(() => {
                                                const ts = log.timestamp;
                                                const date = new Date(getTimestamp(ts));
                                                return isNaN(date.getTime()) ? 'Invalid' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                                            })()}
                                        </span>
                                        <span className="text-[8px] md:text-[9px] uppercase font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded">
                                            {log.subject || 'Mission'}
                                        </span>
                                        <span className="text-[8px] md:text-[9px] uppercase font-bold text-slate-400 font-mono tracking-tighter">
                                            #{log.questionId}
                                        </span>
                                    </div>

                                    {/* Question Text */}
                                    <div className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-200 leading-tight md:leading-snug mb-3">
                                        <LatexRenderer text={log.questionText || "Question Content"} />
                                    </div>

                                    {/* Answer Comparison Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/50">
                                        <div>
                                            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Your Choice</span>
                                            <p className={`text-xs md:text-sm font-bold truncate ${log.isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-500'}`}>
                                                <LatexRenderer text={log.studentAnswer || "-"} />
                                            </p>
                                        </div>
                                        {!log.isCorrect && log.correctAnswer && (
                                            <div className="border-t sm:border-t-0 sm:border-l border-slate-200/50 dark:border-slate-700/50 pt-1.5 sm:pt-0 sm:pl-3">
                                                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-emerald-500 block mb-0.5">Correct Answer</span>
                                                <p className="text-xs md:text-sm font-bold text-emerald-700 dark:text-emerald-400 truncate">
                                                    <LatexRenderer text={log.correctAnswer} />
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {log.explanation && (
                                        <div className="mt-2.5 text-[10px] md:text-[11px] text-slate-600 dark:text-slate-400 bg-indigo-50/30 dark:bg-indigo-900/5 p-2 rounded-lg border-l-2 border-indigo-200 dark:border-indigo-800/30 flex gap-2 items-start">
                                            <div className="mt-0.5 shrink-0">💡</div>
                                            <div className="leading-normal"><LatexRenderer text={log.explanation} /></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
