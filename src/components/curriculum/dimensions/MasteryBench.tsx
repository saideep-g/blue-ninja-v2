import React from 'react';
import { BarChart3 } from 'lucide-react';
import {type MasteryProfile } from '../types';

interface MasteryBenchProps {
  profiles: MasteryProfile[];
}

/**
 * Mastery Bench Dimension
 * Renders the evaluation logic for different mastery tiers.
 */
export const MasteryBench: React.FC<MasteryBenchProps> = ({ profiles }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {profiles.map(profile => (
        <div key={profile.mastery_profile_id} className="bg-slate-900 p-10 rounded-[48px] text-white flex flex-col md:flex-row gap-10 items-center border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="flex-1 relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="text-emerald-400" size={24} />
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border bg-slate-800 text-slate-100 border-slate-700 shadow-sm">
                {profile.mastery_profile_id}
              </span>
            </div>
            <h3 className="text-3xl font-black mb-3 leading-tight">{profile.name}</h3>
            <p className="text-slate-400 italic text-lg leading-relaxed">"{profile.intent}"</p>
          </div>
          
          <div className="w-full md:w-80 grid grid-cols-1 gap-4 relative z-10">
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Accuracy Goal</div>
              <div className="text-3xl font-black text-emerald-400">{profile.requirements.accuracy_last_10 * 100}%</div>
            </div>
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Retention Sync</div>
              <div className="text-3xl font-black text-indigo-400">{profile.requirements.retention_interval_days} Days</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};