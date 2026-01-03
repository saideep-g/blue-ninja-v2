import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, deleteDoc, doc, updateDoc, orderBy, getDoc } from 'firebase/firestore';
import { db } from '../../services/db/firebase';
import { AlertOctagon, Check, X, ExternalLink, ArrowRight } from 'lucide-react';
import { SimplifiedQuestion } from '../../types/bundle';
import { EditQuestionModal } from './bundles/EditQuestionModal'; // Reuse the modal

interface ReviewItem {
    id: string; // doc id in review_queue
    bundleId: string;
    questionId: string;
    questionSnapshot: SimplifiedQuestion;
    reason?: string;
    flaggedAt: any;
}

export default function ReviewQueue() {
    const [items, setItems] = useState<ReviewItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingItem, setEditingItem] = useState<ReviewItem | null>(null);

    useEffect(() => {
        fetchQueue();
    }, []);

    const fetchQueue = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'review_queue'), orderBy('flaggedAt', 'desc'));
            const snap = await getDocs(q);
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ReviewItem));
            setItems(list);
        } catch (e) {
            console.error("Fetch failed", e);
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async (item: ReviewItem, action: 'approve' | 'delete', updatedQuestion?: SimplifiedQuestion) => {
        try {
            if (action === 'approve') {
                // If updated, save to original bundle
                if (updatedQuestion) {
                    const bundleRef = doc(db, 'question_bundle_data', item.bundleId);
                    await updateDoc(bundleRef, {
                        [`questions.${item.questionId}`]: updatedQuestion
                    });
                }
                // Remove from queue
                await deleteDoc(doc(db, 'review_queue', item.id));
                alert("Question approved and removed from queue.");
            } else if (action === 'delete') {
                if (window.confirm("Are you sure you want to PERMANENTLY delete this question from the bundle?")) {
                    const bundleRef = doc(db, 'question_bundle_data', item.bundleId);
                    // Use FieldValue.delete() syntax if possible, but localized update is cleaner for map
                    // Actually for deleting a map key:
                    // we need to set it to deleteField()
                    // But here let's just assume we might not delete, mainly 'approve' (keep) or 'reject' (needs more fix? or actually delete?)
                    // The user said "edit or delete".
                    // For delete from bundle:
                    const snap = await getDoc(bundleRef);
                    if (snap.exists()) {
                        // We can cannot easily delete a map key with simple updateDoc without deleteField import
                        // Let's just remove from queue for now or implement full delete logic later if requested.
                        // User said "delete", so let's try.
                    }
                    await deleteDoc(doc(db, 'review_queue', item.id));
                    alert("Removed from queue (Actual Bundle Delete not fully implemented to be safe options).");
                }
            }
            fetchQueue();
            setEditingItem(null);
        } catch (e) {
            console.error(e);
            alert("Action failed");
        }
    };

    // Better Delete from Bundle Implementation
    const handleDeleteFromBundle = async (item: ReviewItem) => {
        if (!window.confirm("Are you sure you want to PERMANENTLY delete this question from the source bundle?")) return;

        try {
            // 1. Remove from Bundle
            // To delete a map field, we typically need `deleteField()`.
            // Importing it from firestore
            const { deleteField } = await import('firebase/firestore');
            const bundleRef = doc(db, 'question_bundle_data', item.bundleId);
            await updateDoc(bundleRef, {
                [`questions.${item.questionId}`]: deleteField()
            });

            // 2. Remove from Queue
            await deleteDoc(doc(db, 'review_queue', item.id));

            alert("Question deleted from bundle and review queue.");
            fetchQueue();
        } catch (e) {
            console.error("Delete failed", e);
            alert("Failed to delete from bundle");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
            <header className="max-w-6xl mx-auto mb-8">
                <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2">
                    <AlertOctagon className="text-amber-500" /> Review Queue
                </h1>
                <p className="text-slate-500 font-medium mt-1">Manage flagged questions requiring attention ({items.length})</p>
            </header>

            <div className="max-w-6xl mx-auto space-y-4">
                {loading ? <p>Loading...</p> : items.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
                        <Check className="mx-auto text-emerald-400 mb-4" size={48} />
                        <h3 className="text-xl font-bold text-slate-700">All Clear!</h3>
                        <p className="text-slate-400">No questions in the review queue.</p>
                    </div>
                ) : (
                    items.map(item => (
                        <div key={item.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-amber-200 transition-colors group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    <span className="bg-slate-100 px-2 py-1 rounded">Bundle: {item.bundleId}</span>
                                    <span>•</span>
                                    <span>ID: {item.questionId}</span>
                                </div>
                                <span className="text-xs font-mono text-slate-300">
                                    {new Date(item.flaggedAt?.seconds * 1000).toLocaleDateString()}
                                </span>
                            </div>

                            <div className="flex gap-6 items-start">
                                <div className="flex-1">
                                    <p className="text-lg font-bold text-slate-800 mb-2">{item.questionSnapshot.question}</p>
                                    <div className="flex gap-2 text-sm text-slate-500 mb-2">
                                        <span className="font-bold text-emerald-600">Ans: {item.questionSnapshot.answer}</span>
                                        <span className="text-slate-300">|</span>
                                        <span>{item.questionSnapshot.options.join(', ')}</span>
                                    </div>
                                    {item.reason && (
                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-100">
                                            <AlertOctagon size={12} />
                                            Flag Reason: {item.reason}
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-2 min-w-[140px]">
                                    <button
                                        onClick={() => setEditingItem(item)}
                                        className="w-full py-2 px-4 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        Edit / Review
                                    </button>
                                    <button
                                        onClick={() => handleDeleteFromBundle(item)}
                                        className="w-full py-2 px-4 bg-white border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <X size={16} /> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {editingItem && (
                <EditQuestionModal
                    question={editingItem.questionSnapshot}
                    onClose={() => setEditingItem(null)}
                    onSave={(updatedQ) => handleResolve(editingItem, 'approve', updatedQ)}
                />
            )}
        </div>
    );
}
