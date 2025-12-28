import React from 'react';
import { Box, Binary, Sparkles } from 'lucide-react';
import {type Module } from '../types';

interface PedagogicalMapProps {
  modules: Module[];
  onSelectAtom: (id: string) => void;
}

/**
 * Pedagogical Map Dimension
 * Renders a high-level overview of Modules and their constituent Atoms.
 */
export const PedagogicalMap: React.FC<PedagogicalMapProps> = ({ modules, onSelectAtom }) => {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {modules.map(module => (
        <div key={module.module_id} className="relative group">
          {/* Module Divider and Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px flex-1 bg-slate-200"></div>
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
              <Box className="text-indigo-500" size={18} />
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{module.title}</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border bg-slate-800 text-slate-100 border-slate-700 shadow-sm">
                {module.domain}
              </span>
            </div>
            <div className="h-px flex-1 bg-slate-200"></div>
          </div>
          
          {/* Atoms Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {module.atoms.map(atom => (
              <button
                key={atom.atom_id}
                onClick={() => onSelectAtom(atom.atom_id)}
                className="text-left bg-white p-6 rounded-[32px] border border-slate-100 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-50 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                  <Binary size={60} />
                </div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-mono text-slate-400">{atom.atom_id}</span>
                    <div className="flex gap-1">
                      {atom.outcomes.some(o => o.type === 'transfer') && <Sparkles size={14} className="text-amber-400" />}
                    </div>
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 mb-2 leading-tight">{atom.title}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">{atom.core_idea}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};