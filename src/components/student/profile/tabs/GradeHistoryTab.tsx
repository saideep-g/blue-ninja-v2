// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    History,
    TrendingUp,
    Clock,
    Target,
    BookOpen,
    ChevronRight,
    AlertCircle,
    Calendar
} from 'lucide-react';
import { useNinja } from '../../../../context/NinjaContext';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../services/db/firebase';

interface GradeHistoryEntry {
    grade: number;
    academicYear: string;
    startDate: string;
    endDate: string;
    curriculum: string;
    totalQuestions: number;
    totalCorrect: number;
    overallAccuracy: number;
    totalTimeSpent: number;
    subjectStats: {
        [subject: string]: {
            questionsAnswered: number;
            correctAnswers: number;
            accuracy: number;
            timeSpent: number;
            masteryLevel: number;
        };
    };
    completedAt: string;
}

interface GradeHistoryDocument {
    studentId: string;
    completedGrades: GradeHistoryEntry[];
    lastUpdated: any;
}

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

export default function GradeHistoryTab() {
    const { user } = useNinja();
    const navigate = useNavigate();
    const [gradeHistory, setGradeHistory] = useState<GradeHistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedGrade, setExpandedGrade] = useState<number | null>(null);

    useEffect(() => {
        const fetchGradeHistory = async () => {
            if (!user?.uid) return;

            try {
                const historyRef = doc(db, 'students', user.uid, 'metrics', 'gradeHistory');
                const historySnap = await getDoc(historyRef);

                if (historySnap.exists()) {
                    const data = historySnap.data() as GradeHistoryDocument;
                    // Sort by grade descending (most recent first)
                    const sorted = [...(data.completedGrades || [])].sort((a, b) => b.grade - a.grade);
                    setGradeHistory(sorted);
                }
            } catch (error) {
                console.error('Error fetching grade history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchGradeHistory();
    }, [user]);

    const formatTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    const handleViewLogs = (grade: number) => {
        // Navigate to practice history with grade filter
        // This will be implemented when Practice History tab is created
        console.log(`View logs for Grade ${grade}`);
        // navigate('/practice-history', { state: { filterGrade: grade } });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-400"></div>
            </div>
        );
    }

    if (gradeHistory.length === 0) {
        return (
            <motion.div
                className="bg-theme-card/60 backdrop-blur-xl p-12 rounded-3xl border border-theme-border text-center"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
            >
                <Calendar className="mx-auto mb-4 text-gray-300" size={64} />
                <h3 className="text-xl font-serif italic text-theme-text mb-2">No Grade History Yet</h3>
                <p className="text-color-text-secondary text-sm">
                    Your completed grade summaries will appear here once you're promoted to a new grade.
                </p>
            </motion.div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div
                className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-3xl border border-purple-100"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
            >
                <div className="flex items-center gap-3 mb-2">
                    <History className="text-purple-400" size={24} />
                    <h2 className="font-serif italic text-2xl text-theme-text">Grade History</h2>
                </div>
                <p className="text-sm text-gray-600">
                    View your performance summary from completed grades
                </p>
            </motion.div>

            {/* Grade Cards */}
            <div className="space-y-4">
                {gradeHistory.map((entry, index) => (
                    <motion.div
                        key={entry.grade}
                        className="bg-theme-card/60 backdrop-blur-xl rounded-3xl border border-theme-border shadow-lg overflow-hidden"
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: index * 0.1 }}
                    >
                        {/* Grade Header */}
                        <div
                            className="p-6 cursor-pointer hover:bg-gray-50/50 transition-colors"
                            onClick={() => setExpandedGrade(expandedGrade === entry.grade ? null : entry.grade)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-purple-400 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                        <span className="text-2xl font-black">{entry.grade}</span>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-serif italic text-theme-text">
                                            Grade {entry.grade}
                                        </h3>
                                        <p className="text-xs text-color-text-secondary font-bold uppercase tracking-wider">
                                            {entry.academicYear} • {entry.curriculum}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {entry.startDate} to {entry.endDate}
                                        </p>
                                    </div>
                                </div>

                                <ChevronRight
                                    className={`text-gray-400 transition-transform ${expandedGrade === entry.grade ? 'rotate-90' : ''
                                        }`}
                                    size={24}
                                />
                            </div>

                            {/* Summary Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                                <StatCard
                                    icon={<Target size={16} />}
                                    label="Questions"
                                    value={entry.totalQuestions.toLocaleString()}
                                    color="blue"
                                />
                                <StatCard
                                    icon={<TrendingUp size={16} />}
                                    label="Accuracy"
                                    value={`${entry.overallAccuracy}%`}
                                    color="green"
                                />
                                <StatCard
                                    icon={<Clock size={16} />}
                                    label="Time Spent"
                                    value={formatTime(entry.totalTimeSpent)}
                                    color="purple"
                                />
                                <StatCard
                                    icon={<BookOpen size={16} />}
                                    label="Subjects"
                                    value={Object.keys(entry.subjectStats || {}).length}
                                    color="orange"
                                />
                            </div>
                        </div>

                        {/* Expanded Details */}
                        {expandedGrade === entry.grade && (
                            <motion.div
                                className="border-t border-gray-100 p-6 bg-gray-50/30"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <h4 className="text-xs font-black uppercase tracking-widest text-gray-600 mb-4">
                                    Subject Breakdown
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Object.entries(entry.subjectStats || {}).map(([subject, stats]) => (
                                        <div
                                            key={subject}
                                            className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700"
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <h5 className="font-bold text-gray-700 capitalize flex items-center gap-2">
                                                    {getSubjectIcon(subject)}
                                                    {subject}
                                                </h5>
                                                <span className="text-xs font-black text-gray-500">
                                                    {stats.masteryLevel}% Mastery
                                                </span>
                                            </div>

                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Questions:</span>
                                                    <span className="font-bold">{stats.questionsAnswered}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Accuracy:</span>
                                                    <span className="font-bold text-green-600">{stats.accuracy}%</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Time:</span>
                                                    <span className="font-bold">{formatTime(stats.timeSpent)}</span>
                                                </div>
                                            </div>

                                            {/* Mastery Progress Bar */}
                                            <div className="mt-3">
                                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all ${getMasteryColor(stats.masteryLevel)}`}
                                                        style={{ width: `${stats.masteryLevel}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* View Logs Button */}
                                <button
                                    onClick={() => handleViewLogs(entry.grade)}
                                    className="mt-6 w-full py-3 bg-gradient-to-r from-pink-400 to-purple-400 text-white rounded-2xl font-bold text-sm hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                >
                                    <BookOpen size={18} />
                                    View Detailed Practice Logs
                                </button>
                            </motion.div>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

// Helper Components
function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        purple: 'bg-purple-50 text-purple-600',
        orange: 'bg-orange-50 text-orange-600'
    };

    return (
        <div className={`${colorClasses[color]} p-3 rounded-xl`}>
            <div className="flex items-center gap-2 mb-1">
                {icon}
                <span className="text-[9px] font-black uppercase tracking-wider opacity-70">{label}</span>
            </div>
            <div className="text-xl font-black">{value}</div>
        </div>
    );
}

function getSubjectIcon(subject: string): string {
    const icons: Record<string, string> = {
        math: '📐',
        science: '🔬',
        english: '📚',
        social: '🏛️',
        geography: '🌍',
        tables: '✖️'
    };
    return icons[subject.toLowerCase()] || '📖';
}

function getMasteryColor(mastery: number): string {
    if (mastery >= 80) return 'bg-green-500';
    if (mastery >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
}
