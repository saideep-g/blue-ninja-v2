import React, { useState } from 'react';
import { 
  ChevronLeft, 
  Target, 
  Zap, 
  Activity, 
  GraduationCap, 
  Stethoscope, 
  Layers, 
  Terminal, 
  ArrowRight,
  Layout,
  ExternalLink,
  CheckCircle2,
  Info
} from 'lucide-react';
import type { Atom, ThemeMode, UCIVProps } from '../types';

interface Atom360ViewProps {
  atom: Atom;
  themeMode: ThemeMode;
  onClose: () => void;
  onNavigate: (atomId: string) => void;
  dependents: { id: string, title: string }[];
  scaffoldingStrategies: Record<string, any>;
}

/**
 * ATOM 360 VIEW
 * Provides a deep-dive, hydrated look at a single curriculum atom.
 * Implements the "Pedagogical Fix" logic by linking misconceptions to scaffolding strategies.
 */
export const Atom360View: React.FC<Atom360ViewProps> = ({ 
  atom, 
  themeMode, 
  onClose, 
  onNavigate,
  dependents,
  scaffoldingStrategies
}) => {
  const [showJson, setShowJson] = useState(false);

  // --- UI Helpers ---
  const SectionHeader = ({ icon: Icon, title, colorClass }: any) => (
    <h4 className={`flex items-center gap-3 text-sm font-black uppercase tracking-[0.2em] mb-8 ${colorClass}`}>
      <Icon size={20} /> {title}
    </h4>
  );

  const Badge = ({ children, color = "indigo" }: { children: React.ReactNode, color?: string }) => {
    const variants: Record<string, string> = {
      indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
      emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
      rose: "bg-rose-50 text-rose-700 border-rose-100",
      amber: "bg-amber-50 text-amber-700 border-amber-100",
      slate: "bg-slate-900 text-slate-100 border-slate-700"
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border shadow-sm ${variants[color]}`}>
        {children}
      </span>
    );
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-12 duration-500 pb-32">
      
      {/* 1. NAVIGATION BAR */}
      <div className="flex items-center justify-between mb-12">
        <button 
          onClick={onClose}
          className={`group flex items-center gap-3 font-bold transition-all ${
            themeMode === 'ENGINEERING' ? 'text-slate-400 hover:text-indigo-600' : 'text-slate-400 hover:text-blue-600'
          }`}
        >
          <div className="p-2 bg-white rounded-xl border border-slate-200 group-hover:border-current shadow-sm">
            <ChevronLeft size={20} />
          </div>
          Back to Curriculum Map
        </button>
        
        <button 
          onClick={() => setShowJson(!showJson)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
            showJson ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'
          }`}
        >
          <Terminal size={14} /> JSON Inspector
        </button>
      </div>

      {/* 2. HERO SECTION */}
      <div className="grid grid-cols-12 gap-8 mb-12">
        <div className="col-span-12 lg:col-span-8">
          <div className="flex items-center gap-3 mb-4">
            <Badge color="emerald">{atom.domain}</Badge>
            <div className="h-1 w-1 rounded-full bg-slate-300"></div>
            <span className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">{atom.module_title}</span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 leading-[1.1] mb-6 tracking-tight">
            {atom.title}
          </h1>
          <p className="text-2xl text-slate-500 font-medium leading-relaxed italic max-w-3xl">
            "{atom.core_idea}"
          </p>
        </div>
        
        {/* Mastery Logic Reverse-Bridge */}
        <div className="col-span-12 lg:col-span-4">
          <div className={`rounded-[48px] p-8 text-white relative overflow-hidden shadow-2xl transition-colors ${
            themeMode === 'ENGINEERING' ? 'bg-slate-900' : 'bg-blue-900'
          }`}>
            <div className="absolute -right-6 -bottom-6 text-white/5 rotate-12">
              <GraduationCap size={180} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <Activity className="text-emerald-400" size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mastery Standard</span>
              </div>
              <h3 className="text-xl font-bold mb-2">{atom.mastery?.name || "Standard Evaluation"}</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-8 italic">"{atom.mastery?.intent}"</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <div className="text-[9px] text-slate-500 uppercase font-black mb-1">Accuracy</div>
                  <div className="text-xl font-black text-emerald-400">
                    {Math.round((atom.mastery?.requirements.accuracy_last_10 || 0.8) * 100)}%
                  </div>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <div className="text-[9px] text-slate-500 uppercase font-black mb-1">Min Set</div>
                  <div className="text-xl font-black text-indigo-400">
                    {atom.mastery?.requirements.min_attempts || 8} items
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CONTENT GRID */}
      <div className="grid grid-cols-12 gap-8">
        
        {/* Left Column: Pedagogical Details */}
        <div className="col-span-12 lg:col-span-7 space-y-8">
          
          {/* Learning Outcomes */}
          <section className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm">
            <SectionHeader icon={Target} title="Pedagogical Milestones" colorClass="text-indigo-500" />
            <div className="space-y-4">
              {atom.outcomes.map((lo, i) => (
                <div key={i} className="flex gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-indigo-200 transition-all group">
                  <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${lo.type === 'transfer' ? 'bg-amber-400' : 'bg-indigo-400'}`}></div>
                  <div className="flex-1">
                    <Badge color={lo.type === 'transfer' ? 'amber' : 'indigo'}>{lo.type}</Badge>
                    <p className="mt-3 text-lg font-bold text-slate-800 leading-snug">{lo.statement}</p>
                    <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <code className="text-[9px] font-mono text-slate-300">{lo.outcome_id}</code>
                    </div>
                  </div>
                  <CheckCircle2 className="text-slate-100 group-hover:text-emerald-500 transition-colors" size={20} />
                </div>
              ))}
            </div>
          </section>

          {/* Interactive Templates & Contracts */}
          <section className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm">
            <SectionHeader icon={Zap} title="Instructional Technology" colorClass="text-amber-500" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {atom.templates?.map((t: any) => (
                <div key={t.template_id} className="p-6 rounded-3xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-lg transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                      <Layout size={18} />
                    </div>
                    <Badge color={t.cognitive_load === 'high' ? 'rose' : 'emerald'}>
                      {t.cognitive_load || 'Medium'} Load
                    </Badge>
                  </div>
                  <h5 className="font-black text-slate-900 mb-1">{t.name}</h5>
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-4 tracking-widest">{t.interaction_mode}</p>
                  
                  <div className="pt-4 border-t border-slate-200">
                    <div className="text-[9px] font-black text-slate-400 uppercase mb-2">Data Contract</div>
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(t.data_contract || {}).map(key => (
                        <span key={key} className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-[8px] font-mono">{key}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Diagnostics & Network */}
        <div className="col-span-12 lg:col-span-5 space-y-8">
          
          {/* The Pedagogical Fix (Misconception -> Scaffolding Bridge) */}
          <section className="bg-rose-50/50 p-10 rounded-[48px] border border-rose-100 shadow-sm">
            <SectionHeader icon={Stethoscope} title="Diagnostic Intelligence" colorClass="text-rose-500" />
            <div className="space-y-8">
              {atom.misconceptions?.map((m: any, i: number) => {
                const strategy = scaffoldingStrategies[m?.remedial_strategy_id || ""];
                return (
                  <div key={i} className="group">
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="text-sm font-black text-slate-800 uppercase group-hover:text-rose-600 transition-colors">
                        {m?.tag?.split('_').slice(1).join(' ') || "Unknown Pitfall"}
                      </h5>
                      <span className="text-[10px] font-mono text-rose-300">{m?.id}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-4 italic">"{m?.description}"</p>
                    
                    {strategy && (
                      <div className="p-5 bg-white rounded-3xl border border-rose-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <Info size={12} className="text-rose-400" />
                          <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Active Remediation</span>
                        </div>
                        <div className="text-[11px] font-bold text-slate-700 leading-relaxed">
                          Trigger <span className="text-rose-600">{strategy.type}</span>: {strategy.intent}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Dependency Network (Reverse Lookup Analysis) */}
          <section className={`p-10 rounded-[48px] text-white shadow-xl relative overflow-hidden transition-colors ${
            themeMode === 'ENGINEERING' ? 'bg-indigo-900' : 'bg-blue-800'
          }`}>
            <Layers className="absolute -right-4 -bottom-4 text-white/5 w-24 h-24" />
            <SectionHeader icon={Layers} title="Dependency Web" colorClass="text-indigo-300" />
            
            <div className="space-y-8 relative z-10">
              <div>
                <div className="text-[10px] font-black text-indigo-400 uppercase mb-4 tracking-widest">Inbound Foundation</div>
                <div className="flex flex-wrap gap-2">
                  {atom.prerequisites.length > 0 ? atom.prerequisites.map(p => (
                    <button 
                      key={p} 
                      onClick={() => onNavigate(p)}
                      className="group flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl text-xs font-bold hover:bg-white/20 transition-all border border-white/5"
                    >
                      {p} <ExternalLink size={10} className="opacity-0 group-hover:opacity-100" />
                    </button>
                  )) : (
                    <span className="text-xs text-indigo-300/50 italic font-medium px-2">This is a foundation atom (Level 0).</span>
                  )}
                </div>
              </div>

              <div className="pt-8 border-t border-white/10">
                <div className="text-[10px] font-black text-emerald-400 uppercase mb-4 tracking-widest">Downstream Dependents</div>
                <div className="flex flex-wrap gap-2">
                  {dependents.length > 0 ? dependents.map(d => (
                    <button 
                      key={d.id} 
                      onClick={() => onNavigate(d.id)}
                      className="group flex items-center gap-2 px-3 py-2 bg-emerald-500/20 text-emerald-300 rounded-xl text-xs font-bold hover:bg-emerald-500/30 transition-all border border-emerald-500/20"
                    >
                      {d.title} <ArrowRight size={10} className="opacity-0 group-hover:opacity-100" />
                    </button>
                  )) : (
                    <span className="text-xs text-emerald-300/50 italic font-medium px-2">Terminal atom in this module's sequence.</span>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* 4. JSON INSPECTOR DRAWER */}
      {showJson && (
        <div className="fixed inset-y-0 right-0 w-1/3 bg-slate-900 shadow-2xl z-50 p-10 overflow-y-auto animate-in slide-in-from-right duration-300 border-l border-white/10">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-indigo-400 font-mono text-sm font-bold tracking-widest uppercase">Logic Bridge Contract</h3>
            <button onClick={() => setShowJson(false)} className="text-slate-500 hover:text-white transition-colors">
               <ChevronLeft className="rotate-180" size={24} />
            </button>
          </div>
          <pre className="text-[11px] font-mono text-emerald-400 leading-relaxed whitespace-pre-wrap bg-black/30 p-6 rounded-3xl border border-white/5">
            {JSON.stringify(atom, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default Atom360View;