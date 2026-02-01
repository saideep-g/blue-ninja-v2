import React, { useState } from 'react';
import { Users, BookOpen, AlertCircle, TrendingUp, Clock, Activity, Database, Play } from 'lucide-react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../../services/db/firebase';

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
    const [runningMigration, setRunningMigration] = useState(false);
    const [migrationStatus, setMigrationStatus] = useState<string | null>(null);

    const runLogRepair = async () => {
        if (!confirm("Run Log Repair Script? This will update historical log entries with missing subjects, question text, and answers.")) return;
        setRunningMigration(true);
        setMigrationStatus("Starting migration... Fetching content database...");

        try {
            // 1. Build Question Lookup Map (Memory intensive but separate collections for 2 students is fine)
            // Need to map ID -> { text, answer, type, subject }
            const qLookup = new Map<string, any>();
            let contentCount = 0;

            const indexQuestion = (q: any, source: string, defaultSubject?: string) => {
                if (!q) return;
                const id = (q.id || '').toString();
                // Store by ID
                if (id) {
                    qLookup.set(id, {
                        questionText: q.question || q.question_text || q.text,
                        correctAnswer: q.answer || q.correct_answer || (q.options?.find((o: any) => o.isCorrect)?.text),
                        questionType: (q.type || q.template_id || 'MCQ').toUpperCase(),
                        subject: q.subject || defaultSubject || 'era'
                    });
                    // Also store by atomId if available for fuzzy matching? Maybe risky if atoms reuse questions.
                }
                contentCount++;
            };

            // A. Fetch Diagnostic
            const diagSnap = await getDocs(collection(db, 'diagnostic_questions'));
            diagSnap.docs.forEach(d => indexQuestion({ ...d.data(), id: d.id }, 'diagnostic', 'diagnostic'));

            // B. Fetch Bundles
            const bundlesSnap = await getDocs(collection(db, 'question_bundle_data'));
            bundlesSnap.docs.forEach(d => {
                const data = d.data();
                if (data.questions) {
                    Object.values(data.questions).forEach((q: any) => indexQuestion(q, 'bundle'));
                }
            });

            console.log(`[Migration] Indexed ${contentCount} questions.`);
            setMigrationStatus(`Indexed ${contentCount} questions. Scanning student logs...`);

            // 2. Scan Students
            const studentsSnap = await getDocs(collection(db, 'students'));
            let totalDocs = 0;
            let totalEntries = 0;

            for (const studentDoc of studentsSnap.docs) {
                const logsCollection = collection(db, 'students', studentDoc.id, 'session_logs');
                const logsSnap = await getDocs(logsCollection);

                for (const logDoc of logsSnap.docs) {
                    const data = logDoc.data();
                    if (data.entries && Array.isArray(data.entries)) {
                        let modified = false;
                        const newEntries = data.entries.map((entry: any) => {
                            let updated = { ...entry };
                            let needsUpdate = false;

                            // 1. Fix Missing/Generic Subject
                            if (!updated.subject || updated.subject === 'Era' || updated.subject === 'Daily Quest') {
                                const qId = (updated.questionId || '').toString().toLowerCase();
                                const mode = updated.mode || '';

                                if (mode === 'DIAGNOSTIC') {
                                    updated.subject = 'diagnostic';
                                } else if (qId.startsWith('m')) {
                                    updated.subject = 'math';
                                } else if (qId.startsWith('s')) {
                                    updated.subject = 'science';
                                } else if (qId.startsWith('w')) {
                                    updated.subject = 'vocabulary';
                                } else if (qId.startsWith('g')) {
                                    updated.subject = 'gk';
                                } else if (qId.startsWith('y')) {
                                    updated.subject = 'geography';
                                } else if (updated.questionText && updated.questionText.includes('Math')) {
                                    updated.subject = 'math';
                                } else if (entry.atomId && entry.atomId.startsWith('m')) {
                                    updated.subject = 'math';
                                } else {
                                    updated.subject = 'math'; // Default fallback
                                }
                                needsUpdate = true;
                            }

                            // 2. Fix Missing Content (Text/Answer)
                            if (!updated.questionText || !updated.correctAnswer || updated.questionText === 'Question Content' || updated.correctAnswer === 'N/A') {
                                const lookup = qLookup.get(updated.questionId.toString());
                                if (lookup) {
                                    if (!updated.questionText || updated.questionText === 'Question Content') updated.questionText = lookup.questionText;
                                    if (!updated.correctAnswer || updated.correctAnswer === 'N/A') updated.correctAnswer = lookup.correctAnswer;
                                    // Also fix type if we have it better
                                    if (!updated.questionType && lookup.questionType) updated.questionType = lookup.questionType;

                                    needsUpdate = true;
                                }
                            }

                            // 3. Fix Missing Question Type (Fallback)
                            if (!updated.questionType) {
                                if (updated.template_id) updated.questionType = updated.template_id.toUpperCase();
                                else updated.questionType = 'MCQ';
                                needsUpdate = true;
                            }

                            if (needsUpdate) {
                                modified = true;
                                return updated;
                            }
                            return entry;
                        });

                        if (modified) {
                            await updateDoc(logDoc.ref, { entries: newEntries });
                            totalDocs++;
                            // Logic is simpler to just count docs.
                        }
                    }
                }
            }
            setMigrationStatus(`Complete! Updated ${totalDocs} log documents.`);

        } catch (e: any) {
            console.error("Migration failed", e);
            setMigrationStatus(`Error: ${e.message}`);
        } finally {
            setRunningMigration(false);
        }
    };

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

            {/* Data Tools */}
            <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-indigo-900 text-lg flex items-center gap-2">
                        <Database className="w-5 h-5 text-indigo-500" />
                        Data Health & Migration
                    </h3>
                    {migrationStatus && (
                        <span className={`text-sm font-bold px-3 py-1 rounded-full ${migrationStatus.includes('Error') ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            {migrationStatus}
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    <button
                        onClick={runLogRepair}
                        disabled={runningMigration}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-indigo-200"
                    >
                        {runningMigration ? <Activity className="animate-spin" /> : <Play size={18} fill="currentColor" />}
                        Run Log Repair Script
                    </button>

                    <button
                        onClick={async () => {
                            if (!confirm("Are you sure you want to delete all logs with questionId starting with 'DUMMY'? This action cannot be undone.")) return;
                            setRunningMigration(true);
                            setMigrationStatus("Cleaning up dummy logs...");
                            try {
                                const { deleteDummyLogs } = await import('../../../features/multiplication-tables/services/tablesFirestore');
                                const result = await deleteDummyLogs();
                                setMigrationStatus(`Success! Deleted ${result.logsDeleted} dummy logs across ${result.studentsProcessed} students.`);
                            } catch (e: any) {
                                setMigrationStatus(`Error: ${e.message}`);
                            } finally {
                                setRunningMigration(false);
                            }
                        }}
                        disabled={runningMigration}
                        className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-amber-100"
                    >
                        <Database size={18} />
                        Cleanup Dummy Logs
                    </button>

                    <p className="text-sm text-slate-500 max-w-lg">
                        <strong>One-Time Fix:</strong> Iterates through all student histories to fix missing subjects (converting 'Era' to 'Math', 'Science', etc. based on ID) and missing question types. Or use Cleanup to remove test data.
                    </p>
                </div>
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
