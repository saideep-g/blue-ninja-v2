import React, { useState, useMemo } from 'react';
import {
  Search,
  Map,
  Table,
  Stethoscope,
  BarChart3,
  Settings2,
  ChevronRight,
  BookOpen,
  Compass,
  ShieldCheck // Icon for Coverage Intelligence
} from 'lucide-react';

/**
 * IMPORTED TYPES & SUB-COMPONENTS
 * We are using a modular architecture to keep the component manageable.
 * Each dimension handles a specific view of the curriculum data.
 */
import type { UCIVProps, Dimension, ThemeMode, Atom } from './types';
import { PedagogicalMap } from './dimensions/PedagogicalMap';
import { InteractivityMatrix } from './dimensions/InteractivityMatrix';
import { DiagnosticLab } from './dimensions/DiagnosticLab';
import { MasteryBench } from './dimensions/MasteryBench';
import { CoverageIntelligence } from './dimensions/CoverageIntelligence';
import { Atom360View } from './atom360/Atom360View';

/**
 * CURRICULUM VIEWER (V3 ORCHESTRATOR)
 * * Logic Overview:
 * 1. Global State: Tracks the active 'Dimension' and the selected 'Atom ID'.
 * 2. Logic Bridge: Hydrates raw IDs into full objects across different JSON documents.
 * 3. Reverse Dependency Engine: Calculates which atoms depend on the current selection.
 * 4. Content Switching: Smoothly transitions between high-level maps and deep-dive views.
 */
