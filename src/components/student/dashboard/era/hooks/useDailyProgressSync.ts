import { useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../../services/db/firebase';

export const useDailyProgressSync = (user: any, setCompletedSubjects: (s: Set<string>) => void) => {
    useEffect(() => {
        if (!user) return;
        const syncDailyProgress = async () => {
            try {
                const docRef = doc(db, 'students', user.uid);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const data = snap.data();
                    const lastDate = data.lastActive?.toDate();
                    let daily = data.daily || {};

                    // 4 AM Reset Check (Matches MobileQuestDashboard)
                    const now = new Date();
                    const resetTime = new Date();
                    resetTime.setHours(4, 0, 0, 0);
                    if (now < resetTime) resetTime.setDate(resetTime.getDate() - 1);

                    if (lastDate && lastDate < resetTime) {
                        // Logic says: Old Day. Reset View.
                        setCompletedSubjects(new Set());
                    } else {
                        // Load Progress
                        const restored = new Set<string>();
                        if (daily.Math > 0) restored.add('math');
                        if (daily.Science > 0) restored.add('science');
                        if (daily.Words > 0) restored.add('vocabulary');
                        if (daily.World > 0) restored.add('gk');
                        if (daily.Tables > 0) restored.add('tables');
                        setCompletedSubjects(restored);
                    }
                }
            } catch (e) {
                console.error("Failed to sync daily progress", e);
            }
        };
        syncDailyProgress();
    }, [user, setCompletedSubjects]);
};
