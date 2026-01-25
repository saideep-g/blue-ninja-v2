import { useState, useEffect } from 'react';
import coreCurriculum from '../../../../../data/cbse7_core_curriculum_v3.json';
import { SUBJECT_TEMPLATE, VOCAB_CHAPTERS, SCIENCE_CHAPTERS } from '../../../../../constants/studyEraData';
import { calculateWeightedTableMastery } from '../../../../../utils/tablesLogic';

export const useSubjectData = (ninjaStats: any, user: any, completedSubjects: Set<string>) => {
    const [subjects, setSubjects] = useState<any[]>([]);

    useEffect(() => {
        const enrolled = ninjaStats?.enrolledSubjects || [];
        let activeSubjects: any[] = [];

        // Math Logic
        if (enrolled.includes('math') || enrolled.length === 0) {
            const mathModules = coreCurriculum.modules.map(mod => {
                const atoms = mod.atoms.map(atom => {
                    const mScore = ninjaStats?.mastery?.[atom.atom_id] || 0;
                    return {
                        id: atom.atom_id,
                        name: atom.title.split('(')[0].trim(),
                        mastery: Math.min(100, Math.round(mScore * 100)),
                        status: mScore > 0.8 ? 'Mastered' : mScore > 0.1 ? 'Learning' : 'New'
                    };
                });
                const avgMastery = atoms.length > 0 ? Math.round(atoms.reduce((acc, curr) => acc + curr.mastery, 0) / atoms.length) : 0;
                return {
                    id: mod.module_id,
                    name: mod.title.split(':')[0] === 'Chapter' ? mod.title.split(':')[1].trim() : mod.title.trim(),
                    mastery: avgMastery,
                    atoms
                };
            });

            activeSubjects.push({
                id: 'math',
                name: 'Maths Era',
                icon: '🎀',
                color: 'from-[#FFDEE9] to-[#B5FFFC]',
                accent: '#FF8DA1',
                hasAtoms: true,
                completedToday: completedSubjects.has('math'),
                modules: mathModules
            });
        }

        // Vocabulary Logic (Distinct from English)
        if (enrolled.includes('english') || enrolled.length === 0) {
            const vocabModules = VOCAB_CHAPTERS.map(ch => ({
                id: ch.id,
                name: `${ch.e} ${ch.n}`,
                mastery: 0, // Default 0 for now
                status: 'New',
                description: ch.details
            }));

            activeSubjects.push({
                id: 'vocabulary',
                name: 'Vocabulary Era',
                icon: '📚',
                color: 'from-[#a18cd1] to-[#fbc2eb]', // Misty Purple -> Pink
                accent: '#a18cd1',
                hasAtoms: false,
                completedToday: completedSubjects.has('vocabulary'),
                modules: vocabModules
            });
        }

        // Science Logic
        if (enrolled.includes('science') || enrolled.length === 0) {
            const scienceModules = SCIENCE_CHAPTERS.map(ch => ({
                id: ch.id,
                name: `${ch.e} ${ch.n}`,
                mastery: 0,
                status: 'New',
                description: ch.details,
                atoms: []
            }));

            activeSubjects.push({
                id: 'science',
                name: 'Science Era',
                icon: '🌸',
                color: 'from-[#E0C3FC] to-[#8EC5FC]',
                accent: '#A18CD1',
                hasAtoms: false,
                completedToday: completedSubjects.has('science'),
                modules: scienceModules
            });
        }

        // Tables Era Logic (Dynamic)
        const hasTablesData = !!(ninjaStats as any).tables_config;

        if (enrolled.includes('tables') || enrolled.length === 0 || hasTablesData) {
            let tablesScore = 0;
            const tConfig = (ninjaStats as any).tables_config;

            if (tConfig && tConfig.tableStats) {
                // New System Calculation
                const userClass = parseInt(String((ninjaStats as any).class || (ninjaStats as any).grade || 2));
                const isAdvanced = userClass >= 7;
                const maxTable = isAdvanced ? 20 : 12;
                const minTable = 2;
                const totalTables = maxTable - minTable + 1;

                let masteredCount = 0;
                for (let i = minTable; i <= maxTable; i++) {
                    const s = tConfig.tableStats[i];
                    const isMastered = s && (s.status === 'MASTERED' || (s.accuracy >= 90 && s.totalAttempts > 10));
                    if (isMastered) {
                        masteredCount++;
                    }
                }
                tablesScore = Math.round((masteredCount / totalTables) * 100);
            } else {
                // Legacy System Fallback
                tablesScore = calculateWeightedTableMastery(ninjaStats?.mastery || {});
            }

            activeSubjects.push({
                id: 'tables',
                name: 'Table Era',
                icon: '🍬',
                color: 'from-[#84fab0] to-[#8fd3f4]',
                accent: '#43e97b',
                completedToday: completedSubjects.has('tables'),
                modules: [
                    {
                        id: 't_comprehensive',
                        name: 'Tables 1-20',
                        mastery: tablesScore,
                        atoms: []
                    }
                ]
            });
        }

        // Other Subjects
        SUBJECT_TEMPLATE.forEach(tpl => {
            // Filter duplicate/conflicting IDs
            if (tpl.id === 'vocabulary') return;
            if (tpl.id === 'science') return;
            if (tpl.id === 'tables') return; // Handled explicitly above

            if (enrolled.includes(tpl.id) || enrolled.length === 0) {
                // Clone and properly set completedToday
                activeSubjects.push({
                    ...tpl,
                    completedToday: completedSubjects.has(tpl.id)
                });
            }
        });

        setSubjects(activeSubjects);
    }, [ninjaStats, user, completedSubjects]);

    return subjects;
};
