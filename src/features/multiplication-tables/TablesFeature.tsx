
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import TableSelection from './pages/TableSelection';
import PracticeSession from './pages/PracticeSession';
import SessionSummary from './pages/SessionSummary';
import ParentDashboard from './pages/ParentDashboard';

// This component acts as the independent "App" for the Tables feature
export default function TablesFeature() {
    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            <Routes>
                <Route path="/" element={<TableSelection />} />
                <Route path="/practice" element={<PracticeSession />} />
                <Route path="/summary" element={<SessionSummary />} />
                <Route path="/parent" element={<ParentDashboard />} />
                <Route path="*" element={<Navigate to="/tables" replace />} />
            </Routes>
        </div>
    );
}
