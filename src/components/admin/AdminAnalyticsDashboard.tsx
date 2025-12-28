import React, { useState, useEffect } from 'react';
import { db, auth } from '../../services/firebase';
import { collection, query, where, getDocs, orderBy, limit, onSnapshot } from 'firebase/firestore';

import { LayoutDashboard, Users, FileText, Database } from 'lucide-react';
import AdminQuestionsPanel from './AdminQuestionsPanel';

function AdminAnalyticsDashboard() {
    const [activeTab, setActiveTab] = useState('browser');
    const [logs, setLogs] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState('ALL');
    const [loading, setLoading] = useState(true);
    const [diagnostics, setDiagnostics] = useState({
        studentsCount: 0,
        logsCount: 0,
        studentErrors: [],
        logsErrors: [],
        firebaseUser: null,
        collectionsFound: []
    });

    // ========== FETCH STUDENTS ==========
    useEffect(() => {
        const fetchStudents = async () => {
            try {
                console.log('📍 Starting student fetch...');

                const q = query(
                    collection(db, 'students'),
                    // where('role', '!=', 'TEACHER')
                );

                console.log('📍 Query created, executing...');
                const snapshot = await getDocs(q);

                console.log(`✅ Fetched ${snapshot.size} students`);

                const studentList = snapshot.docs.map(doc => {
                    console.log(`  - Student: ${doc.data().name} (${doc.id})`);
                    return {
                        id: doc.id,
                        name: doc.data().name || 'Unknown',
                        email: doc.data().email || '',
                        powerPoints: doc.data().powerPoints || 0,
                        heroLevel: doc.data().heroLevel || 1,
                        role: doc.data().role || 'STUDENT'
                    };
                });

                setStudents(studentList.sort((a, b) => a.name.localeCompare(b.name)));
                setDiagnostics(prev => ({
                    ...prev,
                    studentsCount: snapshot.size,
                    studentErrors: []
                }));
            } catch (error) {
                console.error('❌ Student fetch error:', error);
                setDiagnostics(prev => ({
                    ...prev,
                    studentErrors: [error.message]
                }));
            }
        };

        fetchStudents();
    }, []);

    // ========== FETCH LOGS WITH REAL-TIME UPDATES ==========
    useEffect(() => {
        setLoading(true);
        let unsubscribe = null;

        try {
            console.log(`📍 Fetching logs for student: ${selectedStudent} `);

            let q;

            if (selectedStudent === 'ALL') {
                console.log('📍 Querying ALL logs from session_logs collection...');
                const logsRef = collection(db, 'session_logs');
                q = query(logsRef, orderBy('timestamp', 'desc'), limit(200));
            } else {
                console.log(`📍 Querying logs for student: ${selectedStudent} `);
                const logsRef = collection(db, 'students', selectedStudent, 'session_logs');
                q = query(logsRef, orderBy('timestamp', 'desc'), limit(100));
            }

            unsubscribe = onSnapshot(
                q,
                (snapshot) => {
                    console.log(`✅ Received ${snapshot.size} logs`);

                    const logData = snapshot.docs.map((doc, idx) => {
                        const data = doc.data();
                        console.log(`  Log ${idx + 1}: `, {
                            id: doc.id,
                            studentId: data.studentId,
                            questionId: data.questionId,
                            timestamp: data.timestamp,
                            fields: Object.keys(data).length
                        });

                        return {
                            id: doc.id,
                            studentId: selectedStudent === 'ALL' ? data.studentId : selectedStudent,
                            ...data,
                            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp)
                        };
                    });

                    setLogs(logData);
                    setDiagnostics(prev => ({
                        ...prev,
                        logsCount: snapshot.size,
                        logsErrors: []
                    }));
                    setLoading(false);
                },
                (error) => {
                    console.error('❌ Logs fetch error:', error);
                    setDiagnostics(prev => ({
                        ...prev,
                        logsErrors: [error.message, error.code]
                    }));
                    setLoading(false);
                }
            );

            return () => {
                if (unsubscribe) unsubscribe();
            };
        } catch (error) {
            console.error('❌ Setup error:', error);
            setDiagnostics(prev => ({
                ...prev,
                logsErrors: [error.message]
            }));
            setLoading(false);
        }
    }, [selectedStudent]);

    // ========== CHECK CURRENT USER ==========
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                console.log('👤 Current user:', {
                    uid: user.uid,
                    email: user.email
                });
                setDiagnostics(prev => ({
                    ...prev,
                    firebaseUser: {
                        uid: user.uid,
                        email: user.email
                    }
                }));
            }
        });
        return () => unsubscribe();
    }, []);

    // ========== RENDER ==========
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* TOP NAVIGATION */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-md z-20">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-xl">N</div>
                    <h1 className="font-bold text-lg tracking-tight">Ninja Admin</h1>
                </div>
                <div className="flex gap-1 bg-slate-800 p-1 rounded-lg">
                    {[
                        { id: 'browser', label: 'Questions', icon: Database },
                        { id: 'overview', label: 'Diagnostics', icon: LayoutDashboard },
                        { id: 'users', label: 'Users', icon: Users },
                        { id: 'logs', label: 'Logs', icon: FileText }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab.id
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-4">
                    {diagnostics.firebaseUser && (
                        <span className="text-xs font-mono text-slate-400">{diagnostics.firebaseUser.email}</span>
                    )}
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 overflow-hidden relative">

                {/* 1. QUESTION BROWSER TAB */}
                {activeTab === 'browser' && (
                    <div className="absolute inset-0 z-10 bg-slate-50">
                        <AdminQuestionsPanel />
                    </div>
                )}

                {/* 2. OVERVIEW / DIAGNOSTICS TAB */}
                {activeTab === 'overview' && (
                    <div className="absolute inset-0 overflow-y-auto p-6 animate-in fade-in duration-300">
                        <div className="max-w-7xl mx-auto space-y-6">
                            {/* FIREBASE USER INFO */}
                            <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-blue-200">
                                <h2 className="text-lg font-black text-blue-900 mb-4">👤 Firebase User</h2>
                                {diagnostics.firebaseUser ? (
                                    <div className="bg-green-50 p-4 rounded border border-green-300">
                                        <p className="text-green-800"><strong>✅ User is authenticated</strong></p>
                                        <p className="text-sm text-green-700 mt-2">
                                            UID: <code className="bg-white px-2 py-1 rounded">{diagnostics.firebaseUser.uid}</code>
                                        </p>
                                        <p className="text-sm text-green-700 mt-1">
                                            Email: <code className="bg-white px-2 py-1 rounded">{diagnostics.firebaseUser.email}</code>
                                        </p>
                                    </div>
                                ) : (
                                    <div className="bg-red-50 p-4 rounded border border-red-300">
                                        <p className="text-red-800"><strong>❌ User is NOT authenticated</strong></p>
                                    </div>
                                )}
                            </div>

                            {/* STUDENTS COUNT */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-purple-200">
                                    <h2 className="text-lg font-black text-purple-900 mb-4">👥 Students Query</h2>
                                    {diagnostics.studentErrors.length > 0 ? (
                                        <div className="bg-red-50 p-4 rounded border border-red-300">
                                            <p className="text-red-800 font-bold">❌ Error:</p>
                                            {diagnostics.studentErrors.map((error, idx) => (
                                                <p key={idx} className="text-red-700 text-sm mt-2">{error}</p>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-green-50 p-4 rounded border border-green-300">
                                            <p className="text-green-800">
                                                <strong>✅ Found {diagnostics.studentsCount} students</strong>
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-orange-200">
                                    <h2 className="text-lg font-black text-orange-900 mb-4">📋 Logs Query</h2>
                                    {diagnostics.logsErrors.length > 0 ? (
                                        <div className="bg-red-50 p-4 rounded border border-red-300">
                                            <p className="text-red-800 font-bold">❌ Error:</p>
                                            {diagnostics.logsErrors.map((error, idx) => (
                                                <p key={idx} className="text-red-700 text-sm mt-2">{error}</p>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-green-50 p-4 rounded border border-green-300">
                                            <p className="text-green-800">
                                                <strong>✅ Found {diagnostics.logsCount} logs</strong>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* STUDENT SELECTOR */}
                            <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-slate-200">
                                <h2 className="text-lg font-black text-slate-900 mb-4">📚 Select Student to Debug</h2>
                                <div className="flex flex-wrap gap-3 mb-4">
                                    <button
                                        onClick={() => setSelectedStudent('ALL')}
                                        className={`px-4 py-2 rounded-lg font-bold transition-all ${selectedStudent === 'ALL'
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                            } `}
                                    >
                                        👥 All Students ({students.length})
                                    </button>
                                    {students.slice(0, 10).map(student => (
                                        <button
                                            key={student.id}
                                            onClick={() => setSelectedStudent(student.id)}
                                            className={`px-4 py-2 rounded-lg font-bold transition-all text-sm ${selectedStudent === student.id
                                                ? 'bg-blue-600 text-white shadow-md'
                                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                } `}
                                            title={student.name}
                                        >
                                            {student.name.split(' ')[0]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* LOGS TABLE (Simplified for Overview) */}
                            <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 overflow-hidden">
                                <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
                                    <h2 className="text-lg font-black text-slate-900">
                                        📋 Recent System Logs
                                    </h2>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-sm font-bold text-slate-900">Student</th>
                                                <th className="px-6 py-3 text-left text-sm font-bold text-slate-900">Action</th>
                                                <th className="px-6 py-3 text-left text-sm font-bold text-slate-900">Time</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {logs.slice(0, 10).map((log) => (
                                                <tr key={log.id} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4 text-sm font-bold text-slate-900">
                                                        {students.find(s => s.id === log.studentId)?.name || log.studentId}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-700">
                                                        {log.questionId ? `Answered ${log.questionId}` : 'Session Action'}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-500">
                                                        {log.timestamp ? log.timestamp.toLocaleString() : '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. OTHER TABS */}
                {(activeTab === 'users' || activeTab === 'logs') && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
                        <div className="text-center opacity-50">
                            <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                            <h2 className="text-xl font-bold text-slate-900">Coming Soon</h2>
                            <p className="text-slate-500">This module is under construction.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminAnalyticsDashboard;
