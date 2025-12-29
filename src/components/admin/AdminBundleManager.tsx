import React, { useState, useEffect } from 'react';
import { getDocs, updateDoc, doc } from 'firebase/firestore';
import { studentsCollection, questionBundlesCollection, getStudentRef } from '../../services/db/firestore';
import { User, Package, Plus, Trash2, Loader, Search, CheckCircle, Box } from 'lucide-react';

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
        <div className="flex h-full bg-[#f8faff] overflow-hidden">
            {/* Left Sidebar: Student List */}
            <div className="w-1/3 min-w-[320px] max-w-[400px] border-r border-blue-100 bg-white flex flex-col z-10 shadow-xl shadow-blue-100/20">
                <div className="p-6 border-b border-blue-50">
                    <h2 className="text-xl font-black italic text-blue-900 uppercase tracking-tighter mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-500" /> Students
                    </h2>
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search students..."
                            className="w-full pl-10 pr-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all placeholder:text-blue-300/70"
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {filteredStudents.map(student => {
                        const isSelected = selectedStudentId === student.id;
                        return (
                            <div
                                key={student.id}
                                onClick={() => setSelectedStudentId(student.id)}
                                className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border flex items-center justify-between group 
                                    ${isSelected
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-lg shadow-blue-600/30 transform scale-[1.02]'
                                        : 'bg-white border-transparent hover:bg-blue-50 hover:border-blue-100 text-slate-600'
                                    }`}
                            >
                                <div className="min-w-0">
                                    <p className={`font-bold text-sm truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                                        {student.name || 'Unnamed Student'}
                                    </p>
                                    <p className={`text-xs font-mono truncate max-w-[150px] ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                                        {student.id}
                                    </p>
                                </div>
                                {(student.assignedBundles?.length || 0) > 0 && (
                                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wide
                                        ${isSelected ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'}
                                    `}>
                                        {student.assignedBundles?.length} Sets
                                    </span>
                                )}
                            </div>
                        );
                    })}
                    {filteredStudents.length === 0 && (
                        <div className="p-8 text-center text-slate-400 text-sm italic">No students found matching your search.</div>
                    )}
                </div>
            </div>

            {/* Right Panel: Bundle Management */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#f8faff]">
                {!selectedStudent ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-blue-300">
                        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                            <Box className="w-10 h-10 text-blue-200" />
                        </div>
                        <p className="font-bold text-lg text-blue-900">No Student Selected</p>
                        <p className="text-sm">Select a student from the list to manage their content.</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-8">
                        {/* Header */}
                        <div className="mb-8 flex items-end justify-between border-b border-blue-100 pb-6">
                            <div>
                                <h2 className="text-3xl font-black italic text-blue-900 uppercase tracking-tighter mb-1">
                                    Bundle Management
                                </h2>
                                <p className="text-blue-500 font-medium">
                                    Managing for: <span className="text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded-md">{selectedStudent.name || selectedStudent.id}</span>
                                </p>
                            </div>
                            {saving && (
                                <div className="flex items-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full animate-pulse">
                                    <Loader className="w-4 h-4 animate-spin" /> Saving Changes...
                                </div>
                            )}
                        </div>

                        {/* Assigned Bundles Section */}
                        <div className="mb-10">
                            <h3 className="text-sm font-black uppercase tracking-widest text-blue-400 mb-4 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" /> Assigned to Student
                            </h3>

                            {(!selectedStudent.assignedBundles || selectedStudent.assignedBundles.length === 0) ? (
                                <div className="p-6 bg-amber-50/50 border border-amber-100 rounded-2xl flex items-start gap-4">
                                    <div className="p-2 bg-amber-100 rounded-lg text-amber-600 mt-1">
                                        <Package className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-amber-800">No Bundles Assigned</h4>
                                        <p className="text-sm text-amber-600 mt-1">This student is currently receiving questions from the global default pool.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {selectedStudent.assignedBundles.map(bundleId => {
                                        const bundleInfo = bundles.find(b => b.id === bundleId) || { id: bundleId, bundle_id: 'Unknown Bundle' };
                                        return (
                                            <div key={bundleId} className="bg-white border border-emerald-100 shadow-sm p-4 rounded-xl flex flex-col relative group hover:shadow-md transition-all">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 rounded-l-xl"></div>
                                                <div className="flex items-start justify-between mb-3 pl-2">
                                                    <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg">
                                                        <Package className="w-5 h-5" />
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveBundle(bundleId)}
                                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Remove from student"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="pl-2">
                                                    <p className="font-bold text-slate-800 text-sm">{bundleInfo.bundle_id}</p>
                                                    <p className="text-[10px] text-slate-400 font-mono mt-1 opacity-60 truncate">ID: {bundleId}</p>
                                                    <div className="mt-3 text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded inline-block uppercase tracking-wide">
                                                        {bundleInfo.itemCount || '?'} Items Included
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Available Bundles Section */}
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-blue-400 mb-4 flex items-center gap-2">
                                <Plus className="w-4 h-4" /> Available Library
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {bundles.filter(b => !selectedStudent.assignedBundles?.includes(b.id)).map(bundle => (
                                    <div key={bundle.id} className="bg-white border border-slate-100 shadow-sm p-4 rounded-xl flex flex-col hover:border-blue-200 hover:shadow-md transition-all group">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 p-2 rounded-lg transition-colors">
                                                <Box className="w-5 h-5" />
                                            </div>
                                            <button
                                                onClick={() => handleAssignBundle(bundle.id)}
                                                className="px-4 py-1.5 bg-slate-900 group-hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                                            >
                                                Assign +
                                            </button>
                                        </div>
                                        <p className="font-bold text-slate-700 group-hover:text-blue-900 transition-colors text-sm">{bundle.bundle_id}</p>
                                        <p className="text-[10px] text-slate-400 font-mono mt-1 opacity-60 truncate">ID: {bundle.id}</p>
                                        <div className="mt-3 text-[10px] font-bold bg-slate-50 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 px-2 py-1 rounded inline-block uppercase tracking-wide transition-colors self-start">
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
