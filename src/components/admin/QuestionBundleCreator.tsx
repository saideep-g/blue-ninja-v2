import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../services/db/firebase';
import { QuestionBundleMetadata } from '../../types/bundle';
import { Layers, Plus } from 'lucide-react';

import { BundleList } from './bundles/BundleList';
import { CreateBundleForm } from './bundles/CreateBundleForm';
import { BundleEditor } from './bundles/BundleEditor';

export default function QuestionBundleCreator() {
    // --- State ---
    const [bundles, setBundles] = useState<QuestionBundleMetadata[]>([]);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<'list' | 'create' | 'upload'>('list');
    const [selectedBundle, setSelectedBundle] = useState<QuestionBundleMetadata | null>(null);

    // Filters (Lifted state for BundleList)
    const [filterGrade, setFilterGrade] = useState<number | 'all'>('all');
    const [filterSubject, setFilterSubject] = useState<string>('all');

    // --- Effects ---
    useEffect(() => {
        fetchBundles();
    }, []);

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

    const handleUpdateBundleInList = (updatedBundle: QuestionBundleMetadata) => {
        setSelectedBundle(updatedBundle);
        setBundles(prev => prev.map(b => b.id === updatedBundle.id ? updatedBundle : b));
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
            <header className="max-w-6xl mx-auto mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2">
                        <Layers className="text-purple-600" /> Question Bundles
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Manage grade-specific simplified MCQ collections</p>
                </div>
                {view === 'list' && (
                    <button
                        onClick={() => setView('create')}
                        className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-700 shadow-lg flex items-center gap-2 md:hidden"
                    >
                        <Plus size={20} /> Create
                    </button>
                )}
            </header>

            {/* --- LIST VIEW --- */}
            {view === 'list' && (
                <BundleList
                    bundles={bundles}
                    loading={loading}
                    filterGrade={filterGrade}
                    setFilterGrade={setFilterGrade}
                    filterSubject={filterSubject}
                    setFilterSubject={setFilterSubject}
                    onSelectBundle={(b) => {
                        setSelectedBundle(b);
                        setView('upload');
                    }}
                    onCreateClick={() => setView('create')}
                />
            )}

            {/* --- CREATE VIEW --- */}
            {view === 'create' && (
                <CreateBundleForm
                    onCancel={() => setView('list')}
                    onSuccess={() => {
                        fetchBundles();
                        setView('list');
                    }}
                />
            )}

            {/* --- EDITOR VIEW --- */}
            {view === 'upload' && selectedBundle && (
                <BundleEditor
                    bundle={selectedBundle}
                    onBack={() => {
                        fetchBundles(); // Refresh ensures counts are accurate
                        setView('list');
                        setSelectedBundle(null);
                    }}
                    onUpdateBundle={handleUpdateBundleInList}
                />
            )}
        </div>
    );
}
