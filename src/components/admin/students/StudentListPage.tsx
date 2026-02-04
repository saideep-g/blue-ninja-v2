// @ts-nocheck
import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Users, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStudents } from '../../../hooks/admin/useStudents';
import StudentCard from './StudentCard';

export default function StudentListPage() {
    const navigate = useNavigate();
    const { students, loading, error } = useStudents();

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-theme-bg p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-400"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-theme-bg p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 rounded-2xl p-6 text-center">
                        <p className="text-red-600 dark:text-red-400 font-bold">Error loading students</p>
                        <p className="text-red-500 dark:text-red-500 text-sm mt-2">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-theme-bg text-theme-text p-4 md:p-8 transition-colors duration-300">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/admin')}
                        className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-pink-400 transition-colors mb-6"
                    >
                        <ChevronLeft size={16} /> Back to Dashboard
                    </button>

                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                <Users size={32} />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-serif italic text-theme-text">
                                    Manage Students
                                </h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    Configure learning settings for each student
                                </p>
                            </div>
                        </div>

                        {/* Add Student Button (Disabled - students self-register) */}
                        <button
                            disabled
                            className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded-xl text-sm font-bold cursor-not-allowed"
                            title="Students self-register via Google/Email sign-in"
                        >
                            <Plus size={18} />
                            Add Student
                        </button>
                    </div>
                </div>

                {/* Student Count */}
                <div className="mb-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-bold text-gray-800 dark:text-gray-200">{students.length}</span> student{students.length !== 1 ? 's' : ''} registered
                    </p>
                </div>

                {/* Student Grid */}
                {students.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
                        <Users size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <h3 className="text-xl font-bold text-gray-600 dark:text-gray-400 mb-2">
                            No Students Yet
                        </h3>
                        <p className="text-gray-500 dark:text-gray-500 text-sm">
                            Students will appear here after they register via Google or Email sign-in
                        </p>
                    </div>
                ) : (
                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {students.map((student, index) => (
                            <StudentCard
                                key={student.studentId}
                                student={student}
                                index={index}
                            />
                        ))}
                    </motion.div>
                )}

                {/* Info Note */}
                <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/30 rounded-2xl">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                        <span className="font-bold">Note:</span> Students self-register using Google or Email sign-in.
                        You can manage their learning settings by clicking on their card.
                    </p>
                </div>
            </div>
        </div>
    );
}
