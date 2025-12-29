import React, { useState, useEffect, useMemo } from 'react';
import {
    Activity,
    BarChart3,
    BrainCircuit,
    Target,
    Zap,
    Microscope,
    AlertTriangle,
    CheckCircle2,
    MessageCircle,
    ArrowRight,
    TrendingUp,
    Radar,
    Search,
    Lightbulb
} from 'lucide-react';
import { adminService } from '../../services/admin';
import { QuestionStats, IntelligenceAction } from '../../types/admin';

// ============================================================================
// TYPES & MOCKS (Mocking data that isn't fully in DB yet for V2 Demo)
// ============================================================================

const STUDENT_VOICE_MOCKS = [
    { id: 1, atom: "Variable Isolation", wrongAnswer: "x = 42", context: "Adding instead of Subtracting", type: "Logic Error" },
    { id: 2, atom: "Area of Trapezoids", wrongAnswer: "Area = 12", context: "Confused height with slant edge", type: "Misconception" },
    { id: 3, atom: "Integers", wrongAnswer: "-5 + -3 = 8", context: "Thinking two negatives make a positive in addition", type: "Rule Confusion" },
    { id: 4, atom: "Ratios", wrongAnswer: "2:3 = 3:2", context: "Reversed order—doesn't see ratio as directional", type: "Concept Gap" },
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const KPI_Card = ({ title, value, subtext, icon: Icon, color }: any) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
            <Icon size={64} />
        </div>
        <div className="flex items-center gap-2 mb-2">
            <div className={`p-2 rounded-lg ${color} bg-opacity-10 text-slate-700`}>
                <Icon size={18} />
            </div>
            <h3 className="font-semibold text-slate-600 text-sm">{title}</h3>
        </div>
        <div className="text-3xl font-bold text-slate-800 mb-1">{value}</div>
        <div className="text-xs text-slate-400 font-medium">{subtext}</div>
    </div>
);

