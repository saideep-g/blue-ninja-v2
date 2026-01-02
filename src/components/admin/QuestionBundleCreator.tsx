import React, { useState, useEffect } from 'react';
import {
    collection, query, where, getDocs, getDoc, addDoc, doc, updateDoc,
    serverTimestamp, writeBatch, increment, orderBy
} from 'firebase/firestore';
import { db } from '../../services/db/firebase';
import { QuestionBundleMetadata, SimplifiedQuestion } from '../../types/bundle';
import {
    Plus, Upload, FileJson, Save, Trash2,
    BookOpen, Layers, Clock, CheckCircle, AlertCircle,
    Search, Filter, Download, Check
} from 'lucide-react';

const SUBJECTS = [
    { id: 'math', name: 'Math' },
    { id: 'science', name: 'Science' },
    { id: 'words', name: 'Words (English)' },
    { id: 'world', name: 'World (Geography/GK)' },
    { id: 'logic', name: 'Logic & Reasoning' }
];

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function QuestionBundleCreator() {
    // --- State ---
    const [bundles, setBundles] = useState<QuestionBundleMetadata[]>([]);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<'list' | 'create' | 'upload'>('list');

    // Filters
    const [filterGrade, setFilterGrade] = useState<number | 'all'>('all');
    const [filterSubject, setFilterSubject] = useState<string>('all');

    // Create Form
    const [newBundle, setNewBundle] = useState({
        title: '',
        description: '',
        subject: 'math',
        grade: 2,
        icon: '📦', // Default emoji
        tags: [] as string[]
    });

    // Upload State
    const [selectedBundle, setSelectedBundle] = useState<QuestionBundleMetadata | null>(null);
    const [jsonContent, setJsonContent] = useState('');
    const [parsedQuestions, setParsedQuestions] = useState<SimplifiedQuestion[]>([]);
    const [existingQuestions, setExistingQuestions] = useState<SimplifiedQuestion[]>([]);
    const [uploading, setUploading] = useState(false);

    // --- Effects ---
    useEffect(() => {
        fetchBundles();
    }, []);

    useEffect(() => {
        if (view === 'upload' && selectedBundle) {
            fetchExistingQuestions(selectedBundle.id);
        }
    }, [view, selectedBundle]);

    // --- Actions ---

    // Architecture Note: We use a "Parallel Collection" pattern.
    // 'question_bundles' stores metadata (Title, Grade) -> Optimized for fast List Views.
    // 'question_bundle_data' stores the heavy content (Questions Map) -> Loaded only when editing.
    const fetchExistingQuestions = async (bundleId: string) => {
        try {
            const docRef = doc(db, 'question_bundle_data', bundleId);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                if (data.questions) {
                    // Convert Map to Array for display
                    const qList = Object.values(data.questions) as SimplifiedQuestion[];
                    setExistingQuestions(qList);
                }
            } else {
                setExistingQuestions([]);
            }
        } catch (e) {
            console.error("Failed to load questions", e);
        }
    };

    const fetchBundles = async () => {
        setLoading(true);
        try {
            const ref = collection(db, 'question_bundles');
            const q = query(ref, orderBy('updatedAt', 'desc'));
            const snap = await getDocs(q);
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as QuestionBundleMetadata));
            setBundles(list);
        } catch (e) {
            console.error("Fetch failed", e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBundle = async () => {
        if (!newBundle.title) return;
        setLoading(true);
        try {
            const ref = collection(db, 'question_bundles');
            await addDoc(ref, {
                ...newBundle,
                questionCount: 0,
                isActive: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            await fetchBundles();
            setView('list');
            setNewBundle({ title: '', description: '', subject: 'math', grade: 2, icon: '📦', tags: [] });
        } catch (e) {
            console.error("Create failed", e);
            alert("Failed to create bundle");
        } finally {
            setLoading(false);
        }
    };

    const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = event.target?.result as string;
                setJsonContent(json);
                const parsed = JSON.parse(json);

                // Support both legacy Array and new Object format
                let questionsArray = [];
                if (Array.isArray(parsed)) {
                    questionsArray = parsed;
                } else if (parsed && Array.isArray(parsed.questions)) {
                    questionsArray = parsed.questions;
                    // Optional: Use metadata if needed in future
                }

                if (questionsArray.length > 0) {
                    setParsedQuestions(questionsArray);
                } else {
                    alert("JSON must contain a 'questions' array or be an array of questions.");
                }
            } catch (err) {
                alert("Invalid JSON format");
            }
        };
        reader.readAsText(file);
    };

    const commitToFirestore = async () => {
        if (!selectedBundle || parsedQuestions.length === 0) return;

        // Calculate potential duplicates
        const existingIds = new Set(existingQuestions.filter(q => q.id).map(q => q.id));
        const duplicates = parsedQuestions.filter(q => q.id && existingIds.has(q.id));

        // Confirmation if overwriting
        if (duplicates.length > 0) {
            const confirmed = window.confirm(
                `⚠️ DUPLICATE ID WARNING\n\n` +
                `Found ${duplicates.length} questions with IDs that already exist in this bundle.\n` +
                `(Example: ${duplicates[0].id})\n\n` +
                `These will be UPDATED, not added as new questions.\n` +
                `Do you want to proceed?`
            );
            if (!confirmed) return;
        }

        setUploading(true);

        try {
            const batch = writeBatch(db);

            // 1. Store all questions in a "Parallel Root Collection" to keep metadata light
            // Document ID matches the Bundle ID.
            const dataDocRef = doc(db, 'question_bundle_data', selectedBundle.id);

            const questionsMap: Record<string, any> = {};
            parsedQuestions.forEach(q => {
                const finalId = q.id || `q_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                questionsMap[finalId] = {
                    ...q,
                    id: finalId,
                    updatedAt: new Date().toISOString()
                };
            });

            // Store in 'questions' field map
            batch.set(dataDocRef, { questions: questionsMap }, { merge: true });

            // 2. Update Parent Bundle Metadata (in the original collection)
            // Only increment by the number of NEW questions (total - duplicates)
            const newQuestionsCount = parsedQuestions.length - duplicates.length;

            const parentRef = doc(db, 'question_bundles', selectedBundle.id);
            batch.update(parentRef, {
                questionCount: increment(newQuestionsCount),
                updatedAt: serverTimestamp()
            });

            await batch.commit();

            alert(`Successfully uploaded ${parsedQuestions.length} questions!`);
            setParsedQuestions([]);
            setJsonContent('');
            setView('list');
            fetchBundles();

        } catch (e) {
            console.error("Upload failed", e);
            alert("Upload failed. Check console.");
        } finally {
            setUploading(false);
        }
    };

    const downloadTemplate = () => {
        const template = {
            "metadata": {
                "grade": "2",
                "subject": "Math",
                "template_id": "MCQ_SIMPLIFIED",
                "created_at": new Date().toISOString().split('T')[0]
            },
            "questions": [
                {
                    "id": "m1_001",
                    "chapter_id": "m1",
                    "question": "Question text using $Latex$ for math.",
                    "options": ["Opt1", "Opt2", "Opt3", "Opt4"],
                    "answer": "CorrectOpt",
                    "difficulty": "hard",
                    "explanation": "Kid-friendly explanation."
                }
            ]
        };
        const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'simplified_mcq_template.json';
        a.click();
    };

    const toggleBundleTag = async (tag: string) => {
        if (!selectedBundle) return;

        const currentTags = selectedBundle.tags || [];
        const hasTag = currentTags.includes(tag);
        const newTags = hasTag
            ? currentTags.filter(t => t !== tag)
            : [...currentTags, tag];

        // Optimistic UI Update
        setSelectedBundle({ ...selectedBundle, tags: newTags });

        // Update Firestore
        try {
            const ref = doc(db, 'question_bundles', selectedBundle.id);
            await updateDoc(ref, { tags: newTags, updatedAt: serverTimestamp() });
            // Also update the main list so if we go back it's fresh
            setBundles(prev => prev.map(b => b.id === selectedBundle.id ? { ...b, tags: newTags } : b));
        } catch (e) {
            console.error("Failed to update tags", e);
            // Revert on failure
            setSelectedBundle({ ...selectedBundle, tags: currentTags });
            alert("Failed to update setting");
        }
    };

    // --- Render Helpers ---

    const filteredBundles = bundles.filter(b => {
        if (filterGrade !== 'all' && b.grade !== filterGrade) return false;
        if (filterSubject !== 'all' && b.subject !== filterSubject) return false;
        return true;
    });

    return (
        <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
            <header className="max-w-6xl mx-auto mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2">
                        <Layers className="text-purple-600" /> Question Bundles
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Manage grade-specific simplified MCQ collections</p>
                </div>
                <button
                    onClick={() => setView('create')}
                    className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-700 shadow-lg flex items-center gap-2"
                >
                    <Plus size={20} /> Create Bundle
                </button>
            </header>

            {/* --- LIST VIEW --- */}
            {view === 'list' && (
                <div className="max-w-6xl mx-auto">
                    {/* Filters */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex gap-4 items-center">
                        <Filter size={20} className="text-slate-400" />
                        <select
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-600"
                            value={filterGrade}
                            onChange={e => setFilterGrade(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                        >
                            <option value="all">All Grades</option>
                            {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
                        </select>
                        <select
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-600"
                            value={filterSubject}
                            onChange={e => setFilterSubject(e.target.value)}
                        >
                            <option value="all">All Subjects</option>
                            {SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading ? <p>Loading bundles...</p> : filteredBundles.map(b => (
                            <div key={b.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                                        Grade {b.grade}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider 
                                        ${b.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {b.subject}
                                    </span>
                                    {b.tags?.includes('challenge') && (
                                        <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1">
                                            ⚠️ Arena
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-xl font-black text-slate-800 mb-2">{b.title}</h3>
                                <p className="text-sm text-slate-500 mb-6 line-clamp-2">{b.description || "No description provided."}</p>

                                <div className="flex items-center gap-4 text-xs font-bold text-slate-400 mb-6">
                                    <span className="flex items-center gap-1"><Layers size={14} /> {b.questionCount} Questions</span>
                                    <span className="flex items-center gap-1"><Clock size={14} /> Updated {b.updatedAt?.seconds ? new Date(b.updatedAt.seconds * 1000).toLocaleDateString() : 'N/A'}</span>
                                </div>

                                <button
                                    onClick={() => { setSelectedBundle(b); setView('upload'); }}
                                    className="w-full bg-slate-50 border-2 border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Upload size={18} /> Manage Questions
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- CREATE VIEW --- */}
            {view === 'create' && (
                <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
                    <h2 className="text-2xl font-black mb-6">Create New Question Bundle</h2>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Bundle Title</label>
                            <div className="flex gap-4">
                                <div className="w-24">
                                    <input
                                        className="w-full text-center text-2xl p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-400"
                                        placeholder="📦"
                                        maxLength={2}
                                        value={newBundle.icon || ''}
                                        onChange={e => setNewBundle({ ...newBundle, icon: e.target.value })}
                                        title="Paste an emoji here"
                                    />
                                </div>
                                <input
                                    className="flex-1 text-lg font-bold p-4 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-400"
                                    placeholder="e.g. Algebra Basics - Level 1"
                                    value={newBundle.title}
                                    onChange={e => setNewBundle({ ...newBundle, title: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Subject</label>
                                <select
                                    className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 font-bold"
                                    value={newBundle.subject}
                                    onChange={e => setNewBundle({ ...newBundle, subject: e.target.value })}
                                >
                                    {SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Grade Level</label>
                                <select
                                    className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 font-bold"
                                    value={newBundle.grade}
                                    onChange={e => setNewBundle({ ...newBundle, grade: Number(e.target.value) })}
                                >
                                    {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Description</label>
                            <textarea
                                className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-400 h-32"
                                placeholder="What topics does this bundle cover?"
                                value={newBundle.description}
                                onChange={e => setNewBundle({ ...newBundle, description: e.target.value })}
                            />
                        </div>

                        {/* Challenge Toggle */}
                        <div
                            className="flex items-center gap-3 bg-purple-50 p-4 rounded-xl border border-purple-100 cursor-pointer hover:bg-purple-100 transition-colors"
                            onClick={() => {
                                const hasTag = newBundle.tags.includes('challenge');
                                const newTags = hasTag ? newBundle.tags.filter(t => t !== 'challenge') : [...newBundle.tags, 'challenge'];
                                setNewBundle({ ...newBundle, tags: newTags });
                            }}
                        >
                            <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${newBundle.tags.includes('challenge') ? 'bg-purple-600 border-purple-600' : 'border-slate-300 bg-white'}`}>
                                {newBundle.tags.includes('challenge') && <Check size={16} className="text-white" />}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-700">Challenge Arena Ready?</h4>
                                <p className="text-xs text-slate-500">Mark this bundle for use in Challenge Arena battles.</p>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button
                                onClick={() => setView('list')}
                                className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateBundle}
                                className="flex-1 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg"
                            >
                                Create Bundle
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- UPLOAD VIEW --- */}
            {view === 'upload' && selectedBundle && (
                <div className="max-w-4xl mx-auto">
                    <button onClick={() => setView('list')} className="mb-6 font-bold text-slate-400 hover:text-slate-600">← Back to Bundles</button>

                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
                        <div className="bg-slate-900 p-8 text-white flex justify-between items-start">
                            <div>
                                <h2 className="text-3xl font-black mb-2">{selectedBundle.title}</h2>
                                <div className="flex gap-4 opacity-80 font-mono text-sm">
                                    <span>Grade {selectedBundle.grade}</span>
                                    <span>•</span>
                                    <span className="uppercase">{selectedBundle.subject}</span>
                                    <span>•</span>
                                    <span>{selectedBundle.questionCount} Questions</span>
                                </div>
                            </div>

                            <button
                                onClick={() => toggleBundleTag('challenge')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${selectedBundle.tags?.includes('challenge')
                                        ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/50'
                                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:border-white/20'
                                    }`}
                            >
                                {selectedBundle.tags?.includes('challenge') ? (
                                    <div className="bg-white text-purple-600 rounded-full p-0.5"><Check size={12} /></div>
                                ) : (
                                    <div className="w-4 h-4 border-2 border-slate-500 rounded-md" />
                                )}
                                <span className="font-bold text-sm">Arena Ready</span>
                            </button>
                        </div>

                        <div className="p-8">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-xl font-black text-slate-800">Add Questions via JSON</h3>
                                <button
                                    onClick={downloadTemplate}
                                    className="text-sm font-bold text-purple-600 hover:underline flex items-center gap-1"
                                >
                                    <Download size={16} /> Download Template
                                </button>
                            </div>

                            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-purple-300 transition-colors bg-slate-50/50 mb-8">
                                <FileJson className="mx-auto text-slate-300 mb-4" size={48} />
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={handleJsonUpload}
                                    className="block w-full text-sm text-slate-500
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-full file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-purple-50 file:text-purple-700
                                    hover:file:bg-purple-100 mb-4"
                                />
                                <p className="text-xs text-slate-400">Upload a .json file containing an array of simplified questions.</p>
                            </div>

                            {/* Preview */}
                            {parsedQuestions.length > 0 && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-bold text-emerald-600 flex items-center gap-2">
                                            <CheckCircle size={20} /> {parsedQuestions.length} Questions Ready
                                        </h4>
                                        <button
                                            onClick={commitToFirestore}
                                            disabled={uploading}
                                            className="bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-600 shadow-lg disabled:opacity-50"
                                        >
                                            {uploading ? 'Uploading...' : 'Confirm & Upload'}
                                        </button>
                                    </div>

                                    <div className="max-h-96 overflow-y-auto bg-slate-900 rounded-xl p-4 text-xs font-mono text-green-400">
                                        <pre>{JSON.stringify(parsedQuestions, null, 2)}</pre>
                                    </div>
                                </div>
                            )}
                            {/* Existing Questions List */}
                            <div className="mt-12 border-t border-slate-100 pt-8">
                                <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                                    <BookOpen className="text-purple-500" />
                                    Existing Questions ({existingQuestions.length})
                                </h3>

                                {existingQuestions.length === 0 ? (
                                    <div className="text-center p-8 bg-slate-50 rounded-2xl text-slate-400 font-bold">
                                        No questions uploaded yet.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {existingQuestions.map((q, i) => (
                                            <div key={i} className="bg-white border border-slate-200 p-4 rounded-xl flex gap-4 items-start shadow-sm">
                                                <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-md text-xs font-mono font-bold">
                                                    {q.id || `#${i + 1}`}
                                                </span>
                                                <div className="flex-1">
                                                    <p className="font-bold text-slate-800 text-sm mb-1">{q.question}</p>
                                                    <div className="flex gap-2 text-xs">
                                                        <span className="text-emerald-600 font-bold">Ans: {q.answer}</span>
                                                        <span className="text-slate-400">•</span>
                                                        <span className="text-slate-500">{q.options?.join(', ')}</span>
                                                        {q.chapter_id && (
                                                            <>
                                                                <span className="text-slate-400">•</span>
                                                                <span className="text-purple-500 font-bold uppercase">{q.chapter_id}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
