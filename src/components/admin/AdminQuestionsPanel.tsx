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
  Save, Edit3, Trash2, Database, Play, Loader, FileJson, ArrowRight, X, Eye, RefreshCw,
  CheckCircle, AlertTriangle, AlertCircle, XCircle, Search, Upload, FileUp, Download
} from 'lucide-react';
import { useLocation } from 'react-router-dom';

import { getDocs } from 'firebase/firestore';
import { questionBundlesCollection } from '../../services/db/firestore';
import MissionCard from '../diagnostic/MissionCard';

import { useIndexedDB } from '../../hooks/useIndexedDB';
import { runFullValidationSuite, ValidatedItem, ValidationIssue, ValidationSummary } from "../../services/validation/upload";
import { publishBundleToFirestore, deleteQuestionFromBundle } from "../../services/questions/firestore";
import { AdminIntelligenceReport } from './AdminIntelligenceReport';
import { ConceptVitalityDetail } from './ConceptVitalityDetail';
import { TemplateDiversityReport } from './TemplateDiversityReport';

// Restore PreviewModal here before main component
const PreviewModal = ({
  item,
  onClose,
  onNext,
  onPrev,
  hasNext,
  hasPrev
}: {
  item: any,
  onClose: () => void,
  onNext?: () => void,
  onPrev?: () => void,
  hasNext?: boolean,
  hasPrev?: boolean
}) => {
  const [mode, setMode] = useState<'PREVIEW' | 'JSON'>('PREVIEW');

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && onNext) onNext();
      if (e.key === 'ArrowLeft' && onPrev) onPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-100 rounded-3xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-md shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="bg-blue-600 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                {mode === 'PREVIEW' ? 'User View' : 'Raw Inspector'}
              </span>
              <span className="font-mono text-sm opacity-80">{item.item_id || item.id}</span>
            </div>

            <div className="flex bg-slate-800 rounded-lg p-1 gap-1">
              <button
                onClick={() => setMode('PREVIEW')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition ${mode === 'PREVIEW' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                👁️ Preview
              </button>
              <button
                onClick={() => setMode('JSON')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition ${mode === 'JSON' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                🛠️ JSON
              </button>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center bg-[var(--color-surface)] relative">
          {mode === 'PREVIEW' ? (
            <div className="w-full max-w-5xl">
              {/* Use MissionCard exactly as Student sees it, but with Dummy Callbacks */}
              <MissionCard
                key={item.id} // Force re-mount on change
                question={item}
                onAnswer={(...args) => console.log("Preview Answer:", args)}
                onStartRecovery={() => console.log("Preview Recovery")}
              />
            </div>
          ) : (
            <div className="w-full max-w-5xl bg-white rounded-xl shadow-sm border border-slate-300 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-xs font-mono text-slate-500 uppercase tracking-wider">
                Raw Object Inspector
              </div>
              <pre className="p-4 text-xs font-mono text-slate-800 overflow-auto max-h-[70vh]">
                {JSON.stringify(item, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

type UploadStep = 'UPLOAD' | 'REVIEW' | 'PUBLISHING' | 'SUCCESS' | 'BROWSE' | 'INTELLIGENCE' | 'DUPLICATES' | 'VITALITY_DETAIL' | 'TEMPLATE_DIVERSITY';

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
  const location = useLocation();
  // State
  const [step, setStep] = useState<UploadStep>('BROWSE');
  const [items, setItems] = useState<ValidatedItem[]>([]);
  const [summary, setSummary] = useState<ValidationSummary>({ total: 0, valid: 0, invalid: 0, warnings: 0, duplicates: 0 });
  const [rawBundleMetadata, setRawBundleMetadata] = useState<any>(null);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  // Browser State
  const [browserStep, setBrowserStep] = useState<'IDLE' | 'LOADING' | 'READY'>('IDLE');
  // IndexedDB State
  const {
    getAllPendingQuestions,
    deletePendingQuestion,
    isInitialized,
    cacheBrowserItems,
    getBrowserItems,
    clearBrowserCache,
    deleteBrowserItem
  } = useIndexedDB();

  const [browserQuestions, setBrowserQuestions] = useState<any[]>([]);
  const [browserSearch, setBrowserSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<{ type?: string, version?: string } | null>(null);
  const [duplicateGroups, setDuplicateGroups] = useState<{ signature: string, ids: string[], type: string }[]>([]);
  const [previewItem, setPreviewItem] = useState<any | null>(null);

  const [existingIds, setExistingIds] = useState<Set<string>>(new Set());
  const [pendingDraftCount, setPendingDraftCount] = useState(0);

  // Init Logic
  useEffect(() => {
    if (isInitialized) {
      loadExistingIds();
    }
  }, [isInitialized]);

  // Auto-load Browser Data
  useEffect(() => {
    if (isInitialized && step === 'BROWSE' && browserStep === 'IDLE') {
      loadAllQuestions(false);
    }
  }, [isInitialized, step, browserStep]);

  // Handle Incoming Deep Links / Filters
  useEffect(() => {
    if (location.state?.filter) {
      console.log("Applying Filter:", location.state.filter);
      setStep('BROWSE');
      setActiveFilter(location.state.filter);
      // Don't call loadAllQuestions here; let the isInitialized effect handle it safely
    }
    if (location.state?.mode === 'DUPLICATES') {
      setStep('DUPLICATES');
    }
    if (location.state?.mode === 'VITALITY_DETAIL') {
      setStep('VITALITY_DETAIL');
    }
    if (location.state?.mode === 'TEMPLATE_DIVERSITY') {
      setStep('TEMPLATE_DIVERSITY');
    }
  }, [location.state]);

  const loadExistingIds = async () => {
    try {
      const pending = await getAllPendingQuestions(null);
      const ids = new Set<string>(pending.map((p: any) => String(p.qId)));
      setExistingIds(ids);
      setPendingDraftCount(pending.length); // Track count for UI
      console.log(`[UploadPortal] Loaded ${ids.size} existing IDs from local DB for duplicate checking.`);
    } catch (e) {
      console.warn("Failed to load existing IDs:", e);
    }
  };

  // Draft Management Actions
  const handleResumeDrafts = async () => {
    try {
      const pending = await getAllPendingQuestions(null);
      // Prefer edited data if available, else original
      const rawItems = pending.map((p: any) => p.editedData || p.originalData);
      if (rawItems.length === 0) {
        alert("No drafts found.");
        return;
      }

      // Re-run validation to ensure state is fresh
      await parseAndValidateItems(rawItems, '3.0'); // Assume 3.0 or detect from metadata if stored
      console.log(`[Drafts] Resumed session with ${rawItems.length} items`);
    } catch (e) {
      console.error("Failed to resume drafts:", e);
      alert("Failed to resume session.");
    }
  };

  const handleDownloadDrafts = async () => {
    try {
      const pending = await getAllPendingQuestions(null);
      const rawItems = pending.map((p: any) => p.editedData || p.originalData);

      const exportData = {
        schema_version: "3.0",
        exported_at: new Date().toISOString(),
        items: rawItems
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `draft_recovery_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to download drafts:", e);
      alert("Failed to download drafts.");
    }
  };

  const handleClearDrafts = async () => {
    if (!window.confirm("Are you sure you want to permanently delete these drafts?")) return;
    try {
      const pending = await getAllPendingQuestions(null);
      await Promise.all(pending.map((p: any) => deletePendingQuestion(p.qId)));
      setExistingIds(new Set());
      setPendingDraftCount(0);
      alert("Drafts cleared.");
    } catch (e) {
      console.error("Failed to clear drafts:", e);
      alert("Failed to clear drafts.");
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
      } else if (data.item_id || data.atom_id || data.template_id) {
        // Single V3 Item Upload Support
        rawItems = [data];
        version = '3.0';
      } else {
        throw new Error("Invalid Format: Could not find 'items' array and data does not look like a Question Item.");
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

      // Clear cache so next browser load fetches fresh data
      clearBrowserCache().catch(err => console.error("Failed to clear browser cache:", err));

    } catch (e: any) {
      alert(`Publish Failed: ${e.message}`);
      setStep('REVIEW');
    }
  };

  // Browser Actions
  const loadAllQuestions = async (forceRefresh = false) => {
    setBrowserStep('LOADING');
    try {
      // 1. Try Cache First (if not forced)
      if (!forceRefresh) {
        const cached = await getBrowserItems();
        if (cached && cached.length > 0) {
          console.log(`[Browser] Loaded ${cached.length} questions from IndexedDB cache.`);
          setBrowserQuestions(cached);
          setBrowserStep('READY');
          return;
        }
      }

      // 2. Fetch from Firestore if needed
      console.log('[Browser] Fetching from Firestore...');
      const snap = await getDocs(questionBundlesCollection);
      let allItems: any[] = [];
      snap.forEach(doc => {
        const data = doc.data();
        if (data.items && Array.isArray(data.items)) {
          // Flatten and inject Bundle ID for reference
          const items = data.items.map((it: any) => ({
            ...it,
            _bundleId: doc.id,
            // Ensure ID exists for search
            id: it.item_id || it.id
          }));
          allItems = [...allItems, ...items];
        }
      });

      console.log(`[Browser] Loaded ${allItems.length} questions from ${snap.size} bundles.`);
      setBrowserQuestions(allItems);

      // 3. Update Cache
      await cacheBrowserItems(allItems);
      setBrowserStep('READY');
    } catch (e) {
      console.error("Failed to load bundles:", e);
      alert("Failed to load questions from Firestore.");
      setBrowserStep('IDLE');
    }
  };

  const filteredBrowserItems = useMemo(() => {
    let result = browserQuestions;

    // 1. Apply Strict Filter (if active)
    if (activeFilter) {
      result = result.filter(item => {
        // Type Check
        const itemType = (item.type || item.template_id || 'unknown').toLowerCase();
        // Normalize legacy types for check
        const normalizedType = ['mcq_concept', 'mcq_skill', 'legacy_mcq', 'mcq'].includes(itemType)
          ? 'multiple-choice'
          : (itemType === 'mcq_branching' ? 'mcq-branching' : itemType);

        if (activeFilter.type && normalizedType !== activeFilter.type) return false;

        // Version Check
        if (activeFilter.version) {
          const itemVer = item.metadata?.version ? `v${item.metadata.version}` : 'legacy';
          // Handle case where we click "legacy" but item has no version (which means legacy)
          if (activeFilter.version === 'legacy' && item.metadata?.version) return false;
          if (activeFilter.version !== 'legacy' && `v${item.metadata?.version}` !== activeFilter.version) return false;
        }
        return true;
      });
    }

    // 2. Apply Search
    if (!browserSearch.trim()) return result.slice(0, 50); // Limit initial view

    const terms = browserSearch.toLowerCase().split(/\s+/).filter(t => t.length > 0);

    return result.filter(item => {
      // Create a search corpus from common fields + raw JSON to ensure we catch everything
      const corpus = JSON.stringify(item).toLowerCase();

      // Strict AND search: Item must contain ALL terms
      return terms.every(term => corpus.includes(term));
    }).slice(0, 100); // hard limit render
  }, [browserQuestions, browserSearch, activeFilter]);

  // Preview Navigation Logic
  const currentPreviewIndex = useMemo(() => {
    if (!previewItem) return -1;
    // Match by item_id or id
    return filteredBrowserItems.findIndex(i => (i.item_id || i.id) === (previewItem.item_id || previewItem.id));
  }, [previewItem, filteredBrowserItems]);

  const handleNextPreview = useCallback(() => {
    if (currentPreviewIndex !== -1 && currentPreviewIndex < filteredBrowserItems.length - 1) {
      setPreviewItem(filteredBrowserItems[currentPreviewIndex + 1]);
    }
  }, [currentPreviewIndex, filteredBrowserItems]);

  const handlePrevPreview = useCallback(() => {
    if (currentPreviewIndex > 0) {
      setPreviewItem(filteredBrowserItems[currentPreviewIndex - 1]);
    }
  }, [currentPreviewIndex, filteredBrowserItems]);

  const hasNextPreview = currentPreviewIndex !== -1 && currentPreviewIndex < filteredBrowserItems.length - 1;
  const hasPrevPreview = currentPreviewIndex > 0;

  const scanForDuplicates = async () => {
    // Ensure we have data
    let items = browserQuestions;
    if (items.length === 0) {
      setBrowserStep('LOADING');
      items = (await getBrowserItems()) || [];
      setBrowserQuestions(items);
      setBrowserStep('READY');
    }

    const signatures = new Map<string, string[]>();
    const idToType = new Map<string, string>();

    items.forEach((item: any) => {
      let prompt = item.prompt?.text || item.content?.prompt?.text || '';
      // Support V3 Stages if top-level prompt is effectively empty
      // Deep Dive for V3 structure
      if (prompt.trim().length === 0) {
        if (item.stages && Array.isArray(item.stages) && item.stages.length > 0) {
          prompt = item.stages[0].prompt?.text || '';
        } else if (item.content?.stages && Array.isArray(item.content.stages) && item.content.stages.length > 0) {
          prompt = item.content.stages[0].prompt?.text || '';
        }
      }

      // Debug specific difficult items
      const id = item.item_id || item.id || 'unknown_id';
      if (id.includes('BRANCH.SET1.001')) {
        console.log(`[DuplicateDebug] Scanning ${id}`);
        console.log(`__ Extracted Prompt: ${prompt.substring(0, 50)}...`);
      }

      if (prompt.length < 10) return;
      const sig = prompt.toLowerCase().trim().replace(/[^a-z0-9]/g, '');

      if (!signatures.has(sig)) signatures.set(sig, []);
      signatures.get(sig)?.push(id);
      idToType.set(id, item.template_id || item.type);
    });

    const dups: any[] = [];
    signatures.forEach((ids, sig) => {
      if (ids.length > 1) {
        dups.push({
          signature: sig,
          ids,
          type: idToType.get(ids[0]) || 'Unknown'
        });
      }
    });
    setDuplicateGroups(dups);
  };

  const handleResolveDelete = async (id: string, signature: string) => {
    // Find item to get Bundle ID
    const item = browserQuestions.find(q => (q.item_id || q.id) === id);
    if (!item) return;

    const isFirestore = !!item._bundleId;
    const location = isFirestore ? 'FIRESTORE CLOUD' : 'LOCAL DRAFT';

    if (!window.confirm(`PERMANENTLY DELETE question '${id}' from ${location}? This cannot be undone.`)) return;

    try {
      if (isFirestore) {
        await deleteQuestionFromBundle(item._bundleId, id);
      }

      // Also clean up local index if present
      await deletePendingQuestion(id);

      // Update Local State
      setDuplicateGroups(prev => prev.map(g => {
        if (g.signature === signature) {
          return { ...g, ids: g.ids.filter(i => i !== id) };
        }
        return g;
      }).filter(g => g.ids.length > 1));

      // Update Browser UI
      setBrowserQuestions(prev => prev.filter(q => (q.item_id || q.id) !== id));

      // Permanently remove from IndexedDB Browser Cache
      await deleteBrowserItem(id);

    } catch (e: any) {
      console.error(e);
      alert(`Failed to delete: ${e.message}`);
    }
  };

  // Trigger scan when entering DUPLICATES mode
  useEffect(() => {
    if (step === 'DUPLICATES' && duplicateGroups.length === 0) {
      scanForDuplicates();
    }
  }, [step]);

  // Renderers
  if (step === 'DUPLICATES') {
    // Trigger scan on mount of this step if empty


    return (
      <div className="h-full flex flex-col bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="text-red-500" /> Content Integrity Check
          </h2>
          <button onClick={() => setStep('INTELLIGENCE')} className="text-sm font-bold text-slate-500 hover:text-slate-800">
            ← Back to Report
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full space-y-6">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex gap-4 items-start">
            <AlertCircle className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-blue-900">Duplicate Resolution Mode</h3>
              <p className="text-sm text-blue-700 mt-1">
                These groups of questions share identical prompt text. This usually happens when AI generates multiple variations that are too similar, or when a question is uploaded multiple times with different IDs.
              </p>
            </div>
          </div>

          {duplicateGroups.length === 0 ? (
            <div className="text-center py-20 opacity-50">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <h3 className="text-xl font-bold text-slate-700">All Clear!</h3>
              <p>No duplicate content signatures found.</p>
            </div>
          ) : (
            duplicateGroups.map((group, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="bg-slate-50 px-6 py-3 border-b flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold uppercase">{group.type}</span>
                    <span className="text-xs font-mono text-slate-400">Sig: {group.signature.substring(0, 20)}...</span>
                  </div>
                  <span className="text-sm font-bold text-red-600">{group.ids.length} Conflicts</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {group.ids.map(id => {
                    const item = browserQuestions.find(q => (q.item_id || q.id) === id);
                    return (
                      <div key={id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition group">
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-bold text-slate-700">{id}</span>
                            {item?._bundleId && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 rounded">{item._bundleId}</span>}
                          </div>
                          <p className="text-sm text-slate-500 truncate">{item?.prompt?.text || "Text not found"}</p>
                        </div>
                        <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setPreviewItem(item)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleResolveDelete(id, group.signature)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete this copy"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Re-use Preview Modal */}
        {previewItem && (
          <PreviewModal
            item={previewItem}
            onClose={() => setPreviewItem(null)}
          />
        )}
      </div>
    );
  }

  if (step === 'VITALITY_DETAIL') {
    return <ConceptVitalityDetail onBack={() => setStep('INTELLIGENCE')} />;
  }

  if (step === 'TEMPLATE_DIVERSITY') {
    return <TemplateDiversityReport onBack={() => setStep('INTELLIGENCE')} />;
  }

  if (step === 'INTELLIGENCE') {
    return (
      <div className="h-full flex flex-col bg-slate-50">
        {/* Tab Bar */}
        <div className="bg-white border-b px-8 pt-6 pb-0 flex items-center justify-between sticky top-0 z-10">
          <div className="flex gap-8">
            <button onClick={() => setStep('BROWSE')} className="pb-4 px-2 border-b-2 border-transparent font-medium text-slate-500 hover:text-slate-800">Browse Database</button>
            <button onClick={() => setStep('UPLOAD')} className="pb-4 px-2 border-b-2 border-transparent font-medium text-slate-500 hover:text-slate-800">Upload Portal</button>
            <button onClick={() => setStep('INTELLIGENCE')} className="pb-4 px-2 border-b-2 border-slate-900 font-bold text-slate-900">Intelligence</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
          <AdminIntelligenceReport />
        </div>
      </div>
    );
  }

  if (step === 'BROWSE') {
    return (
      <div className="h-full flex flex-col bg-slate-50">
        {/* Tab Bar */}
        <div className="bg-white border-b px-8 pt-6 pb-0 flex items-center justify-between sticky top-0 z-10">
          <div className="flex gap-8">
            <button onClick={() => setStep('BROWSE')} className="pb-4 px-2 border-b-2 border-slate-900 font-bold text-slate-900">Browse Database</button>
            <button onClick={() => setStep('UPLOAD')} className="pb-4 px-2 border-b-2 border-transparent font-medium text-slate-500 hover:text-slate-800">Upload Portal</button>
            <button onClick={() => setStep('INTELLIGENCE')} className="pb-4 px-2 border-b-2 border-transparent font-medium text-slate-500 hover:text-slate-800">Intelligence</button>
          </div>
          <div className="pb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{browserQuestions.length} Items cached</span>
          </div>
        </div>

        {/* Browser Content */}
        <div className="flex-1 overflow-hidden flex flex-col p-8 max-w-7xl mx-auto w-full">

          {/* Search & Actions */}
          <div className="flex flex-col gap-4 mb-6">
            {activeFilter && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold uppercase text-xs tracking-wider bg-blue-200 px-2 py-1 rounded">Filtered View</span>
                  <span className="font-medium">
                    {activeFilter.type && `Type: ${activeFilter.type}`}
                    {activeFilter.version && ` • Version: ${activeFilter.version}`}
                  </span>
                </div>
                <button onClick={() => setActiveFilter(null)} className="p-1 hover:bg-blue-100 rounded-full">
                  <XCircle className="w-5 h-5 text-blue-500" />
                </button>
              </div>
            )}
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by ID, Template, Content..."
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  value={browserSearch}
                  onChange={(e) => setBrowserSearch(e.target.value)}
                />
              </div>
              <button
                onClick={() => loadAllQuestions(true)}
                disabled={browserStep === 'LOADING'}
                className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition flex items-center gap-2"
              >
                {browserStep === 'LOADING' ? <Loader className="animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {browserStep === 'IDLE' ? 'Load Data' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {browserStep === 'IDLE' && (
              <div className="text-center py-20 opacity-50">
                <Database className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p>Click "Load Data" to fetch questions from Firestore.</p>
              </div>
            )}

            {browserStep === 'READY' && filteredBrowserItems.length === 0 && (
              <div className="text-center py-20 opacity-50">
                <p>No matches found.</p>
              </div>
            )}

            {filteredBrowserItems.map((item, idx) => {
              // Robust Prompt Extraction for Display
              let displayPrompt = item.prompt?.text || item.content?.prompt?.text || "";
              if (!displayPrompt && item.stages && Array.isArray(item.stages) && item.stages.length > 0) {
                displayPrompt = item.stages[0].prompt?.text || "";
              }

              return (
                <div key={idx} onClick={() => setPreviewItem(item)} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md cursor-pointer transition lg:flex items-center gap-6 group">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-blue-50 group-hover:text-blue-600 transition">
                    <Eye className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold text-slate-800 truncate">{item.item_id}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{item.template_id || 'UNKNOWN'}</span>
                      <span className="text-[10px] font-mono text-slate-300">{item._bundleId}</span>
                    </div>
                    <p className="text-sm text-slate-500 truncate font-medium">
                      {displayPrompt || "No prompt text found..."}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-200 group-hover:text-blue-500 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal */}
        {previewItem && (
          <PreviewModal
            item={previewItem}
            onClose={() => setPreviewItem(null)}
            onNext={hasNextPreview ? handleNextPreview : undefined}
            onPrev={hasPrevPreview ? handlePrevPreview : undefined}
            hasNext={hasNextPreview}
            hasPrev={hasPrevPreview}
          />
        )}
      </div>
    );
  }

  if (step === 'UPLOAD') {
    return (
      <div className="h-full flex flex-col bg-slate-50">
        {/* Tab Bar */}
        <div className="bg-white border-b px-8 pt-6 pb-0 flex items-center justify-between sticky top-0 z-10 shrink-0">
          <div className="flex gap-8">
            <button onClick={() => setStep('BROWSE')} className="pb-4 px-2 border-b-2 border-transparent font-medium text-slate-500 hover:text-slate-800">Browse Database</button>
            <button onClick={() => setStep('UPLOAD')} className="pb-4 px-2 border-b-2 border-slate-900 font-bold text-slate-900">Upload Portal</button>
            <button onClick={() => setStep('INTELLIGENCE')} className="pb-4 px-2 border-b-2 border-transparent font-medium text-slate-500 hover:text-slate-800">Intelligence</button>
          </div>
        </div>

        <div className="flex-1 overflow-auto flex flex-col items-center justify-center p-8 min-h-[600px]">
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

            {/* Draft Recovery Section */}
            {pendingDraftCount > 0 && (
              <div className="mt-8 pt-8 border-t border-slate-200 w-full animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="text-left">
                    <h3 className="text-amber-900 font-bold flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Unsaved Drafts Found
                    </h3>
                    <p className="text-amber-700 text-sm mt-1">
                      We found <strong>{pendingDraftCount}</strong> items from a previous session.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleClearDrafts}
                      className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition border border-transparent hover:border-red-200 flex items-center gap-2 text-sm font-bold"
                      title="Delete Drafts"
                    >
                      <Trash2 className="w-4 h-4" /> Clear
                    </button>
                    <button
                      onClick={handleDownloadDrafts}
                      className="p-3 text-slate-600 hover:bg-slate-100 rounded-xl transition border border-transparent hover:border-slate-200 flex items-center gap-2 text-sm font-bold"
                      title="Download JSON"
                    >
                      <Download className="w-4 h-4" /> Export
                    </button>
                    <button
                      onClick={handleResumeDrafts}
                      className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-lg shadow-amber-500/20 transition flex items-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-current" /> Resume Session
                    </button>
                  </div>
                </div>
              </div>
            )}
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
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => setPreviewItem(item.data)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  title="Preview Item"
                >
                  <Eye className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setEditingItemIndex(idx)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  title="Edit Item JSON"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Item Editor Modal */}
      {editingItemIndex !== null && items[editingItemIndex] && (
        <EditorModal
          item={items[editingItemIndex]}
          onSave={handleUpdateItem}
          onCancel={() => setEditingItemIndex(null)}
        />
      )}

      {/* Shared Preview Modal (works for both Browser and Review modes) */}
      {previewItem && (
        <PreviewModal
          item={previewItem}
          onClose={() => setPreviewItem(null)}
          // Determine if we are in REVIEW or BROWSE mode to calculate Next/Prev
          onNext={() => {
            // Logic to find current index and move next
            // This needs access to the current list context. 
            // Since this is inside the render block for Step === 'REVIEW' (or Browse), 
            // I'll rely on a smarter 'handleNext' defined in the main body or inline check.
            if (step === 'REVIEW') {
              const idx = items.findIndex(i => i.data.item_id === previewItem.item_id);
              if (idx !== -1 && idx < items.length - 1) setPreviewItem(items[idx + 1].data);
            } else {
              if (hasNextPreview) handleNextPreview();
            }
          }}
          onPrev={() => {
            if (step === 'REVIEW') {
              const idx = items.findIndex(i => i.data.item_id === previewItem.item_id);
              if (idx > 0) setPreviewItem(items[idx - 1].data);
            } else {
              if (hasPrevPreview) handlePrevPreview();
            }
          }}
          hasNext={step === 'REVIEW' ? (items.findIndex(i => i.data.item_id === previewItem.item_id) < items.length - 1) : hasNextPreview}
          hasPrev={step === 'REVIEW' ? (items.findIndex(i => i.data.item_id === previewItem.item_id) > 0) : hasPrevPreview}
        />
      )}
    </div>
  );
}
