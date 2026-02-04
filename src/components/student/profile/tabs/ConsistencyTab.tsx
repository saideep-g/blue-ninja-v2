// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, Calendar as CalendarIcon, TrendingUp, AlertCircle } from 'lucide-react';
import { useNinja } from '../../../../context/NinjaContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../services/db/firebase';
import ConsistencyCalendar from '../components/ConsistencyCalendar';
import DailyDetailPane from '../components/DailyDetailPane';
import StreakDisplay from '../components/StreakDisplay';

interface DailyCompletionEntry {
    date: string;
    completedSubjects: string[];
    totalSubjects: number;
    isPerfectDay: boolean;
    timestamp: any;
}

interface DailyCompletionDocument {
    grade: number;
    entries: DailyCompletionEntry[];
}

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

export default function ConsistencyTab() {
    const { user, ninjaStats } = useNinja();
    const [loading, setLoading] = useState(true);
    const [dailyCompletions, setDailyCompletions] = useState<DailyCompletionEntry[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [currentStreak, setCurrentStreak] = useState(0);
    const [longestStreak, setLongestStreak] = useState(0);
    const [gradeYearStats, setGradeYearStats] = useState({
        perfectDays: 0,
        partialDays: 0,
        inactiveDays: 0
    });

    const currentGrade = ninjaStats?.grade || 7;

    useEffect(() => {
        fetchDailyCompletions();
    }, [user, currentGrade]);

    const fetchDailyCompletions = async () => {
        if (!user?.uid) return;

        try {
            const completionRef = doc(db, 'students', user.uid, 'daily_completion', `grade_${currentGrade}`);
            const completionSnap = await getDoc(completionRef);

            if (completionSnap.exists()) {
                const data = completionSnap.data() as DailyCompletionDocument;
                setDailyCompletions(data.entries || []);
                calculateStreaks(data.entries || []);
                calculateGradeYearStats(data.entries || []);
            } else {
                setDailyCompletions([]);
            }
        } catch (error) {
            console.error('Error fetching daily completions:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStreaks = (entries: DailyCompletionEntry[]) => {
        if (entries.length === 0) {
            setCurrentStreak(0);
            setLongestStreak(0);
            return;
        }

        // Sort by date descending
        const sorted = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Calculate current streak (only Perfect Days count)
        let current = 0;
        const today = new Date().toISOString().split('T')[0];

        for (const entry of sorted) {
            if (entry.date > today) continue; // Skip future dates
            if (!entry.isPerfectDay) break; // Streak broken
            current++;
        }

        setCurrentStreak(current);

        // Calculate longest streak
        let longest = 0;
        let temp = 0;

        for (const entry of sorted) {
            if (entry.isPerfectDay) {
                temp++;
                longest = Math.max(longest, temp);
            } else {
                temp = 0;
            }
        }

        setLongestStreak(longest);
    };

    const calculateGradeYearStats = (entries: DailyCompletionEntry[]) => {
        // Grade Year: June 1 to May 31
        const now = new Date();
        const currentYear = now.getFullYear();
        const gradeYearStart = new Date(now.getMonth() >= 5 ? currentYear : currentYear - 1, 5, 1); // June 1
        const gradeYearEnd = new Date(now.getMonth() >= 5 ? currentYear + 1 : currentYear, 4, 31); // May 31

        const gradeYearEntries = entries.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate >= gradeYearStart && entryDate <= gradeYearEnd;
        });

        const perfect = gradeYearEntries.filter(e => e.isPerfectDay).length;
        const partial = gradeYearEntries.filter(e => !e.isPerfectDay && e.completedSubjects.length > 0).length;
        const inactive = gradeYearEntries.filter(e => e.completedSubjects.length === 0).length;

        setGradeYearStats({
            perfectDays: perfect,
            partialDays: partial,
            inactiveDays: inactive
        });
    };

    const handleDateSelect = (date: Date) => {
        setSelectedDate(date);
    };

    const handleMonthChange = (direction: 'prev' | 'next') => {
        const newMonth = new Date(currentMonth);
        if (direction === 'prev') {
            newMonth.setMonth(newMonth.getMonth() - 1);
        } else {
            newMonth.setMonth(newMonth.getMonth() + 1);
        }
        setCurrentMonth(newMonth);
    };

    const handleSubjectToggle = async (subject: string) => {
        // This will be implemented to update Firestore
        // For now, just refresh the data
        await fetchDailyCompletions();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-400"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Streak */}
            <motion.div
                className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/30 dark:to-yellow-950/30 p-6 rounded-3xl border border-orange-100 dark:border-orange-900/30"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
            >
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <Flame className="text-orange-400" size={32} fill="currentColor" />
                        <div>
                            <h2 className="font-serif italic text-2xl text-theme-text">Consistency Tracker</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Build your learning streak</p>
                        </div>
                    </div>
                    <StreakDisplay current={currentStreak} longest={longestStreak} />
                </div>
            </motion.div>

            {/* Grade Year Stats */}
            <motion.div
                className="grid grid-cols-3 gap-4"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.1 }}
            >
                <StatCard
                    label="Perfect Days"
                    value={gradeYearStats.perfectDays}
                    color="green"
                    icon="🟢"
                />
                <StatCard
                    label="Partial Days"
                    value={gradeYearStats.partialDays}
                    color="blue"
                    icon="🔵"
                />
                <StatCard
                    label="Inactive Days"
                    value={gradeYearStats.inactiveDays}
                    color="gray"
                    icon="⚪"
                />
            </motion.div>

            {/* Calendar and Detail Pane */}
            <motion.div
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.2 }}
            >
                {/* Calendar */}
                <div className="lg:col-span-2">
                    <ConsistencyCalendar
                        currentMonth={currentMonth}
                        dailyCompletions={dailyCompletions}
                        selectedDate={selectedDate}
                        onDateSelect={handleDateSelect}
                        onMonthChange={handleMonthChange}
                    />
                </div>

                {/* Detail Pane */}
                <div className="lg:col-span-1">
                    <DailyDetailPane
                        selectedDate={selectedDate}
                        dailyCompletions={dailyCompletions}
                        onSubjectToggle={handleSubjectToggle}
                        onRefresh={fetchDailyCompletions}
                    />
                </div>
            </motion.div>

            {/* Info Note */}
            <motion.div
                className="bg-blue-50/50 dark:bg-blue-950/30 backdrop-blur-xl p-4 rounded-2xl border border-blue-200 dark:border-blue-900/30"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.3 }}
            >
                <div className="flex items-start gap-3">
                    <AlertCircle size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-xs font-bold text-blue-800 dark:text-blue-300 mb-1">How Streaks Work</p>
                        <p className="text-xs text-blue-700 dark:text-blue-200">
                            Your streak only increases when you complete ALL 6 subjects in a day (Perfect Day 🟢).
                            Partial days (🔵) show your effort but don't break your streak!
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// Helper Component
function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
    const colorClasses = {
        green: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900/30',
        blue: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/30',
        gray: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    };

    return (
        <div className={`${colorClasses[color]} p-4 rounded-2xl border text-center`}>
            <div className="text-3xl mb-2">{icon}</div>
            <div className="text-2xl font-black text-gray-800 dark:text-gray-200">{value}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">{label}</div>
        </div>
    );
}