const CurriculumViewer: React.FC<UCIVProps> = ({
  coreCurriculum,
  templateLibrary,
  assessmentGuide
}) => {
  // --- Persistent UI States ---
  const [activeDimension, setActiveDimension] = useState<Dimension>('PEDAGOGICAL');
  const [selectedAtomId, setSelectedAtomId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [themeMode, setThemeMode] = useState<ThemeMode>('ENGINEERING');

  // --- Logic Bridge: The Hydration Engine ---
  /**
   * This is the "Truth Engine" of v3. It takes the selected Atom ID 
   * and resolves links to Mastery Profiles (Doc3), Templates (Doc2), 
   * and Misconceptions (Doc1).
   */
  const hydratedAtom = useMemo(() => {
    if (!selectedAtomId) return null;

    let target: Atom | null = null;
    // Walk through core modules to find the specific atom
    for (const mod of coreCurriculum.modules) {
      const found = mod.atoms.find(a => a.atom_id === selectedAtomId);
      if (found) {
        target = { ...found, module_id: mod.module_id, module_title: mod.title };
        break;
      }
    }

    if (!target) return null;

    // Build the Logic Bridge: Resolve IDs to full objects
    return {
      ...target,
      // Link to Assessment Guide (Doc3)
      mastery: assessmentGuide.mastery_profiles.find(p => p.mastery_profile_id === target?.mastery_profile_id),
      // Link to Template Library (Doc2)
      templates: target.template_ids.map(tid =>
        templateLibrary.templates.find(t => t.template_id === tid) || { template_id: tid, name: tid } as any
      ),
      // Link to Misconceptions defined in the core (Doc1)
      misconceptions: target.misconception_ids.map(mid => coreCurriculum.misconception_library[mid])
    };
  }, [selectedAtomId, coreCurriculum, assessmentGuide, templateLibrary]);

  // --- Logic: Reverse Dependency Analysis ---
  /**
   * Addresses the requirement: "Where else is this component used?".
   * Scans the entire core curriculum to find any atoms that list the 
   * current selected atom as a prerequisite.
   */
  const dependents = useMemo(() => {
    if (!selectedAtomId) return [];
    const deps: { id: string, title: string }[] = [];

    coreCurriculum.modules.forEach(m => {
      m.atoms.forEach(a => {
        if (a.prerequisites.includes(selectedAtomId)) {
          deps.push({ id: a.atom_id, title: a.title });
        }
      });
    });
    return deps;
  }, [selectedAtomId, coreCurriculum]);

  // --- Logic: Fuzzy Search & Filtering ---
  const filteredModules = useMemo(() => {
    return coreCurriculum.modules
      .map(module => ({
        ...module,
        atoms: module.atoms.filter(atom => {
          const searchFields = `${atom.title} ${atom.core_idea} ${module.title}`.toLowerCase();
          return !searchQuery || searchFields.includes(searchQuery.toLowerCase());
        })
      }))
      .filter(module => module.atoms.length > 0);
  }, [searchQuery, coreCurriculum]);

  return (
    <div className={`flex h-screen overflow-hidden font-sans transition-colors duration-500 ${themeMode === 'ENGINEERING' ? 'bg-[#F8FAFC]' : 'bg-blue-50/50'
      }`}>

      {/* SIDEBAR NAVIGATION */}
      <div className={`w-80 flex flex-col z-30 shadow-2xl border-r transition-colors ${themeMode === 'ENGINEERING' ? 'bg-white border-slate-200' : 'bg-white/95 border-blue-100 shadow-blue-900/5'
        }`}>
        <div className="p-8 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-8">
            <div className={`p-2 rounded-2xl shadow-lg transition-colors ${themeMode === 'ENGINEERING' ? 'bg-indigo-600 shadow-indigo-100' : 'bg-blue-600 shadow-blue-100'
              }`}>
              <BookOpen className="text-white" size={24} />
            </div>
            <div>
              <span className="font-black text-2xl italic tracking-tighter text-slate-900">
                Quest<span className={themeMode === 'ENGINEERING' ? 'text-indigo-600' : 'text-blue-600'}>Arch</span>
              </span>
              <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mt-0.5">V3.0 UCIV</div>
            </div>
          </div>

          {/* DIMENSION SELECTOR */}
          <div className="space-y-1">
            {[
              { id: 'PEDAGOGICAL', icon: Map, label: 'Pedagogical Map' },
              { id: 'MATRIX', icon: Table, label: 'Interaction Matrix' },
              { id: 'DIAGNOSTIC', icon: Stethoscope, label: 'Diagnostic Lab' },
              { id: 'BENCHMARK', icon: BarChart3, label: 'Mastery Bench' },
              { id: 'COVERAGE', icon: ShieldCheck, label: 'Coverage Intel' }
            ].map(dim => (
              <button
                key={dim.id}
                onClick={() => { setActiveDimension(dim.id as Dimension); setSelectedAtomId(null); }}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all group ${activeDimension === dim.id
                  ? (themeMode === 'ENGINEERING' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-blue-600 text-white shadow-lg')
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                  }`}
              >
                <dim.icon size={18} />
                <span className="text-sm font-bold tracking-tight">{dim.label}</span>
                {activeDimension === dim.id && <ChevronRight className="ml-auto" size={16} />}
              </button>
            ))}
          </div>
        </div>

        {/* SEARCH & MODE TOGGLE */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input
              type="text"
              placeholder="Search curriculum..."
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-3xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="pt-4">
            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4 px-2">Mode Context</div>
            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                onClick={() => setThemeMode('ENGINEERING')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${themeMode === 'ENGINEERING' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'
                  }`}
              >
                <Settings2 size={12} /> Blueprint
              </button>
              <button
                onClick={() => setThemeMode('EXPLORER')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${themeMode === 'EXPLORER' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'
                  }`}
              >
                <Compass size={12} /> Explorer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* VIEWPORT CONTENT AREA */}
      <div className="flex-1 overflow-y-auto relative custom-scrollbar">
        <main className="max-w-7xl mx-auto p-12">

          {/* LOGIC: Render Atom 360 View if an atom is selected, else render the Dimension */}
          {!selectedAtomId ? (
            <>
              <div className="mb-12">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-2 uppercase">
                  {activeDimension.replace('_', ' ')}
                </h2>
                <p className="text-slate-400 font-medium">Visualizing cross-document logic bridges for CBSE7 v3.</p>
              </div>

              {/* Dimension Dispatcher */}
              {activeDimension === 'PEDAGOGICAL' && (
                <PedagogicalMap modules={filteredModules} onSelectAtom={setSelectedAtomId} />
              )}
              {activeDimension === 'MATRIX' && (
                <InteractivityMatrix modules={filteredModules} templates={templateLibrary.templates} />
              )}
              {activeDimension === 'DIAGNOSTIC' && (
                <DiagnosticLab misconceptions={coreCurriculum.misconception_library} />
              )}
              {activeDimension === 'BENCHMARK' && (
                <MasteryBench profiles={assessmentGuide.mastery_profiles} />
              )}
              {activeDimension === 'COVERAGE' && (
                <CoverageIntelligence coreCurriculum={coreCurriculum} />
              )}
            </>
          ) : (
            // The Deep-Dive Interface: No masking, full-screen content.
            hydratedAtom && (
              <Atom360View
                atom={hydratedAtom}
                themeMode={themeMode}
                onClose={() => setSelectedAtomId(null)}
                onNavigate={(id) => setSelectedAtomId(id)}
                dependents={dependents}
                scaffoldingStrategies={assessmentGuide.scaffolding_strategies}
              />
            )
          )}
        </main>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
      `}} />
    </div>
  );
};

export default CurriculumViewer;