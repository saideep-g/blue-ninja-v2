import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/db/firebase';
import { Check } from 'lucide-react';

interface CreateBundleFormProps {
    onCancel: () => void;
    onSuccess: () => void;
}

const SUBJECTS = [
    { id: 'math', name: 'Math' },
    { id: 'science', name: 'Science' },
    { id: 'social', name: 'Social' },
    { id: 'vocabulary', name: 'Vocabulary (Words)' },
    { id: 'english', name: 'English (Grammar)' },
    { id: 'world', name: 'World (GK)' },
    { id: 'geography', name: 'Geography' },
    { id: 'logic', name: 'Logic & Reasoning' }
];

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const CreateBundleForm: React.FC<CreateBundleFormProps> = ({ onCancel, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [newBundle, setNewBundle] = useState({
        title: '',
        description: '',
        subject: 'math',
        grade: 2,
        icon: '📦', // Default emoji
        tags: [] as string[]
    });

    const handleCreateBundle = async () => {
        if (!newBundle.title) return alert("Please enter a title");
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
            onSuccess();
            // Reset form (though component will likely unmount)
            setNewBundle({ title: '', description: '', subject: 'math', grade: 2, icon: '📦', tags: [] });
        } catch (e) {
            console.error("Create failed", e);
            alert("Failed to create bundle");
        } finally {
            setLoading(false);
        }
    };

    return (
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
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 rounded-xl"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreateBundle}
                        disabled={loading}
                        className="flex-1 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg disabled:opacity-50"
                    >
                        {loading ? 'Creating...' : 'Create Bundle'}
                    </button>
                </div>
            </div>
        </div>
    );
};
