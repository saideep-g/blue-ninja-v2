import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { TwoTierTemplate } from './TwoTierTemplate';
import type { QuestionItem } from '../../types/curriculum.v3';

// Import your v3 JSON documents
// Note: Ensure these paths match your project structure
import coreCurriculum from '../../data/cbse7_core_curriculum_v3.json';
import assessmentGuide from '../../data/cbse7_assessment_guide_v3.json';
import goldQuestions from '../../data/cbse7_gold_questions_v3_medium_kpop_cdrama_set1.json';

/**
 * TEMPLATE WORKBENCH
 * ------------------
 * Purpose: This is a container component that simulates the "Player" environment.
 * It handles:
 * 1. Data Selection: Finds the correct question based on the URL or template type.
 * 2. Hydration: Passes the global curriculum and assessment docs to the template.
 * 3. Telemetry: Captures and logs events for debugging.
 */
export const TemplateWorkbench: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();

  // Find the first question in the Gold set that matches the template type
  // This allows you to use the same workbench for different templates later.
  const activeItem = useMemo(() => {
    return goldQuestions.items.find(
      (item: any) => item.template_id === templateId?.toUpperCase()
    ) as QuestionItem | undefined;
  }, [templateId]);

  /**
   * Mock Telemetry Handler
   * In a real app, this would dispatch to a Redux/Zustand store or an API.
   */
  const handleTelemetry = (event: string, payload: any) => {
    console.group(`📊 Telemetry Event: ${event}`);
    console.log('Payload:', payload);
    console.log('Timestamp:', new Date().toISOString());
    console.groupEnd();
  };

  if (!activeItem) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-10">
        <div className="bg-rose-50 text-rose-600 p-6 rounded-[32px] border border-rose-100 mb-6">
          <h2 className="text-xl font-black uppercase tracking-tight">Template Not Found</h2>
          <p className="text-sm font-medium mt-2">
            No question of type "{templateId}" found in the Gold Questions JSON.
          </p>
        </div>
        <Link to="/" className="text-indigo-600 font-bold uppercase text-xs tracking-widest border-b-2 border-indigo-200 pb-1">
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      {/* Workbench Navigation Header */}
      <header className="max-w-[1400px] mx-auto px-4 py-8 lg:py-12">
        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Workbench: <span className="text-indigo-600">{activeItem.template_id}</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              Item ID: {activeItem.item_id}
            </p>
          </div>
          <div className="flex gap-2">
            {activeItem.context_tags.map(tag => (
              <span key={tag} className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* The Template Container (Simulating Mobile/Web Viewport) */}
      <main className="w-full mx-auto bg-white rounded-[48px] shadow-2xl shadow-indigo-100/50 border border-slate-50 overflow-hidden">
        <TwoTierTemplate
          item={activeItem}
          coreCurriculum={coreCurriculum}
          assessmentGuide={assessmentGuide}
          onEmitTelemetry={handleTelemetry}
        />
      </main>

      {/* Logic Bridge Debugger Panel */}
      <footer className="max-w-xl mx-auto mt-12 p-8 bg-slate-900 rounded-[40px] text-white">
        <div className="flex items-center gap-2 mb-6 text-indigo-400">
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Logic Bridge Inspector</h4>
        </div>
        <div className="grid grid-cols-2 gap-8 font-mono text-[11px]">
          <div>
            <p className="text-slate-500 mb-1">// Resolved Atom</p>
            <p className="text-emerald-400 truncate">{activeItem.atom_id}</p>
          </div>
          <div>
            <p className="text-slate-500 mb-1">// Difficulty</p>
            <p className="text-amber-400">Level {activeItem.difficulty}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TemplateWorkbench;