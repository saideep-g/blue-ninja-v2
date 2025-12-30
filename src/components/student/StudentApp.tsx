import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNinja } from '../../context/NinjaContext';
import { useDiagnostic } from '../../hooks/useDiagnostic';
import { useDailyMission } from '../../hooks/useDailyMission';
import { auth } from "../../services/db/firebase";
import { BlueNinjaTheme } from '../../theme/themeConfig';

import MissionCard from '../diagnostic/MissionCard';
import PowerMap from '../dashboard/PowerMap';
import BossTracker from '../dashboard/BossTracker';
import Achievements from '../dashboard/Achievements';
import AchievementUnlock from '../dashboard/AchievementUnlock';
import ConceptPowerMap from '../dashboard/ConceptPowerMap';
import MissionHistory from '../dashboard/MissionHistory';
import StudentInsightsReport from '../dashboard/StudentInsightsReport';
import { FlaskConical } from 'lucide-react';

/**
 * StudentApp - Contains all Student Logic (Quest, Dashboard, Missions)
 * This component is ONLY mounted for users with role = STUDENT.
 */
export default function StudentApp() {
    const { user, ninjaStats, sessionHistory, updatePower, activeAchievement } = useNinja();
    const [currentView, setCurrentView] = useState('QUEST');
    const [isSimulated, setIsSimulated] = useState(false);

    useEffect(() => {
        const simConfig = localStorage.getItem('BLUE_NINJA_SIM_CONFIG');
        if (simConfig) setIsSimulated(true);
    }, []);

    const {
        currentQuestion: diagQ,
        currentIndex: diagIdx,
        totalQuestions: diagTotal,
        submitAnswer: submitDiag,
        startRecoveryTimer,
        isComplete: diagComplete,
        masteryData: sessionMastery,
        hurdles: sessionHurdles
    } = useDiagnostic(null);

    const {
        currentQuestion: dailyQ,
        currentIndex: dailyIdx,
        totalQuestions: dailyTotal,
        submitDailyAnswer,
        isComplete: dailyComplete,
        sessionResults,
        isLoading: dailyLoading // Destructure isLoading
    } = useDailyMission(null);

    const handleDiagAnswer = (isCorrect: boolean, choice: string | number, isRecovered: boolean, tag: string, timeSpentSeconds: number) => {
        if (!diagQ) return;
        submitDiag(diagQ.id, isCorrect, diagQ.atom || 'UNKNOWN', isRecovered, tag, choice, diagQ.correct_answer, timeSpentSeconds);
        if (isCorrect) updatePower(10);
        else if (isRecovered) updatePower(5);
    };

    const handleDailyAnswer = (isCorrect: boolean, choice: string | number, isRecovered: boolean, tag: string, timeSpentSeconds: number) => {
        const speedRating = timeSpentSeconds < 3 ? 'SPRINT' : (timeSpentSeconds < 15 ? 'NORMAL' : 'SLOW');
        submitDailyAnswer(isCorrect, choice, isRecovered, tag, timeSpentSeconds, speedRating);
        if (isCorrect) updatePower(15);
        else if (isRecovered) updatePower(7);
    };

    const activeMastery = ninjaStats?.currentQuest === 'COMPLETED' ? (ninjaStats.mastery || {}) : sessionMastery;
    const activeHurdles = ninjaStats?.currentQuest === 'COMPLETED' ? (ninjaStats.hurdles || {}) : sessionHurdles;

    useEffect(() => {
        if (ninjaStats?.currentQuest === 'COMPLETED' && currentView === 'QUEST') {
            setCurrentView('DASHBOARD');
        }
    }, [ninjaStats?.currentQuest, currentView]);

    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--color-primary', BlueNinjaTheme.colors.primary);
        root.style.setProperty('--color-accent', BlueNinjaTheme.colors.accent);
        root.style.setProperty('--color-surface', BlueNinjaTheme.colors.surface);
        root.style.setProperty('--color-text', BlueNinjaTheme.colors.text);
        root.style.setProperty('--color-card', BlueNinjaTheme.colors.card);
    }, []);

    const effectiveView = currentView;

    return (
        <div className={`min-h-screen ${isSimulated ? 'border-[6px] border-green-500' : 'bg-[var(--color-surface)]'}`}>
            {isSimulated && (
                <div className="bg-green-500 text-white font-bold text-center py-2 uppercase tracking-widest text-xs flex justify-center items-center gap-2">
                    <FlaskConical size={14} /> SIMULATION MODE ACTIVE
                </div>
            )}
            {dailyComplete && (
                <div className="min-h-screen flex items-center justify-center p-6">
                    <div className="ninja-card max-w-md w-full text-center space-y-8 animate-in zoom-in duration-500">
                        <h1 className="text-4xl font-black italic text-blue-800 uppercase tracking-tighter">Mission Accomplished</h1>
                        <div className="text-7xl py-4">🏆</div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                                <span className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Accuracy</span>
                                <span className="text-3xl font-bold text-blue-800">{sessionResults.correctCount}/10</span>
                            </div>
                            <div className="bg-yellow-50 p-6 rounded-3xl border border-yellow-100">
                                <span className="block text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-1">Flow Gained</span>
                                <span className="text-3xl font-bold text-yellow-700">+{sessionResults.flowGained}</span>
                            </div>
                        </div>
                        {sessionResults.sprintCount > 0 && (
                            <div className="p-4 bg-blue-600 rounded-2xl text-white font-bold flex items-center justify-center gap-2">
                                <span>⚡</span> {sessionResults.sprintCount} Ninja Sprints Detected!
                            </div>
                        )}
                        <button onClick={() => window.location.reload()} className="w-full py-5 bg-[var(--color-primary)] text-white rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                            Return to Dashboard ➤
                        </button>
                    </div>
                </div>
            )}

            {effectiveView === 'DAILY_MISSION' && !dailyComplete && (
                <div className="pb-20">
                    <header className="max-w-7xl mx-auto p-6 flex justify-between items-center">
                        <h1 className="text-2xl font-black italic text-blue-800 tracking-tighter uppercase">Daily Flight</h1>
                        <div className="flex flex-col items-end">
                            <span className="font-bold text-blue-900">{dailyIdx + 1} / {dailyTotal}</span>
                            <div className="w-32 h-1 bg-blue-100 rounded-full mt-1 overflow-hidden">
                                <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${((dailyIdx + 1) / dailyTotal) * 100}%` }}></div>
                            </div>
                        </div>
                    </header>
                    <main className="max-w-7xl mx-auto mt-2 px-4">
                        {dailyQ ? (
                            <MissionCard
                                key={`${dailyQ.id || 'unknown'}-${dailyIdx}`}
                                question={dailyQ}
                                onAnswer={(...args: any[]) => {
                                    console.log(`[DailyFlight] Answer submitted for Q${dailyIdx} (${dailyQ.id})`);
                                    // @ts-ignore - Dynamic dispatch to fix spread error on tuple
                                    handleDailyAnswer(...args);
                                }}
                                onStartRecovery={null}
                            />
                        ) : dailyLoading ? (
                            <div className="ninja-card flex flex-col items-center justify-center py-20">
                                <div className="animate-spin text-4xl mb-4">🌊</div>
                                <p className="font-bold text-blue-800">Preparing your flight path...</p>
                            </div>
                        ) : (
                            <div className="ninja-card flex flex-col items-center justify-center py-20 border-red-200 bg-red-50">
                                <div className="text-4xl mb-4">⚠️</div>
                                <p className="font-bold text-red-800">No mission data available.</p>
                                <p className="text-xs text-red-600 mt-2">Check console for details or clear simulation.</p>
                                <button onClick={() => { localStorage.removeItem('BLUE_NINJA_SIM_CONFIG'); window.location.reload(); }} className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-xs font-bold uppercase">
                                    Exit Simulation
                                </button>
                            </div>
                        )}
                    </main>
                </div>
            )}

            {effectiveView === 'DASHBOARD' && (
                <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
                    <AchievementUnlock achievement={activeAchievement} />
                    <header className="flex justify-between items-center mb-10">
                        <div>
                            <h1 className="text-3xl font-black italic text-blue-800 uppercase tracking-tighter">Blue Ninja Dashboard</h1>
                            <div className="flex gap-4 mt-2">
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">🔥 {ninjaStats.streakCount || 0} Day Streak</span>
                                <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Level {ninjaStats.heroLevel}</span>
                            </div>
                        </div>
                        <div className="flex gap-4 items-center">
                            <Link to="/profile" className="flex items-center gap-2 group transition-all hover:scale-105">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-500 p-0.5 shadow-sm">
                                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                                        <span className="text-xs font-black text-indigo-500">{(user?.displayName || 'N').charAt(0).toUpperCase()}</span>
                                    </div>
                                </div>
                                <span className="text-xs font-black text-blue-800 uppercase tracking-widest group-hover:text-blue-600 hidden md:block">Profile</span>
                            </Link>
                            <button onClick={() => auth.signOut()} className="text-xs font-black text-blue-400 uppercase tracking-widest hover:text-blue-800 transition-colors">Sign Out 🚪</button>
                        </div>
                    </header>
                    <div className="ninja-card bg-blue-600 text-white border-none flex flex-col md:flex-row items-center justify-between p-8 md:p-12 mb-8 gap-6 shadow-2xl">
                        <div className="text-center md:text-left z-10">
                            <h2 className="text-3xl font-black uppercase italic mb-2 tracking-tighter">The Sky Is Calling</h2>
                            <p className="text-blue-100 font-medium">Ready for today's 10-mission flight? Clear the Storm Clouds.</p>
                        </div>
                        <button onClick={() => setCurrentView('DAILY_MISSION')} className="bg-yellow-400 text-blue-900 px-12 py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all text-lg whitespace-nowrap">
                            Start Daily Flight ➤
                        </button>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            <PowerMap masteryData={activeMastery} />
                            <ConceptPowerMap masteryData={activeMastery} />
                            <StudentInsightsReport logs={sessionHistory} />
                        </div>
                        <div className="space-y-8">
                            <BossTracker hurdles={activeHurdles} />
                            <Achievements ninjaStats={ninjaStats} />
                            <MissionHistory logs={sessionHistory} />
                        </div>
                    </div>
                </div>
            )}

            {effectiveView === 'QUEST' && !diagComplete && (
                <div className="pb-20">
                    <header className="max-w-7xl mx-auto p-6 flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-black italic text-blue-800 tracking-tighter uppercase">Entrance Quest</h1>
                            <div className="w-full h-1 bg-blue-100 rounded-full mt-1 overflow-hidden">
                                <div className="h-full bg-[var(--color-accent)] transition-all duration-700" style={{ width: `${(diagIdx / diagTotal) * 100}%` }}></div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="font-bold text-blue-900 leading-none">{ninjaStats.powerPoints} ⚡ FLOW</span>
                            <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mt-1">Mission {diagIdx + 1} / {diagTotal}</span>
                        </div>
                    </header>
                    <main className="max-w-7xl mx-auto mt-8 px-4">
                        {diagQ ? (
                            <MissionCard question={diagQ} onStartRecovery={startRecoveryTimer} onAnswer={handleDiagAnswer} />
                        ) : (
                            <div className="ninja-card flex flex-col items-center justify-center py-20">
                                <div className="animate-spin text-4xl mb-4">🌊</div>
                                <p className="font-bold text-blue-800">Setting up the next mission...</p>
                            </div>
                        )}
                    </main>
                    <div className="flex justify-center mt-10">
                        <button onClick={() => setCurrentView('DASHBOARD')} className="text-[10px] font-black text-blue-400 hover:text-blue-800 uppercase tracking-widest border-b border-blue-100 pb-1 transition-all">Check Mission Intel Dashboard</button>
                    </div>
                    <p className="text-center mt-10 text-[10px] font-black text-blue-300 uppercase tracking-widest">"When I fly towards you, the whole world turns blue."</p>
                    <button onClick={() => auth.signOut()} className="fixed bottom-6 right-6 p-3 bg-white/80 backdrop-blur-sm rounded-full text-[10px] font-black text-blue-400 hover:text-blue-600 shadow-sm border border-blue-50 uppercase tracking-tighter">Sign Out 🚪</button>
                </div>
            )}
        </div>
    );
}
