export const VOCAB_CHAPTERS = [
    { "id": "w1", "n": "The Power of Prefixes", "e": "🏗️", "details": "Focus on un-, dis-, re-, pre-, mis-." },
    { "id": "w2", "n": "Suffixes & Word Types", "e": "🏷️", "details": "Focus on -able, -ment, -ness, -ity." },
    { "id": "w3", "n": "Synonyms & Nuance", "e": "🎭", "details": "Difference between 'good', 'excellent', 'sublime'." },
    { "id": "w4", "n": "Antonyms in Action", "e": "🌓", "details": "Learning words through their opposites." },
    { "id": "w5", "n": "Context Clue Detective", "e": "🔍", "details": "Identifying meanings using hints." },
    { "id": "w6", "n": "Collocations: Natural Pairs", "e": "🤝", "details": "Words that naturally go together." },
    { "id": "w7", "n": "Idioms: Beyond the Literal", "e": "🥨", "details": "Common English idioms." },
    { "id": "w8", "n": "Phrasal Verbs: Part 1", "e": "🏃", "details": "Movement verbs: get away, run into." },
    { "id": "w9", "n": "Words of the Natural World", "e": "🌿", "details": "Ecology, conservation, biodiversity." },
    { "id": "w10", "n": "Travel & Exploration", "e": "🧭", "details": "Itinerary, expedition, navigation." },
    { "id": "w11", "n": "The Language of Conflict", "e": "⚔️", "details": "Valor, fortress, treaty, siege." },
    { "id": "w12", "n": "Describing Personalities", "e": "👤", "details": "Meticulous, arrogant, empathetic." },
    { "id": "w13", "n": "Academic & Formal English", "e": "🎓", "details": "Inquire, purchase, reside, commence." },
    { "id": "w14", "n": "Figurative: Similes & Metaphors", "e": "✨", "details": "Comparisons and descriptions." },
    { "id": "w15", "n": "Hyperbole & Personification", "e": "🗣️", "details": "Exaggeration and human traits." },
    { "id": "w16", "n": "Homophones & Confusing Pairs", "e": "👯", "details": "Complement/Compliment, Principal/Principle." },
    { "id": "w17", "n": "The Language of Technology", "e": "🛡️", "details": "Encryption, vulnerability, algorithm." },
    { "id": "w18", "n": "Emotional Intelligence", "e": "🧠", "details": "Melancholy, serenity, resilience." },
    { "id": "w19", "n": "The Arts & Culture", "e": "🎨", "details": "Aesthetic, rhythm, classical, legacy." },
    { "id": "w20", "n": "Persuasion & Debate", "e": "⚖️", "details": "Consequently, fundamentally, nevertheless." }
];

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

export const GEN_Z_GREETINGS = [
    "Let's get this bread 🍞", "Main character energy ✨", "Slay the day 💅", "No cap, you got this 🧢", "Vibe check passed ✅",
    "It's giving genius 🧠", "CEO of learning 💼", "Manifesting 100% 🕯️", "Stay hydrated & educated 💧", "Big brain time 🤯",
    "Lowkey unstoppable 🚀", "Highkey crushing it 🔥", "Woke up and chose success ☀️", "Sending positive vibes 📡", "Level up season 📈",
    "Your potential is viral 🦠", "Straight fire today 🔥", "Periodt. 💅", "Icon behavior 🌟", "Living rent-free in success 🏠",
    "Sheesh! Look at you go 🥶", "Glow up loading... ⏳", "Caught in 4K being smart 📸", "Bet on yourself 🤝", "Hits different when you study 📚",
    "POV: You're crushing it 🎥", "Certified genius badge 📛", "Entering your winning era 🏆", "Mindset: Guccier than Gucci 👜", "Brain looking swole 💪",
    "Don't sleep on your goals 😴", "Finna ace this quiz 💯", "Simply iconic 🖼️", "The moment is now ⏱️", "Secure the knowledge bag 💰",
    "Serving intelligence 🍽️", "Gatekeeping good grades 🚫", "Understood the assignment 📝", "Valid effort only ✅", "Snapping on these questions 🫰",
    "A whole mood 🌈", "Just built different 🏗️", "Academic weapon activated ⚔️", "Go off, bestie 👯", "Yeet the doubt 🚮",
    "Cheugy-free zone 🚫", "Drip or drown? We maximize 💧", "Clout chaser? No, grade chaser 🏃", "Simping for success 😍", "Zoomer zoomer zoom 🏎️"
];
