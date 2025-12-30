import React, { useState, useEffect, useMemo } from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  Sparkles,
  Trophy,
  MessageSquare,
  SearchCode,
  BrainCircuit,
  Mic,
  MicOff,
  RotateCcw,
  Lightbulb,
  AlertTriangle,
  Target,
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { useLogicBridge } from '../../hooks/useLogicBridge';
import type { QuestionItem, Option } from '../../types/curriculum.v3';

interface Props {
  item: QuestionItem;
  coreCurriculum: any;
  assessmentGuide: any;
  onEmitTelemetry: (event: string, payload: any) => void;
}

/**
 * TWO TIER TEMPLATE (V5 - PROMINENT FEEDBACK)
 * Optimized for Android Tablets (Samsung Galaxy Tab).
 * Features:
 * 1. Web Speech API for voice-to-text reasoning.
 * 2. High-visibility "Thinking Alerts" for insufficient reasoning.
 * 3. Two-column responsive architecture for 10" screens.
 * 4. Logic Bridge hydration from Doc1 & Doc3.
 */
/**
 * TWO TIER TEMPLATE (V6 - SCAFFOLDED & VOICE ENABLED)
 * Implements the v3 Sequencing Engine adaptation rules.
 * Logic Flow:
 * - 1st Wrong: Level 1 Hint (Restate concept).
 * - 2nd Wrong: Level 2 Hint (Procedure/Worked Micro).
 * - 3rd Wrong: Terminal State (Show solution, move to review).
 */
