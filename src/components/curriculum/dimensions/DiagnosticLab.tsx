import React from 'react';
import { type CoreCurriculum } from '../types';

interface DiagnosticLabProps {
  misconceptions: CoreCurriculum['misconception_library'];
}

/**
 * Diagnostic Lab Dimension
 * Allows exploration of the Misconception Library and linked symptoms.
 */
export const DiagnosticLab: React.FC<DiagnosticLabProps> = ({ misconceptions }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
      {Object.values(misconceptions).map(m => (
        <div key={m.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm group hover:border-rose-400 transition-all">
          <div className="flex justify-between items-start mb-4">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border bg-rose-50 text-rose-700 border-rose-100 shadow-sm">
              {m.tag}
            </span>
            <span className="text-[10px] font-mono text-slate-300">{m.id}</span>
          </div>
          <h4 className="text-lg font-bold text-slate-800 mb-2 leading-tight">"{m.description}"</h4>
          <div className="flex flex-wrap gap-2 mt-4">
            {m.symptoms.map((s, i) => (
              <span key={i} className="text-[10px] bg-slate-50 text-slate-500 px-3 py-1 rounded-full border border-slate-100">
                Symptom: {s}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};