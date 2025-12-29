import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { auth, db } from '../services/db/firebase';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    writeBatch,
    serverTimestamp,
    query,
    orderBy,
    limit,
    getDocs
} from 'firebase/firestore';
// import { syncOfflineData } from '../services/sync'; // Unused and not exported
import { User as FirebaseUser } from 'firebase/auth';
import { NinjaStats, QuestionLog } from '../types';
import { getStudentRef, getSessionLogsCollection } from '../services/db/firestore';
import { initializeV3Mastery } from '../services/analytics/progress';

interface NinjaContextType {
    user: FirebaseUser | null;
    ninjaStats: NinjaStats;
    sessionHistory: any[];
    setNinjaStats: React.Dispatch<React.SetStateAction<NinjaStats>>;
    updatePower: (gain: number) => Promise<void>;
    logQuestionResult: (logData: QuestionLog) => Promise<void>;
    logQuestionResultLocal: (logData: QuestionLog, currentQuestionIndex: number) => void;
    updateStreak: () => Promise<boolean>;
    syncToCloud: (isFinal?: boolean, overrideLogs?: QuestionLog[] | null) => Promise<void>;
    refreshSessionLogs: () => Promise<any[]>;
    loading: boolean;
    activeAchievement: any;
    userRole: string;
    setUserRole: React.Dispatch<React.SetStateAction<string>>;
}

const NinjaContext = createContext<NinjaContextType | undefined>(undefined);