export const TwoTierTemplate: React.FC<Props> = ({
  item,
  coreCurriculum,
  assessmentGuide,
  onEmitTelemetry
}) => {
  // Logic Bridge: Links MCQ distractions to scaffolding strategies
  const tier1 = item.stages[0]; // Stage 1: The Answer (MCQ)
  const tier2 = item.stages[1]; // Stage 2: The Reasoning (Short Explain)
  const bridge = useLogicBridge(coreCurriculum, assessmentGuide);

  // --- UI & INTERACTION STATE ---
  const [tier1Selected, setTier1Selected] = useState<string | null>(null);
  const [tier2Text, setTier2Text] = useState("");
  const [isTier1Correct, setIsTier1Correct] = useState(false);
  const [failureCount, setFailureCount] = useState(0);
  const [isTerminated, setIsTerminated] = useState(false);
  const [activeRemediation, setActiveRemediation] = useState<any>(null);
  const [shuffledTier1, setShuffledTier1] = useState<Option[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Voice & Validation States
  const [isListening, setIsListening] = useState(false);
  const [nudgeType, setNudgeType] = useState<'NONE' | 'LENGTH' | 'KEYWORDS'>('NONE');

  // FORCE RESET when Item ID changes
  useEffect(() => {
    setTier1Selected(null);
    setTier2Text("");
    setIsTier1Correct(false);
    setFailureCount(0);
    setIsTerminated(false);
    setActiveRemediation(null);
    setIsSubmitted(false);
    setIsListening(false);
    setNudgeType('NONE');
    console.log(`[TwoTierTemplate] Reset for Item: ${item.item_id}`);
  }, [item.item_id]);



  // --- SEMANTIC KEYWORD ENGINE (Doc3 Logic Bridge) ---
  const semanticKeywords = useMemo(() => {
    // Extracts pedagogical requirements from answer_key.key_points
    const points = tier2.answer_key.key_points?.join(' ') || "";
    return Array.from(new Set(points.toLowerCase().match(/[a-z]{3,}|[0-9]+/g) || []))
      .filter(word => !['the', 'and', 'because', 'this', 'was', 'for'].includes(word));
  }, [tier2]);

  // --- SCAFFOLDING HANDLER ---
  /**
   * Resolves the current hint level based on the failure count.
   * Level 1: Concept, Level 2: Worked Micro, Level 3: Full Scaffold.
   */
  const resolveScaffolding = (misconceptionId: string) => {
    const remediation = bridge.resolveRemediation(misconceptionId);
    const ladder = remediation.strategy?.hint_ladder || [];

    // Map failure count to hint levels (Max level 3)
    const levelIndex = Math.min(failureCount, ladder.length - 1);
    const activeHint = ladder[levelIndex] || { text: remediation.hint, level: 1, type: 'CONCEPT' };

    return {
      ...remediation,
      currentHint: activeHint.text,
      level: activeHint.level,
      type: activeHint.type
    };
  };

  // --- VOICE-TO-TEXT LOGIC (Samsung Tab / Android Chrome Optimized) ---
  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported on this browser. Please use Chrome on your Galaxy Tab.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN'; // Standard for Indian English curriculum context
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      // Append voice transcript to text field
      setTier2Text(prev => (prev ? `${prev} ${transcript}` : transcript));
      setNudgeType('NONE');
      onEmitTelemetry('voice_input_received', { transcript_length: transcript.length });
    };

    recognition.start();
  };

  // --- CORE INTERACTION HANDLERS ---

  const handleTier1Select = (option: Option) => {
    if (isTier1Correct || isTerminated) return;

    setTier1Selected(option.id);
    const isCorrect = option.id === tier1.answer_key.correct_option_id;

    if (isCorrect) {
      setIsTier1Correct(true);
      setActiveRemediation(null);
      onEmitTelemetry('tier_1_correct', { attempts: failureCount + 1 });
    } else {
      const newFailureCount = failureCount + 1;
      setFailureCount(newFailureCount);

      // Check Adaptation Rule: Stop after 3 failures
      if (newFailureCount >= 3) {
        setIsTerminated(true);
        setActiveRemediation(null);
        onEmitTelemetry('item_terminated', { reason: 'max_failures', atom_id: item.atom_id });
      } else if (option.diagnostic?.misconception_id) {
        // Trigger Scaffolding Bridge
        setActiveRemediation(resolveScaffolding(option.diagnostic.misconception_id));
        onEmitTelemetry('scaffolding_level_shown', { level: newFailureCount });
      }
    }
  };

  // --- ACTION-ORIENTED VALIDATION ---
  /**
   * Final Submission Logic: Performs the keyword/length check only when button is clicked.
   * Prominently flags insufficient "XYZ" style answers.
   */
  const handleFinalSubmit = () => {
    const text = tier2Text.toLowerCase();
    const foundKeywords = semanticKeywords.filter(k => text.includes(k));

    // Enforcement: Min length and at least one concept match
    if (tier2Text.length < 15) {
      setNudgeType('LENGTH');

      return;
    }

    if (foundKeywords.length === 0) {
      setNudgeType('KEYWORDS');
      onEmitTelemetry('reasoning_rejected', { reason: 'no_keywords' });
      return;
    }

    // Success Path
    setIsSubmitted(true);
    setNudgeType('NONE');
    onEmitTelemetry('tier_2_submitted', {
      text: tier2Text,
      semantic_match_count: foundKeywords.length,
      input_type: 'hybrid'
    });
  };

  // Initial Shuffle: Logic from mathquest_template_library_v3.json
  useEffect(() => {
    const options = tier1.interaction.config.options || [];
    setShuffledTier1(tier1.interaction.config.shuffle ? [...options].sort(() => Math.random() - 0.5) : options);
  }, [tier1]);

  return (
    <div className="w-full">
      {/* 2-COLUMN RESPONSIVE GRID (Optimized for 10" Tablet Workspace) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-stretch">

        {/* LEFT COLUMN: Problem Definition & Stage 1 */}
        <div className="flex flex-col space-y-6">
          <div className="bg-white p-8 lg:p-10 rounded-[40px] border border-slate-100 shadow-sm flex-1">
            <header className="mb-8">
              <Badge color="indigo">Stage 1: The Answer</Badge>
              <h3 className="text-2xl lg:text-3xl font-black text-slate-900 leading-tight mt-6 whitespace-pre-wrap">
                <LatexRenderer text={tier1.prompt.text} />
              </h3>
              <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mt-3 italic whitespace-pre-wrap">
                {tier1.instruction}
              </p>
            </header>

            <div className="space-y-3">
              {shuffledTier1.map((opt) => (
                <button
                  key={opt.id}
                  disabled={isTier1Correct || isSubmitted}
                  onClick={() => handleTier1Select(opt)}
                  className={`w-full p-6 text-left rounded-3xl border-2 transition-all flex justify-between items-center group ${tier1Selected === opt.id
                    ? (opt.id === tier1.answer_key.correct_option_id ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-rose-400 bg-rose-50')
                    : 'border-slate-50 hover:border-indigo-100 bg-slate-50/50 hover:bg-white'
                    } ${isTier1Correct && opt.id !== tier1Selected ? 'opacity-40 grayscale-[0.5]' : ''}`}
                >
                  <span className="text-lg font-bold text-slate-700">
                    <LatexRenderer text={opt.text} />
                  </span>
                  {tier1Selected === opt.id && (
                    opt.id === tier1.answer_key.correct_option_id
                      ? <CheckCircle2 className="text-emerald-500" size={24} />
                      : <AlertCircle className="text-rose-500" size={24} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Scaffolding & Stage 2 Voice/Text reasoning */}
        <div className="flex flex-col space-y-6">
          <AnimatePresence mode="wait">

            {/* TERMINAL STATE: The "Stop" logic */}
            {isTerminated && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-10 rounded-[40px] bg-slate-900 text-white shadow-2xl flex-1 flex flex-col justify-center text-center">
                <div className="w-20 h-20 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle size={40} />
                </div>
                <h4 className="text-2xl font-black uppercase tracking-tight mb-4">Let's pivot for a moment</h4>
                <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                  You've tried this a few times. Don't worry—some concepts take a few representation shifts to click! Let's reveal the solution and try a simpler version next.
                </p>
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 text-left mb-8">
                  <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Architect's Solution</span>
                  <div className="text-emerald-400 font-bold text-xl mt-2 italic underline underline-offset-8 decoration-emerald-400/30">
                    Correct Answer: {tier1.interaction.config.options?.find(o => o.id === tier1.answer_key.correct_option_id)?.text}
                  </div>
                </div>
                <button onClick={() => window.location.reload()} className="w-full py-5 bg-indigo-600 text-white font-black uppercase rounded-2xl shadow-xl shadow-indigo-900/40">Try Next Item</button>
              </motion.div>
            )}

            {/* SCAFFOLDING HINT LADDER */}
            {/* Scaffolding Banner (Doc1+Doc3 Logic Bridge) */}
            {activeRemediation && (
              <motion.div
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className={`p-10 rounded-[40px] border shadow-2xl relative overflow-hidden flex-1 flex flex-col justify-center bg-amber-50 border-amber-100`}
              >
                <div className="flex gap-6 items-start">
                  <div className={`p-4 rounded-2xl shadow-lg bg-amber-500 text-white`}>
                    <Sparkles size={32} />
                  </div>
                  <div>
                    <Badge color="amber">Level {activeRemediation.level || 1} Scaffolding</Badge>
                    <p className="text-xl font-bold text-slate-800 leading-relaxed mt-4">
                      {activeRemediation.currentHint}
                    </p>
                    <div className="mt-6 flex items-center gap-2 text-amber-600">
                      <HelpCircle size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Type: {activeRemediation.type}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Stage 2: Voice-Enabled Reasoning */}
            {isTier1Correct && (
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white p-8 lg:p-10 rounded-[40px] border border-slate-100 shadow-sm flex-1 flex flex-col relative"
              >
                <div className="flex items-center justify-between mb-8">
                  <Badge color="amber">Stage 2: The Reasoning</Badge>
                  <Trophy className="text-emerald-500 animate-bounce" size={28} />
                </div>

                <h4 className="text-xl font-black text-slate-800 leading-tight mb-6">
                  {tier2.prompt.text}
                </h4>

                {/* PROMINENT THINKING NUDGE (NEW): High contrast Alert Card */}
                <AnimatePresence>
                  {nudgeType !== 'NONE' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className="absolute inset-x-8 top-24 z-20 bg-rose-600 text-white p-8 rounded-[32px] shadow-2xl border-4 border-rose-400"
                    >
                      <div className="flex gap-5 items-start">
                        <div className="bg-white/20 p-3 rounded-2xl">
                          <AlertTriangle size={32} />
                        </div>
                        <div>
                          <h5 className="text-lg font-black uppercase tracking-tight">Wait! We need more detail...</h5>
                          <p className="text-rose-50 text-base font-bold mt-2 leading-relaxed">
                            {nudgeType === 'LENGTH'
                              ? "Your explanation is a bit too short for 100% mastery. Can you explain a bit more?"
                              : "Try using specific math words or numbers from the problem (like denominators or the final sum) to prove your thinking."}
                          </p>
                          <button
                            onClick={() => setNudgeType('NONE')}
                            className="mt-6 px-6 py-2 bg-white text-rose-600 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg"
                          >
                            I'll add more
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="relative flex-1 flex flex-col min-h-[300px]">
                  <textarea
                    value={tier2Text}
                    disabled={isSubmitted}
                    onChange={(e) => { setTier2Text(e.target.value); setNudgeType('NONE'); }}
                    placeholder="Describe your thinking process..."
                    className="w-full flex-1 p-8 rounded-t-3xl border-2 border-b-0 border-slate-100 focus:border-indigo-100 outline-none transition-all text-xl font-medium resize-none bg-slate-50/50"
                  />

                  {/* ANDROID VOICE CONTROLLER */}
                  <div className="bg-slate-50 border-2 border-t-0 border-slate-100 rounded-b-3xl p-6 flex items-center justify-between">
                    <button
                      onClick={startSpeechRecognition}
                      disabled={isListening || isSubmitted}
                      className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black uppercase text-sm tracking-widest transition-all ${isListening
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                        }`}
                    >
                      {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                      {isListening ? 'Listening...' : 'Say your Answer'}
                    </button>

                    <button
                      onClick={() => setTier2Text("")}
                      disabled={isSubmitted}
                      className="p-3 text-slate-300 hover:text-rose-500 transition-colors"
                    >
                      <RotateCcw size={24} />
                    </button>
                  </div>
                </div>

                {/* ACTION AREA: Rubric & Submit */}
                <div className="mt-8 p-8 rounded-[32px] bg-slate-900 border-4 border-slate-800">
                  {!isSubmitted ? (
                    <>
                      <div className="flex items-center gap-2 text-emerald-400 mb-6">
                        <Lightbulb size={20} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Checklist for Success</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        {tier2.interaction.config.rubric_points?.map((point, i) => (
                          <div key={i} className="flex items-start gap-4">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-700 mt-1.5 shrink-0" />
                            <p className="text-[11px] font-bold leading-relaxed text-slate-400">
                              {point}
                            </p>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={handleFinalSubmit}
                        className="w-full py-6 bg-emerald-500 text-slate-900 font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-400 transition-all transform active:scale-95 shadow-xl shadow-emerald-900/20 text-lg"
                      >
                        Submit Reasoning
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <div className="bg-emerald-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="text-slate-900" size={32} />
                      </div>
                      <h5 className="text-white text-xl font-black uppercase tracking-widest mb-2">Reasoning Saved</h5>
                      <p className="text-slate-400 text-sm font-medium">Logical evidence has been recorded for this topic.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Inactive State: Tablet Guide */}
            {!isTier1Correct && !activeRemediation && (
              <div className="hidden lg:flex flex-col items-center justify-center flex-1 border-4 border-dashed border-slate-100 rounded-[50px] p-20 text-center">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                  <Target size={40} className="text-slate-200" />
                </div>
                <h5 className="text-slate-300 font-black uppercase text-[12px] tracking-[0.4em]">
                  Solve Stage 1 to unlock Reasoning
                </h5>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// --- RETAINED MINI-COMPONENTS ---

const Badge = ({ children, color }: { children: React.ReactNode, color: string }) => {
  const styles: any = {
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
  };
  return (
    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${styles[color]}`}>
      {children}
    </span>
  );
};

const LatexRenderer = ({ text }: { text: string | null }) => {
  if (!text) return null;
  const parts = text.split(/(\$\$.*?\$\$)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('$$')
          ? <InlineMath key={i} math={part.replace(/\$\$/g, '')} />
          : part
      )}
    </>
  );
};