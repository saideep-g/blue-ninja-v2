// @ts-nocheck
import React, { useState } from 'react';
import { Target, Calendar, Zap, TrendingUp, AlertCircle } from 'lucide-react';
import { studentService } from '../../../../services/admin/studentService';
import { getModulesForSubject } from '../../../../data/mockCurriculum';
import { calculateExamReadiness, getDifficultyMultiplier, calculateExamModeQuestions } from '../../../../types/admin/performance';
import type { StudentProfile } from '../../../../types/admin/student';

interface ExamModeTabProps {
    studentId: string;
    student: StudentProfile;
    onRefresh: () => void;
}

export default function ExamModeTab({ studentId, student, onRefresh }: ExamModeTabProps) {
    const examMode = student.examMode || {
        enabled: false,
        examName: '',
        startDate: '',
        endDate: '',
        focusTopics: {},
        questionMultiplier: 1.5,
        difficultyLevel: 'medium' as const
    };

    const [formData, setFormData] = useState(examMode);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);

            // Validation
            if (formData.enabled && (!formData.examName || !formData.startDate || !formData.endDate)) {
                setError('Please fill in all exam details');
                return;
            }

            if (formData.enabled && formData.startDate > formData.endDate) {
                setError('End date must be after start date');
                return;
            }

            await studentService.updateStudentProfile(studentId, {
                examMode: formData
            });

            onRefresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save exam mode');
            console.error('Error saving exam mode:', err);
        } finally {
            setSaving(false);
        }
    };

    const toggleSubjectModule = (subject: string, moduleId: string) => {
        const currentTopics = formData.focusTopics[subject] || [];
        const updated = currentTopics.includes(moduleId)
            ? currentTopics.filter(id => id !== moduleId)
            : [...currentTopics, moduleId];

        setFormData({
            ...formData,
            focusTopics: {
                ...formData.focusTopics,
                [subject]: updated
            }
        });
    };

    const totalFocusTopics = Object.values(formData.focusTopics).reduce((sum, topics) => sum + topics.length, 0);
    const baseQuestions = student.dailyQuestionConfig?.weekday || 20;
    const difficultyMultiplier = getDifficultyMultiplier(formData.difficultyLevel);
    const totalQuestions = calculateExamModeQuestions(baseQuestions, formData.questionMultiplier, difficultyMultiplier);

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
                    Exam Mode Configuration
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Activate exam mode to increase practice intensity and focus on specific topics before exams.
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 rounded-xl">
                    <p className="text-red-700 dark:text-red-300 text-sm font-bold">❌ {error}</p>
                </div>
            )}

            {/* Enable Toggle */}
            <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border-2 border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                            <Target className="text-red-600 dark:text-red-400" size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800 dark:text-gray-200">Enable Exam Mode</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Boost practice for upcoming exams</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setFormData({ ...formData, enabled: !formData.enabled })}
                        className={`
                            relative w-16 h-8 rounded-full transition-colors
                            ${formData.enabled ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}
                        `}
                    >
                        <div className={`
                            absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform
                            ${formData.enabled ? 'translate-x-9' : 'translate-x-1'}
                        `} />
                    </button>
                </div>
            </div>

            {/* Exam Details */}
            {formData.enabled && (
                <>
                    {/* Exam Name & Dates */}
                    <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border-2 border-gray-200 dark:border-gray-600 space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                Exam Name
                            </label>
                            <input
                                type="text"
                                value={formData.examName}
                                onChange={(e) => setFormData({ ...formData, examName: e.target.value })}
                                placeholder="e.g., Mid-Term Exams - March 2026"
                                className="w-full px-4 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-xl text-gray-800 dark:text-gray-200"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    className="w-full px-4 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-xl text-gray-800 dark:text-gray-200"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    className="w-full px-4 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-xl text-gray-800 dark:text-gray-200"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Focus Topics */}
                    <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border-2 border-gray-200 dark:border-gray-600">
                        <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-4">Focus Topics</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                            Select chapters to focus on during exam preparation
                        </p>

                        <div className="space-y-4">
                            {student.enrolledSubjects?.map((subject) => {
                                const modules = getModulesForSubject(subject, student.grade);
                                const selectedModules = formData.focusTopics[subject] || [];

                                return (
                                    <div key={subject} className="border border-gray-200 dark:border-gray-600 rounded-xl p-4">
                                        <h5 className="font-bold text-gray-700 dark:text-gray-300 mb-3 capitalize">
                                            {subject} ({selectedModules.length} selected)
                                        </h5>
                                        <div className="space-y-2">
                                            {modules.map((module) => {
                                                const isSelected = selectedModules.includes(module.id);
                                                return (
                                                    <button
                                                        key={module.id}
                                                        onClick={() => toggleSubjectModule(subject, module.id)}
                                                        className={`
                                                            w-full text-left px-3 py-2 rounded-lg text-sm transition-all
                                                            ${isSelected
                                                                ? 'bg-red-50 dark:bg-red-950/30 border border-red-500 text-red-700 dark:text-red-400'
                                                                : 'bg-gray-50 dark:bg-gray-600 border border-gray-200 dark:border-gray-500 text-gray-700 dark:text-gray-300 hover:border-red-300 dark:hover:border-red-700'
                                                            }
                                                        `}
                                                    >
                                                        {module.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Question Settings */}
                    <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border-2 border-gray-200 dark:border-gray-600 space-y-4">
                        <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-4">Question Settings</h4>

                        {/* Difficulty */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                Difficulty Level
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {(['medium', 'hard'] as const).map((level) => (
                                    <button
                                        key={level}
                                        onClick={() => setFormData({ ...formData, difficultyLevel: level })}
                                        className={`
                                            px-4 py-3 rounded-xl font-bold text-sm transition-all
                                            ${formData.difficultyLevel === level
                                                ? 'bg-red-500 text-white'
                                                : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500'
                                            }
                                        `}
                                    >
                                        {level.charAt(0).toUpperCase() + level.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Question Multiplier */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                Question Multiplier: {formData.questionMultiplier}x
                            </label>
                            <input
                                type="range"
                                min="1"
                                max="2"
                                step="0.1"
                                value={formData.questionMultiplier}
                                onChange={(e) => setFormData({ ...formData, questionMultiplier: parseFloat(e.target.value) })}
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
                                <span>1x (Normal)</span>
                                <span>2x (Double)</span>
                            </div>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 p-6 rounded-xl border border-red-200 dark:border-red-900/30">
                        <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                            <Zap className="text-red-600 dark:text-red-400" size={20} />
                            Exam Mode Summary
                        </h4>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <div className="text-2xl font-black text-red-600 dark:text-red-400">
                                    {totalFocusTopics}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Focus Topics</div>
                            </div>
                            <div>
                                <div className="text-2xl font-black text-orange-600 dark:text-orange-400">
                                    {totalQuestions}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Questions/Day</div>
                            </div>
                            <div>
                                <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                                    {formData.difficultyLevel === 'hard' ? 'Hard' : 'Medium'}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Difficulty</div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Save Button */}
            <div className="flex gap-3">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 px-6 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Save Exam Mode Settings'}
                </button>
            </div>

            {/* Info Note */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/30 rounded-xl">
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    <span className="font-bold">💡 Tip:</span> Exam mode automatically increases practice intensity and focuses on selected topics.
                    It will be active during the specified date range and can be toggled on/off anytime.
                </p>
            </div>
        </div>
    );
}