const ActionCard = ({ action }: { action: IntelligenceAction }) => {
    const isHigh = action.priority === 'HIGH';
    return (
        <div className={`p-5 rounded-xl border-l-4 shadow-sm transition-all hover:-translate-y-1 ${isHigh ? 'bg-purple-50 border-purple-500' : 'bg-amber-50 border-amber-500'}`}>
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <Zap className={`w-4 h-4 ${isHigh ? 'text-purple-600' : 'text-amber-600'}`} />
                    <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider ${isHigh ? 'bg-purple-200 text-purple-800' : 'bg-amber-200 text-amber-800'}`}>
                        {action.type}
                    </span>
                </div>
                <span className="text-[10px] font-bold text-slate-400">AI DETECTED</span>
            </div>
            <h4 className="font-bold text-slate-900 mb-1">{action.title}</h4>
            <p className="text-sm text-slate-600 mb-3">{action.description}</p>

            <div className="bg-white/60 p-3 rounded-lg border border-slate-100">
                <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                    <BrainCircuit size={12} /> WHY THIS MATTERS:
                </div>
                <p className="text-xs text-slate-700 italic">"{action.reasoning}"</p>
            </div>
        </div>
    );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AdminIntelligenceReport: React.FC = () => {
    const [stats, setStats] = useState<QuestionStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'RADAR' | 'ACTIONS'>('ACTIONS');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await adminService.getQuestionStats();
            setStats(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // --- INTELLIGENCE ENGINE ---
    const intelligence = useMemo(() => {
        if (!stats.length) return null;

        // 1. Atom Analysis
        const atomCounts: Record<string, number> = {};
        stats.forEach(q => {
            const atom = q.atom || 'Uncategorized';
            atomCounts[atom] = (atomCounts[atom] || 0) + 1;
        });

        // 2. Generate ACTIONS (Heuristic AI)
        const actions: IntelligenceAction[] = [];

        // Rule 1: Low Coverage on vital atoms
        Object.entries(atomCounts).forEach(([atom, count]) => {
            if (count < 3 && atom !== 'Uncategorized') {
                actions.push({
                    id: `gap_${atom}`,
                    type: 'GAP_FILL',
                    priority: 'HIGH',
                    title: `Content Gap: ${atom}`,
                    description: `Only ${count} questions found for '${atom}'. This exposes students to guessing.`,
                    reasoning: "The 'Ratio as a Fraction' atom requires at least 5 variants to prevent pattern matching.",
                    targetAtom: atom,
                    suggestedTemplate: 'MATCHING' // Default suggestion
                });
            }
        });

        // Rule 2: Abstract questions need Context (7th Grade Girls Persona)
        const abstractQs = stats.filter(q => q.topic === 'Algebra' && (q.statement.includes('x') || q.statement.includes('y')));
        if (abstractQs.length > 5) {
            actions.push({
                id: 'context_algebra',
                type: 'REMEDIAL',
                priority: 'MEDIUM',
                title: "Contextualize Algebra",
                description: `Found ${abstractQs.length} abstract variable questions. Convert 5 to Storytelling format.`,
                reasoning: "Algebra questions using abstract x/y have 20% lower engagement. Try 'Architectural Design' or 'Recipe Scaling' contexts.",
                suggestedTemplate: 'TWO_TIER'
            });
        }

        // Rule 3: Distractor Analysis (Mocked check)
        // If we had granular stats, we'd check for high distractor pick rates.
        // For now, heuristic:
        actions.push({
            id: 'distractor_check',
            type: 'EXTENSION',
            priority: 'MEDIUM',
            title: "Review Distractor Efficacy",
            description: "Check 'Area of Trapezoids'. Current wrong answers may be too obvious.",
            reasoning: "If students finish Matching tasks in <10s, distractors aren't functioning. Increase complexity.",
            targetAtom: 'Geometry'
        });

        return {
            atomCounts,
            actions: actions.sort((a, b) => a.priority === 'HIGH' ? -1 : 1),
            totalAtoms: Object.keys(atomCounts).length,
            coverageScore: Math.min(100, Math.round((stats.length / (Object.keys(atomCounts).length * 5 || 1)) * 100)) // Crude "Vitality"
        };

    }, [stats]);


    if (loading) return (
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
                <BrainCircuit className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600" size={24} />
            </div>
            <p className="text-slate-500 animate-pulse font-medium">Running Gap Analysis...</p>
        </div>
    );

    if (!intelligence) return <div className="p-12 text-center">No data found.</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header with Philosophy */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                            <SparklesIcon /> Intelligence V2
                        </span>
                        <span className="text-slate-400 text-sm font-medium">7th Grade Math • Girls Cohort</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Content Gap Analysis</h1>
                    <p className="text-slate-500 mt-1 max-w-2xl text-sm">
                        Focusing on what is <span className="font-bold text-purple-600">missing</span> rather than what exists.
                        Prioritizing "Atoms" and Misconception coverage.
                    </p>
                </div>
                <div className="flex gap-3 mt-4 md:mt-0">
                    <button className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 text-sm font-bold shadow-sm hover:bg-slate-50 transition">
                        Export Report
                    </button>
                    <button className="px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-purple-700 hover:shadow-lg transition flex items-center gap-2">
                        <Zap size={16} /> Auto-Generate Tasks
                    </button>
                </div>
            </div>

            {/* KPI ROW - Vitality & Gap First Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <KPI_Card
                    title="Concept Vitality Score"
                    value={`${intelligence.coverageScore}%`}
                    subtext="Weighted coverage of all Atoms"
                    icon={Activity}
                    color="text-emerald-600 bg-emerald-500"
                />
                <KPI_Card
                    title="Active Misconceptions"
                    value={STUDENT_VOICE_MOCKS.length}
                    subtext="Patterns tracked in repository"
                    icon={Microscope}
                    color="text-amber-600 bg-amber-500"
                />
                <KPI_Card
                    title="Distractor Efficacy"
                    value="Low"
                    subtext="Students guessing correctly too often"
                    icon={Target}
                    color="text-red-500 bg-red-500"
                />
                <KPI_Card
                    title="Gap-Fill Actions"
                    value={intelligence.actions.length}
                    subtext="High priority recommendations"
                    icon={Lightbulb}
                    color="text-purple-600 bg-purple-500"
                />
            </div>

            <div className="grid grid-cols-12 gap-8">

                {/* LEFT COLUMN - RADAR & ACTIONS (8 Kols) */}
                <div className="col-span-12 lg:col-span-8 space-y-8">

                    {/* Module A: Content Gap Radar (Visual List for now) */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Radar className="text-blue-500" size={20} />
                                Content Gap Radar
                            </h3>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Scanning {intelligence.totalAtoms} Atoms
                            </div>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(intelligence.atomCounts).slice(0, 6).map(([atom, count]) => (
                                <div key={atom} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-white hover:border-blue-200 hover:shadow-sm transition-all group cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${count < 3 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                                        <span className="font-medium text-slate-700">{atom}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-slate-400 font-mono">{count} Qs</span>
                                        {count < 3 && (
                                            <button className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                                + CREATE
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Module B: Next-Best-Action Engine */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 px-1">
                            <BrainCircuit className="text-purple-600" size={20} />
                            AI Suggestions <span className="text-slate-400 font-normal text-sm ml-2">Next Best Actions</span>
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            {intelligence.actions.map(action => (
                                <ActionCard key={action.id} action={action} />
                            ))}
                            {intelligence.actions.length === 0 && (
                                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-400">
                                    All clear! No gap actions detected.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Module C: Misconception Tracker Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <AlertTriangle className="text-amber-500" size={20} />
                                Misconception Hotspots
                            </h3>
                        </div>
                        <div className="overflow-x-auto text-sm">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-slate-500 font-medium">
                                    <tr>
                                        <th className="p-4 pl-6">Atom</th>
                                        <th className="p-4">Top Misconception</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    <tr className="group hover:bg-slate-50 transition">
                                        <td className="p-4 pl-6 font-bold text-slate-700">Variable Isolation</td>
                                        <td className="p-4 text-slate-600">"Adding instead of Subtracting"</td>
                                        <td className="p-4"><Badge type="LOW_COVERAGE" /></td>
                                        <td className="p-4 text-purple-600 font-bold group-hover:underline cursor-pointer">Add Matching Qs</td>
                                    </tr>
                                    <tr className="group hover:bg-slate-50 transition">
                                        <td className="p-4 pl-6 font-bold text-slate-700">Trapezoids</td>
                                        <td className="p-4 text-slate-600">"Confusing Height with Slant"</td>
                                        <td className="p-4"><Badge type="HIGH_FAIL" /></td>
                                        <td className="p-4 text-purple-600 font-bold group-hover:underline cursor-pointer">Refine Two-Tier</td>
                                    </tr>
                                    <tr className="group hover:bg-slate-50 transition">
                                        <td className="p-4 pl-6 font-bold text-slate-700">Negatives</td>
                                        <td className="p-4 text-slate-600">"Negative + Negative = Positive"</td>
                                        <td className="p-4"><Badge type="ROBUST" /></td>
                                        <td className="p-4 text-slate-400">None</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

                {/* RIGHT COLUMN - STUDENT VOICE & PERSONA (4 Kols) */}
                <div className="col-span-12 lg:col-span-4 space-y-8">

                    {/* Student Voice Sidebar */}
                    <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-slate-200">
                        <div className="flex items-center gap-2 mb-6 border-b border-slate-700 pb-4">
                            <MessageCircle className="text-blue-400" />
                            <h3 className="font-bold">Student Voice Feed</h3>
                        </div>
                        <div className="space-y-4">
                            {STUDENT_VOICE_MOCKS.map(voice => (
                                <div key={voice.id} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] uppercase font-bold text-blue-300 tracking-wider opacity-80">{voice.atom}</span>
                                        <span className="text-[10px] text-slate-500">{voice.type}</span>
                                    </div>
                                    <div className="font-mono text-red-300 text-sm mb-2 bg-black/20 p-2 rounded border-l-2 border-red-500">
                                        "{voice.wrongAnswer}"
                                    </div>
                                    <p className="text-xs text-slate-400 italic">
                                        Context: {voice.context}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
                            <button className="text-xs text-blue-300 hover:text-white font-bold uppercase tracking-wider transition">
                                View Full Error Logs →
                            </button>
                        </div>
                    </div>

                    {/* Template Performance - "Persona Based" */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <TrendingUp size={18} className="text-emerald-500" />
                            Format Efficacy
                        </h3>
                        <p className="text-xs text-slate-500 mb-6"> Which formats work best for 7th grade girls?</p>

                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-bold text-slate-700">Two-Tier Questions</span>
                                    <span className="text-emerald-600 font-bold">High Insight</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2 mb-1">
                                    <div className="bg-emerald-500 h-2 rounded-full w-[92%]"></div>
                                </div>
                                <p className="text-xs text-slate-400">92% correlation between reasoning and answer.</p>
                            </div>

                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-bold text-slate-700">Matching</span>
                                    <span className="text-amber-600 font-bold">Too Easy</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2 mb-1">
                                    <div className="bg-amber-500 h-2 rounded-full w-[45%]"></div>
                                </div>
                                <p className="text-xs text-slate-400">Avg completion time &lt;10s. Distractors need complexity.</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

// Start Sparkles Icon for "V2" badge
const SparklesIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor" />
    </svg>
);

const Badge = ({ type }: { type: 'LOW_COVERAGE' | 'HIGH_FAIL' | 'ROBUST' }) => {
    if (type === 'LOW_COVERAGE') return <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded">⚠️ Low Coverage</span>;
    if (type === 'HIGH_FAIL') return <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded">🔴 High Failure</span>;
    return <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded">✅ Robust</span>;
};
