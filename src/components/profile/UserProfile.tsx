// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User,
    Settings,
    Map,
    Calendar,
    BookOpen,
    Moon,
    Sun,
    Award,
    ChevronRight,
    TrendingUp,
    Save,
    Check
} from 'lucide-react';
import { useProfileStore } from '../../store/profile';
import { useNinja } from '../../context/NinjaContext';

// Mock chapters for exclusion list (ideally fetched from curriculum)
const AVAILABLE_CHAPTERS = [
    { id: 'ch1', title: 'Integers' },
    { id: 'ch2', title: 'Fractions & Decimals' },
    { id: 'ch3', title: 'Data Handling' },
    { id: 'ch4', title: 'Simple Equations' },
    { id: 'ch5', title: 'Lines & Angles' },
    { id: 'ch6', title: 'Triangles & Properties' },
    { id: 'ch7', title: 'Comparing Quantities' },
    { id: 'ch8', title: 'Rational Numbers' },
    { id: 'ch9', title: 'Perimeter & Area' },
    { id: 'ch10', title: 'Algebraic Expressions' },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: { type: 'spring', stiffness: 100 }
    }
};

export default function UserProfile() {
    const { user, ninjaStats } = useNinja();
    const profileStore = useProfileStore();

    // Local state for form management
    const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');
    const [formData, setFormData] = useState({
        dailyQuestionCount: 5,
        diagnosticQuestionCount: 10,
        excludedChapters: [] as string[],
        theme: 'light' as 'light' | 'dark' | 'system',
        grade: '7'
    });

    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Load initial data from store
    useEffect(() => {
        setFormData({
            dailyQuestionCount: profileStore.dailyQuestionCount || 5,
            diagnosticQuestionCount: profileStore.diagnosticQuestionCount || 10,
            excludedChapters: profileStore.excludedChapters || [],
            theme: profileStore.theme || 'system',
            grade: profileStore.grade || '7'
        });
    }, [profileStore]);

    const handleSave = async () => {
        setIsSaving(true);
        // Simulate API delay for effect
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
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-12 font-sans text-slate-900">
            <motion.div
                className="max-w-5xl mx-auto"
                initial="hidden"
                animate="visible"
                variants={containerVariants}
            >
                {/* HEADER SECTION */}
                <motion.div variants={itemVariants} className="mb-12 flex items-end justify-between">
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-500 p-1">
                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                                    <User size={48} className="text-slate-300" />
                                    {/* Real avatar would go here */}
                                </div>
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-black px-3 py-1 rounded-full shadow-lg border-2 border-white">
                                LVL {ninjaStats?.heroLevel || 1}
                            </div>
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-1">
                                {user?.displayName || 'Ninja Scout'}
                            </h1>
                            <p className="text-slate-500 font-medium flex items-center gap-2">
                                <Award size={16} className="text-blue-500" />
                                {ninjaStats?.currentQuest || 'Novice Journey'}
                            </p>
                        </div>
                    </div>

                    <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-slate-200">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'overview'
                                ? 'bg-blue-500 text-white shadow-md'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'settings'
                                ? 'bg-blue-500 text-white shadow-md'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            Settings
                        </button>
                    </div>
                </motion.div>

                <AnimatePresence mode="wait">
                    {activeTab === 'overview' ? (
                        <motion.div
                            key="overview"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="grid grid-cols-1 md:grid-cols-3 gap-6"
                        >
                            {/* CONSISTENCY CHECKER */}
                            <div className="md:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold flex items-center gap-3">
                                        <Calendar className="text-pink-500" />
                                        Practice Consistency
                                    </h3>
                                    <div className="flex items-center gap-2 text-sm text-slate-400 font-medium">
                                        <span className="w-3 h-3 rounded-full bg-green-400"></span> Practice
                                        <span className="w-3 h-3 rounded-full bg-slate-200"></span> Rest
                                    </div>
                                </div>

                                {/* Mock Calendar Grid */}
                                <div className="grid grid-cols-7 gap-3 mb-4">
                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                                        <div key={d} className="text-center text-xs font-black text-slate-300 uppercase">{d}</div>
                                    ))}
                                    {Array.from({ length: 28 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className={`aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all
                        ${[2, 3, 5, 8, 9, 10, 12, 15, 16, 17, 18, 20, 22, 23, 24, 25].includes(i)
                                                    ? 'bg-green-100 text-green-600 border-2 border-green-200 shadow-sm scale-100'
                                                    : 'bg-slate-50 text-slate-300 scale-90'
                                                }`}
                                        >
                                            {i + 1}
                                        </div>
                                    ))}
                                </div>
                                <div className="p-4 bg-indigo-50 rounded-2xl flex items-center gap-4">
                                    <div className="p-3 bg-white rounded-xl shadow-sm text-indigo-500">
                                        <TrendingUp size={24} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-indigo-900">Current Streak</div>
                                        <div className="text-xs text-indigo-500 font-medium">You're on fire! 🔥 {ninjaStats?.streakCount || 0} day streak</div>
                                    </div>
                                </div>
                            </div>

                            {/* QUICK STATS */}
                            <div className="space-y-6">
                                <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
                                    <div className="relative z-10">
                                        <div className="option font-black text-white/50 text-xs uppercase tracking-widest mb-2">Total Points</div>
                                        <div className="text-5xl font-black mb-1">{ninjaStats?.powerPoints || 0}</div>
                                        <div className="text-sm font-medium text-white/80">Flow Points Earned</div>
                                    </div>

                                    {/* Decorative circles */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
                                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl -ml-10 -mb-10"></div>
                                </div>

                                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                                    <h3 className="font-bold text-slate-900 mb-4">Missions Completed</h3>
                                    <div className="flex items-end gap-2">
                                        <div className="text-4xl font-black text-slate-900">{ninjaStats?.completedMissions || 0}</div>
                                        <div className="text-slate-400 font-medium mb-1">missions</div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="settings"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-8"
                        >
                            {/* ACADEMIC PREFERENCES */}
                            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-8">
                                <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
                                    <div className="p-2 bg-blue-50 rounded-xl text-blue-500"><BookOpen size={20} /></div>
                                    <h3 className="text-lg font-bold">Academic Preferences</h3>
                                </div>

                                {/* Grade Selection */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 mb-3">CURRENT CLASS</label>
                                    <div className="grid grid-cols-4 gap-3">
                                        {['6', '7', '8', '9'].map(g => (
                                            <button
                                                key={g}
                                                onClick={() => setFormData({ ...formData, grade: g })}
                                                className={`py-3 rounded-xl font-black text-sm transition-all ${formData.grade === g
                                                    ? 'bg-blue-500 text-white shadow-lg scale-105'
                                                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                                    }`}
                                            >
                                                {g}th
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Chapter Exclusion */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 mb-3">EXCLUDE CHAPTERS (UNTAUGHT)</label>
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                        {AVAILABLE_CHAPTERS.map(chapter => (
                                            <button
                                                key={chapter.id}
                                                onClick={() => toggleChapter(chapter.id)}
                                                className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all ${formData.excludedChapters.includes(chapter.id)
                                                    ? 'bg-red-50 text-red-500 border border-red-100'
                                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                                    }`}
                                            >
                                                <span className="font-medium text-sm">{chapter.title}</span>
                                                {formData.excludedChapters.includes(chapter.id) ? (
                                                    <span className="text-xs font-bold bg-red-100 px-2 py-1 rounded">EXCLUDED</span>
                                                ) : (
                                                    <Check size={16} className="text-slate-300" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2 font-medium">Selected chapters will not appear in daily missions.</p>
                                </div>
                            </div>

                            {/* MISSION & APP SETTINGS */}
                            <div className="space-y-6">
                                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-8">
                                    <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
                                        <div className="p-2 bg-purple-50 rounded-xl text-purple-500"><Settings size={20} /></div>
                                        <h3 className="text-lg font-bold">Mission Config</h3>
                                    </div>

                                    {/* Daily Mission Count */}
                                    <div>
                                        <div className="flex justify-between mb-3">
                                            <label className="text-sm font-bold text-slate-500">DAILY QUESTIONS</label>
                                            <span className="text-sm font-black text-purple-600 bg-purple-50 px-2 rounded-lg">
                                                {formData.dailyQuestionCount}
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="15"
                                            value={formData.dailyQuestionCount}
                                            onChange={(e) => setFormData({ ...formData, dailyQuestionCount: parseInt(e.target.value) })}
                                            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                        />
                                        <div className="flex justify-between text-xs text-slate-400 font-bold mt-2">
                                            <span>1</span>
                                            <span>15</span>
                                        </div>
                                    </div>

                                    {/* Diagnostic Count */}
                                    <div>
                                        <div className="flex justify-between mb-3">
                                            <label className="text-sm font-bold text-slate-500">DIAGNOSTIC TEST SIZE</label>
                                            <span className="text-sm font-black text-blue-600 bg-blue-50 px-2 rounded-lg">
                                                {formData.diagnosticQuestionCount}
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="5"
                                            max="30"
                                            step="5"
                                            value={formData.diagnosticQuestionCount}
                                            onChange={(e) => setFormData({ ...formData, diagnosticQuestionCount: parseInt(e.target.value) })}
                                            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        />
                                        <div className="flex justify-between text-xs text-slate-400 font-bold mt-2">
                                            <span>5</span>
                                            <span>30</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
                                    <h3 className="text-sm font-bold text-slate-500 mb-4">THEME PREFERENCE</h3>
                                    <div className="flex gap-4">
                                        {[
                                            { id: 'light', icon: Sun, label: 'Light' },
                                            { id: 'dark', icon: Moon, label: 'Dark' },
                                            { id: 'system', icon: Settings, label: 'System' },
                                        ].map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => setFormData({ ...formData, theme: t.id as any })}
                                                className={`flex-1 flex flex-col items-center gap-3 py-4 rounded-2xl border-2 transition-all ${formData.theme === t.id
                                                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                                                    : 'border-transparent bg-slate-50 text-slate-400 hover:bg-slate-100'
                                                    }`}
                                            >
                                                <t.icon size={20} />
                                                <span className="text-xs font-bold">{t.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* SAVE BUTTON */}
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className={`w-full py-4 rounded-2xl font-black text-white text-lg shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 ${saveSuccess
                                        ? 'bg-green-500 shadow-green-200'
                                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-200 hover:shadow-xl'
                                        } ${isSaving ? 'opacity-70 cursor-wait' : ''}`}
                                >
                                    {saveSuccess ? (
                                        <>
                                            <Check size={24} /> Saved!
                                        </>
                                    ) : (
                                        <>
                                            <Save size={20} /> {isSaving ? 'Saving...' : 'Save Settings'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
