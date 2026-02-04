// @ts-nocheck
import React from 'react';
import { Calendar, Sun, Sparkles } from 'lucide-react';
import type { StudentProfileUpdateData } from '../../../../types/admin/student';

interface PracticeSettingsTabProps {
    formData: StudentProfileUpdateData;
    onChange: (updates: StudentProfileUpdateData) => void;
}

export default function PracticeSettingsTab({ formData, onChange }: PracticeSettingsTabProps) {
    const config = formData.dailyQuestionConfig || {
        weekday: 20,
        weekend: 25,
        holiday: 30
    };

    const updateConfig = (field: 'weekday' | 'weekend' | 'holiday', value: number) => {
        onChange({
            dailyQuestionConfig: {
                ...config,
                [field]: value
            }
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
                    Daily Practice Settings
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Configure how many questions the student should practice each day based on the day type.
                </p>
            </div>

            {/* Weekday Questions */}
            <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border-2 border-gray-200 dark:border-gray-600">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Calendar className="text-blue-600 dark:text-blue-400" size={24} />
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Regular Days (Monday - Friday)
                        </label>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                            Questions to practice on school days
                        </p>
                        <div className="flex items-center gap-4">
                            <input
                                type="number"
                                min="5"
                                max="100"
                                value={config.weekday}
                                onChange={(e) => updateConfig('weekday', parseInt(e.target.value) || 20)}
                                className="w-24 px-4 py-2 bg-white dark:bg-gray-600 border-2 border-gray-200 dark:border-gray-500 rounded-xl text-gray-800 dark:text-gray-200 font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400">questions per day</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Weekend Questions */}
            <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border-2 border-gray-200 dark:border-gray-600">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Sun className="text-orange-600 dark:text-orange-400" size={24} />
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Weekends (Saturday - Sunday)
                        </label>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                            Questions to practice on weekends
                        </p>
                        <div className="flex items-center gap-4">
                            <input
                                type="number"
                                min="5"
                                max="100"
                                value={config.weekend}
                                onChange={(e) => updateConfig('weekend', parseInt(e.target.value) || 25)}
                                className="w-24 px-4 py-2 bg-white dark:bg-gray-600 border-2 border-gray-200 dark:border-gray-500 rounded-xl text-gray-800 dark:text-gray-200 font-bold text-center focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400">questions per day</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Holiday Questions */}
            <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border-2 border-gray-200 dark:border-gray-600">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Sparkles className="text-purple-600 dark:text-purple-400" size={24} />
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Holidays & Breaks
                        </label>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                            Questions to practice during school holidays
                        </p>
                        <div className="flex items-center gap-4">
                            <input
                                type="number"
                                min="5"
                                max="100"
                                value={config.holiday}
                                onChange={(e) => updateConfig('holiday', parseInt(e.target.value) || 30)}
                                className="w-24 px-4 py-2 bg-white dark:bg-gray-600 border-2 border-gray-200 dark:border-gray-500 rounded-xl text-gray-800 dark:text-gray-200 font-bold text-center focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400">questions per day</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Info Note */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/30 rounded-xl">
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    <span className="font-bold">Tip:</span> These are daily targets. The system will automatically adjust based on the student's performance and available time. You can configure boost periods and exam mode in Phase 2 for more advanced scheduling.
                </p>
            </div>

            {/* Summary */}
            <div className="mt-6 p-5 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 rounded-xl border border-pink-200 dark:border-pink-900/30">
                <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-3">Weekly Practice Estimate</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                            {config.weekday * 5}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Weekdays</div>
                    </div>
                    <div>
                        <div className="text-2xl font-black text-orange-600 dark:text-orange-400">
                            {config.weekend * 2}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Weekends</div>
                    </div>
                    <div>
                        <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                            {(config.weekday * 5) + (config.weekend * 2)}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Total/Week</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
