export const SUBJECT_TEMPLATE = [
    {
        id: 'science',
        name: 'Science Era',
        icon: '🌸',
        color: 'from-[#E0C3FC] to-[#8EC5FC]',
        accent: '#A18CD1',
        completedToday: false,
        modules: [
            {
                id: 's_bio',
                name: 'Biology Basics',
                mastery: 45,
                atoms: [
                    { id: 's1', name: 'Photosynthesis', mastery: 90, status: 'Mastered' },
                    { id: 's2', name: 'Cell Structure', mastery: 10, status: 'New' }
                ]
            }
        ]
    },
    {
        id: 'gk',
        name: 'GK Era',
        icon: '✨',
        color: 'from-[#fdfcfb] to-[#e2d1c3]',
        accent: '#D4A373',
        completedToday: true,
        hasAtoms: false,
        modules: [
            { id: 'g1', name: 'The Indian Constitution', mastery: 0 },
            { id: 'g2', name: 'State Government Functions', mastery: 0 },
            { id: 'g3', name: 'Women Pioneers & Reformers', mastery: 0 },
            { id: 'g4', name: 'The Indian Judicial System', mastery: 0 },
            { id: 'g5', name: 'India in Space (ISRO 2026)', mastery: 0 },
            { id: 'g6', name: 'Renewable Energy & Sustainability', mastery: 0 },
            { id: 'g7', name: 'Cyber Safety & Digital Literacy', mastery: 0 },
            { id: 'g8', name: 'Artificial Intelligence (AI)', mastery: 0 },
            { id: 'g9', name: 'Sustainable Development Goals', mastery: 0 },
            { id: 'g10', name: 'The Himalayan Ecosystem', mastery: 0 },
            { id: 'g11', name: 'Major World Rivers', mastery: 0 },
            { id: 'g12', name: 'Wildlife Conservation in India', mastery: 0 },
            { id: 'g13', name: 'Medieval India Highlights', mastery: 0 },
            { id: 'g14', name: 'Classical Dances & Culture', mastery: 0 },
            { id: 'g15', name: 'Bhakti & Sufi Movements', mastery: 0 },
            { id: 'g16', name: 'Basic Economics & RBI', mastery: 0 },
            { id: 'g17', name: 'International Organizations', mastery: 0 },
            { id: 'g18', name: 'Literature & Famous Authors', mastery: 0 },
            { id: 'g19', name: 'Sports Icons & Achievements', mastery: 0 },
            { id: 'g20', name: 'Health, Wellness & Nutrition', mastery: 0 }
        ]
    },
    {
        id: 'english',
        name: 'English Era',
        icon: '💌',
        color: 'from-[#f6d365] to-[#fda085]',
        accent: '#f093fb',
        completedToday: true,
        modules: [
            {
                id: 'e_gram',
                name: 'Grammar',
                mastery: 60,
                atoms: [
                    { id: 'e1', name: 'Tenses', mastery: 75, status: 'Learning' }
                ]
            }
        ]
    },
    {
        id: 'tables',
        name: 'Table Era',
        icon: '🍬',
        color: 'from-[#84fab0] to-[#8fd3f4]',
        accent: '#43e97b',
        completedToday: false,
        modules: [
            {
                id: 't_basics',
                name: 'Foundations',
                mastery: 82,
                atoms: [
                    { id: 't1', name: 'Tables 2-12', mastery: 100, status: 'Mastered' }
                ]
            }
        ]
    }
];
