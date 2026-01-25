
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RefreshCw, Play, Award, Star, Zap, TrendingUp, Trophy } from 'lucide-react';
import { useNinja } from '../../../context/NinjaContext';
import { getTableSettings } from '../services/tablesFirestore';
import { TablesConfig, DEFAULT_TABLES_CONFIG } from '../logic/types';

interface InteractionLog {
    questionId: string;
    table: number;
    isCorrect: boolean;
    timeTaken: number;
    timestamp: number;
}

interface SummaryState {
    logs: InteractionLog[];
    initialConfig?: TablesConfig;
}

export default function SessionSummary() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useNinja();
    const state = location.state as SummaryState;
    const logs = state?.logs || [];
    const initialConfig = state?.initialConfig || DEFAULT_TABLES_CONFIG;

    const [newConfig, setNewConfig] = useState<TablesConfig | null>(null);
    const [leveledUp, setLeveledUp] = useState(false);
    const [masteredTables, setMasteredTables] = useState<number[]>([]);

    const totalQuestions = logs.length;
    const correctAnswers = logs.filter(l => l.isCorrect).length;
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    // Fetch latest config to check for progress
    useEffect(() => {
        if (!user) return;
        getTableSettings(user.uid).then(latest => {
            if (latest) {
                setNewConfig(latest);

                // Check Level Up
                if (latest.currentPathStage > (initialConfig.currentPathStage || 2)) {
                    setLeveledUp(true);
                }

                // Check Mastered Tables
                const newlyMastered: number[] = [];
                Object.keys(latest.tableStats).forEach(key => {
                    const t = parseInt(key);
                    const oldStatus = initialConfig.tableStats[t]?.status || 'NOT_STARTED';
                    const newStatus = latest.tableStats[t]?.status;
                    if (newStatus === 'MASTERED' && oldStatus !== 'MASTERED') {
                        newlyMastered.push(t);
                    }
                });
                setMasteredTables(newlyMastered);
            }
        });
    }, [user, initialConfig]);

    const getEncouragement = () => {
        if (leveledUp) return "LEVEL UP! You're unstoppable! 🚀";
        if (masteredTables.length > 0) return "Mastery Unlocked! Incredible work! 🏆";
        if (accuracy === 100) return "Perfect Score! You're a Math Wizard! 🧙‍♂️";
        if (accuracy >= 80) return "Amazing Job! Keep it up! 🌟";
        return "Good effort! Practice makes perfect! 💪";
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {leveledUp && (
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-b from-yellow-100/20 to-transparent"></div>
                    {/* Simplified confetti effect via CSS classes or just abstract shapes could go here */}
                </div>
            )}

            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center relative z-10"
            >
                {/* Header Icon */}
                <div className="flex justify-center mb-6 relative">
                    {leveledUp ? (
                        <div className="relative">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="absolute -inset-4 bg-gradient-to-tr from-yellow-300 to-orange-400 rounded-full opacity-20 blur-xl"
                            ></motion.div>
                            <Trophy className="w-24 h-24 text-yellow-500 relative z-10" />
                        </div>
                    ) : (
                        <Award className={`w-24 h-24 ${accuracy >= 80 ? 'text-yellow-400' : 'text-blue-400'}`} />
                    )}
                </div>

                <h1 className="text-4xl font-black text-slate-800 mb-2">
                    {leveledUp ? 'Level Up!' : 'Session Complete!'}
                </h1>
                <p className="text-xl text-slate-500 mb-8 font-medium">{getEncouragement()}</p>

                {/* Achievements Box */}
                {(leveledUp || masteredTables.length > 0) && (
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mb-8 p-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl text-white shadow-lg"
                    >
                        {leveledUp && (
                            <div className="flex items-center gap-3 justify-center mb-2">
                                <TrendingUp className="w-6 h-6 text-yellow-300" />
                                <span className="font-bold text-lg">Next Stage Unlocked: x{newConfig?.currentPathStage}</span>
                            </div>
                        )}
                        {masteredTables.length > 0 && (
                            <div className="text-sm opacity-90">
                                You mastered the <strong>{masteredTables.map(t => `x${t}`).join(', ')}</strong> tables!
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-indigo-50 p-4 rounded-2xl">
                        <div className="text-3xl font-black text-indigo-600">{accuracy}%</div>
                        <div className="text-sm font-bold text-indigo-400">Accuracy</div>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-2xl">
                        <div className="text-3xl font-black text-emerald-600">{correctAnswers}/{totalQuestions}</div>
                        <div className="text-sm font-bold text-emerald-400">Score</div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => navigate('/tables/practice')}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-200"
                    >
                        <RefreshCw className="w-5 h-5" />
                        Practice Again
                    </button>
                    <button
                        onClick={() => navigate('/tables')}
                        className="w-full py-4 text-slate-500 hover:text-slate-800 font-bold flex items-center justify-center gap-2"
                    >
                        <Play className="w-5 h-5" />
                        Dashboard
                    </button>
                </div>

            </motion.div>
        </div>
    );
}
