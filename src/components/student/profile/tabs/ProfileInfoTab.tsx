// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    User,
    Mail,
    GraduationCap,
    BookOpen,
    Layout,
    Calendar,
    TrendingUp,
    Zap,
    Target,
    AlertCircle
} from 'lucide-react';
import { useNinja } from '../../../../context/NinjaContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../services/db/firebase';

interface StudentProfile {
    studentName: string;
    email: string;
    grade: number;
    curriculum: string;
    preferredLayout: string;
    enrolledSubjects: string[];
    dailyQuestionConfig: {
        weekday: number;
        weekend: number;
        holiday: number;
    };
    boostPeriods: any[];
    examMode: {
        enabled: boolean;
        examName: string;
        startDate: string;
        endDate: string;
    };
}

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

export default function ProfileInfoTab() {
    const { user } = useNinja();
    const [profile, setProfile] = useState<StudentProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user?.uid) return;

            try {
                const profileRef = doc(db, 'students', user.uid);
                const profileSnap = await getDoc(profileRef);

                if (profileSnap.exists()) {
                    setProfile(profileSnap.data() as StudentProfile);
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [user]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-400"></div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="bg-theme-card/60 backdrop-blur-xl p-8 rounded-3xl border border-theme-border text-center">
                <AlertCircle className="mx-auto mb-4 text-gray-400" size={48} />
                <p className="text-color-text-secondary">No profile data found</p>
            </div>
        );
    }

    const subjectIcons: Record<string, string> = {
        math: '📐',
        science: '🔬',
        english: '📚',
        social: '🏛️',
        geography: '🌍',
        tables: '✖️'
    };

    return (
        <div className="space-y-6">
            {/* Basic Details Card */}
            <motion.div
                className="bg-theme-card/60 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-theme-border shadow-lg"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
            >
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                    <div className="p-2 bg-pink-50 rounded-xl text-pink-400">
                        <User size={20} />
                    </div>
                    <h2 className="font-serif italic text-2xl text-theme-text">Basic Details</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InfoField
                        icon={<User size={18} />}
                        label="Student Name"
                        value={profile.studentName || user?.displayName || 'Not set'}
                    />
                    <InfoField
                        icon={<Mail size={18} />}
                        label="Email"
                        value={profile.email || user?.email || 'Not set'}
                    />
                    <InfoField
                        icon={<GraduationCap size={18} />}
                        label="Grade"
                        value={`Grade ${profile.grade || 'Not set'}`}
                    />
                    <InfoField
                        icon={<BookOpen size={18} />}
                        label="Curriculum"
                        value={profile.curriculum || 'Not set'}
                    />
                    <InfoField
                        icon={<Layout size={18} />}
                        label="Interface Layout"
                        value={profile.preferredLayout === 'mobile-quest-v1' ? 'Mobile Quest' : 'Study Era'}
                    />
                </div>
            </motion.div>

            {/* Enrolled Subjects Card */}
            <motion.div
                className="bg-theme-card/60 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-theme-border shadow-lg"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.1 }}
            >
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                    <div className="p-2 bg-blue-50 rounded-xl text-blue-400">
                        <BookOpen size={20} />
                    </div>
                    <h2 className="font-serif italic text-2xl text-theme-text">Enrolled Subjects</h2>
                </div>

                <div className="flex flex-wrap gap-3">
                    {profile.enrolledSubjects && profile.enrolledSubjects.length > 0 ? (
                        profile.enrolledSubjects.map((subject) => (
                            <div
                                key={subject}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-50 to-purple-50 rounded-full border border-pink-100"
                            >
                                <span className="text-xl">{subjectIcons[subject] || '📖'}</span>
                                <span className="text-sm font-bold text-gray-700 capitalize">{subject}</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-color-text-secondary text-sm">No subjects enrolled</p>
                    )}
                </div>
            </motion.div>

            {/* Practice Settings Card */}
            <motion.div
                className="bg-theme-card/60 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-theme-border shadow-lg"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.2 }}
            >
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                    <div className="p-2 bg-green-50 rounded-xl text-green-400">
                        <Target size={20} />
                    </div>
                    <h2 className="font-serif italic text-2xl text-theme-text">Practice Settings</h2>
                </div>

                <div className="space-y-4">
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-2xl border border-blue-100">
                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-600 mb-3">Daily Question Limits</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <QuestionLimit
                                label="Weekdays"
                                value={profile.dailyQuestionConfig?.weekday || 20}
                                icon="📅"
                            />
                            <QuestionLimit
                                label="Weekends"
                                value={profile.dailyQuestionConfig?.weekend || 25}
                                icon="🎉"
                            />
                            <QuestionLimit
                                label="Holidays"
                                value={profile.dailyQuestionConfig?.holiday || 30}
                                icon="🏖️"
                            />
                        </div>
                    </div>

                    {/* Active Boost Periods */}
                    {profile.boostPeriods && profile.boostPeriods.length > 0 && (
                        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded-2xl border border-orange-100">
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-600 mb-3 flex items-center gap-2">
                                <Zap size={14} className="text-orange-400" />
                                Active Boost Periods
                            </h3>
                            <div className="space-y-2">
                                {profile.boostPeriods.map((boost, index) => (
                                    <div key={index} className="flex items-center justify-between text-sm">
                                        <span className="font-bold text-gray-700">{boost.name}</span>
                                        <span className="text-xs text-gray-500">
                                            {boost.startDate} to {boost.endDate}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Exam Mode */}
                    {profile.examMode?.enabled && (
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-2xl border border-purple-100">
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-600 mb-3 flex items-center gap-2">
                                <TrendingUp size={14} className="text-purple-400" />
                                Exam Mode Active
                            </h3>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-bold text-gray-700">{profile.examMode.examName}</span>
                                </div>
                                <div className="text-xs text-gray-500">
                                    {profile.examMode.startDate} to {profile.examMode.endDate}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Note */}
            <motion.div
                className="bg-yellow-50/50 backdrop-blur-xl p-4 rounded-2xl border border-yellow-200"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.3 }}
            >
                <div className="flex items-start gap-3">
                    <AlertCircle size={18} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-xs font-bold text-yellow-800 mb-1">Read-Only Profile</p>
                        <p className="text-xs text-yellow-700">
                            All profile settings are managed by your admin/parent. Contact them to make changes.
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// Helper Components
function InfoField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-start gap-3">
            <div className="p-2 bg-gray-50 rounded-lg text-gray-400 mt-1">
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-color-text-secondary mb-1">
                    {label}
                </p>
                <p className="text-sm font-bold text-theme-text">{value}</p>
            </div>
        </div>
    );
}

function QuestionLimit({ label, value, icon }: { label: string; value: number; icon: string }) {
    return (
        <div className="text-center">
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-2xl font-black text-blue-600">{value}</div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500">{label}</div>
        </div>
    );
}
