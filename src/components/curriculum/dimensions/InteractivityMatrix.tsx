import React from 'react';
import { CheckCircle2 } from 'lucide-react'; // Fixed: Explicitly imported CheckCircle2
import { type Module, type Template } from '../types';

interface MatrixProps {
  modules: Module[];
  templates: Template[];
}

/**
 * Interactivity Matrix Dimension
 * Visualizes the relationship between Curriculum Atoms and Interaction Templates.
 */
export const InteractivityMatrix: React.FC<MatrixProps> = ({ modules, templates }) => {
  const allAtoms = modules.flatMap(m => m.atoms);

  return (
    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="p-6 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 sticky left-0 bg-slate-50 z-20">
                Curriculum Atom
              </th>
              {templates.map(t => (
                <th key={t.template_id} className="p-6 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 min-w-[120px] text-center">
                  {t.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allAtoms.map(atom => (
              <tr key={atom.atom_id} className="hover:bg-indigo-50/30 transition-colors group">
                <td className="p-6 border-b border-slate-50 sticky left-0 bg-white group-hover:bg-indigo-50 z-10 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                  <div className="font-bold text-sm text-slate-800">{atom.title}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{atom.atom_id}</div>
                </td>
                {templates.map(t => {
                  const isRecommended = atom.template_ids.includes(t.template_id);
                  return (
                    <td key={t.template_id} className="p-6 border-b border-slate-50 text-center">
                      {isRecommended ? (
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600">
                          <CheckCircle2 size={16} />
                        </div>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-slate-100 inline-block"></div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};