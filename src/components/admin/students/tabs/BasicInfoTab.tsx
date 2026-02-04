// @ts-nocheck
import React from 'react';
import { GRADE_OPTIONS, CURRICULUM_OPTIONS, LAYOUT_OPTIONS } from '../../../../types/admin/student';
import type { StudentProfileUpdateData } from '../../../../types/admin/student';

interface BasicInfoTabProps {
    formData: StudentProfileUpdateData;
    onChange: (updates: StudentProfileUpdateData) => void;
}

export default function BasicInfoTab({ formData, onChange }: BasicInfoTabProps) {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
                    Basic Information
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Configure the student's grade level, curriculum, and interface preference.
                </p>
            </div>

            {/* Grade Selection */}
            <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Grade Level
                </label>
                <select
                    value={formData.grade || 7}
                    onChange={(e) => onChange({ grade: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-gray-800 dark:text-gray-200 font-medium focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all"
                >
                    {GRADE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Select the current grade level for this student
                </p>
            </div>

            {/* Curriculum Selection */}
            <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Curriculum
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {CURRICULUM_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => onChange({ curriculum: option.value })}
                            className={`
                                p-4 rounded-xl border-2 font-bold text-sm transition-all
                                ${formData.curriculum === option.value
                                    ? 'bg-pink-50 dark:bg-pink-950/30 border-pink-500 text-pink-600 dark:text-pink-400'
                                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-pink-300 dark:hover:border-pink-700'
                                }
                            `}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Choose the curriculum board for this student
                </p>
            </div>

            {/* Layout Preference */}
            <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Interface Layout
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {LAYOUT_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => onChange({ preferredLayout: option.value })}
                            className={`
                                p-5 rounded-xl border-2 text-left transition-all
                                ${formData.preferredLayout === option.value
                                    ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-500'
                                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-700'
                                }
                            `}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl">{option.icon}</span>
                                <span className={`font-bold ${formData.preferredLayout === option.value ? 'text-purple-600 dark:text-purple-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                    {option.label}
                                </span>
                            </div>
                            <p className={`text-xs ${formData.preferredLayout === option.value ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                {option.description}
                            </p>
                        </button>
                    ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Choose the interface style that best suits the student's learning preference
                </p>
            </div>

            {/* Info Note */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/30 rounded-xl">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                    <span className="font-bold">Note:</span> Name and email cannot be changed as they are linked to the student's authentication account.
                </p>
            </div>
        </div>
    );
}
