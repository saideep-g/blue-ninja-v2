// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    BookOpen,
    TrendingUp,
    Clock,
    Target,
    AlertCircle,
    Filter,
    ChevronDown,
    Download
} from 'lucide-react';
import { useNinja } from '../../../../context/NinjaContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../../../services/db/firebase';
import { questionBundleSyncService } from '../../../../services/questionBundleSync';
import { indexedDBService } from '../../../../services/indexedDBService';
import ChapterCard from '../components/ChapterCard';

interface ChapterMetrics {
    chapterId: string;
    chapterName: string;
    subject: string;
    moduleId: string;
    questionsAnswered: number;
    correctAnswers: number;
    accuracy: number;
    timeSpent: number; // minutes
    masteryLevel: number; // 0-100
    lastPracticed: string;
    weakTopics: string[];
}

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

export default function ChapterAnalyticsTab() {
    const { user, ninjaStats } = useNinja();
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [chapterMetrics, setChapterMetrics] = useState<ChapterMetrics[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'mastery' | 'recent' | 'accuracy'>('mastery');
    const [syncProgress, setSyncProgress] = useState({ synced: 0, total: 0 });

    const currentGrade = ninjaStats?.grade || 7;
    const subjects = ['all', 'math', 'science', 'english', 'social', 'geography', 'tables'];

    useEffect(() => {
        initializeData();
    }, [user, currentGrade]);

    const initializeData = async () => {
        setLoading(true);

        // First, sync question bundles
        await syncQuestionBundles();

        // Then, calculate chapter metrics from session logs
        await calculateChapterMetrics();

        setLoading(false);
    };

    const syncQuestionBundles = async () => {
        setSyncing(true);

        try {
            await questionBundleSyncService.syncUpdatedBundles(currentGrade, (progress) => {
                setSyncProgress({ synced: progress.synced, total: progress.total });
            });
        } catch (error) {
            console.error('Error syncing bundles:', error);
        } finally {
            setSyncing(false);
        }
    };

    const calculateChapterMetrics = async () => {
        if (!user?.uid) return;

        try {
            // Get session logs for current grade
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth() + 1;

            // Get last 6 months of logs
            const monthsToFetch = [];
            for (let i = 0; i < 6; i++) {
                const date = new Date(currentYear, currentMonth - 1 - i, 1);
                const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                monthsToFetch.push(yearMonth);
            }

            const allLogs: any[] = [];

            for (const yearMonth of monthsToFetch) {
                const logsRef = collection(db, 'students', user.uid, 'session_logs', yearMonth, 'logs');
                const q = query(logsRef, where('grade', '==', currentGrade));
                const snapshot = await getDocs(q);

                snapshot.docs.forEach(doc => {
                    allLogs.push({ id: doc.id, ...doc.data() });
                });
            }

            // Group by chapter and calculate metrics
            const chapterMap = new Map<string, ChapterMetrics>();

            for (const log of allLogs) {
                if (!log.chapterId || !log.questionResults) continue;

                const chapterId = log.chapterId;

                if (!chapterMap.has(chapterId)) {
                    chapterMap.set(chapterId, {
                        chapterId: chapterId,
                        chapterName: log.chapterName || 'Unknown Chapter',
                        subject: log.subject || 'Unknown',
                        moduleId: log.moduleId || '',
                        questionsAnswered: 0,
                        correctAnswers: 0,
                        accuracy: 0,
                        timeSpent: 0,
                        masteryLevel: 0,
                        lastPracticed: log.timestamp || '',
                        weakTopics: []
                    });
                }

                const metrics = chapterMap.get(chapterId)!;

                // Aggregate data
                const results = log.questionResults || [];
                metrics.questionsAnswered += results.length;
                metrics.correctAnswers += results.filter((r: any) => r.isCorrect).length;
                metrics.timeSpent += log.totalTime || 0;

                // Update last practiced if more recent
                if (log.timestamp > metrics.lastPracticed) {
                    metrics.lastPracticed = log.timestamp;
                }
            }

            // Calculate accuracy and mastery for each chapter
            const metricsArray = Array.from(chapterMap.values()).map(metrics => {
                metrics.accuracy = metrics.questionsAnswered > 0
                    ? Math.round((metrics.correctAnswers / metrics.questionsAnswered) * 100)
                    : 0;

                // Simple mastery calculation (can be enhanced)
                metrics.masteryLevel = metrics.accuracy;

                return metrics;
            });

            setChapterMetrics(metricsArray);
        } catch (error) {
            console.error('Error calculating chapter metrics:', error);
        }
    };

    const getFilteredAndSortedChapters = (): ChapterMetrics[] => {
        let filtered = chapterMetrics;

        // Filter by subject
        if (selectedSubject !== 'all') {
            filtered = filtered.filter(c => c.subject.toLowerCase() === selectedSubject);
        }

        // Sort
        const sorted = [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'mastery':
                    return b.masteryLevel - a.masteryLevel;
                case 'recent':
                    return new Date(b.lastPracticed).getTime() - new Date(a.lastPracticed).getTime();
                case 'accuracy':
                    return b.accuracy - a.accuracy;
                default:
                    return 0;
            }
        });

        return sorted;
    };

    const formatTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    const filteredChapters = getFilteredAndSortedChapters();

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-400 mb-4"></div>
                {syncing && (
                    <p className="text-sm text-gray-600">
                        Syncing question bundles... {syncProgress.synced}/{syncProgress.total}
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div
                className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 p-6 rounded-3xl border border-blue-100 dark:border-blue-900/30"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
            >
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <BookOpen className="text-blue-400" size={32} />
                        <div>
                            <h2 className="font-serif italic text-2xl text-theme-text">Chapter Analytics</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Detailed performance by chapter</p>
                        </div>
                    </div>
                    <button
                        onClick={syncQuestionBundles}
                        disabled={syncing}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                        <Download size={16} />
                        {syncing ? 'Syncing...' : 'Sync Data'}
                    </button>
                </div>
            </motion.div>

            {/* Filters */}
            <motion.div
                className="bg-theme-card/60 backdrop-blur-xl p-6 rounded-3xl border border-theme-border shadow-lg"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.1 }}
            >
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Subject Filter */}
                    <div className="flex-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-2 block">
                            Filter by Subject
                        </label>
                        <div className="relative">
                            <select
                                value={selectedSubject}
                                onChange={(e) => setSelectedSubject(e.target.value)}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-sm font-bold appearance-none cursor-pointer focus:border-blue-400 focus:outline-none dark:text-gray-200"
                            >
                                {subjects.map(subject => (
                                    <option key={subject} value={subject}>
                                        {subject === 'all' ? 'All Subjects' : subject.charAt(0).toUpperCase() + subject.slice(1)}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                        </div>
                    </div>

                    {/* Sort By */}
                    <div className="flex-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-2 block">
                            Sort By
                        </label>
                        <div className="relative">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-sm font-bold appearance-none cursor-pointer focus:border-blue-400 focus:outline-none dark:text-gray-200"
                            >
                                <option value="mastery">Mastery Level</option>
                                <option value="recent">Recently Practiced</option>
                                <option value="accuracy">Accuracy</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Summary Stats */}
            <motion.div
                className="grid grid-cols-2 md:grid-cols-4 gap-4"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.2 }}
            >
                <StatCard
                    label="Chapters"
                    value={filteredChapters.length}
                    icon={<BookOpen size={18} />}
                    color="blue"
                />
                <StatCard
                    label="Avg Accuracy"
                    value={`${Math.round(filteredChapters.reduce((sum, c) => sum + c.accuracy, 0) / (filteredChapters.length || 1))}%`}
                    icon={<Target size={18} />}
                    color="green"
                />
                <StatCard
                    label="Total Questions"
                    value={filteredChapters.reduce((sum, c) => sum + c.questionsAnswered, 0)}
                    icon={<TrendingUp size={18} />}
                    color="purple"
                />
                <StatCard
                    label="Total Time"
                    value={formatTime(filteredChapters.reduce((sum, c) => sum + c.timeSpent, 0))}
                    icon={<Clock size={18} />}
                    color="orange"
                />
            </motion.div>

            {/* Chapter List */}
            {filteredChapters.length === 0 ? (
                <motion.div
                    className="bg-theme-card/60 backdrop-blur-xl p-12 rounded-3xl border border-theme-border text-center"
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: 0.3 }}
                >
                    <BookOpen className="mx-auto mb-4 text-gray-300" size={64} />
                    <h3 className="text-xl font-serif italic text-theme-text mb-2">No Chapter Data</h3>
                    <p className="text-color-text-secondary text-sm">
                        Start practicing to see your chapter-wise performance here
                    </p>
                </motion.div>
            ) : (
                <motion.div
                    className="space-y-4"
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: 0.3 }}
                >
                    {filteredChapters.map((chapter, index) => (
                        <ChapterCard
                            key={chapter.chapterId}
                            chapter={chapter}
                            index={index}
                        />
                    ))}
                </motion.div>
            )}
        </div>
    );
}

// Helper Component
function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
    const colorClasses = {
        blue: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/30',
        green: 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900/30',
        purple: 'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/30',
        orange: 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900/30'
    };

    return (
        <div className={`${colorClasses[color]} p-4 rounded-2xl border`}>
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <span className="text-[9px] font-black uppercase tracking-wider opacity-70">{label}</span>
            </div>
            <div className="text-2xl font-black">{value}</div>
        </div>
    );
}
