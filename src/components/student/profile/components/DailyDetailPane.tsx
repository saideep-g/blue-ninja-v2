// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, RefreshCw } from 'lucide-react';
import { useNinja } from '../../../../context/NinjaContext';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../services/db/firebase';

interface DailyCompletionEntry {
    date: string;
    completedSubjects: string[];
    totalSubjects: number;
    isPerfectDay: boolean;
    timestamp: any;
}

interface DailyDetailPaneProps {
    selectedDate: Date;
    dailyCompletions: DailyCompletionEntry[];
    onSubjectToggle: (subject: string) => void;
    onRefresh: () => void;
}

const SUBJECTS = [
    { id: 'math', name: 'Math', icon: '📐' },
    { id: 'science', name: 'Science', icon: '🔬' },
    { id: 'english', name: 'English', icon: '📚' },
    { id: 'social', name: 'Social', icon: '🏛️' },
    { id: 'geography', name: 'Geography', icon: '🌍' },
    { id: 'tables', name: 'Tables', icon: '✖️' }
];

export default function DailyDetailPane({
    selectedDate,
    dailyCompletions,
    onSubjectToggle,
    onRefresh
}: DailyDetailPaneProps) {
    const { user, ninjaStats } = useNinja();
    const [updating, setUpdating] = useState(false);
    const [localCompletedSubjects, setLocalCompletedSubjects] = useState<string[]>([]);

    const dateStr = selectedDate.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    const isToday = dateStr === today;
    const isPast = dateStr < today;
    const isFuture = dateStr > today;

    const completion = dailyCompletions.find(entry => entry.date === dateStr);
    const completedSubjects = completion?.completedSubjects || [];
    const completedCount = completedSubjects.length;
    const totalSubjects = 6;
    const isPerfect = completedCount === totalSubjects;

    useEffect(() => {
        setLocalCompletedSubjects(completedSubjects);
    }, [dateStr, JSON.stringify(completedSubjects)]);

    const handleToggleSubject = async (subjectId: string) => {
        if (!isToday || !user?.uid) return;

        setUpdating(true);

        try {
            const currentGrade = ninjaStats?.grade || 7;
            const completionRef = doc(db, 'students', user.uid, 'daily_completion', `grade_${currentGrade}`);

            // Get current document
            const completionSnap = await getDoc(completionRef);
            let entries: DailyCompletionEntry[] = [];

            if (completionSnap.exists()) {
                entries = completionSnap.data().entries || [];
            }

            // Find or create today's entry
            const todayIndex = entries.findIndex(e => e.date === dateStr);
            let newCompletedSubjects: string[];

            if (localCompletedSubjects.includes(subjectId)) {
                // Remove subject
                newCompletedSubjects = localCompletedSubjects.filter(s => s !== subjectId);
            } else {
                // Add subject
                newCompletedSubjects = [...localCompletedSubjects, subjectId];
            }

            const newEntry: DailyCompletionEntry = {
                date: dateStr,
                completedSubjects: newCompletedSubjects,
                totalSubjects: 6,
                isPerfectDay: newCompletedSubjects.length === 6,
                timestamp: serverTimestamp()
            };

            if (todayIndex >= 0) {
                // Update existing entry
                entries[todayIndex] = newEntry;
            } else {
                // Add new entry
                entries.push(newEntry);
            }

            // Save to Firestore
            await setDoc(completionRef, {
                grade: currentGrade,
                entries: entries
            }, { merge: true });

            // Update local state
            setLocalCompletedSubjects(newCompletedSubjects);

            // Refresh parent
            onRefresh();
        } catch (error) {
            console.error('Error toggling subject:', error);
        } finally {
            setUpdating(false);
        }
    };

    const getProgressPercentage = () => {
        return Math.round((completedCount / totalSubjects) * 100);
    };

    const getProgressColor = () => {
        if (isPerfect) return 'text-green-500';
        if (completedCount > 0) return 'text-blue-500';
        return 'text-gray-300';
    };

    return (
        <div className="bg-theme-card/60 backdrop-blur-xl p-6 rounded-3xl border border-theme-border shadow-lg h-full">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-serif italic text-xl text-theme-text">
                        {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </h3>
                    {isToday && (
                        <span className="px-3 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-full text-[10px] font-black uppercase tracking-wider">
                            Today
                        </span>
                    )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>

            {/* Progress Ring */}
            <div className="mb-6">
                <div className="relative w-32 h-32 mx-auto">
                    <svg className="transform -rotate-90 w-32 h-32">
                        <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            className="text-gray-100 dark:text-gray-700"
                        />
                        <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={`${2 * Math.PI * 56}`}
                            strokeDashoffset={`${2 * Math.PI * 56 * (1 - completedCount / totalSubjects)}`}
                            className={`${getProgressColor()} transition-all duration-500`}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-3xl font-black text-gray-800 dark:text-gray-200">
                            {completedCount}/{totalSubjects}
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Subjects
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Message */}
            {isFuture && (
                <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Future date - no data yet</p>
                </div>
            )}

            {!isFuture && (
                <>
                    {/* Subject List */}
                    <div className="space-y-2 mb-6">
                        {SUBJECTS.map((subject) => {
                            const isCompleted = localCompletedSubjects.includes(subject.id);

                            return (
                                <button
                                    key={subject.id}
                                    onClick={() => handleToggleSubject(subject.id)}
                                    disabled={!isToday || updating}
                                    className={`
                                        w-full flex items-center gap-3 p-3 rounded-xl transition-all
                                        ${isToday ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : 'cursor-default'}
                                        ${isCompleted ? 'bg-green-50 dark:bg-green-950/30 border-2 border-green-200 dark:border-green-900/30' : 'bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700'}
                                        ${updating ? 'opacity-50' : ''}
                                    `}
                                >
                                    <span className="text-2xl">{subject.icon}</span>
                                    <span className={`flex-1 text-left font-bold text-sm ${isCompleted ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-300'}`}>
                                        {subject.name}
                                    </span>
                                    {isCompleted ? (
                                        <CheckCircle size={20} className="text-green-500" />
                                    ) : (
                                        <Circle size={20} className="text-gray-300" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Status Badge */}
                    {isPerfect && (
                        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-2xl border border-green-200 dark:border-green-900/30 text-center">
                            <div className="text-2xl mb-1">🎉</div>
                            <p className="text-sm font-black text-green-700 dark:text-green-400">Perfect Day!</p>
                            <p className="text-xs text-green-600 dark:text-green-500">All subjects completed</p>
                        </div>
                    )}

                    {!isPerfect && completedCount > 0 && (
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-2xl border border-blue-200 dark:border-blue-900/30 text-center">
                            <div className="text-2xl mb-1">💪</div>
                            <p className="text-sm font-black text-blue-700 dark:text-blue-400">Good Progress!</p>
                            <p className="text-xs text-blue-600 dark:text-blue-500">{completedCount} of {totalSubjects} subjects done</p>
                        </div>
                    )}

                    {completedCount === 0 && isPast && (
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 text-center">
                            <div className="text-2xl mb-1">😴</div>
                            <p className="text-sm font-black text-gray-600 dark:text-gray-400">Inactive Day</p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">No subjects completed</p>
                        </div>
                    )}

                    {completedCount === 0 && isToday && (
                        <div className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 rounded-2xl border border-pink-200 dark:border-pink-900/30 text-center">
                            <div className="text-2xl mb-1">🚀</div>
                            <p className="text-sm font-black text-pink-700 dark:text-pink-400">Let's Start!</p>
                            <p className="text-xs text-pink-600 dark:text-pink-500">Mark subjects as you complete them</p>
                        </div>
                    )}
                </>
            )}

            {/* Refresh Button (for debugging) */}
            {isToday && (
                <button
                    onClick={onRefresh}
                    className="mt-4 w-full py-2 text-xs text-gray-500 hover:text-gray-700 flex items-center justify-center gap-2"
                >
                    <RefreshCw size={14} />
                    Refresh
                </button>
            )}
        </div>
    );
}
