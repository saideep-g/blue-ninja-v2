// @ts-nocheck
import React, { useState } from 'react';
import { Plus, Trash2, Calendar, TrendingUp, X } from 'lucide-react';
import { moduleService } from '../../../../services/admin/moduleService';
import { isBoostPeriodActive } from '../../../../types/admin/modules';
import type { BoostPeriod } from '../../../../types/admin/modules';

interface BoostPeriodsTabProps {
    studentId: string;
    enrolledSubjects: string[];
    boostPeriods: BoostPeriod[];
    onRefresh: () => void;
}

export default function BoostPeriodsTab({
    studentId,
    enrolledSubjects,
    boostPeriods,
    onRefresh
}: BoostPeriodsTabProps) {
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        startDate: '',
        endDate: '',
        subjectBoosts: {} as { [subject: string]: number },
        active: true
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreate = async () => {
        try {
            setSaving(true);
            setError(null);

            // Validation
            if (!formData.name || !formData.startDate || !formData.endDate) {
                setError('Please fill in all required fields');
                return;
            }

            if (formData.startDate > formData.endDate) {
                setError('End date must be after start date');
                return;
            }

            // Validate that at least one subject has more than 0 questions
            const totalBoost = Object.values(formData.subjectBoosts).reduce((sum, val) => sum + val, 0);
            if (totalBoost === 0) {
                setError('Please add extra questions for at least one subject');
                return;
            }

            await moduleService.addBoostPeriod(studentId, formData);

            // Reset form
            setFormData({
                name: '',
                startDate: '',
                endDate: '',
                subjectBoosts: {},
                active: true
            });
            setShowCreateForm(false);
            onRefresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create boost period');
            console.error('Error creating boost period:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (boostPeriod: BoostPeriod) => {
        if (!confirm(`Delete boost period "${boostPeriod.name}"?`)) return;

        try {
            setSaving(true);
            setError(null);

            await moduleService.deleteBoostPeriod(studentId, boostPeriod);
            onRefresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete boost period');
            console.error('Error deleting boost period:', err);
        } finally {
            setSaving(false);
        }
    };

    const updateSubjectBoost = (subject: string, value: number) => {
        setFormData({
            ...formData,
            subjectBoosts: {
                ...formData.subjectBoosts,
                [subject]: value
            }
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
                    Boost Periods
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Increase practice during holidays, exam prep, or when focusing on specific subjects.
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 rounded-xl">
                    <p className="text-red-700 dark:text-red-300 text-sm font-bold">❌ {error}</p>
                </div>
            )}

            {/* Create Button */}
            {!showCreateForm && (
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-xl text-sm font-bold hover:bg-purple-600 transition-colors"
                >
                    <Plus size={18} />
                    Create Boost Period
                </button>
            )}

            {/* Create Form */}
            {showCreateForm && (
                <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border-2 border-purple-200 dark:border-purple-900/30">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-gray-800 dark:text-gray-200">Create Boost Period</h4>
                        <button
                            onClick={() => setShowCreateForm(false)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                Period Name
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Winter Break Practice"
                                className="w-full px-4 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-xl text-gray-800 dark:text-gray-200"
                            />
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    className="w-full px-4 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-xl text-gray-800 dark:text-gray-200"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    className="w-full px-4 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-xl text-gray-800 dark:text-gray-200"
                                />
                            </div>
                        </div>

                        {/* Subject Boosts */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                Extra Questions Per Subject
                            </label>
                            <div className="space-y-2">
                                {enrolledSubjects.map((subject) => (
                                    <div key={subject} className="flex items-center gap-3">
                                        <span className="w-24 text-sm text-gray-700 dark:text-gray-300 capitalize">
                                            {subject}:
                                        </span>
                                        <input
                                            type="number"
                                            min="0"
                                            max="50"
                                            value={formData.subjectBoosts[subject] || 0}
                                            onChange={(e) => updateSubjectBoost(subject, parseInt(e.target.value) || 0)}
                                            className="w-20 px-3 py-1 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-800 dark:text-gray-200 text-center"
                                        />
                                        <span className="text-xs text-gray-500 dark:text-gray-400">extra questions</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={handleCreate}
                                disabled={saving}
                                className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-xl text-sm font-bold hover:bg-purple-600 transition-colors disabled:opacity-50"
                            >
                                {saving ? 'Creating...' : 'Create Boost Period'}
                            </button>
                            <button
                                onClick={() => setShowCreateForm(false)}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold hover:bg-gray-300 dark:hover:bg-gray-500"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Boost Periods List */}
            <div className="space-y-3">
                {boostPeriods.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-xl">
                        <p className="text-gray-600 dark:text-gray-400">
                            No boost periods configured yet
                        </p>
                    </div>
                ) : (
                    boostPeriods.map((period) => {
                        const isActive = isBoostPeriodActive(period);
                        const totalBoost = Object.values(period.subjectBoosts).reduce((sum, val) => sum + val, 0);

                        return (
                            <div
                                key={period.id}
                                className={`
                                    p-4 rounded-xl border-2 transition-all
                                    ${isActive
                                        ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-500'
                                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                                    }
                                `}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h4 className={`font-bold ${isActive ? 'text-purple-700 dark:text-purple-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                                {period.name}
                                            </h4>
                                            {isActive && (
                                                <span className="px-2 py-0.5 bg-purple-500 text-white rounded-full text-xs font-bold">
                                                    Active Now
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 mb-3">
                                            <div className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                {new Date(period.startDate).toLocaleDateString()} - {new Date(period.endDate).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <TrendingUp size={14} />
                                                +{totalBoost} total extra questions
                                            </div>
                                        </div>

                                        {/* Subject Boosts */}
                                        <div className="flex gap-2 flex-wrap">
                                            {Object.entries(period.subjectBoosts).map(([subject, boost]) => (
                                                boost > 0 && (
                                                    <span
                                                        key={subject}
                                                        className="px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold"
                                                    >
                                                        {subject}: +{boost}
                                                    </span>
                                                )
                                            ))}
                                        </div>
                                    </div>

                                    {/* Delete Button */}
                                    <button
                                        onClick={() => handleDelete(period)}
                                        disabled={saving}
                                        className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Info Note */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/30 rounded-xl">
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    <span className="font-bold">💡 Tip:</span> Boost periods automatically add extra questions during the specified date range.
                    Perfect for holidays, exam preparation, or when you want to focus on specific subjects.
                </p>
            </div>
        </div>
    );
}
