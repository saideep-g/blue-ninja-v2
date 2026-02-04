// @ts-nocheck
import React from 'react';
import { ALL_SUBJECTS, CURRICULUM_SUBJECTS, SUPPLEMENTAL_SUBJECTS } from '../../../../types/admin/student';
import type { StudentProfileUpdateData } from '../../../../types/admin/student';

interface SubjectsTabProps {
    formData: StudentProfileUpdateData;
    onChange: (updates: StudentProfileUpdateData) => void;
}

export default function SubjectsTab({ formData, onChange }: SubjectsTabProps) {
    const enrolledSubjects = formData.enrolledSubjects || [];

    const toggleSubject = (subjectId: string) => {
        const isEnrolled = enrolledSubjects.includes(subjectId);
        const updated = isEnrolled
            ? enrolledSubjects.filter(id => id !== subjectId)
            : [...enrolledSubjects, subjectId];

        onChange({ enrolledSubjects: updated });
    };

    const isSubjectEnrolled = (subjectId: string) => {
        return enrolledSubjects.includes(subjectId);
    };

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
                    Subject Enrollment
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Select the subjects this student will practice. Curriculum subjects are based on their grade level.
                </p>
            </div>

            {/* Curriculum Subjects */}
            <div>
                <h4 className="text-md font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-pink-500 rounded-full"></span>
                    Curriculum Subjects
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {CURRICULUM_SUBJECTS.map((subject) => {
                        const isEnrolled = isSubjectEnrolled(subject.id);

                        return (
                            <button
                                key={subject.id}
                                onClick={() => toggleSubject(subject.id)}
                                className={`
                                    flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left
                                    ${isEnrolled
                                        ? 'bg-pink-50 dark:bg-pink-950/30 border-pink-500'
                                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-pink-300 dark:hover:border-pink-700'
                                    }
                                `}
                            >
                                {/* Checkbox */}
                                <div className={`
                                    w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all
                                    ${isEnrolled
                                        ? 'bg-pink-500 border-pink-500'
                                        : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500'
                                    }
                                `}>
                                    {isEnrolled && (
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>

                                {/* Subject Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{subject.icon}</span>
                                        <span className={`font-bold ${isEnrolled ? 'text-pink-600 dark:text-pink-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                            {subject.name}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Supplemental Subjects */}
            <div>
                <h4 className="text-md font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
                    Supplemental Subjects
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                    Optional subjects to enhance learning beyond the core curriculum
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {SUPPLEMENTAL_SUBJECTS.map((subject) => {
                        const isEnrolled = isSubjectEnrolled(subject.id);

                        return (
                            <button
                                key={subject.id}
                                onClick={() => toggleSubject(subject.id)}
                                className={`
                                    flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left
                                    ${isEnrolled
                                        ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-500'
                                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-700'
                                    }
                                `}
                            >
                                {/* Checkbox */}
                                <div className={`
                                    w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0
                                    ${isEnrolled
                                        ? 'bg-purple-500 border-purple-500'
                                        : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500'
                                    }
                                `}>
                                    {isEnrolled && (
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>

                                {/* Subject Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">{subject.icon}</span>
                                        <span className={`font-bold text-sm ${isEnrolled ? 'text-purple-600 dark:text-purple-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                            {subject.name}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Summary */}
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-bold">{enrolledSubjects.length}</span> subject{enrolledSubjects.length !== 1 ? 's' : ''} selected
                </p>
            </div>
        </div>
    );
}