export function NinjaProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeAchievement, setActiveAchievement] = useState<any>(null);
    const [sessionHistory, setSessionHistory] = useState<any[]>([]);
    const [userRole, setUserRole] = useState('STUDENT');

    const [ninjaStats, setNinjaStats] = useState<NinjaStats>({
        powerPoints: 0,
        heroLevel: 1,
        mastery: {},
        hurdles: {},
        consecutiveBossSuccesses: {},
        completedMissions: 0,
        currentQuest: 'DIAGNOSTIC',
        streakCount: 0,
        lastMissionDate: null
    });

    const statsRef = useRef(ninjaStats);
    useEffect(() => {
        statsRef.current = ninjaStats;
    }, [ninjaStats]);

    const bufferRef = useRef<{ logs: QuestionLog[], pointsGained: number }>({ logs: [], pointsGained: 0 });
    const [localBuffer, setLocalBuffer] = useState<{ logs: QuestionLog[], pointsGained: number }>({ logs: [], pointsGained: 0 });

    const fetchSessionLogs = async (uid: string) => {
        try {
            const logsRef = getSessionLogsCollection(uid);
            const q = query(logsRef, orderBy('timestamp', 'desc'), limit(50));
            const querySnapshot = await getDocs(q);
            const logs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSessionHistory(logs);
            return logs;
        } catch (error) {
            console.error("Error fetching logs:", error);
            return [];
        }
    };

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            console.group('🔐 [NinjaContext] Auth Initialization');
            setUser(user);
            if (user) {
                // Initialize V3 Mastery (One-time check)
                initializeV3Mastery(user.uid).catch(console.error);

                console.log('👤 User UID:', user.uid);
                const localSession = localStorage.getItem(`ninja_session_${user.uid}`);

                if (localSession) {
                    console.log('📦 Local session found. Hydrating state...');
                    const data = JSON.parse(localSession);
                    setNinjaStats(data.stats);
                    setLocalBuffer(data.buffer);
                    bufferRef.current = data.buffer;
                    setUserRole(data.role || 'STUDENT');
                } else {
                    console.log('☁️ No local session. Fetching from Firestore...');
                    const userDoc = await getDoc(getStudentRef(user.uid));

                    if (userDoc.exists()) {
                        console.log('✅ Remote profile loaded successfully');
                        const data = userDoc.data();
                        setNinjaStats(data);
                        setUserRole((data as any).role || 'STUDENT');
                        fetchSessionLogs(user.uid);
                    } else {
                        console.log('🆕 No profile found. Initializing new Ninja...');
                        const initialStats: NinjaStats = {
                            powerPoints: 0,
                            heroLevel: 1,
                            mastery: {},
                            hurdles: {},
                            consecutiveBossSuccesses: {},
                            completedMissions: 0,
                            currentQuest: 'DIAGNOSTIC',
                            streakCount: 0,
                            lastMissionDate: null
                        };
                        await setDoc(getStudentRef(user.uid), initialStats);
                        setNinjaStats(initialStats);
                    }
                }
            } else {
                console.log('🚪 User logged out');
            }
            console.groupEnd();
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const syncingRef = useRef(false);

    const syncToCloud = async (isFinal = false, overrideLogs: QuestionLog[] | null = null) => {
        if (syncingRef.current && !overrideLogs) {
            console.log('⏳ Sync already in progress. Skipping.');
            return;
        }

        syncingRef.current = true;
        let logsToSync: QuestionLog[] = [];

        if (overrideLogs) {
            logsToSync = overrideLogs;
        } else {
            // SNAPSHOT STRATEGY: Capture and clear immediately to prevent double-processing
            logsToSync = [...bufferRef.current.logs];
            bufferRef.current.logs = [];
            bufferRef.current.pointsGained = 0; // Reset pending points if we handle them here
            setLocalBuffer({ logs: [], pointsGained: 0 });
        }

        console.group('🚀 [syncToCloud] Firestore Transaction Start');
        console.log('Target Logs Count:', logsToSync.length);

        if (!auth.currentUser || logsToSync.length === 0) {
            console.log('🛑 Aborting Sync: No authenticated user or empty log buffer');
            syncingRef.current = false;
            console.groupEnd();
            return;
        }

        const batch = writeBatch(db);
        const userRef = getStudentRef(auth.currentUser.uid);
        const logsRef = getSessionLogsCollection(auth.currentUser.uid);

        console.log('📂 Path:', `students/${auth.currentUser.uid}/session_logs`);

        try {
            logsToSync.forEach((log, idx) => {
                const newLogRef = doc(logsRef); // Typed ref!

                const enrichedLog: QuestionLog = {
                    ...log,
                    studentId: auth.currentUser!.uid,
                    diagnosticTag: log.diagnosticTag || (log.isCorrect ? 'NONE' : 'UNTAGGED'),
                    isSuccess: !!(log.isCorrect || log.isRecovered),
                    masteryDelta: log.masteryBefore !== undefined && log.masteryAfter !== undefined
                        ? Number((log.masteryAfter - log.masteryBefore).toFixed(3))
                        : 0,
                    timestamp: serverTimestamp(),
                    syncedAt: Date.now()
                };

                batch.set(newLogRef, enrichedLog);
                console.log(`[Batch] Queueing Log ${idx + 1}: ${log.questionId}`);
            });

            const currentStats = statsRef.current;
            // Only update stats if we're syncing the main buffer or force final
            if (!overrideLogs || isFinal) {
                batch.update(userRef, {
                    ...currentStats
                });
            }

            await batch.commit();

            if (isFinal) {
                localStorage.removeItem(`ninja_session_${auth.currentUser.uid}`);
            }

            console.log('✅ Batch Commit Successful');
        } catch (error) {
            console.error('❌ Sync Failed:', error);
            // RESTORE STRATEGY: If not override, put them back in buffer
            if (!overrideLogs) {
                console.warn('⚠️ Restoring unsynced logs to buffer...');
                bufferRef.current.logs = [...logsToSync, ...bufferRef.current.logs]; // Prepend
                setLocalBuffer(prev => ({ ...prev, logs: bufferRef.current.logs }));
            }
        } finally {
            syncingRef.current = false;
        }
        console.groupEnd();
    };

    const updatePower = async (gain: number) => {
        setNinjaStats(prev => {
            const newPoints = (prev.powerPoints || 0) + gain;
            const newLevel = Math.floor(newPoints / 100) + 1;

            // Check for Level Up (Placeholder logic)
            if (newLevel > (prev.heroLevel || 1)) {
                setActiveAchievement({
                    id: 'LEVEL_UP',
                    name: `Level ${newLevel} Reached!`,
                    icon: '🆙'
                });
            }
            return { ...prev, powerPoints: newPoints, heroLevel: newLevel };
        });

        // Update Buffer
        bufferRef.current.pointsGained += gain;
        setLocalBuffer(prev => ({
            ...prev,
            pointsGained: prev.pointsGained + gain
        }));
    };

    const logQuestionResultLocal = (logData: QuestionLog, currentQuestionIndex: number) => {
        // DEDUPLICATION: Check if identical to last log (simple debounce)
        const lastLog = bufferRef.current.logs[bufferRef.current.logs.length - 1];
        if (lastLog && lastLog.questionId === logData.questionId && Math.abs((logData.timeSpent || 0) - (lastLog.timeSpent || 0)) < 0.1) {
            console.warn(`[LocalLog] Duplicate detected for ${logData.questionId}. Ignoring.`);
            return;
        }

        console.log(`[LocalLog] Buffer updated: Q${currentQuestionIndex}`);

        // Add to buffer
        bufferRef.current.logs.push(logData);
        setLocalBuffer(prev => ({
            ...prev,
            logs: [...prev.logs, logData]
        }));

        // Persist to LocalStorage for crash resilience
        if (auth.currentUser) {
            localStorage.setItem(`ninja_session_${auth.currentUser.uid}`, JSON.stringify({
                stats: statsRef.current,
                buffer: bufferRef.current,
                role: userRole,
                lastUpdated: Date.now()
            }));
        }

        // Auto-sync every 5 logs
        if (bufferRef.current.logs.length >= 5) {
            console.log('⚡ Auto-sync triggered (Buffer Full)');
            syncToCloud();
        }
    };

    const logQuestionResult = async (logData: QuestionLog) => {
        // Legacy direct log, redirected to buffer for consistency
        logQuestionResultLocal(logData, 0);
    };

    const updateStreak = async () => {
        // Placeholder for strict streak logic
        return true;
    };

    const refreshSessionLogs = async () => {
        if (user) {
            return fetchSessionLogs(user.uid);
        }
        return [];
    };

    return (
        <NinjaContext.Provider value={{
            user,
            ninjaStats,
            sessionHistory,
            setNinjaStats,
            updatePower,
            logQuestionResult,
            logQuestionResultLocal,
            updateStreak,
            syncToCloud,
            refreshSessionLogs,
            loading,
            activeAchievement,
            userRole,
            setUserRole
        }}>
            {children}
        </NinjaContext.Provider>
    );
}

export const useNinja = () => {
    const context = useContext(NinjaContext);
    if (!context) {
        throw new Error('useNinja must be used within a NinjaProvider');
    }
    return context;
};
