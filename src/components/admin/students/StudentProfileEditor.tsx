// @ts-nocheck
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Save, User, BookOpen, Settings, X, Layers, TrendingUp, Target } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStudentWithMetrics } from '../../../hooks/admin/useStudents';
import { studentService } from '../../../services/admin/studentService';
import BasicInfoTab from './tabs/BasicInfoTab';
import SubjectsTab from './tabs/SubjectsTab';
import PracticeSettingsTab from './tabs/PracticeSettingsTab';
import ModulesTab from './tabs/ModulesTab';
import BoostPeriodsTab from './tabs/BoostPeriodsTab';
import ExamModeTab from './tabs/ExamModeTab';
import type { StudentProfileUpdateData } from '../../../types/admin/student';

type TabId = 'basic' | 'subjects' | 'practice' | 'modules' | 'boost' | 'exam';

interface Tab {
    id: TabId;
    label: string;
    icon: React.ElementType;
}

const TABS: Tab[] = [
    { id: 'basic', label: 'Basic Info', icon: User },
    { id: 'subjects', label: 'Subjects', icon: BookOpen },
    { id: 'practice', label: 'Practice', icon: Settings },
    { id: 'modules', label: 'Chapters', icon: Layers },
    { id: 'boost', label: 'Boost Periods', icon: TrendingUp },
    { id: 'exam', label: 'Exam Mode', icon: Target }
];

export default function StudentProfileEditor() {
    const { studentId } = useParams<{ studentId: string }>();
    const navigate = useNavigate();
    const { student, loading, error, refetch } = useStudentWithMetrics(studentId);

    const [activeTab, setActiveTab] = useState<TabId>('basic');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Local state for form data
    const [formData, setFormData] = useState<StudentProfileUpdateData>({});

    // Update form data when student loads
    React.useEffect(() => {
        if (student) {
            setFormData({
                grade: student.grade,
                curriculum: student.curriculum,
                preferredLayout: student.preferredLayout,
                enrolledSubjects: student.enrolledSubjects,
                dailyQuestionConfig: student.dailyQuestionConfig
            });
        }
    }, [student]);

    const handleSave = async () => {
        if (!studentId) return;

        try {
            setSaving(true);
            setSaveError(null);
            setSaveSuccess(false);

            await studentService.updateStudentProfile(studentId, formData);

            setSaveSuccess(true);
            await refetch();

            // Hide success message after 3 seconds
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Failed to save');
            console.error('Error saving profile:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        navigate('/admin/students');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-theme-bg p-4 md:p-8">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-400"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !student) {
        return (
            <div className="min-h-screen bg-theme-bg p-4 md:p-8">
                <div className="max-w-5xl mx-auto">
                    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 rounded-2xl p-6 text-center">
                        <p className="text-red-600 dark:text-red-400 font-bold">Error loading student</p>
                        <p className="text-red-500 dark:text-red-500 text-sm mt-2">{error || 'Student not found'}</p>
                        <button
                            onClick={() => navigate('/admin/students')}
                            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700"
                        >
                            Back to Students
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-theme-bg text-theme-text p-4 md:p-8 transition-colors duration-300">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/admin/students')}
                        className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-pink-400 transition-colors mb-6"
                    >
                        <ChevronLeft size={16} /> Back to Students
                    </button>

                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white shadow-lg">
                                <User size={32} />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-serif italic text-theme-text">
                                    {student.studentName}
                                </h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    Grade {student.grade} • {student.curriculum}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleCancel}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                <X size={18} />
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-xl text-sm font-bold hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save size={18} />
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Success/Error Messages */}
                {saveSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/30 rounded-2xl"
                    >
                        <p className="text-green-700 dark:text-green-300 font-bold text-sm">
                            ✅ Changes saved successfully!
                        </p>
                    </motion.div>
                )}

                {saveError && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 rounded-2xl"
                    >
                        <p className="text-red-700 dark:text-red-300 font-bold text-sm">
                            ❌ {saveError}
                        </p>
                    </motion.div>
                )}

                {/* Tabs */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden">
                    {/* Tab Headers */}
                    <div className="flex border-b border-gray-200 dark:border-gray-700">
                        {TABS.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                                        flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-bold transition-all
                                        ${isActive
                                            ? 'bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400 border-b-2 border-pink-500'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }
                                    `}
                                >
                                    <Icon size={18} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Tab Content */}
                    <div className="p-6 md:p-8">
                        {activeTab === 'basic' && (
                            <BasicInfoTab
                                formData={formData}
                                onChange={(updates) => setFormData({ ...formData, ...updates })}
                            />
                        )}
                        {activeTab === 'subjects' && (
                            <SubjectsTab
                                formData={formData}
                                onChange={(updates) => setFormData({ ...formData, ...updates })}
                            />
                        )}
                        {activeTab === 'practice' && (
                            <PracticeSettingsTab
                                formData={formData}
                                onChange={(updates) => setFormData({ ...formData, ...updates })}
                            />
                        )}
                        {activeTab === 'modules' && studentId && (
                            <ModulesTab
                                studentId={studentId}
                                grade={student.grade}
                                enrolledSubjects={student.enrolledSubjects || []}
                                enabledModules={student.enabledModules || {}}
                                onRefresh={refetch}
                            />
                        )}
                        {activeTab === 'boost' && studentId && (
                            <BoostPeriodsTab
                                studentId={studentId}
                                enrolledSubjects={student.enrolledSubjects || []}
                                boostPeriods={student.boostPeriods || []}
                                onRefresh={refetch}
                            />
                        )}
                        {activeTab === 'exam' && studentId && (
                            <ExamModeTab
                                studentId={studentId}
                                student={student}
                                onRefresh={refetch}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
