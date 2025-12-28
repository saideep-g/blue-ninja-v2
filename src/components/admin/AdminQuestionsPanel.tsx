/**
 * src/components/admin/AdminQuestionsPanel.tsx
 * ============================================
 * 
 * A World-Class Question Upload Portal.
 * Rebuilt from scratch to support V3 Bundles, robust validation, and duplicate detection.
 * 
 * Features:
 * - Clean Drag & Drop Interface
 * - V2/V3 Auto-Detection
 * - Real-time Validation Engine (Schema + Duplicates + Logic)
 * - In-browser JSON Editor for Corrections
 * - Bundle Publishing
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Upload, FileUp, CheckCircle, AlertTriangle, XCircle, Search,
  Save, Edit3, Trash2, Database, Play, Loader, FileJson, ArrowRight
} from 'lucide-react';

import { useIndexedDB } from '../../hooks/useIndexedDB';
import { runFullValidationSuite, ValidatedItem, ValidationIssue, ValidationSummary } from '../../services/uploadValidationEngine';
import { publishBundleToFirestore } from '../../services/firestoreQuestionService';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

type UploadStep = 'UPLOAD' | 'REVIEW' | 'PUBLISHING' | 'SUCCESS';

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const ValidationBadge = ({ type, count }: { type: 'error' | 'warning' | 'valid', count: number }) => {
  if (count === 0) return null;
  const config = {
    error: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
    warning: { bg: 'bg-amber-100', text: 'text-amber-700', icon: AlertTriangle },
    valid: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  }[type];
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{count}</span>
    </div>
  );
};

const IssueCard = ({ issue }: { issue: ValidationIssue }) => {
  const isCrit = issue.severity === 'CRITICAL';
  return (
    <div className={`p-3 rounded-lg text-sm border flex gap-3 ${isCrit ? 'bg-red-50 border-red-100 text-red-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
      {isCrit ? <XCircle className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
      <div>
        <div className="font-semibold">{issue.code}</div>
        <div>{issue.message}</div>
        {issue.suggestion && <div className="mt-1 text-xs opacity-80">💡 {issue.suggestion}</div>}
      </div>
    </div>
  );
};

const EditorModal = ({
  item,
  onSave,
  onCancel
}: {
  item: ValidatedItem,
  onSave: (data: any) => void,
  onCancel: () => void
}) => {
  const [jsonText, setJsonText] = useState(JSON.stringify(item.data, null, 2));
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    try {
      const parsed = JSON.parse(jsonText);
      onSave(parsed);
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-blue-600" />
            Edit Item: {item.item_id}
          </h3>
          <button onClick={onCancel} className="p-2 hover:bg-slate-200 rounded-full transition">
            <XCircle className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          <div className="flex-1 p-0 relative">
            <textarea
              value={jsonText}
              onChange={(e) => { setJsonText(e.target.value); setError(null); }}
              className="w-full h-full p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 ring-inset ring-blue-500/20"
              spellCheck={false}
            />
            {error && (
              <div className="absolute bottom-4 left-4 right-4 bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-semibold border border-red-200 shadow-lg animate-bounce">
                JSON Error: {error}
              </div>
            )}
          </div>
          <div className="w-full md:w-80 border-l bg-slate-50 p-4 overflow-y-auto">
            <h4 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wider">Current Issues</h4>
            <div className="space-y-2">
              {item.issues.length === 0 ? (
                <div className="text-green-600 text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> No issues found.
                </div>
              ) : (
                item.issues.map((iss, idx) => <IssueCard key={idx} issue={iss} />)
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition">
            Cancel
          </button>
          <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium shadow-sm transition flex items-center gap-2">
            <Save className="w-4 h-4" /> Save Corrections
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AdminQuestionsPanel() {
  // State
  const [step, setStep] = useState<UploadStep>('UPLOAD');
  const [items, setItems] = useState<ValidatedItem[]>([]);
  const [summary, setSummary] = useState<ValidationSummary>({ total: 0, valid: 0, invalid: 0, warnings: 0, duplicates: 0 });
  const [rawBundleMetadata, setRawBundleMetadata] = useState<any>(null);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  // IndexedDB State
  const { getAllPendingQuestions, isInitialized } = useIndexedDB();
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set());

  // Initialization
  useEffect(() => {
    if (isInitialized) {
      loadExistingIds();
    }
  }, [isInitialized]);

  const loadExistingIds = async () => {
    try {
      const pending = await getAllPendingQuestions(null);
      const ids = new Set(pending.map((p: any) => p.qId));
      setExistingIds(ids);
      console.log(`[UploadPortal] Loaded ${ids.size} existing IDs from local DB for duplicate checking.`);
    } catch (e) {
      console.warn("Failed to load existing IDs:", e);
    }
  };

  // Actions
  const handleFileUpload = async (file: File) => {
    const text = await file.text();
    parseAndValidate(text);
  };

  const loadDemoBundle = async () => {
    try {
      const demoData = await import('../../data/cbse7_gold_questions_v3_medium_kpop_cdrama_set1.json');
      const data = demoData.default || demoData;
      setRawBundleMetadata(data); // Capture bundle metadata
      const rawText = JSON.stringify(data.items || []); // Just extract items for validation suite but pass array
      // Re-serializing is inefficient but robust for my parser function below which expects text or obj
      parseAndValidateItems(data.items || [], data.schema_version);
    } catch (e) {
      console.error("Failed to load demo:", e);
      alert("Failed to load demo bundle.");
    }
  };

  const parseAndValidate = (jsonText: string) => {
    try {
      const data = JSON.parse(jsonText);
      setRawBundleMetadata(data); // Store root for publishing later

      let rawItems = [];
      let version = '3.0';

      if (Array.isArray(data)) {
        rawItems = data;
        version = '2.0'; // Assume V2 if straight array
      } else if (data.items) {
        rawItems = data.items;
        version = data.schema_version || '3.0';
      } else {
        throw new Error("Invalid Format: Could not find 'items' array.");
      }

      parseAndValidateItems(rawItems, version);
    } catch (e: any) {
      alert(`Parse Error: ${e.message}`);
    }
  };

  const parseAndValidateItems = async (rawItems: any[], version: string) => {
    setStep('REVIEW'); // Show review screen immediately (could show loading first)
    // Run validation
    const result = await runFullValidationSuite(rawItems, existingIds, version);
    setItems(result.items);
    setSummary(result.summary);
  };

  const handleUpdateItem = async (newData: any) => {
    if (editingItemIndex === null) return;

    // Update the item safely
    const newItems = [...items];
    const oldItem = newItems[editingItemIndex];

    // We need to re-validate JUST this item (or better, all, to check batch duplicates)
    // For performance, let's re-validate all. It's safe given < 1000 items usually.
    const rawList = newItems.map((it, idx) => idx === editingItemIndex ? newData : it.data);
    const result = await runFullValidationSuite(rawList, existingIds, oldItem.schemaVersion);

    setItems(result.items);
    setSummary(result.summary);
    setEditingItemIndex(null);
  };

  const handlePublish = async () => {
    if (summary.invalid > 0) {
      if (!window.confirm(`You have ${summary.invalid} invalid items. They will be EXCLUDED from the bundle. Continue?`)) {
        return;
      }
    }

    setStep('PUBLISHING');
    try {
      const validItems = items.filter(i => i.isValid).map(i => i.data);
      if (validItems.length === 0) throw new Error("No valid items to publish.");

      // Construct Bundle
      const bundle = {
        ...(rawBundleMetadata || {}),
        items: validItems,
        updated_at: new Date().toISOString()
      };

      // PUBLISH
      await publishBundleToFirestore(bundle, {
        userId: 'ADMIN',
        bankId: bundle.bundle_id || 'unknown_bundle'
      });

      setStep('SUCCESS');
    } catch (e: any) {
      alert(`Publish Failed: ${e.message}`);
      setStep('REVIEW');
    }
  };

  // Renderers
  if (step === 'UPLOAD') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-50 min-h-[600px]">
        <div className="max-w-2xl w-full text-center space-y-8">
          <div className="space-y-4">
            <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-100">
              <Upload className="w-10 h-10 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Question Upload Portal</h1>
            <p className="text-lg text-slate-600">Drag and drop your V2/V3 JSON bundle here to begin.</p>
          </div>

          <div
            className="border-3 border-dashed border-slate-300 rounded-3xl p-12 bg-white hover:bg-blue-50 hover:border-blue-400 transition-all cursor-pointer group"
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]);
            }}
          >
            <div className="space-y-4">
              <FileUp className="w-12 h-12 text-slate-400 mx-auto group-hover:text-blue-500 transition-colors" />
              <div className="text-slate-500 font-medium">Drop JSON file or click to browse</div>
              <input
                type="file"
                accept=".json"
                className="hidden"
                id="file-upload"
                onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }}
              />
              <label htmlFor="file-upload" className="inline-block px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition cursor-pointer shadow-lg hover:shadow-xl translate-y-0 hover:-translate-y-0.5 transform">
                Browse Files
              </label>
            </div>
          </div>

          <div className="pt-8 flex justify-center">
            <button
              onClick={loadDemoBundle}
              className="flex items-center gap-2 px-6 py-3 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 rounded-xl font-semibold transition border border-yellow-200"
            >
              <FileJson className="w-5 h-5" />
              Load V3 Demo Bundle
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'PUBLISHING') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50">
        <Loader className="w-16 h-16 text-blue-600 animate-spin mb-6" />
        <h2 className="text-2xl font-bold text-slate-800">Publishing Bundle...</h2>
        <p className="text-slate-500 mt-2">Uploading to Question Store.</p>
      </div>
    );
  }

  if (step === 'SUCCESS') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-green-50">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-in zoom-in spin-in-6 duration-500">
          <CheckCircle className="w-14 h-14 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-green-900 mb-2">Publish Successful!</h2>
        <p className="text-green-700 mb-8">The bundle has been uploaded to Firestore.</p>
        <button
          onClick={() => { setStep('UPLOAD'); setItems([]); }}
          className="px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-lg font-semibold transition"
        >
          Upload Another
        </button>
      </div>
    );
  }

  // REVIEW STEP
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b px-8 py-5 flex items-center justify-between bg-white sticky top-0 z-10">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Database className="w-6 h-6 text-slate-400" />
            Review Bundle
          </h2>
          <div className="flex gap-4 mt-2 text-sm font-medium text-slate-600">
            <span>Total: {summary.total}</span>
            <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Valid: {summary.valid}</span>
            <span className="text-red-600 flex items-center gap-1"><XCircle className="w-3 h-3" /> Invalid: {summary.invalid}</span>
            <span className="text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Warnings: {summary.warnings}</span>
            {summary.duplicates > 0 && <span className="text-purple-600 font-bold">Duplicates: {summary.duplicates}</span>}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { if (window.confirm('Reset everything?')) setStep('UPLOAD'); }}
            className="px-4 py-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handlePublish}
            disabled={summary.total === 0}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md hover:shadow-lg font-semibold transition flex items-center gap-2"
          >
            Publish Bundle <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-8 bg-slate-50">
        <div className="max-w-6xl mx-auto space-y-3">
          {items.map((item, idx) => (
            <div
              key={idx}
              className={`bg-white rounded-xl p-4 border shadow-sm transition-all hover:shadow-md flex items-start gap-4 
                ${!item.isValid ? 'border-red-200 ring-1 ring-red-50' : item.hasWarnings ? 'border-amber-200' : 'border-slate-200'}
              `}
            >
              {/* Status Icon */}
              <div className="mt-1">
                {!item.isValid ? (
                  <XCircle className="w-6 h-6 text-red-500" />
                ) : item.hasWarnings ? (
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                ) : (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                )}
              </div>

              {/* Main Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-slate-900 truncate">{item.item_id}</h3>
                  <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{item.template_id}</span>
                </div>

                {/* Issues List */}
                {item.issues.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {item.issues.map((iss, i) => (
                      <div key={i} className={`text-sm flex gap-2 ${iss.severity === 'CRITICAL' ? 'text-red-700' : 'text-amber-700'}`}>
                        <span className="font-bold shrink-0">{iss.code}:</span>
                        <span className="opacity-90">{iss.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <button
                onClick={() => setEditingItemIndex(idx)}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                title="Edit Item JSON"
              >
                <Edit3 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {editingItemIndex !== null && items[editingItemIndex] && (
        <EditorModal
          item={items[editingItemIndex]}
          onSave={handleUpdateItem}
          onCancel={() => setEditingItemIndex(null)}
        />
      )}
    </div>
  );
}
