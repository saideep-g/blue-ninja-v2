// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
    User,
    Settings,
    Calendar,
    BookOpen,
    Moon,
    Sun,
    Award,
    ChevronRight,
    TrendingUp,
    Save,
    Check,
    ChevronLeft,
    Sparkles,
    Flame,
    Coffee
} from 'lucide-react';
import { useProfileStore } from '../../store/profile';
import { useNinja } from '../../context/NinjaContext';

// Mock chapters for exclusion list
const AVAILABLE_CHAPTERS = [
    { id: 'ch1', title: 'Integers' },
    { id: 'ch2', title: 'Fractions & Decimals' },
    { id: 'ch3', title: 'Data Handling' },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
};

export default function StudyEraProfile() {
    const { user, ninjaStats } = useNinja();
    const profileStore = useProfileStore();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');
    const [formData, setFormData] = useState({
        dailyQuestionCount: 5,
        diagnosticQuestionCount: 10,
        excludedChapters: [] as string[],
        theme: 'light' as 'light' | 'dark' | 'system',
        grade: '7',
        autoAdvance: true
    });

    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [activityDays, setActivityDays] = useState<Set<string>>(new Set());
    const [calendarGrid, setCalendarGrid] = useState<Date[]>([]);

    useEffect(() => {
        setFormData({
            dailyQuestionCount: profileStore.dailyQuestionCount || 5,
            diagnosticQuestionCount: profileStore.diagnosticQuestionCount || 10,
            excludedChapters: profileStore.excludedChapters || [],
            theme: profileStore.theme || 'system',
            grade: profileStore.grade || '7',
            autoAdvance: profileStore.autoAdvance ?? true
        });
    }, [profileStore]);

    useEffect(() => {
        const today = new Date();
        const currentDay = today.getDay();
        const startOfCurrentWeek = new Date(today);
        startOfCurrentWeek.setDate(today.getDate() - currentDay);
        const startDate = new Date(startOfCurrentWeek);
        startDate.setDate(startDate.getDate() - 21);
        startDate.setHours(0, 0, 0, 0);

        const days: Date[] = [];
        for (let i = 0; i < 28; i++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            days.push(d);
        }
        setCalendarGrid(days);

        if (ninjaStats?.activityLog) {
            setActivityDays(new Set(ninjaStats.activityLog));
        }
    }, [ninjaStats]);

    const handleSave = async () => {
        setIsSaving(true);
        await new Promise(r => setTimeout(r, 800));
        if (user?.uid) {
            await profileStore.updateProfile(user.uid, formData);
            profileStore.setTheme(formData.theme);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        }
        setIsSaving(false);
    };

    const toggleChapter = (chapterId: string) => {
        setFormData(prev => ({
            ...prev,
            excludedChapters: prev.excludedChapters.includes(chapterId)
                ? prev.excludedChapters.filter(id => id !== chapterId)
                : [...prev.excludedChapters, chapterId]
        }));
    };

    return (
        <div className="min-h-screen bg-[#FAF9F6] text-[#4A4A4A] font-sans selection:bg-pink-100 overflow-x-hidden p-6 md:p-12">
            {/* --- BACKGROUND DECORATION (Aura Blobs) --- */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-pink-100/50 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-purple-100/40 rounded-full blur-[100px]"></div>
            </div>

            <motion.div
                className="max-w-4xl mx-auto relative z-10"
                initial="hidden"
                animate="visible"
                variants={containerVariants}
            >
                {/* Header with Back Button */}
                <div className="mb-12">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-pink-400 transition-colors mb-6"
                    >
                        <ChevronLeft size={16} /> Back to Hub
                    </button>

                    <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                        <div className="flex items-center gap-6">
                            <div className="w-24 h-24 bg-gradient-to-tr from-pink-200 to-rose-300 rounded-full flex items-center justify-center text-white shadow-[0_20px_40px_-10px_rgba(255,182,193,0.5)] border-4 border-white">
                                <User size={40} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="bg-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-sm text-pink-400 border border-pink-50">Level {ninjaStats?.heroLevel || 1}</span>
                                </div>
                                <h1 className="text-4xl font-serif italic text-gray-800">
                                    {ninjaStats?.username || user?.displayName || 'Student Era'}
                                </h1>
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">
                                    {ninjaStats?.currentQuest || 'Scholar Journey'}
                                </p>
                            </div>
                        </div>

                        <div className="flex bg-white/60 backdrop-blur-md rounded-2xl p-1 shadow-sm border border-white">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'overview'
                                    ? 'bg-[#1A1A1A] text-white shadow-md'
                                    : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                Overview
                            </button>
                            <button
                                onClick={() => setActiveTab('settings')}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'settings'
                                    ? 'bg-[#1A1A1A] text-white shadow-md'
                                    : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                Config
                            </button>
                        </div>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'overview' ? (
                        <motion.div
                            key="overview"
                            className="grid grid-cols-1 md:grid-cols-2 gap-8"
                            variants={itemVariants}
                            initial="hidden"
                            animate="visible"
                            exit={{ opacity: 0, y: 20 }}
                        >
                            {/* Consistency Card */}
                            <div className="bg-white/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-[0_20px_50px_rgba(0,0,0,0.03)]">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="font-serif italic text-xl text-gray-800">Consistency</h3>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Study Streak</p>
                                    </div>
                                    <Flame className="text-orange-400" size={24} fill="currentColor" />
                                </div>

                                <div className="grid grid-cols-7 gap-2 mb-6">
                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                                        <div key={i} className="text-center text-[9px] font-black text-gray-300">{d}</div>
                                    ))}
                                    {calendarGrid.map((date) => {
                                        const dateStr = date.toISOString().split('T')[0];
                                        const isActive = activityDays.has(dateStr);
                                        const isToday = new Date().toISOString().split('T')[0] === dateStr;
                                        return (
                                            <div
                                                key={dateStr}
                                                className={`aspect-square rounded-full flex items-center justify-center text-[10px] font-bold transition-all
                                                ${isActive
                                                        ? 'bg-pink-300 text-white shadow-sm scale-105'
                                                        : 'bg-white/50 text-gray-300'
                                                    } ${isToday ? 'ring-2 ring-pink-100 ring-offset-2' : ''}`}
                                            >
                                                {date.getDate()}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-orange-400 font-black shadow-sm">
                                        {ninjaStats?.streakCount || 0}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-700">Day Streak</p>
                                        <p className="text-[9px] font-medium text-gray-400">Keep the flame alive!</p>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Card */}
                            <div className="bg-[#1A1A1A] text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-between">
                                <div className="relative z-10">
                                    <Sparkles className="text-yellow-400 mb-4" size={32} />
                                    <h4 className="text-5xl font-serif italic mb-2 tracking-tight">
                                        {ninjaStats?.powerPoints?.toLocaleString() || 0}
                                    </h4>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Total Aura Points</p>
                                </div>

                                <div className="mt-8 relative z-10">
                                    <div className="flex justify-between text-xs font-bold text-white/50 mb-2">
                                        <span>Next Level</span>
                                        <span>{(ninjaStats?.heroLevel || 1) + 1}</span>
                                    </div>
                                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500 w-[60%]"></div>
                                    </div>
                                </div>

                                {/* Decor */}
                                <div className="absolute top-[-20%] right-[-20%] w-48 h-48 bg-pink-500/20 rounded-full blur-[60px]"></div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="settings"
                            className="bg-white/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-[0_20px_50px_rgba(0,0,0,0.03)]"
                            variants={itemVariants}
                            initial="hidden"
                            animate="visible"
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <div className="space-y-8 max-w-2xl mx-auto">
                                <div className="flex items-center gap-3 pb-6 border-b border-gray-100">
                                    <div className="p-2 bg-pink-50 rounded-xl text-pink-400"><Settings size={20} /></div>
                                    <h3 className="font-serif italic text-xl text-gray-800">Configuration</h3>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Grade Level</label>
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {['6', '7', '8'].map(g => (
                                            <button
                                                key={g}
                                                onClick={() => setFormData({ ...formData, grade: g })}
                                                className={`w-12 h-12 rounded-2xl font-black text-sm flex items-center justify-center transition-all ${formData.grade === g
                                                    ? 'bg-gradient-to-br from-pink-400 to-rose-400 text-white shadow-lg shadow-pink-200'
                                                    : 'bg-white border border-gray-100 text-gray-400 hover:border-pink-200'
                                                    }`}
                                            >
                                                {g}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Daily Goal</label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min="1"
                                            max="15"
                                            value={formData.dailyQuestionCount}
                                            onChange={(e) => setFormData({ ...formData, dailyQuestionCount: parseInt(e.target.value) })}
                                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-400"
                                        />
                                        <span className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-gray-800 border border-gray-100 shadow-sm">
                                            {formData.dailyQuestionCount}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className={`w-full py-5 bg-[#1A1A1A] text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-pink-500 transition-all shadow-xl active:scale-95 ${isSaving ? 'opacity-80' : ''}`}
                                >
                                    {saveSuccess ? <Check size={18} /> : <Save size={18} />}
                                    {saveSuccess ? 'Changes Saved' : (isSaving ? 'Saving...' : 'Save Configuration')}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
