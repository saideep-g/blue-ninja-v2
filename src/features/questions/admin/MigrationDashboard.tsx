import React, { useState } from 'react';
import { LegacyToMCQV1, QuestionTransformer } from './transformers';
import { V3ToBranchingTransformer } from './transformers/v3-to-branching';
import { registry } from '../registry';
import { Check, X, ArrowRight, Database, RefreshCw, Play, AlertTriangle } from 'lucide-react';

// Mock Data Source for Demo
const MOCK_LEGACY_DB = [
    { id: 'old_1', type: 'MCQ', question: 'What is 2+2?', options: ['3', '4', '5'], correctOptionIndex: 1 },
    { id: 'old_2', type: 'MCQ', text: 'Capital of France?', options: ['London', 'Paris'], answer: 'Paris' },
    { id: 'old_3', type: 'UNKNOWN', question: 'Broken Data', options: null }
];

const MOCK_V3_DB = [
    {
        "item_id": "V3.MCQ.GOLD.BRANCH.SET1.001",
        "atom_id": "CBSE7.CH03.DATA.02",
        "template_id": "MCQ_CONCEPT",
        "difficulty": 2,
        "context_tags": [
            "crafts",
            "origami"
        ],
        "prompt": null,
        "instruction": null,
        "stimulus": null,
        "interaction": null,
        "answer_key": null,
        "evidence": [
            {
                "outcome_type": "conceptual",
                "outcome_ref": null
            }
        ],
        "grading_overrides": {},
        "diagnostics": {
            "error_model": []
        },
        "recovery_override": null,
        "stages": [
            {
                "stage_id": "ST1",
                "atom_id_override": null,
                "prompt": {
                    "text": "Double-bar chart (table): Club votes\nDance: Girls 18, Boys 12\nMusic: Girls 14, Boys 16\nArt: Girls 10, Boys 8\nQuestion: Which statement is true?",
                    "latex": null,
                    "media_ref": null
                },
                "instruction": "Read totals carefully (Girls + Boys).",
                "interaction": {
                    "type": "mcq_concept",
                    "config": {
                        "options": [
                            {
                                "id": "A",
                                "text": "More girls than boys voted for Music.",
                                "latex": null,
                                "diagnostic": {
                                    "misconception_id": "MIS_40394F1D2C",
                                    "confidence": 0.85,
                                    "note": null
                                }
                            },
                            {
                                "id": "B",
                                "text": "Total votes for Dance is 30.",
                                "latex": null,
                                "diagnostic": null
                            },
                            {
                                "id": "C",
                                "text": "Art has the highest total votes.",
                                "latex": null,
                                "diagnostic": {
                                    "misconception_id": "MIS_8DDC5FC2FF",
                                    "confidence": 0.85,
                                    "note": null
                                }
                            },
                            {
                                "id": "D",
                                "text": "Boys voted more than girls for Dance.",
                                "latex": null,
                                "diagnostic": {
                                    "misconception_id": "MIS_6D0456042E",
                                    "confidence": 0.85,
                                    "note": null
                                }
                            }
                        ],
                        "shuffle": true,
                        "single_select": true
                    }
                },
                "answer_key": {
                    "correct_option_id": "B"
                },
                "evidence": [
                    {
                        "outcome_type": "logical",
                        "outcome_ref": null
                    },
                    {
                        "outcome_type": "conceptual",
                        "outcome_ref": null
                    }
                ],
                "grading_overrides": {},
                "diagnostics": {
                    "error_model": []
                },
                "recovery_override": null,
                "unlock_logic": {
                    "show_when": "always",
                    "depends_on_stage_id": null,
                    "max_attempts": null
                }
            },
            {
                "stage_id": "STC",
                "atom_id_override": null,
                "prompt": {
                    "text": "Transfer: If Girls for Art increase by 5, what is the new total votes for Art?",
                    "latex": null,
                    "media_ref": null
                },
                "instruction": "Update only the specified bar, then add.",
                "interaction": {
                    "type": "mcq_concept",
                    "config": {
                        "options": [
                            {
                                "id": "A",
                                "text": "18",
                                "latex": null,
                                "diagnostic": {
                                    "misconception_id": "MIS_40394F1D2C",
                                    "confidence": 0.85,
                                    "note": null
                                }
                            },
                            {
                                "id": "B",
                                "text": "23",
                                "latex": null,
                                "diagnostic": null
                            },
                            {
                                "id": "C",
                                "text": "13",
                                "latex": null,
                                "diagnostic": {
                                    "misconception_id": "MIS_8DDC5FC2FF",
                                    "confidence": 0.85,
                                    "note": null
                                }
                            },
                            {
                                "id": "D",
                                "text": "28",
                                "latex": null,
                                "diagnostic": {
                                    "misconception_id": "MIS_6D0456042E",
                                    "confidence": 0.85,
                                    "note": null
                                }
                            }
                        ],
                        "shuffle": true,
                        "single_select": true
                    }
                },
                "answer_key": {
                    "correct_option_id": "B"
                },
                "evidence": [
                    {
                        "outcome_type": "procedural",
                        "outcome_ref": null
                    },
                    {
                        "outcome_type": "logical",
                        "outcome_ref": null
                    }
                ],
                "grading_overrides": {},
                "diagnostics": {
                    "error_model": []
                },
                "recovery_override": null,
                "unlock_logic": {
                    "show_when": "after_stage_correct",
                    "depends_on_stage_id": "ST1",
                    "max_attempts": null
                }
            },
            {
                "stage_id": "STR",
                "atom_id_override": "CBSE7.CH03.DATA.02",
                "prompt": {
                    "text": "Repair: In a bar chart, what does the height of a bar represent?",
                    "latex": null,
                    "media_ref": null
                },
                "instruction": "Think: bars encode numbers using the axis scale.",
                "interaction": {
                    "type": "mcq_concept",
                    "config": {
                        "options": [
                            {
                                "id": "A",
                                "text": "The category name",
                                "latex": null,
                                "diagnostic": {
                                    "misconception_id": "MIS_40394F1D2C",
                                    "confidence": 0.85,
                                    "note": null
                                }
                            },
                            {
                                "id": "B",
                                "text": "The frequency/value on the y-axis",
                                "latex": null,
                                "diagnostic": null
                            },
                            {
                                "id": "C",
                                "text": "The width of the bar",
                                "latex": null,
                                "diagnostic": {
                                    "misconception_id": "MIS_8DDC5FC2FF",
                                    "confidence": 0.85,
                                    "note": null
                                }
                            },
                            {
                                "id": "D",
                                "text": "The colour of the bar",
                                "latex": null,
                                "diagnostic": {
                                    "misconception_id": "MIS_6D0456042E",
                                    "confidence": 0.85,
                                    "note": null
                                }
                            }
                        ],
                        "shuffle": true,
                        "single_select": true
                    }
                },
                "answer_key": {
                    "correct_option_id": "B"
                },
                "evidence": [
                    {
                        "outcome_type": "conceptual",
                        "outcome_ref": null
                    }
                ],
                "grading_overrides": {},
                "diagnostics": {
                    "error_model": []
                },
                "recovery_override": null,
                "unlock_logic": {
                    "show_when": "after_stage_attempts_exceeded",
                    "depends_on_stage_id": "ST1",
                    "max_attempts": 1
                }
            },
            {
                "stage_id": "STR2",
                "atom_id_override": null,
                "prompt": {
                    "text": "Retry: What is the total number of votes for Music (Girls + Boys)?",
                    "latex": null,
                    "media_ref": null
                },
                "instruction": "Add the two bars for Music: 14 + 16.",
                "interaction": {
                    "type": "mcq_concept",
                    "config": {
                        "options": [
                            {
                                "id": "A",
                                "text": "28",
                                "latex": null,
                                "diagnostic": {
                                    "misconception_id": "MIS_40394F1D2C",
                                    "confidence": 0.85,
                                    "note": null
                                }
                            },
                            {
                                "id": "B",
                                "text": "30",
                                "latex": null,
                                "diagnostic": {
                                    "misconception_id": "MIS_8DDC5FC2FF",
                                    "confidence": 0.85,
                                    "note": null
                                }
                            },
                            {
                                "id": "C",
                                "text": "32",
                                "latex": null,
                                "diagnostic": null
                            },
                            {
                                "id": "D",
                                "text": "16",
                                "latex": null,
                                "diagnostic": {
                                    "misconception_id": "MIS_6D0456042E",
                                    "confidence": 0.85,
                                    "note": null
                                }
                            }
                        ],
                        "shuffle": true,
                        "single_select": true
                    }
                },
                "answer_key": {
                    "correct_option_id": "C"
                },
                "evidence": [
                    {
                        "outcome_type": "procedural",
                        "outcome_ref": null
                    },
                    {
                        "outcome_type": "logical",
                        "outcome_ref": null
                    }
                ],
                "grading_overrides": {},
                "diagnostics": {
                    "error_model": []
                },
                "recovery_override": null,
                "unlock_logic": {
                    "show_when": "after_stage_correct",
                    "depends_on_stage_id": "STR",
                    "max_attempts": null
                }
            }
        ],
        "transfer": null,
        "metadata": {
            "version": "v3",
            "author": "generated",
            "created_at": "2025-12-29T17:46:48Z"
        }
    }
];

