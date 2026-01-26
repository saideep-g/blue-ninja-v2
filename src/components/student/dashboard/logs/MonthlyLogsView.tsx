import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../services/db/firebase';
import { useNinja } from '../../../../context/NinjaContext';
import { ChevronLeft, ChevronRight, Calculator, CheckCircle2, XCircle, FileText, Calendar, BookOpen } from 'lucide-react';

const SUBJECTS = [
    { id: 'all', label: 'All Subjects', color: 'slate' },
    { id: 'math', label: 'Math', color: 'blue' },
    { id: 'science', label: 'Science', color: 'emerald' },
    { id: 'vocabulary', label: 'Words', color: 'purple' },
    { id: 'gk', label: 'World', color: 'amber' },
    { id: 'tables', label: 'Tables', color: 'rose' }
];

export function MonthlyLogsView() {
    const { user } = useNinja();
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [selectedSubject, setSelectedSubject] = useState('all');
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!user) return;

        const fetchLogs = async () => {
            setLoading(true);
            try {
                const monthKey = selectedMonth.toISOString().slice(0, 7); // "YYYY-MM"
                const docRef = doc(db, 'students', user.uid, 'session_logs', monthKey);
                const snap = await getDoc(docRef);

                if (snap.exists()) {
                    const data = snap.data();
                    const entries = data.entries || [];
                    // Phase 4: Sort reverse chronological
                    // Assuming items inserted in order, reverse is mostly correct. 
                    // Better to sort by timestamp if available. All bucketed logs have timestamp.
                    entries.sort((a: any, b: any) => {
                        const tA = new Date(a.timestamp).getTime();
                        const tB = new Date(b.timestamp).getTime();
                        return tB - tA; // Newest first
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

        fetchLogs();
    }, [user, selectedMonth]);

    const changeMonth = (delta: number) => {
        const newDate = new Date(selectedMonth);
        newDate.setMonth(newDate.getMonth() + delta);
        setSelectedMonth(newDate);
    };

    const filteredLogs = selectedSubject === 'all'
        ? logs
        : logs.filter(log => {
            if (selectedSubject === 'vocabulary' && (log.subject === 'eng' || log.subject === 'english' || log.subject === 'vocabulary')) return true;
            return log.subject === selectedSubject;
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
                                            {new Date(log.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                        </span>
                                        <span className="text-[10px] uppercase font-black tracking-wider text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-md">
                                            {log.subject || 'Era'}
                                        </span>
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
        </div>
    );
}
