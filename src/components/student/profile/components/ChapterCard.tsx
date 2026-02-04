// @ts-nocheck
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronRight,
    Target,
    Clock,
    TrendingUp,
    AlertTriangle
} from 'lucide-react';

interface ChapterMetrics {
    chapterId: string;
    chapterName: string;
    subject: string;
    moduleId: string;
    questionsAnswered: number;
    correctAnswers: number;
    accuracy: number;
    timeSpent: number;
    masteryLevel: number;
    lastPracticed: string;
    weakTopics: string[];
}

interface ChapterCardProps {
    chapter: ChapterMetrics;
    index: number;
}

export default function ChapterCard({ chapter, index }: ChapterCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const getMasteryColor = (mastery: number): string => {
        if (mastery >= 80) return 'bg-green-500';
        if (mastery >= 50) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const getMasteryLabel = (mastery: number): string => {
        if (mastery >= 80) return 'Strong';
        if (mastery >= 50) return 'Developing';
        return 'Needs Practice';
    };

    const getSubjectIcon = (subject: string): string => {
        const icons: Record<string, string> = {
            math: '📐',
            science: '🔬',
            english: '📚',
            social: '🏛️',
            geography: '🌍',
            tables: '✖️'
        };
        return icons[subject.toLowerCase()] || '📖';
    };

    const formatTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'Never';
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return `${Math.floor(diffDays / 30)} months ago`;
    };

    return (
        <motion.div
            className="bg-theme-card/60 backdrop-blur-xl rounded-3xl border border-theme-border shadow-lg overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
        >
            {/* Card Header */}
            <div
                className="p-6 cursor-pointer hover:bg-gray-50/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                        {/* Subject Icon */}
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center text-2xl">
                            {getSubjectIcon(chapter.subject)}
                        </div>

                        {/* Chapter Info */}
                        <div className="flex-1">
                            <h3 className="text-lg font-serif italic text-theme-text mb-1">
                                {chapter.chapterName}
                            </h3>
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                    {chapter.subject}
                                </span>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-gray-500">
                                    Last practiced: {formatDate(chapter.lastPracticed)}
                                </span>
                            </div>
                        </div>

                        {/* Mastery Badge */}
                        <div className="hidden md:flex items-center gap-2">
                            <div className="text-right">
                                <div className="text-2xl font-black text-gray-800">
                                    {chapter.masteryLevel}%
                                </div>
                                <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500">
                                    {getMasteryLabel(chapter.masteryLevel)}
                                </div>
                            </div>
                            <div className="w-2 h-12 rounded-full overflow-hidden bg-gray-100">
                                <div
                                    className={`w-full transition-all ${getMasteryColor(chapter.masteryLevel)}`}
                                    style={{ height: `${chapter.masteryLevel}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    <ChevronRight
                        className={`text-gray-400 transition-transform ml-4 ${isExpanded ? 'rotate-90' : ''
                            }`}
                        size={24}
                    />
                </div>

                {/* Quick Stats (Mobile) */}
                <div className="md:hidden mt-4 flex items-center justify-between">
                    <div className="text-center">
                        <div className="text-xl font-black text-gray-800">{chapter.masteryLevel}%</div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Mastery</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xl font-black text-gray-800">{chapter.accuracy}%</div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Accuracy</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xl font-black text-gray-800">{chapter.questionsAnswered}</div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Questions</div>
                    </div>
                </div>
            </div>

            {/* Expanded Details */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        className="border-t border-gray-100 p-6 bg-gray-50/30"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Detailed Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <DetailStat
                                icon={<Target size={16} />}
                                label="Questions"
                                value={chapter.questionsAnswered}
                                color="blue"
                            />
                            <DetailStat
                                icon={<TrendingUp size={16} />}
                                label="Accuracy"
                                value={`${chapter.accuracy}%`}
                                color="green"
                            />
                            <DetailStat
                                icon={<TrendingUp size={16} />}
                                label="Correct"
                                value={chapter.correctAnswers}
                                color="purple"
                            />
                            <DetailStat
                                icon={<Clock size={16} />}
                                label="Time Spent"
                                value={formatTime(chapter.timeSpent)}
                                color="orange"
                            />
                        </div>

                        {/* Mastery Progress Bar */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-black uppercase tracking-wider text-gray-600">
                                    Mastery Progress
                                </span>
                                <span className="text-sm font-bold text-gray-700">
                                    {chapter.masteryLevel}%
                                </span>
                            </div>
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all ${getMasteryColor(chapter.masteryLevel)}`}
                                    style={{ width: `${chapter.masteryLevel}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Weak Topics */}
                        {chapter.weakTopics && chapter.weakTopics.length > 0 && (
                            <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <AlertTriangle size={16} className="text-yellow-600" />
                                    <span className="text-xs font-black uppercase tracking-wider text-yellow-700">
                                        Topics Needing Practice
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {chapter.weakTopics.map((topic, i) => (
                                        <span
                                            key={i}
                                            className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold"
                                        >
                                            {topic}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// Helper Component
function DetailStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
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
