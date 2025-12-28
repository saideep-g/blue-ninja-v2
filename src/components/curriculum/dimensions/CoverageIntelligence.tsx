import React, { useMemo } from 'react';
import { 
  BarChart3, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  FileWarning,
  Dna,
  Zap,
  Target,
  Layers,
  SearchCode,
  ArrowRight,
  Sparkles,
  Construction
} from 'lucide-react';
import type { CoreCurriculum, Module } from '../types';

interface CoverageProps {
  coreCurriculum: CoreCurriculum;
  onJumpToModule?: (moduleId: string) => void; // For future action linking
}

/**
 * COVERAGE INTELLIGENCE DIMENSION (ACTION-ORIENTED)
 * Focus: Identifying Gaps and providing a "Priority Queue" for Curriculum Authors.
 */
export const CoverageIntelligence: React.FC<CoverageProps> = ({ coreCurriculum }) => {
  
  // --- ANALYTICS & ACTION ENGINE ---
  const { stats, priorityQueue } = useMemo(() => {
    let conceptual = 0;
    let procedural = 0;
    let transfer = 0;
    let totalAtoms = 0;
    let totalPrerequisites = 0;
    const missingTransfer: string[] = [];
    const lowInteractivity: string[] = [];
    const templateUsage: Record<string, number> = {};
    const queue: any[] = [];

    coreCurriculum.modules.forEach(m => {
      let moduleConceptual = 0;
      let moduleTransfer = 0;
      let moduleAtoms = 0;

      m.atoms.forEach(a => {
        totalAtoms++;
        moduleAtoms++;
        totalPrerequisites += a.prerequisites.length;
        
        let atomHasTransfer = false;
        a.outcomes.forEach(o => {
          if (o.type === 'conceptual') { conceptual++; moduleConceptual++; }
          if (o.type === 'procedural') { procedural++; }
          if (o.type === 'transfer') {
            transfer++;
            moduleTransfer++;
            atomHasTransfer = true;
          }
        });
        
        if (!atomHasTransfer) missingTransfer.push(a.title);
        a.template_ids.forEach(tid => { templateUsage[tid] = (templateUsage[tid] || 0) + 1; });
        if (a.template_ids.length < 2) lowInteractivity.push(a.title);
      });

      // CALCULATE PRIORITY SCORE (0-100)
      // Logic: If transfer outcomes are low compared to conceptual, priority increases.
      const transferGap = moduleAtoms > 0 ? (1 - (moduleTransfer / moduleAtoms)) : 0;
      const priorityScore = Math.round(transferGap * 100);

      if (priorityScore > 20) {
        queue.push({
          id: m.module_id,
          title: m.title,
          score: priorityScore,
          gap: moduleAtoms - moduleTransfer,
          total: moduleAtoms,
          action: priorityScore > 70 ? 'CRITICAL: Add Application Tasks' : 'Refine: Add Transfer LOs'
        });
      }
    });

    const totalOutcomes = conceptual + procedural + transfer;

    return { 
      stats: { 
        totalAtoms, conceptual, procedural, transfer, totalOutcomes,
        missingTransfer, lowInteractivity, templateUsage,
        avgPrereqs: totalAtoms > 0 ? (totalPrerequisites / totalAtoms).toFixed(1) : 0
      },
      priorityQueue: queue.sort((a, b) => b.score - a.score)
    };
  }, [coreCurriculum]);

  const readinessScore = useMemo(() => {
    if (stats.totalAtoms === 0) return 0;
    const transferPenalty = (stats.missingTransfer.length / stats.totalAtoms) * 30;
    return Math.max(0, Math.min(100, 100 - transferPenalty)).toFixed(0);
  }, [stats]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 1. EXECUTIVE METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard icon={Dna} label="Total Atoms" value={stats.totalAtoms} color="text-indigo-600" />
        <MetricCard icon={TrendingUp} label="Transfer Ratio" value={`${Math.round((stats.transfer / stats.totalOutcomes) * 100 || 0)}%`} color="text-emerald-600" />
        <MetricCard icon={AlertTriangle} label="Logic Gaps" value={stats.missingTransfer.length} color="text-rose-600" />
        <MetricCard icon={Layers} label="Path Density" value={stats.avgPrereqs} color="text-amber-600" />
      </div>

      {/* 2. ARCHITECT'S ACTION QUEUE (THE ICING) */}
      <section className="bg-white rounded-[48px] border-4 border-indigo-50 shadow-xl overflow-hidden">
        <div className="bg-indigo-600 p-8 flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-2 rounded-xl"><Construction size={24} /></div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight">Architect's Priority Queue</h3>
              <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mt-1">Recommended next actions to reach 100% Readiness</p>
            </div>
          </div>
          <div className="hidden md:flex gap-2">
            <Badge color="slate">High Priority: {priorityQueue.filter(q => q.score > 70).length}</Badge>
          </div>
        </div>
        
        <div className="divide-y divide-slate-50">
          {priorityQueue.length > 0 ? priorityQueue.slice(0, 5).map((item) => (
            <div key={item.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
              <div className="flex items-center gap-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${
                  item.score > 70 ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                }`}>
                  {item.score}
                </div>
                <div>
                  <h4 className="font-black text-slate-800 text-sm uppercase tracking-tight">{item.title}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{item.action}</span>
                    <span className="h-1 w-1 rounded-full bg-slate-200"></span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{item.gap} Gaps in {item.total} Atoms</span>
                  </div>
                </div>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase rounded-xl opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                Fix Now <ArrowRight size={14} />
              </button>
            </div>
          )) : (
            <div className="p-20 text-center">
              <Sparkles className="mx-auto text-emerald-400 mb-4" size={48} />
              <p className="font-black text-slate-400 uppercase tracking-widest">All Modules are Balanced & Ready</p>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-12 gap-8">
        {/* 3. OUTCOME BALANCE */}
        <div className="col-span-12 lg:col-span-8 bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <Target className="text-indigo-500" size={20} /> Curriculum DNA
              </h3>
              <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">Weighting of theoretical vs applied learning</p>
            </div>
            <BarChart3 className="text-slate-200" size={32} />
          </div>
          
          <div className="space-y-10">
            <DistributionBar label="Conceptual" desc="Theory & Definitions" count={stats.conceptual} total={stats.totalOutcomes} color="bg-indigo-500" />
            <DistributionBar label="Procedural" desc="Skills & Calculations" count={stats.procedural} total={stats.totalOutcomes} color="bg-emerald-500" />
            <DistributionBar label="Transfer" desc="Real-world Application" count={stats.transfer} total={stats.totalOutcomes} color="bg-amber-500" />
          </div>

          <div className="mt-12 p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-start gap-4">
            <SearchCode className="text-indigo-400 mt-1" size={20} />
            <p className="text-sm text-slate-500 leading-relaxed italic">
              "System Insight: To improve student outcomes in 7th grade math, focus on converting 
              <strong> {stats.missingTransfer.length} Procedural Atoms</strong> into <strong>Transfer Challenges</strong>."
            </p>
          </div>
        </div>

        {/* 4. READINESS GAUGE */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          <div className="bg-slate-900 rounded-[48px] p-10 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 text-white/5"><CheckCircle2 size={200} /></div>
            <div className="relative z-10">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-2">Readiness Score</h4>
              <div className="text-7xl font-black mb-4">{readinessScore}<span className="text-2xl text-slate-600">%</span></div>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Combined v3 logic score. A score of 90+ is recommended before generating student content.
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-100 p-8 rounded-[48px] shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-rose-50 rounded-xl"><FileWarning size={18} className="text-rose-500" /></div>
              <h4 className="font-black text-xs uppercase tracking-widest text-slate-800">Critical Gaps</h4>
            </div>
            <div className="space-y-2">
              {stats.missingTransfer.slice(0, 6).map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 text-xs font-bold text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400" /> {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- PRIVATE HELPERS ---

const MetricCard = ({ icon: Icon, label, value, color }: any) => (
  <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
    <div className={`p-3 w-fit rounded-2xl mb-4 bg-slate-50 ${color}`}><Icon size={24} /></div>
    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</div>
    <div className="text-3xl font-black text-slate-900">{value}</div>
  </div>
);

const Badge = ({ children, color = "indigo" }: { children: React.ReactNode, color?: string }) => {
  const variants: Record<string, string> = {
    slate: "bg-slate-800 text-slate-100 border-slate-700 shadow-sm"
  };
  return <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${variants[color] || ''}`}>{children}</span>;
};

const DistributionBar = ({ label, desc, count, total, color }: any) => {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <div>
          <span className="text-sm font-black text-slate-800 uppercase tracking-widest">{label}</span>
          <span className="text-[10px] text-slate-400 font-bold block mt-0.5">{desc}</span>
        </div>
        <div className="text-right">
          <span className="text-xl font-black text-slate-900">{percentage}%</span>
          <span className="text-[10px] text-slate-400 font-bold block">{count} items</span>
        </div>
      </div>
      <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden p-1 border border-slate-50">
        <div className={`h-full ${color} rounded-full transition-all duration-1000 ease-out shadow-sm`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};