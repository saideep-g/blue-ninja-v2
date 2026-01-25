import React, { useState } from 'react';
import { Download, Search, AlertCircle, CheckCircle2, FileJson, Loader2 } from 'lucide-react';
import { getAllPracticeLogs, migrateLogsToBuckets } from '../../../features/multiplication-tables/services/tablesFirestore';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../../services/db/firebase';

export default function StudentLogsDownloader() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<{ id: string, name?: string, displayName?: string, email: string } | null>(null);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;

        setIsSearching(true);
        setSearchResults([]);
        setStatus(null);
        setSelectedStudent(null);

        try {
            // Search by email or displayName
            // Firestore doesn't support OR queries natively in this setup cleanly without multiple queries usually, 
            // but let's try searching by email first as it is unique.
            // If the searchTerm looks like an ID, we can also check that.

            let users: any[] = [];

            // 1. Try Email
            const qEmail = query(collection(db, 'students'), where('email', '>=', searchTerm), where('email', '<=', searchTerm + '\uf8ff'), limit(5));
            const snapEmail = await getDocs(qEmail);
            snapEmail.forEach(doc => {
                const data = doc.data();
                if (!users.find(u => u.id === doc.id)) {
                    users.push({ id: doc.id, ...data });
                }
            });

            // 2. Try Display Name
            if (users.length < 5) {
                const qName = query(collection(db, 'students'), where('displayName', '>=', searchTerm), where('displayName', '<=', searchTerm + '\uf8ff'), limit(5));
                const snapName = await getDocs(qName);
                snapName.forEach(doc => {
                    const data = doc.data();
                    if (!users.find(u => u.id === doc.id)) {
                        users.push({ id: doc.id, ...data });
                    }
                });
            }

            // 3. Try exact ID
            if (users.length === 0 && searchTerm.length > 20) {
                // It might be an ID
                // We can't query by documentId field easily in client SDK without using documentId(), 
                // but let's assume user searches by name/email mostly.
            }

            setSearchResults(users);
            if (users.length === 0) {
                setStatus({ type: 'error', message: 'No students found matching that term.' });
            }
        } catch (error) {
            console.error(error);
            setStatus({ type: 'error', message: 'Failed to search students.' });
        } finally {
            setIsSearching(false);
        }
    };

    const handleMigration = async () => {
        if (!selectedStudent) return;
        const confirm = window.confirm(`Are you sure you want to migrate logs for ${selectedStudent.displayName || selectedStudent.name}? This will move individual docs to buckets and delete the old ones.`);
        if (!confirm) return;

        setIsMigrating(true);
        setStatus({ type: 'success', message: 'Migration started...' }); // Info essentially

        try {
            const result = await migrateLogsToBuckets(selectedStudent.id);
            setStatus({
                type: 'success',
                message: `Migration Complete. Moved ${result.migrated} logs to V2 buckets.`
            });
        } catch (e) {
            console.error(e);
            setStatus({ type: 'error', message: 'Migration failed. Check console.' });
        } finally {
            setIsMigrating(false);
        }
    };

    const handleDownload = async () => {
        if (!selectedStudent) return;

        setIsDownloading(true);
        setStatus(null);

        try {
            const logs = await getAllPracticeLogs(selectedStudent.id);

            if (logs.length === 0) {
                setStatus({ type: 'error', message: 'No practice logs found for this student.' });
                setIsDownloading(false);
                return;
            }

            // Create JSON Blob
            const dataStr = JSON.stringify(logs, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            // Trigger Download Link
            const link = document.createElement('a');
            link.href = url;
            link.download = `table_practice_logs_${selectedStudent.displayName || selectedStudent.name || 'student'}_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setStatus({ type: 'success', message: `Successfully downloaded ${logs.length} logs.` });
        } catch (error) {
            console.error(error);
            setStatus({ type: 'error', message: 'Failed to download logs.' });
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                    <FileJson className="text-indigo-500" />
                    Export Practice Logs
                </h1>
                <p className="text-slate-500 mt-2">Search for a student and download their complete table practice history in JSON format.</p>
            </div>

            {/* Search Section */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
                <form onSubmit={handleSearch} className="flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isSearching || !searchTerm.trim()}
                        className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                        {isSearching ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                        Search
                    </button>
                </form>

                {/* Results List */}
                {searchResults.length > 0 && !selectedStudent && (
                    <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Select a Student</p>
                        {searchResults.map(student => (
                            <button
                                key={student.id}
                                onClick={() => { setSelectedStudent(student); setSearchResults([]); setSearchTerm(''); }}
                                className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all text-left group"
                            >
                                <div>
                                    <div className="font-bold text-slate-800">{student.displayName || student.name || 'Unknown Log'}</div>
                                    <div className="text-sm text-slate-500">{student.email}</div>
                                </div>
                                <div className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-mono group-hover:bg-white transition-colors">
                                    {student.id.slice(0, 8)}...
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Selected Student & Download Action */}
            {selectedStudent && (
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <div className="text-indigo-200 font-bold uppercase tracking-widest text-xs mb-1">Selected Student</div>
                                <h2 className="text-3xl font-black">{selectedStudent.displayName || selectedStudent.name}</h2>
                                <p className="text-white/80 font-medium mt-1">{selectedStudent.email}</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleMigration}
                                    disabled={isMigrating || isDownloading}
                                    className="px-3 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-400/30 rounded-lg text-sm font-bold transition-colors text-yellow-100"
                                >
                                    {isMigrating ? 'Migrating...' : 'Migrate to buckets'}
                                </button>
                                <button
                                    onClick={() => setSelectedStudent(null)}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold transition-colors"
                                >
                                    Change
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleDownload}
                                disabled={isDownloading}
                                className="flex-1 bg-white text-indigo-600 py-4 rounded-xl font-black text-lg shadow-lg hover:shadow-xl hover:bg-indigo-50 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-75 disabled:cursor-wait"
                            >
                                {isDownloading ? (
                                    <>
                                        <Loader2 className="animate-spin" /> Preparing JSON...
                                    </>
                                ) : (
                                    <>
                                        <Download size={24} /> Download Logs
                                    </>
                                )}
                            </button>
                        </div>

                        {status && (
                            <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 ${status.type === 'success' ? 'bg-green-500/20 text-green-100 border border-green-500/30' : 'bg-red-500/20 text-red-100 border border-red-500/30'
                                }`}>
                                {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                                <span className="font-bold">{status.message}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
