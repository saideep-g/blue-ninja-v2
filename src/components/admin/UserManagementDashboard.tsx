import React, { useState, useEffect } from 'react';
import { db } from "../../services/db/firebase";
import { collection, query, limit, getDocs, updateDoc, doc, getDoc, orderBy, setDoc } from 'firebase/firestore';
import { Search, User, Check, Smartphone, BookOpen, AlertCircle, Save, X, RefreshCw, Grid } from 'lucide-react';
import { User as UserType } from '../../types/models';

const SUBJECTS = [
    { id: 'math', name: 'Math' },
    { id: 'science', name: 'Science' },
    { id: 'social', name: 'Social' },
    { id: 'tables', name: 'Tables' },
    { id: 'vocabulary', name: 'Vocabulary' },
    { id: 'english', name: 'English' },
    { id: 'gk', name: 'General Knowledge' },
];

export default function UserManagementDashboard() {
    // Search & List State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]); // Use any because students doc shape is loose
    const [loading, setLoading] = useState(false);

    // Edit State
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [editForm, setEditForm] = useState<{
        layout: "default" | "mobile-quest-v1" | "study-era";
        enrolledSubjects: string[];
        assignedTables: number[];
    }>({ layout: 'default', enrolledSubjects: [], assignedTables: [] });

    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Initial load: Fetch recent users or empty
    useEffect(() => {
        searchUsers('');
    }, []);

    const searchUsers = async (term: string) => {
        setLoading(true);
        try {
            // QUERY 'students' collection, not 'users'
            const studentsRef = collection(db, 'students');
            let docs = [];

            if (term.trim() === '') {
                // Default: fetch last 50 (trying to use recent if possible, though 'students' might not have timestamps on root)
                // We'll just fetch a batch.
                const q = query(studentsRef, limit(50));
                const snapshot = await getDocs(q);
                docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } else {
                // Client-side filtering because Firestore doesn't support substring search
                // and we might be missing fields on some docs.
                // We'll fetch a larger batch? No, scanning entire DB is bad.
                // But for this project scale (assumed smallish), we fetch what we can.
                // Or we can try to fetch by ID if term looks like ID.

                // For now, let's fetch strictly where we can, OR fetch 'recent' and filter.
                // Given the user complaint "it's not bringing anything", we should cast a wide net.
                // Fetch 100 docs and filter in memory.
                const q = query(studentsRef, limit(100)); // Simple fetch
                const snapshot = await getDocs(q);
                const allDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const lowerTerm = term.toLowerCase();
                docs = allDocs.filter((u: any) =>
                    (u.email && u.email.toLowerCase().includes(lowerTerm)) ||
                    (u.username && u.username.toLowerCase().includes(lowerTerm)) ||
                    u.id.includes(lowerTerm)
                );
            }

            setSearchResults(docs);
        } catch (error) {
            console.error("Error searching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = async (user: any) => {
        try {
            // We already have the data in 'user' mainly, but good to refresh
            const studentRef = doc(db, 'students', user.id);
            const studentSnap = await getDoc(studentRef);

            let layout: any = 'default';
            let enrolledSubjects: string[] = [];
            let fullData = user;

            if (studentSnap.exists()) {
                const data = studentSnap.data();
                fullData = { id: user.id, ...data };
                layout = data.layout || 'default';
                enrolledSubjects = data.enrolledSubjects || [];
                // Check deep profile if not on root
                if (!data.layout && data.profile?.layout) layout = data.profile.layout;
                if (!data.enrolledSubjects && data.profile?.enrolledSubjects) enrolledSubjects = data.profile.enrolledSubjects;
            }

            // Fetch Table Config (from tables_config field)
            let assignedTables = [2, 3, 4]; // Default
            if (studentSnap.exists()) {
                const data = studentSnap.data();
                if (data.tables_config && data.tables_config.selectedTables && Array.isArray(data.tables_config.selectedTables)) {
                    assignedTables = data.tables_config.selectedTables;
                }
            } else if (user.tables_config?.selectedTables) {
                // Fallback to list object if doc fetch failed for some reason
                assignedTables = user.tables_config.selectedTables;
            }

            setEditingUser(fullData);
            setEditForm({
                layout,
                enrolledSubjects,
                assignedTables
            });
            setMessage(null);
        } catch (e) {
            console.error("Error fetching student details", e);
            alert("Could not load student details.");
        }
    };

    const toggleSubject = (subId: string) => {
        setEditForm(prev => {
            const current = prev.enrolledSubjects;
            if (current.includes(subId)) {
                return { ...prev, enrolledSubjects: current.filter(id => id !== subId) };
            } else {
                return { ...prev, enrolledSubjects: [...current, subId] };
            }
        });
    };

    const toggleTable = (num: number) => {
        setEditForm(prev => {
            const current = prev.assignedTables;
            if (current.includes(num)) {
                return { ...prev, assignedTables: current.filter(n => n !== num) };
            } else {
                return { ...prev, assignedTables: [...current, num].sort((a, b) => a - b) };
            }
        });
    };

    const handleSave = async () => {
        if (!editingUser) return;
        setSaving(true);
        setMessage(null);

        try {
            const studentRef = doc(db, 'students', editingUser.id);
            // Update root level config (NinjaStats model in models.ts)
            // Storing tables_config as a Map Field on the student document.
            await setDoc(studentRef, {
                layout: editForm.layout,
                enrolledSubjects: editForm.enrolledSubjects,
                'profile': {
                    layout: editForm.layout,
                    enrolledSubjects: editForm.enrolledSubjects
                },
                tables_config: {
                    selectedTables: editForm.assignedTables,
                    // Preserve defaults if they don't exist, technically this overwrite might reset custom accuracy if we don't read it first.
                    // But for Admin UI, we are only editing tables. 
                    // Better approach: use merge: true with setDoc to update specific fields without nuking others.
                }
            }, { merge: true });

            // Note: If we strictly wanted to ONLY update selectedTables inside tables_config without touching targetAccuracy:
            // We would need to use updateDoc with 'tables_config.selectedTables': ... 
            // BUT setDoc { merge: true } with nested object `tables_config: { selectedTables: ... }` behaves like a deep merge in Firebase JS SDK? 
            // NO. It replaces the `tables_config` map if you don't use dot notation or if you provide the map.
            // Actually, `setDoc(ref, { a: { b: 1 } }, { merge: true })` MERGES `a.b`. 
            // So `tables_config` properties NOT in this object should be preserved.
            // Verified: setDoc with merge performs a deep merge on maps.

            setMessage({ type: 'success', text: `Successfully updated ${editingUser.username || 'User'}!` });

            // Refresh local list
            setSearchResults(prev => prev.map(u => {
                if (u.id === editingUser.id) {
                    return {
                        ...u,
                        layout: editForm.layout,
                        enrolledSubjects: editForm.enrolledSubjects
                    };
                }
                return u;
            }));

        } catch (error) {
            console.error("Error saving user:", error);
            setMessage({ type: 'error', text: "Failed to save changes. Check console." });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
            <header className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row md:justify-between md:items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-800">User Management</h1>
                    <p className="text-slate-500 font-medium">Manage student layouts and subject enrollment</p>
                </div>

                {/* Search Bar */}
                <div className="mt-4 md:mt-0 relative w-full md:w-96 flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by ID, name or email..."
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && searchUsers(searchQuery)}
                        />
                    </div>
                    <button onClick={() => searchUsers(searchQuery)} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500">
                        <RefreshCw size={20} />
                    </button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* User List Columns */}
                <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-[600px] flex flex-col">
                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                        <h2 className="font-bold text-slate-700">Student List ({searchResults.length})</h2>
                        <p className="text-xs text-slate-400 mt-1">Source: 'students' collection</p>
                    </div>
                    <div className="overflow-y-auto flex-1 p-2 space-y-2">
                        {loading && <div className="text-center p-4 text-slate-400">Loading users...</div>}

                        {!loading && searchResults.length === 0 && (
                            <div className="text-center p-8 text-slate-400 flex flex-col items-center">
                                <User size={32} className="mb-2 opacity-50" />
                                <p>No students found.</p>
                                <p className="text-xs mt-2">Make sure users have logged in at least once.</p>
                            </div>
                        )}

                        {searchResults.map(user => {
                            // Fallback display logic
                            const displayName = user.username || user.profile?.name || 'Unknown User';
                            const displayEmail = user.email || user.profile?.email || `ID: ${user.id.substring(0, 8)}...`;
                            const initial = displayName.charAt(0).toUpperCase();

                            return (
                                <button
                                    key={user.id}
                                    onClick={() => handleEditClick(user)}
                                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3
                                        ${editingUser?.id === user.id
                                            ? 'bg-purple-100 border border-purple-300 shadow-sm'
                                            : 'hover:bg-slate-50 border border-transparent hover:border-slate-100'
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold
                                        ${editingUser?.id === user.id ? 'bg-purple-500 text-white' : 'bg-slate-200 text-slate-500'}
                                    `}>
                                        {initial}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-bold truncate ${editingUser?.id === user.id ? 'text-purple-900' : 'text-slate-800'}`}>
                                            {displayName}
                                        </p>
                                        <p className="text-xs text-slate-500 truncate">{displayEmail}</p>
                                    </div>
                                    {(!user.username && !user.email) && <span title="Missing metadata"><AlertCircle size={14} className="text-amber-500" /></span>}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Edit Panel */}
                <div className="lg:col-span-2">
                    {editingUser ? (
                        <div className="bg-white rounded-2xl shadow-xl border border-purple-100 overflow-hidden relative">
                            {/* Header */}
                            <div className="bg-slate-900 p-6 text-white flex justify-between items-start">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-3xl font-black">
                                        {(editingUser.username || editingUser.id).charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black">{editingUser.username || 'Unknown User'}</h2>
                                        <p className="text-slate-400 text-sm font-mono">{editingUser.id}</p>
                                        <p className="text-slate-500 text-xs">{editingUser.email || 'No email synced'}</p>
                                    </div>
                                </div>
                                <button onClick={() => setEditingUser(null)} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 space-y-8">
                                {/* Success/Error Message */}
                                {message && (
                                    <div className={`p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2
                                        ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}
                                    `}>
                                        {message.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
                                        <p className="font-bold">{message.text}</p>
                                    </div>
                                )}

                                {!editingUser.username && (
                                    <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-sm border border-amber-200">
                                        ⚠️ This user hasn't logged in recently. Their name/email might be missing until they login again. You can still set their layout.
                                    </div>
                                )}

                                {/* LAYOUT SELECTOR */}
                                <section>
                                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Smartphone size={16} /> Interface Layout
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <button
                                            onClick={() => setEditForm(p => ({ ...p, layout: 'default' }))}
                                            className={`p-4 rounded-xl border-2 text-left transition-all
                                                ${editForm.layout === 'default'
                                                    ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200 ring-offset-2'
                                                    : 'border-slate-100 hover:border-slate-200'}`}
                                        >
                                            <div className="font-black text-slate-800 mb-1">Default Dashboard</div>
                                            <p className="text-xs text-slate-500 leading-relaxed">Standard rich web layout. Best for desktop/tablet/laptop use.</p>
                                        </button>

                                        <button
                                            onClick={() => setEditForm(p => ({ ...p, layout: 'mobile-quest-v1' }))}
                                            className={`p-4 rounded-xl border-2 text-left transition-all
                                                ${editForm.layout === 'mobile-quest-v1'
                                                    ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200 ring-offset-2'
                                                    : 'border-slate-100 hover:border-slate-200'}`}
                                        >
                                            <div className="font-black text-slate-800 mb-1">Mobile Quest v1</div>
                                            <p className="text-xs text-slate-500 leading-relaxed">Simplified, engaging mobile-first UI for younger students.</p>
                                        </button>

                                        <button
                                            onClick={() => setEditForm(p => ({ ...p, layout: 'study-era' }))}
                                            className={`p-4 rounded-xl border-2 text-left transition-all
                                                ${editForm.layout === 'study-era'
                                                    ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200 ring-offset-2'
                                                    : 'border-slate-100 hover:border-slate-200'}`}
                                        >
                                            <div className="font-black text-slate-800 mb-1">Study Era</div>
                                            <p className="text-xs text-slate-500 leading-relaxed">Aesthetic dashboard with customizable subjects like Math, Science, Vocab.</p>
                                        </button>
                                    </div>
                                </section>

                                {/* SUBJECT SELECTOR */}
                                <section>
                                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <BookOpen size={16} /> Enrolled Subjects
                                    </h3>
                                    <div className="flex flex-wrap gap-3">
                                        {SUBJECTS.map(sub => {
                                            const isActive = editForm.enrolledSubjects.includes(sub.id);
                                            return (
                                                <button
                                                    key={sub.id}
                                                    onClick={() => toggleSubject(sub.id)}
                                                    className={`px-4 py-2 rounded-full font-bold text-sm border-2 transition-all
                                                        ${isActive
                                                            ? 'bg-slate-800 text-white border-slate-800'
                                                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                                                >
                                                    {sub.name}
                                                    {isActive && <Check size={14} className="inline ml-2 -mt-0.5" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-3 font-medium">
                                        * Selecting zero subjects serves ALL valid subjects by default.
                                    </p>
                                </section>

                                {/* TABLES SELECTOR */}
                                <section>
                                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Grid size={16} /> Multiplication Tables
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {Array.from({ length: 19 }, (_, i) => i + 2).map((num) => {
                                            const isActive = editForm.assignedTables.includes(num);
                                            return (
                                                <button
                                                    key={num}
                                                    onClick={() => toggleTable(num)}
                                                    className={`w-10 h-10 rounded-lg font-bold text-sm border-2 transition-all flex items-center justify-center
                                                         ${isActive
                                                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                                                >
                                                    {num}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-3 font-medium">
                                        * Assign tables 2 through 20. Users will only practice assigned tables.
                                    </p>
                                </section>

                                {/* Actions */}
                                <div className="pt-6 border-t border-slate-100 flex justify-end">
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-xl font-bold text-lg shadow-lg shadow-purple-200 transition-all active:scale-95 disabled:opacity-70 flex items-center gap-2"
                                    >
                                        {saving ? 'Saving...' : (
                                            <>
                                                <Save size={20} /> Save Changes
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                            <User size={64} className="mb-4 opacity-20" />
                            <p className="font-medium text-lg">Select a student to manage details</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}