import React, { useState, useEffect } from 'react';
import { getDocs, updateDoc, doc } from 'firebase/firestore';
import { studentsCollection, questionBundlesCollection, getStudentRef } from '../../services/db';
import { User, Package, Plus, Trash2, Loader, Search, CheckCircle } from 'lucide-react';

interface Student {
    id: string;
    name?: string;
    email?: string;
    assignedBundles?: string[];
    [key: string]: any;
}

interface Bundle {
    id: string;
    bundle_id?: string;
    itemCount?: number;
    items?: any[];
    [key: string]: any;
}

export const AdminBundleManager: React.FC = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [bundles, setBundles] = useState<Bundle[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [studentSearch, setStudentSearch] = useState('');

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Students
                const sSnap = await getDocs(studentsCollection);
                const sList = sSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Student[];

                // Fetch Bundles
                const bSnap = await getDocs(questionBundlesCollection);
                const bList = bSnap.docs.map(d => {
                    const data = d.data();
                    return {
                        id: d.id,
                        bundle_id: data.bundle_id || d.id,
                        itemCount: data.items?.length || 0,
                        ...data
                    };
                }) as Bundle[];

                setStudents(sList);
                setBundles(bList);
            } catch (e) {
                console.error("Error fetching admin data:", e);
                alert("Failed to load data.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const selectedStudent = students.find(s => s.id === selectedStudentId);

    const handleAssignBundle = async (bundleId: string) => {
        if (!selectedStudent) return;
        if (selectedStudent.assignedBundles?.includes(bundleId)) return;

        setSaving(true);
        try {
            const currentBundles = selectedStudent.assignedBundles || [];
            const newBundles = [...currentBundles, bundleId];

            // Update Firestore
            const ref = getStudentRef(selectedStudent.id);
            await updateDoc(ref, { assignedBundles: newBundles });

            // Update Local State
            setStudents(prev => prev.map(s =>
                s.id === selectedStudent.id ? { ...s, assignedBundles: newBundles } : s
            ));
        } catch (e) {
            console.error("Failed to assign bundle:", e);
            alert("Failed to assign bundle.");
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveBundle = async (bundleId: string) => {
        if (!selectedStudent) return;

        setSaving(true);
        try {
            const currentBundles = selectedStudent.assignedBundles || [];
            const newBundles = currentBundles.filter(b => b !== bundleId);

            // Update Firestore
            const ref = getStudentRef(selectedStudent.id);
            await updateDoc(ref, { assignedBundles: newBundles });

            // Update Local State
            setStudents(prev => prev.map(s =>
                s.id === selectedStudent.id ? { ...s, assignedBundles: newBundles } : s
            ));
        } catch (e) {
            console.error("Failed to remove bundle:", e);
            alert("Failed to remove bundle.");
        } finally {
            setSaving(false);
        }
    };

    const filteredStudents = students.filter(s =>
    (s.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.id.toLowerCase().includes(studentSearch.toLowerCase()))
    );

    if (loading) return <div className="flex h-full items-center justify-center"><Loader className="animate-spin w-8 h-8 text-blue-500" /></div>;

    return (
        <div className="flex h-full bg-slate-50 overflow-hidden">
            {/* Left Sidebar: Student List */}
            <div className="w-1/3 min-w-[300px] border-r border-slate-200 bg-white flex flex-col">
                <div className="p-4 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-slate-600" /> Students
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search students..."
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {filteredStudents.map(student => (
                        <div
                            key={student.id}
                            onClick={() => setSelectedStudentId(student.id)}
                            className={`p-4 border-b border-slate-50 cursor-pointer transition-colors hover:bg-slate-50 flex items-center justify-between ${selectedStudentId === student.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                        >
                            <div>
                                <p className="font-bold text-slate-800">{student.name || 'Unnamed Student'}</p>
                                <p className="text-xs text-slate-500 font-mono truncate max-w-[150px]">{student.id}</p>
                            </div>
                            {(student.assignedBundles?.length || 0) > 0 && (
                                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-bold">
                                    {student.assignedBundles?.length} Bundles
                                </span>
                            )}
                        </div>
                    ))}
                    {filteredStudents.length === 0 && (
                        <div className="p-8 text-center text-slate-400 text-sm">No students found.</div>
                    )}
                </div>
            </div>

            {/* Right Panel: Bundle Management */}
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
                {!selectedStudent ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <User className="w-16 h-16 mb-4 opacity-20" />
                        <p>Select a student to manage their bundles.</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-8">
                        <div className="mb-8 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">
                                    Managing: <span className="text-blue-600">{selectedStudent.name || selectedStudent.id}</span>
                                </h2>
                                <p className="text-slate-500">Assign question bundles to this student's queue.</p>
                            </div>
                            {saving && <span className="text-sm font-bold text-blue-500 animate-pulse">Saving changes...</span>}
                        </div>

                        {/* Assigned Bundles Section */}
                        <div className="mb-8">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" /> Assigned Bundles
                            </h3>

                            {(!selectedStudent.assignedBundles || selectedStudent.assignedBundles.length === 0) ? (
                                <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
                                    No bundles assigned. This student is receiving default global content.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {selectedStudent.assignedBundles.map(bundleId => {
                                        const bundleInfo = bundles.find(b => b.id === bundleId) || { id: bundleId, bundle_id: 'Unknown Bundle' };
                                        return (
                                            <div key={bundleId} className="bg-white border border-green-200 shadow-sm p-4 rounded-xl flex flex-col relative group">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="bg-green-100 text-green-700 p-2 rounded-lg">
                                                        <Package className="w-5 h-5" />
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveBundle(bundleId)}
                                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                                        title="Remove Bundle"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <p className="font-bold text-slate-800 text-sm">{bundleInfo.bundle_id}</p>
                                                <p className="text-xs text-slate-500 font-mono mt-1 opacity-60 truncate">{bundleId}</p>
                                                <div className="mt-3 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded inline-block self-start">
                                                    {bundleInfo.itemCount || '?'} Items
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Available Bundles Section */}
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                                <Plus className="w-4 h-4" /> Available Bundles
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {bundles.filter(b => !selectedStudent.assignedBundles?.includes(b.id)).map(bundle => (
                                    <div key={bundle.id} className="bg-white border border-slate-200 shadow-sm p-4 rounded-xl flex flex-col hover:border-blue-300 transition-colors">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="bg-slate-100 text-slate-500 p-2 rounded-lg">
                                                <Package className="w-5 h-5" />
                                            </div>
                                            <button
                                                onClick={() => handleAssignBundle(bundle.id)}
                                                className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-black transition shadow-sm"
                                            >
                                                Assign
                                            </button>
                                        </div>
                                        <p className="font-bold text-slate-800 text-sm">{bundle.bundle_id}</p>
                                        <p className="text-xs text-slate-500 font-mono mt-1 opacity-60 truncate">{bundle.id}</p>
                                        <div className="mt-3 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded inline-block self-start">
                                            {bundle.itemCount || '?'} Items
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
