import coreCurriculum from '../../data/cbse7_core_curriculum_v3.json';
import { doc, getFirestore, getDoc, setDoc } from 'firebase/firestore';

const db = getFirestore();

/**
 * Ensures the user has V3 mastery keys initialized in Firestore.
 * Returns the new mastery map if an update occurred, otherwise null.
 */
export async function initializeV3Mastery(userId: string): Promise<Record<string, number> | null> {
    if (!userId) return null;

    try {
        const userRef = doc(db, 'students', userId);
        const snap = await getDoc(userRef);

        let currentMastery: Record<string, number> = {};
        if (snap.exists()) {
            const data = snap.data();
            currentMastery = data.mastery || {};
        }

        // Safety check for empty curriculum
        if (!coreCurriculum.modules || coreCurriculum.modules.length === 0) return null;

        // Check if V3 initialized (sample atom)
        const v3AtomSample = coreCurriculum.modules[0].atoms[0].atom_id;

        // If the sample atom exists, we assume we've already run this migration.
        if (currentMastery[v3AtomSample]) {
            return null;
        }

        console.log('[MasteryService] Initializing V3 Mastery (Bayesian Prior 0.5)...');

        const initMastery: Record<string, number> = { ...currentMastery };

        coreCurriculum.modules.forEach((mod: any) => {
            mod.atoms.forEach((atom: any) => {
                // Only set if undefined to avoid overwriting existing progress
                if (initMastery[atom.atom_id] === undefined) {
                    initMastery[atom.atom_id] = 0.5;
                }
            });
        });

        // Hard Write to Firestore
        await setDoc(userRef, {
            mastery: initMastery,
            updatedAt: new Date().toISOString(),
            curriculumVersion: 'v3'
        }, { merge: true });

        console.log('[MasteryService] V3 Mastery synced to Firestore.');
        return initMastery;

    } catch (error) {
        console.error('[MasteryService] Initialization error:', error);
        return null;
    }
}
