// @ts-nocheck
import React from 'react';
import { Calendar, TrendingUp, Award, Clock } from 'lucide-react';
import type { StudentProfile } from '../../../../types/admin/student';

interface GradeHistoryTabProps {
    student: StudentProfile;
}

export default function GradeHistoryTab({ student }: GradeHistoryTabProps) {
    // Mock grade history - in production, this would come from Firestore
    const gradeHistory = [
        {
            grade: 6,
            academicYear: '2024-2025',
            startDate: '2024-04-01',
            endDate: '2025-03-31',
            totalQuestions: 2847,
            totalCorrect: 2335,
            overallAccuracy: 82,
            totalTimeSpent: 1425,
            subjectStats: {
                math: { questionsAnswered: 856, correctAnswers: 728, accuracy: 85, timeSpent: 428, masteryLevel: 78 },
                science: { questionsAnswered: 743, correctAnswers: 587, accuracy: 79, timeSpent: 371, masteryLevel: 72 },
                english: { questionsAnswered: 672, correctAnswers: 564, accuracy: 84, timeSpent: 336, masteryLevel: 80 },
                social: { questionsAnswered: 576, correctAnswers: 456, accuracy: 79, timeSpent: 290, masteryLevel: 75 }
            }
        },
        {
            grade: 5,
            academicYear: '2023-2024',
            startDate: '2023-04-01',
            endDate: '2024-03-31',
            totalQuestions: 1923,
            totalCorrect: 1500,
            overallAccuracy: 78,
            totalTimeSpent: 965,
            subjectStats: {
                math: { questionsAnswered: 612, correctAnswers: 478, accuracy: 78, timeSpent: 306, masteryLevel: 72 },
                science: { questionsAnswered: 534, correctAnswers: 420, accuracy: 79, timeSpent: 267, masteryLevel: 70 }
            }
        }
    ];

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
                    Grade History
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    View past performance across different grades. Data is archived when students are promoted.
                </p>
            </div>

            {/* Current Grade Info */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-6 rounded-xl border border-blue-200 dark:border-blue-900/30">
                <div className="flex items-center gap-3 mb-2">
                    <Award className="text-blue-600 dark:text-blue-400" size={24} />
                    <h4 className="font-bold text-gray-800 dark:text-gray-200">Current Grade</h4>
                </div>
                <div className="text-3xl font-black text-blue-600 dark:text-blue-400">
                    Grade {student.grade}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    Academic Year: 2025-2026 • {student.curriculum}
                </p>
            </div>

            {/* Grade History List */}
            {gradeHistory.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <Calendar size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                        No grade history available yet
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        History will be saved when the student is promoted to the next grade
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {gradeHistory.map((entry) => (
                        <div
                            key={entry.grade}
                            className="bg-white dark:bg-gray-700 p-6 rounded-xl border-2 border-gray-200 dark:border-gray-600"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h4 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                                        Grade {entry.grade}
                                    </h4>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                        {entry.academicYear}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-black text-green-600 dark:text-green-400">
                                        {entry.overallAccuracy}%
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">Overall Accuracy</p>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="text-center p-3 bg-gray-50 dark:bg-gray-600 rounded-lg">
                                    <div className="text-lg font-black text-gray-800 dark:text-gray-200">
                                        {entry.totalQuestions}
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">Questions</div>
                                </div>
                                <div className="text-center p-3 bg-gray-50 dark:bg-gray-600 rounded-lg">
                                    <div className="text-lg font-black text-gray-800 dark:text-gray-200">
                                        {entry.totalCorrect}
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">Correct</div>
                                </div>
                                <div className="text-center p-3 bg-gray-50 dark:bg-gray-600 rounded-lg">
                                    <div className="text-lg font-black text-gray-800 dark:text-gray-200">
                                        {Math.round(entry.totalTimeSpent / 60)}h
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">Time Spent</div>
                                </div>
                            </div>

                            {/* Subject Breakdown */}
                            <div>
                                <h5 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                                    Subject Performance
                                </h5>
                                <div className="grid grid-cols-2 gap-3">
                                    {Object.entries(entry.subjectStats).map(([subject, stats]) => (
                                        <div
                                            key={subject}
                                            className="p-3 bg-gray-50 dark:bg-gray-600 rounded-lg"
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 capitalize">
                                                    {subject}
                                                </span>
                                                <span className="text-sm font-black text-gray-800 dark:text-gray-200">
                                                    {stats.accuracy}%
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-600 dark:text-gray-400">
                                                {stats.questionsAnswered} questions • Mastery: {stats.masteryLevel}%
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Info Note */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/30 rounded-xl">
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    <span className="font-bold">💡 Note:</span> Grade history is automatically saved when a student is promoted to the next grade.
                    All practice data is preserved and can be viewed here for reference.
                </p>
            </div>
        </div>
    );
}