export const MigrationDashboard: React.FC = () => {
    const [scannedItems, setScannedItems] = useState<any[]>([]);
    const [results, setResults] = useState<any[]>([]);
    const [selectedTransformer, setSelectedTransformer] = useState<QuestionTransformer>(LegacyToMCQV1);

    const scan = () => {
        // Toggle source based on transformer type for demo purposes
        if (selectedTransformer.id === V3ToBranchingTransformer.id) {
            setScannedItems(MOCK_V3_DB);
        } else {
            setScannedItems(MOCK_LEGACY_DB);
        }
        setResults([]);
    };

    const runDryRun = () => {
        const outcomes = scannedItems.map(item => {
            const res = selectedTransformer.transform(item);
            return {
                original: item,
                ...res
            };
        });
        setResults(outcomes);
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8">
            <header className="border-b pb-4">
                <h1 className="text-3xl font-bold text-gray-900">Question Migration Tool</h1>
                <p className="text-gray-500">Upgrade legacy content to QLMS V1/V2 Schemas.</p>
            </header>

            {/* CONTROLS */}
            <div className="flex gap-4 p-4 bg-gray-50 rounded-xl border items-center flex-wrap">
                <div className="flex items-center gap-2">
                    <label className="text-sm font-bold text-gray-700">Transformer:</label>
                    <select
                        className="px-3 py-2 border rounded-lg bg-white"
                        value={selectedTransformer.id}
                        onChange={(e) => {
                            if (e.target.value === LegacyToMCQV1.id) setSelectedTransformer(LegacyToMCQV1);
                            if (e.target.value === V3ToBranchingTransformer.id) setSelectedTransformer(V3ToBranchingTransformer);
                            setScannedItems([]);
                            setResults([]);
                        }}
                    >
                        <option value={LegacyToMCQV1.id}>Legacy MCQ to V1</option>
                        <option value={V3ToBranchingTransformer.id}>V3 Declarative to Branching FSM</option>
                    </select>
                </div>

                <div className="h-8 w-px bg-gray-300 mx-2 hidden md:block" />

                <button
                    onClick={scan}
                    className="flex items-center gap-2 px-4 py-2 bg-white border shadow-sm rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
                >
                    <Database className="w-4 h-4" /> Load Mock Data
                </button>

                <button
                    onClick={runDryRun}
                    disabled={scannedItems.length === 0}
                    className="md:ml-auto flex items-center gap-2 px-6 py-2 bg-blue-600 text-white shadow-md rounded-lg hover:bg-blue-700 font-bold disabled:opacity-50"
                >
                    <Play className="w-4 h-4" /> Run Transformation
                </button>
            </div>

            {/* RESULTS GRID */}
            <div className="grid gap-4">
                {results.map((res, idx) => (
                    <div key={idx} className={`border rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4 ${res.success ? 'bg-white border-green-100' : 'bg-red-50 border-red-200'}`}>
                        {/* BEFORE */}
                        <div className="flex flex-col gap-2">
                            <div className="font-bold text-xs text-gray-400 uppercase tracking-widest">Original Source</div>
                            <div className="text-xs font-mono bg-gray-50 p-3 rounded border overflow-auto max-h-60">
                                <pre>{JSON.stringify(res.original, null, 2)}</pre>
                            </div>
                        </div>

                        {/* AFTER */}
                        <div className={`p-3 rounded border overflow-auto max-h-60 flex flex-col gap-2 ${res.success ? 'bg-green-50 border-green-200' : 'bg-red-100 border-red-200'}`}>
                            <div className="font-bold text-xs text-gray-400 uppercase tracking-widest flex justify-between">
                                <span>{res.success ? `Transformed Target` : 'Error Log'}</span>
                                {res.success ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-red-600" />}
                            </div>
                            {res.success ? (
                                <pre className="text-xs font-mono text-green-900">{JSON.stringify(res.data, null, 2)}</pre>
                            ) : (
                                <div className="text-red-700 font-bold text-sm flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" /> {res.error}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {results.length > 0 && results.some(r => r.success) && (
                <div className="flex justify-end pt-4 border-t">
                    <button className="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 shadow-lg">
                        <RefreshCw className="w-4 h-4 inline mr-2" />
                        Save {results.filter(r => r.success).length} Migrated Items to DB
                    </button>
                </div>
            )}
        </div>
    );
};
