import React, { useState, useEffect, useMemo } from 'react';
import {
    LayoutDashboard,
    BookOpen,
    Trophy,
    CheckCircle2,
    Circle,
    TrendingUp,
    Zap,
    Target,
    ChevronRight,
    Search,
    Calendar,
    Star,
    Flame,
    User as UserIcon,
    MoreVertical,
    ArrowUpRight,
    Layers,
    Heart,
    Sparkles,
    Cloud,
    Moon,
    Coffee,
    Palette
} from 'lucide-react';
import { useNinja } from '../../../context/NinjaContext';
import { useNavigate } from 'react-router-dom';
import coreCurriculum from '../../../data/cbse7_core_curriculum_v3.json';

/**
 * REFINED AESTHETIC DATA STRUCTURE
 * Subjects -> Modules (Chapters) -> ATOMs (Concepts)
 */
const SUBJECT_TEMPLATE = [
    // Math will be generated dynamically
    {
        id: 'science',
        name: 'Science Era',
        icon: '🌸',
        color: 'from-[#E0C3FC] to-[#8EC5FC]', // Lavender to Blue
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
        color: 'from-[#fdfcfb] to-[#e2d1c3]', // Cream to Sand
        accent: '#D4A373',
        completedToday: true,
        modules: [
            {
                id: 'g_geo',
                name: 'Geography',
                mastery: 92,
                atoms: [
                    { id: 'g1', name: 'World Capitals', mastery: 95, status: 'Mastered' }
                ]
            }
        ]
    },
    {
        id: 'vocabulary',
        name: 'Vocab Era',
        icon: '☁️',
        color: 'from-[#a1c4fd] to-[#c2e9fb]', // Soft Blue
        accent: '#4facfe',
        completedToday: false,
        modules: [
            {
                id: 'v_eng',
                name: 'Word Power',
                mastery: 30,
                atoms: [
                    { id: 'v1', name: 'Prefixes', mastery: 60, status: 'Learning' }
                ]
            }
        ]
    },
    {
        id: 'english',
        name: 'English Era', // Assuming 'english' might be an ID if added later, currently mostly mapped to 'vocabulary' or separate
        icon: '💌',
        color: 'from-[#f6d365] to-[#fda085]', // Peach
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
        color: 'from-[#84fab0] to-[#8fd3f4]', // Mint to Sky
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

// Aesthetic Candy Progress Bar
const ProgressBar = ({ value, color, height = "h-2" }: { value: number, color?: string, height?: string }) => (
    <div className={`w-full bg-black/5 rounded-full ${height} overflow-hidden`}>
        <div
            className={`${height} rounded-full transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-[0_0_15px_-3px_rgba(0,0,0,0.1)]`}
            style={{
                width: `${value}%`,
                backgroundColor: color || '#FF8DA1',
                backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%)'
            }}
        />
    </div>
);

const StudyEraDashboard = () => {
    const { user, ninjaStats } = useNinja();
    const navigate = useNavigate();

    // Merge real data
    const [subjects, setSubjects] = useState<any[]>([]);

    useEffect(() => {
        // Filter template based on enrolled subjects
        const enrolled = ninjaStats?.enrolledSubjects || [];

        let activeSubjects: any[] = [];

        // 1. Build Math if enrolled
        if (enrolled.includes('math') || enrolled.length === 0) { // Default if empty
            const mathModules = coreCurriculum.modules.map(mod => {
                const moduleMastery = 0; // Aggregate from atoms later if needed

                const atoms = mod.atoms.map(atom => {
                    // Check mastery map
                    // @ts-ignore
                    const mScore = ninjaStats?.mastery?.[atom.atom_id] || 0;
                    let status = 'New';
                    if (mScore > 0.8) status = 'Mastered'; // Assuming mScore is 0-1
                    else if (mScore > 0.1) status = 'Learning';

                    return {
                        id: atom.atom_id,
                        name: atom.title.split('(')[0].trim(), // Shorten title
                        mastery: Math.round(mScore * 100), // Scale to 0-100
                        status
                    };
                });

                const avgMastery = atoms.length > 0 ? Math.round(atoms.reduce((acc, curr) => acc + curr.mastery, 0) / atoms.length) : 0;

                return {
                    id: mod.module_id,
                    name: mod.title.split(':')[0] === 'Chapter' ? mod.title.split(':')[1].trim() : mod.title.trim(), // Clean name
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
                completedToday: false, // Todo: check log
                modules: mathModules
            });
        }

        // 2. Add other subjects from template if enrolled
        SUBJECT_TEMPLATE.forEach(tpl => {
            if (enrolled.includes(tpl.id) || enrolled.length === 0) {
                activeSubjects.push(tpl);
            }
        });

        // Deduplicate if empty defaulted to all
        // ... handled by explicit checks above reasonably

        setSubjects(activeSubjects);

    }, [ninjaStats, user]);


    const [selectedSubject, setSelectedSubject] = useState<any>(null);
    const [viewMode, setViewMode] = useState<'modules' | 'atoms'>('modules');
    const [atomFilter, setAtomFilter] = useState('');
    const [greeting, setGreeting] = useState("Loading vibes...");

    // Set greeting and hydration effect
    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting("Good morning, Angel ☕");
        else if (hour < 18) setGreeting("Slay the afternoon 💅");
        else setGreeting("Evening routine... 🌙");
    }, []);

    const totalCompletedToday = subjects.filter(s => s.completedToday).length;

    // Total XP/Points (Growth that never drops)
    // Use real points if available, else sum up mastery
    const auraPoints = ninjaStats?.powerPoints || 0;

    // Overall quality of covered curriculum
    // Use real mastery if possible. For now derived from the template/merged data
    const academicAura = useMemo(() => {
        let totalMastery = 0;
        let totalAtoms = 0;
        subjects.forEach(s => s.modules.forEach((m: any) => m.atoms.forEach((a: any) => {
            totalMastery += a.mastery;
            totalAtoms++;
        })));
        return totalAtoms === 0 ? 0 : Math.round(totalMastery / totalAtoms);
    }, [subjects]);

    const filteredAtoms = useMemo(() => {
        if (!selectedSubject) return [];
        let atoms: any[] = [];
        selectedSubject.modules.forEach((mod: any) => {
            mod.atoms.forEach((atom: any) => {
                atoms.push({ ...atom, moduleName: mod.name });
            });
        });
        if (atomFilter) {
            return atoms.filter(a =>
                a.name.toLowerCase().includes(atomFilter.toLowerCase()) ||
                a.moduleName.toLowerCase().includes(atomFilter.toLowerCase())
            );
        }
        return atoms;
    }, [selectedSubject, atomFilter]);

    if (!user) return <div className="p-20 text-center">Loading your era...</div>;

    return (
        <div className="min-h-screen bg-[#FAF9F6] text-[#4A4A4A] font-sans selection:bg-pink-100 overflow-x-hidden">

            {/* --- BACKGROUND DECORATION (Aura Blobs) --- */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-pink-100/50 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[30vw] h-[30vw] bg-purple-100/40 rounded-full blur-[100px]"></div>
                <div className="absolute top-[20%] left-[10%] w-[20vw] h-[20vw] bg-blue-50/30 rounded-full blur-[80px]"></div>
            </div>

            <div className="relative max-w-[1400px] mx-auto p-4 md:p-8 lg:p-12">

                {/* --- HEADER ERA --- */}
                <header className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm text-pink-400 border border-pink-50">{ninjaStats?.profile?.class || '7'}th Grade Elite</span>
                            <span className="text-pink-300">✦</span>
                            <span className="text-gray-300 text-[10px] uppercase font-bold tracking-widest tracking-[0.1em]">Student Dashboard</span>
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-serif italic text-gray-800 tracking-tight leading-tight">
                            {greeting}
                        </h1>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden lg:flex flex-col items-end">
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Daily Progress</p>
                            <div className="flex gap-1 mt-1">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className={`w-1.5 h-4 rounded-full ${i < totalCompletedToday ? 'bg-pink-300' : 'bg-gray-100'}`}></div>
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/profile')}
                            className="flex items-center gap-3 bg-white/40 backdrop-blur-xl p-2 pr-4 rounded-full border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:bg-white/60 transition-all cursor-pointer"
                        >
                            <div className="w-12 h-12 bg-gradient-to-tr from-pink-200 to-rose-300 rounded-full flex items-center justify-center text-white shadow-inner border-2 border-white">
                                <UserIcon size={20} />
                            </div>
                            <div className="text-left">
                                <p className="text-xs font-black text-gray-800 leading-none">{ninjaStats?.username || user.displayName || 'Student Era'}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <Flame size={12} className="text-orange-400" fill="currentColor" />
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">{ninjaStats?.streakCount || 0} Streak</span>
                                </div>
                            </div>
                        </button>
                    </div>
                </header>

                {/* --- MAIN BENTO GRID --- */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* LEFT SECTION: Content & Cards */}
                    <div className="lg:col-span-8 space-y-10">

                        {/* STATS OVERVIEW */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                            {/* CHECKLIST CARD */}
                            <div className="md:col-span-2 bg-white/60 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/80 shadow-[0_20px_50px_rgba(0,0,0,0.03)] relative overflow-hidden group">
                                <div className="flex justify-between items-start mb-6 relative z-10">
                                    <div>
                                        <h3 className="text-xl font-serif italic text-gray-800">Today's Focus</h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                            {totalCompletedToday} of {subjects.length} Completed
                                        </p>
                                    </div>
                                    <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-50 text-pink-400">
                                        <Sparkles size={20} />
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 relative z-10">
                                    {subjects.map((s) => (
                                        <div
                                            key={s.id}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-wider transition-all duration-500 ${s.completedToday
                                                ? 'bg-white border-pink-100 text-pink-500 shadow-sm scale-105'
                                                : 'bg-gray-50/50 border-gray-100 text-gray-300'
                                                }`}
                                        >
                                            <span className={s.completedToday ? '' : 'grayscale opacity-50'}>{s.icon}</span>
                                            {s.name.split(' ')[0]}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* XP CARD */}
                            <div className="bg-[#1A1A1A] text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-between group">
                                <div className="relative z-10">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Total Aura</p>
                                    <h4 className="text-4xl font-black mt-2 tracking-tighter group-hover:scale-105 transition-transform origin-left">
                                        {auraPoints.toLocaleString()} <span className="text-xs font-normal text-white/40 tracking-normal ml-1">pts</span>
                                    </h4>
                                </div>
                                <div className="flex justify-between items-end relative z-10">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-white/60">Top 1% Class</p>
                                        <div className="flex gap-0.5">
                                            {[...Array(3)].map((_, i) => <Star key={i} size={10} fill="#FFD700" className="text-[#FFD700]" />)}
                                        </div>
                                    </div>
                                    <TrendingUp className="text-emerald-400" size={24} />
                                </div>
                                {/* Dark aesthetic blobs */}
                                <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-pink-500/20 rounded-full blur-3xl"></div>
                            </div>
                        </div>

                        {/* SUBJECTS GRID */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-gray-400">Current Eras</h2>
                                <button className="text-[10px] font-bold text-pink-400 uppercase tracking-widest hover:underline decoration-2 underline-offset-4">View All Curriculum</button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                {subjects.map((subject) => {
                                    const mastery = Math.round(subject.modules.reduce((a: number, b: any) => a + b.mastery, 0) / subject.modules.length);
                                    const isSelected = selectedSubject?.id === subject.id;

                                    return (
                                        <button
                                            key={subject.id}
                                            onClick={() => {
                                                setSelectedSubject(subject);
                                                setViewMode('modules');
                                            }}
                                            className={`group relative p-8 rounded-[3rem] border-2 text-left transition-all duration-500 overflow-hidden ${isSelected
                                                ? 'bg-white border-pink-200 shadow-[0_30px_60px_-15px_rgba(255,141,161,0.15)] -translate-y-2'
                                                : 'bg-white/40 border-white shadow-sm hover:bg-white hover:border-pink-50 hover:shadow-xl hover:shadow-gray-100 hover:-translate-y-1'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-8 relative z-10">
                                                <div className={`w-14 h-14 rounded-[2rem] bg-gradient-to-br ${subject.color} flex items-center justify-center text-3xl shadow-sm group-hover:rotate-12 transition-transform duration-500`}>
                                                    {subject.icon}
                                                </div>
                                                {subject.completedToday && (
                                                    <div className="w-6 h-6 bg-pink-50 rounded-full flex items-center justify-center text-pink-400 border border-pink-100 shadow-sm">
                                                        <CheckCircle2 size={14} fill="currentColor" stroke="white" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="relative z-10">
                                                <h4 className="font-serif italic text-lg text-gray-800 leading-tight group-hover:text-pink-500 transition-colors">
                                                    {subject.name}
                                                </h4>
                                                <div className="flex justify-between items-end mt-4">
                                                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Mastery</span>
                                                    <span className="text-xs font-black text-gray-800">{mastery}%</span>
                                                </div>
                                                <div className="mt-2">
                                                    <ProgressBar value={mastery} color={subject.accent} />
                                                </div>
                                            </div>

                                            {/* Abstract glass highlight */}
                                            <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-white/40 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT SECTION: Detailed Curriculum "Journal" */}
                    <div className="lg:col-span-4 sticky top-8">
                        <div className="bg-white/70 backdrop-blur-3xl rounded-[3.5rem] border border-white shadow-[0_40px_100px_rgba(0,0,0,0.05)] h-full min-h-[700px] flex flex-col overflow-hidden">

                            {!selectedSubject ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-8 animate-in fade-in zoom-in duration-700">
                                    <div className="relative">
                                        <div className="w-32 h-32 bg-pink-50 rounded-full flex items-center justify-center text-6xl shadow-inner border border-white">
                                            🎀
                                        </div>
                                        <div className="absolute -top-2 -right-2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center animate-bounce">
                                            ✨
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-serif italic text-gray-800">What's the Move?</h3>
                                        <p className="text-sm text-gray-400 font-medium px-4">Choose a subject to dive into your personal learning era.</p>
                                    </div>
                                    <div className="w-full max-w-[200px] h-[1px] bg-gradient-to-r from-transparent via-pink-100 to-transparent"></div>
                                    <div className="space-y-4 w-full">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300">Daily Recs</p>
                                        <div className="p-4 bg-white/40 rounded-3xl border border-white text-left flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-400">
                                                <Coffee size={18} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-800 leading-tight">Quick Review</p>
                                                <p className="text-[10px] text-gray-400">Linear Equations (10m)</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col h-full animate-in slide-in-from-right-8 duration-500 ease-out">

                                    {/* HEADER OF JOURNAL */}
                                    <div className={`p-8 bg-gradient-to-br ${selectedSubject.color} relative overflow-hidden`}>
                                        <div className="flex justify-between items-center mb-8 relative z-10">
                                            <button
                                                onClick={() => setSelectedSubject(null)}
                                                className="bg-white/80 p-3 rounded-[1.25rem] text-gray-400 hover:text-pink-400 transition-colors shadow-sm"
                                            >
                                                <ChevronRight className="rotate-180" size={20} />
                                            </button>
                                            <div className="bg-white/30 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/40">
                                                <p className="text-[9px] font-black text-white uppercase tracking-widest leading-none">Overall Quality: {academicAura}%</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-5 relative z-10 mb-8">
                                            <div className="text-5xl drop-shadow-sm">{selectedSubject.icon}</div>
                                            <div>
                                                <h3 className="text-3xl font-serif italic text-white leading-none tracking-tight">
                                                    {selectedSubject.name}
                                                </h3>
                                                <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mt-2">Curriculum Map</p>
                                            </div>
                                        </div>

                                        {/* GLASS TABS */}
                                        <div className="flex bg-black/5 backdrop-blur-xl rounded-2xl p-1.5 relative z-10 border border-white/20 shadow-inner">
                                            <button
                                                onClick={() => setViewMode('modules')}
                                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${viewMode === 'modules' ? 'bg-white text-gray-800 shadow-sm scale-[1.02]' : 'text-white/60 hover:text-white'}`}
                                            >
                                                <Layers size={14} /> Chapters
                                            </button>
                                            <button
                                                onClick={() => setViewMode('atoms')}
                                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${viewMode === 'atoms' ? 'bg-white text-gray-800 shadow-sm scale-[1.02]' : 'text-white/60 hover:text-white'}`}
                                            >
                                                <Target size={14} /> ATOMs
                                            </button>
                                        </div>

                                        {/* Abstract decorative circles */}
                                        <div className="absolute top-[-20%] left-[-10%] w-48 h-48 bg-white/20 rounded-full blur-3xl"></div>
                                        <div className="absolute bottom-[-20%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                                    </div>

                                    {/* CONTENT AREA */}
                                    <div className="p-8 flex-1 overflow-y-auto">
                                        {viewMode === 'modules' ? (
                                            <div className="space-y-6">
                                                <div className="flex justify-between items-center px-1">
                                                    <p className="text-[10px] font-black uppercase text-gray-300 tracking-widest">Mastery per Chapter</p>
                                                    <p className="text-[10px] font-bold text-gray-400">{selectedSubject.modules.length} Modules</p>
                                                </div>
                                                <div className="space-y-4">
                                                    {selectedSubject.modules.map((mod: any) => (
                                                        <div key={mod.id} className="p-6 bg-gray-50/40 rounded-[2rem] border border-gray-100 hover:bg-white hover:border-pink-100 hover:shadow-xl hover:shadow-gray-50 transition-all duration-500 group">
                                                            <div className="flex justify-between items-center mb-4">
                                                                <h5 className="font-serif italic text-gray-700 text-lg group-hover:text-pink-500 transition-colors">{mod.name}</h5>
                                                                <span className="text-xs font-black text-gray-800">{mod.mastery}%</span>
                                                            </div>
                                                            <ProgressBar value={mod.mastery} color={selectedSubject.accent} height="h-1.5" />
                                                            <div className="mt-4 flex justify-between items-center">
                                                                <div className="flex -space-x-1">
                                                                    {[...Array(3)].map((_, i) => <div key={i} className={`w-3 h-3 rounded-full border border-white ${i < Math.floor(mod.mastery / 30) ? 'bg-pink-300' : 'bg-gray-200'}`}></div>)}
                                                                </div>
                                                                <button
                                                                    onClick={() => setViewMode('atoms')}
                                                                    className="text-[10px] font-black uppercase tracking-widest text-pink-400 hover:underline underline-offset-4 decoration-2"
                                                                >
                                                                    Details
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                {/* SEARCH/FILTER */}
                                                <div className="relative group">
                                                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-pink-400 transition-colors" size={16} />
                                                    <input
                                                        type="text"
                                                        placeholder="Find a concept..."
                                                        className="w-full bg-gray-50/50 border-2 border-transparent focus:border-pink-50 focus:bg-white rounded-[1.5rem] py-4 pl-14 pr-6 text-xs font-bold text-gray-700 transition-all outline-none shadow-inner"
                                                        value={atomFilter}
                                                        onChange={(e) => setAtomFilter(e.target.value)}
                                                    />
                                                </div>

                                                <div className="space-y-4">
                                                    {filteredAtoms.length > 0 ? (
                                                        filteredAtoms.map((atom: any) => (
                                                            <div key={atom.id} className="p-5 bg-white rounded-[2rem] border border-gray-50 shadow-sm hover:shadow-md hover:border-pink-100 transition-all group">
                                                                <div className="flex justify-between items-start mb-4">
                                                                    <div>
                                                                        <p className="text-[9px] text-pink-300 font-black uppercase tracking-widest mb-1">{atom.moduleName}</p>
                                                                        <h5 className="font-serif italic text-gray-700 leading-snug group-hover:text-pink-500 transition-colors">{atom.name}</h5>
                                                                    </div>
                                                                    <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${atom.status === 'Mastered' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' :
                                                                        atom.status === 'Learning' ? 'bg-blue-50 text-blue-500 border-blue-100' : 'bg-orange-50 text-orange-400 border-orange-100'
                                                                        }`}>
                                                                        {atom.status}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-4">
                                                                    <div className="flex-1">
                                                                        <ProgressBar value={atom.mastery} color={atom.mastery > 80 ? '#34d399' : selectedSubject.accent} height="h-1" />
                                                                    </div>
                                                                    <span className="text-[10px] font-black text-gray-300">{atom.mastery}%</span>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-center py-20 text-gray-300 font-serif italic text-lg opacity-60">
                                                            No concepts found in this era... 🔎
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* CTA AT BOTTOM OF JOURNAL */}
                                    <div className="p-8 border-t border-gray-50 bg-gray-50/20 backdrop-blur-md">
                                        <button className="w-full py-5 bg-[#1A1A1A] text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-pink-500 transition-all shadow-[0_20px_40px_rgba(0,0,0,0.1)] active:scale-95">
                                            Start Assessment
                                            <Zap size={18} fill="currentColor" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- CUSTOM FLOATING DOCK (Mobile Only) --- */}
                <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/60 backdrop-blur-2xl border border-white rounded-full p-2 flex items-center gap-2 shadow-[0_30px_60px_rgba(0,0,0,0.1)] md:hidden z-50">
                    <button className="w-12 h-12 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-lg"><LayoutDashboard size={20} /></button>
                    <button className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-pink-400"><BookOpen size={20} /></button>
                    <button className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-pink-400"><Target size={20} /></button>
                    <button className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-pink-400"><Palette size={20} /></button>
                </nav>

                {/* Padding for dock */}
                <div className="h-24 md:hidden"></div>
            </div>
        </div>
    );
};

export default StudyEraDashboard;
