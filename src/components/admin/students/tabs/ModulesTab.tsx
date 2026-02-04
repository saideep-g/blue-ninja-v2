// @ts-nocheck
import React, { useState } from 'react';
import { Calendar, CheckCircle, Circle, Clock, Star } from 'lucide-react';
import { moduleService } from '../../../../services/admin/moduleService';
import { getModulesForSubject } from '../../../../data/mockCurriculum';
import { isRecentModule } from '../../../../types/admin/modules';
import type { StudentProfileUpdateData } from '../../../../types/admin/student';
import type { ModuleConfig } from '../../../../types/admin/modules';

interface ModulesTabProps {
    studentId: string;
    grade: number;
    enrolledSubjects: string[];
    enabledModules: { [subject: string]: { [moduleId: string]: ModuleConfig } };
    onRefresh: () => void;
}

export default function ModulesTab({
    studentId,
    grade,
    enrolledSubjects,
    enabledModules,
    onRefresh
}: ModulesTabProps) {
    const [selectedSubject, setSelectedSubject] = useState<string>(enrolledSubjects[0] || 'math');
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Get modules for selected subject
    const modules = getModulesForSubject(selectedSubject, grade);
    const subjectModules = enabledModules[selectedSubject] || {};

    const handleToggleModule = async (moduleId: string, currentlyEnabled: boolean) => {
        try {
            setUpdating(true);
            setError(null);

            const today = new Date().toISOString().split('T')[0];

            await moduleService.updateModule(studentId, {
                subject: selectedSubject,
                moduleId,
                enabled: !currentlyEnabled,
                enabledDate: !currentlyEnabled ? today : ''
            });

            onRefresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update module');
            console.error('Error toggling module:', err);
        } finally {
            setUpdating(false);
        }
    };

    const handleScheduleModule = async (moduleId: string, scheduledDate: string) => {
        try {
            setUpdating(true);
            setError(null);

            await moduleService.updateModule(studentId, {
                subject: selectedSubject,
                moduleId,
                enabled: false,
                scheduledDate
            });

            onRefresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to schedule module');
            console.error('Error scheduling module:', err);
        } finally {
            setUpdating(false);
        }
    };

    const handleEnableUpTo = async (moduleId: string) => {
        try {
            setUpdating(true);
            setError(null);

            const moduleIds = modules.map(m => m.id);
            await moduleService.enableModulesUpTo(studentId, selectedSubject, moduleId, moduleIds);

            onRefresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to enable modules');
            console.error('Error enabling modules:', err);
        } finally {
            setUpdating(false);
        }
    };

    if (enrolledSubjects.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">
                    No subjects enrolled. Please enroll subjects in the Subjects tab first.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
                    Chapter Management
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Enable chapters as they are taught in school. Recently enabled chapters (last 15 days) get 2x practice questions.
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 rounded-xl">
                    <p className="text-red-700 dark:text-red-300 text-sm font-bold">❌ {error}</p>
                </div>
            )}

            {/* Subject Selector */}
            <div className="flex gap-2 flex-wrap">
                {enrolledSubjects.map((subject) => (
                    <button
                        key={subject}
                        onClick={() => setSelectedSubject(subject)}
                        className={`
                            px-4 py-2 rounded-xl font-bold text-sm transition-all
                            ${selectedSubject === subject
                                ? 'bg-pink-500 text-white shadow-md'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }
                        `}
                    >
                        {subject.charAt(0).toUpperCase() + subject.slice(1)}
                    </button>
                ))}
            </div>

            {/* Bulk Actions */}
            <div className="flex gap-3 flex-wrap">
                <button
                    onClick={() => modules.length > 0 && handleEnableUpTo(modules[modules.length - 1].id)}
                    disabled={updating || modules.length === 0}
                    className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Enable All Chapters
                </button>
            </div>

            {/* Chapter List */}
            <div className="space-y-3">
                {modules.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-xl">
                        <p className="text-gray-600 dark:text-gray-400">
                            No chapters available for {selectedSubject} Grade {grade}
                        </p>
                    </div>
                ) : (
                    modules.map((module) => {
                        const config = subjectModules[module.id];
                        const isEnabled = config?.enabled || false;
                        const enabledDate = config?.enabledDate || '';
                        const scheduledDate = config?.scheduledDate || '';
                        const isRecent = isEnabled && enabledDate && isRecentModule(enabledDate);

                        return (
                            <div
                                key={module.id}
                                className={`
                                    p-4 rounded-xl border-2 transition-all
                                    ${isEnabled
                                        ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900/30'
                                        : scheduledDate
                                            ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/30'
                                            : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                                    }
                                `}
                            >
                                <div className="flex items-start gap-4">
                                    {/* Checkbox */}
                                    <button
                                        onClick={() => handleToggleModule(module.id, isEnabled)}
                                        disabled={updating}
                                        className="flex-shrink-0 mt-1"
                                    >
                                        {isEnabled ? (
                                            <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
                                        ) : (
                                            <Circle className="text-gray-400 dark:text-gray-500" size={24} />
                                        )}
                                    </button>

                                    {/* Module Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className={`font-bold ${isEnabled ? 'text-green-700 dark:text-green-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                                {module.name}
                                            </h4>
                                            {isRecent && (
                                                <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full text-xs font-bold">
                                                    <Star size={12} fill="currentColor" />
                                                    Recent - 2x Practice
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                            {module.description}
                                        </p>

                                        {/* Status */}
                                        {isEnabled && enabledDate && (
                                            <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                                                <Calendar size={14} />
                                                Enabled on: {new Date(enabledDate).toLocaleDateString()}
                                            </div>
                                        )}

                                        {scheduledDate && !isEnabled && (
                                            <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                                                <Clock size={14} />
                                                Scheduled for: {new Date(scheduledDate).toLocaleDateString()}
                                            </div>
                                        )}

                                        {/* Schedule Input */}
                                        {!isEnabled && !scheduledDate && (
                                            <div className="mt-2 flex items-center gap-2">
                                                <input
                                                    type="date"
                                                    min={new Date().toISOString().split('T')[0]}
                                                    onChange={(e) => e.target.value && handleScheduleModule(module.id, e.target.value)}
                                                    disabled={updating}
                                                    className="px-3 py-1 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-xs text-gray-800 dark:text-gray-200"
                                                />
                                                <span className="text-xs text-gray-500 dark:text-gray-400">Schedule for later</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Enable Up To Button */}
                                    {!isEnabled && (
                                        <button
                                            onClick={() => handleEnableUpTo(module.id)}
                                            disabled={updating}
                                            className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
                                        >
                                            Enable up to here
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Info Note */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/30 rounded-xl">
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    <span className="font-bold">💡 Tip:</span> Enable chapters as they are taught in school.
                    Chapters enabled in the last 15 days automatically get 2x more questions for better revision.
                </p>
            </div>
        </div>
    );
}
