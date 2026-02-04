// @ts-nocheck
import React from 'react';
import { motion } from 'framer-motion';
import { User, Flame, TrendingUp, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { StudentWithMetrics } from '../../../types/admin/student';

interface StudentCardProps {
    student: StudentWithMetrics;
    index: number;
}

export default function StudentCard({ student, index }: StudentCardProps) {
    const navigate = useNavigate();
    const metrics = student.metrics;

    // Check if student practiced today
    const today = new Date().toISOString().split('T')[0];
    const practicedToday = metrics?.lastPracticeDate === today;

    // Determine status
    const getStatus = () => {
        if (practicedToday) {
            return { text: 'Active today', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30' };
        }

        if (metrics?.currentStreak && metrics.currentStreak > 0) {
            return { text: 'On streak', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30' };
        }

        return { text: 'Needs attention', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-800' };
    };

    const status = getStatus();

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.4,
                delay: index * 0.1
            }
        }
    };

    return (
        <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{ scale: 1.02, y: -4 }}
            className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-100 dark:border-gray-700 p-6 cursor-pointer transition-all shadow-md hover:shadow-xl"
            onClick={() => navigate(`/admin/students/${student.studentId}`)}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white shadow-lg">
                        <User size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">
                            {student.studentName}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Grade {student.grade}
                        </p>
                    </div>
                </div>

                {/* Status Badge */}
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.bg} ${status.color}`}>
                    {status.text}
                </span>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-3 mt-4">
                {/* Streak */}
                <div className="flex items-center gap-2">
                    <Flame
                        size={18}
                        className={metrics?.currentStreak && metrics.currentStreak > 0 ? 'text-orange-500' : 'text-gray-300 dark:text-gray-600'}
                        fill={metrics?.currentStreak && metrics.currentStreak > 0 ? 'currentColor' : 'none'}
                    />
                    <div>
                        <div className="text-lg font-black text-gray-800 dark:text-gray-200">
                            {metrics?.currentStreak || 0}
                        </div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Streak
                        </div>
                    </div>
                </div>

                {/* Weekly Accuracy */}
                <div className="flex items-center gap-2">
                    <TrendingUp size={18} className="text-blue-500" />
                    <div>
                        <div className="text-lg font-black text-gray-800 dark:text-gray-200">
                            {metrics?.weeklyStats?.accuracy || 0}%
                        </div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Accuracy
                        </div>
                    </div>
                </div>

                {/* Questions */}
                <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-green-500" />
                    <div>
                        <div className="text-lg font-black text-gray-800 dark:text-gray-200">
                            {metrics?.weeklyStats?.questionsAnswered || 0}
                        </div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            This Week
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">
                        {student.curriculum}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                        {student.enrolledSubjects?.length || 0} subjects
                    </span>
                </div>
            </div>
        </motion.div>
    );
}
