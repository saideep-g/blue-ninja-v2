// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, User, Calendar, History, BookOpen, Flame } from 'lucide-react';
import { useNinja } from '../../../context/NinjaContext';
import ProfileInfoTab from './tabs/ProfileInfoTab';
import GradeHistoryTab from './tabs/GradeHistoryTab';
import ConsistencyTab from './tabs/ConsistencyTab';
import ChapterAnalyticsTab from './tabs/ChapterAnalyticsTab';

type TabType = 'profile' | 'consistency' | 'chapterAnalytics' | 'gradeHistory';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
};

export default function StudentProfileLayout() {
    const { user, ninjaStats } = useNinja();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabType>('profile');

    // Hardware back button handler
    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            event.preventDefault();
            navigate('/', { replace: true });
        };

        window.history.pushState(null, '', window.location.href);
        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [navigate]);

    const tabs = [
        { id: 'profile', label: 'Profile Info', icon: User },
        { id: 'consistency', label: 'Consistency', icon: Flame },
        { id: 'chapterAnalytics', label: 'Chapter Analytics', icon: BookOpen },
        { id: 'gradeHistory', label: 'Grade History', icon: History }
    ];

    return (
        <div className="min-h-screen bg-theme-bg text-theme-text font-sans selection:bg-pink-100 overflow-x-hidden p-4 md:p-8 transition-colors duration-300">
            {/* Background decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-pink-100/50 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-purple-100/40 rounded-full blur-[100px]"></div>
            </div>

            <motion.div
                className="max-w-6xl mx-auto relative z-10"
                initial="hidden"
                animate="visible"
                variants={containerVariants}
            >
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/', { replace: true })}
                        className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-pink-400 transition-colors mb-6"
                    >
                        <ChevronLeft size={16} /> Back to Hub
                    </button>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-tr from-pink-200 to-rose-300 rounded-full flex items-center justify-center text-white shadow-lg border-4 border-white">
                                <User size={32} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="bg-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-sm text-pink-400 border border-pink-50">
                                        Level {ninjaStats?.heroLevel || 1}
                                    </span>
                                </div>
                                <h1 className="text-3xl md:text-4xl font-serif italic text-theme-text">
                                    {ninjaStats?.username || user?.displayName || 'Student Profile'}
                                </h1>
                                <p className="text-color-text-secondary text-xs font-bold uppercase tracking-widest mt-1">
                                    Read-Only View
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <motion.div
                    className="mb-8 overflow-x-auto"
                    variants={itemVariants}
                >
                    <div className="flex gap-2 bg-theme-card/80 backdrop-blur-md rounded-2xl p-2 shadow-sm border border-theme-border min-w-max">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as TabType)}
                                    className={`flex items-center gap-2 px-4 md:px-6 py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                                        ? 'bg-theme-text text-theme-bg shadow-md'
                                        : 'text-color-text-secondary hover:text-theme-text'
                                        }`}
                                >
                                    <Icon size={16} />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Tab Content */}
                <AnimatePresence mode="wait">
                    {activeTab === 'profile' && (
                        <motion.div
                            key="profile"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <ProfileInfoTab />
                        </motion.div>
                    )}

                    {activeTab === 'consistency' && (
                        <motion.div
                            key="consistency"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <ConsistencyTab />
                        </motion.div>
                    )}

                    {activeTab === 'chapterAnalytics' && (
                        <motion.div
                            key="chapterAnalytics"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <ChapterAnalyticsTab />
                        </motion.div>
                    )}

                    {activeTab === 'gradeHistory' && (
                        <motion.div
                            key="gradeHistory"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <GradeHistoryTab />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
