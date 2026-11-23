import React, { useState } from 'react';
import { apiRequest } from '../../api/client.js';
import { useNavigate } from 'react-router-dom';
import { ImageWithFallback } from '../../components/ImageWithFallback.js';
import {
  Sparkles,
  Cpu,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Send,
  HelpCircle,
  Wrench,
  Package,
  ShieldCheck,
  Check,
  AlertTriangle,
} from 'lucide-react';

interface ExtractedReq {
  capability: string;
  label: string;
  priority: 'must' | 'nice';
  reason: string;
}

interface RecommendedItem {
  id: number;
  slug: string;
  name: string;
  category: string;
  family: string;
  departmentName: string;
  lab: string;
  location: string;
  imageUrl: string | null;
  imageAlt: string;
  matchPercentage: number;
  matchLevel: 'full' | 'partial';
  matchedCapabilities: string[];
  limitations: string[];
  quantity: number;
  availableQuantity: number;
  status: string;
  nextFreeAt: string | null;
  relevanceReason: string;
}

interface PrototypePlan {
  projectSummary: string;
  requiredCapabilities: string[];
  mustHaveRequirements: ExtractedReq[];
  niceToHaveRequirements: ExtractedReq[];
  recommendedEquipment: RecommendedItem[];
  coveragePercentage: number;
  unmetCapabilities: string[];
  partsToBring: string[];
  source: 'gemini' | 'deterministic_rules';
}

export const ProjectAssistant: React.FC = () => {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<PrototypePlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const samplePrompts = [
    {
      label: 'Smart Agriculture IoT Node',
      text: 'I want to build a smart agriculture IoT node with ESP32, capacitive soil moisture sensor, and WiFi cloud dashboard.',
    },
    {
      label: '100MHz Clock Jitter & Signal Analysis',
      text: 'Characterizing 100MHz high-frequency square wave signal integrity, transient ringing, and clock jitter for FPGA PCB.',
    },
    {
      label: 'Edge AI Vision with Jetson Nano',
      text: 'Deploying real-time PyTorch object tracking on a quad-core ARM edge computer with USB camera input.',
    },
    {
      label: '4WD Mobile Robot Chassis',
      text: 'Prototyping an autonomous differential-drive 4WD rover with ultrasonic obstacle avoidance and motor encoders.',
    },
  ];

  const handleAnalyze = async (textToAnalyze?: string) => {
    const text = textToAnalyze || prompt;
    if (!text.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<PrototypePlan>('/matchmaker/analyze', {
        method: 'POST',
        body: JSON.stringify({ projectDescription: text }),
      });
      setPlan(res);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze project requirements');
    } finally {
      setLoading(false);
    }
  };

  const handleBookEquipment = (item: RecommendedItem) => {
    navigate('/requests/new', {
      state: {
        prefillEquipmentId: item.id,
        prefillTitle: plan?.projectSummary || prompt.slice(0, 50),
        prefillDescription: prompt,
        prefillCapabilities: item.matchedCapabilities,
      },
    });
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-navy-950 via-ai-950 to-navy-950 border border-ai-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-ai-600/30 text-ai-300 border border-ai-500/30 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-ai-400" />
            GenAI & Deterministic Matchmaker
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight text-white">
            Project-to-Prototype Matchmaker
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Enter your natural-language research idea or capstone concept. LabLink extracts required hardware capabilities, verifies lab inventory coverage, highlights parts to bring yourself, and matches verified campus equipment.
          </p>
        </div>
      </div>

      {/* Input Prompt Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <label htmlFor="project-desc" className="block text-xs font-heading font-bold uppercase tracking-wider text-slate-700">
          Describe Your Engineering Prototype Concept
        </label>
        <div className="relative">
          <textarea
            id="project-desc"
            rows={4}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="e.g. I am building a solar-powered IoT weather station with ESP32, temperature sensors, battery management, and need an oscilloscope and soldering iron..."
            className="w-full p-4 text-sm bg-slate-50 border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ai-500 focus:bg-white transition-all resize-none"
          />
        </div>

        {/* Action button & sample prompts */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-400 mr-1">Examples:</span>
            {samplePrompts.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPrompt(s.text);
                  handleAnalyze(s.text);
                }}
                className="text-[11px] font-medium bg-slate-100 hover:bg-ai-50 hover:text-ai-700 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200 transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={loading || !prompt.trim()}
            onClick={() => handleAnalyze()}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-ai-600 to-indigo-600 hover:from-ai-500 hover:to-indigo-500 text-white font-heading font-semibold text-xs shadow-md shadow-ai-900/20 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analyzing Requirements...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Prototype Plan
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            {error}
          </div>
        )}
      </div>

      {/* Generated Prototype Plan Display */}
      {plan && (
        <div className="space-y-6 animate-fadeIn">
          {/* Plan Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-ai-700 bg-ai-50 px-2.5 py-0.5 rounded-full border border-ai-200">
                    Structured Prototype Plan
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    Engine: {plan.source === 'gemini' ? 'Gemini 2.5 Flash' : 'Deterministic Rules'}
                  </span>
                </div>
                <h2 className="text-xl font-heading font-bold text-slate-900">
                  {plan.projectSummary}
                </h2>
              </div>

              {/* Coverage Meter */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shrink-0 text-right space-y-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Hardware Coverage
                </span>
                <div className="text-2xl font-heading font-extrabold text-slate-900">
                  {plan.coveragePercentage}%
                </div>
                <span className="text-[10px] text-slate-500">
                  {plan.unmetCapabilities.length === 0 ? 'All capabilities available' : `${plan.unmetCapabilities.length} unmet items`}
                </span>
              </div>
            </div>

            {/* Requirements Grid: Must-Haves vs Nice-To-Haves */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Must-Have Requirements */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Must-Have Capabilities
                </h3>
                <div className="space-y-1.5">
                  {plan.mustHaveRequirements.map((req, i) => (
                    <div key={i} className="text-xs bg-white p-2.5 rounded-lg border border-slate-200 flex items-start justify-between gap-2">
                      <div>
                        <span className="font-semibold text-slate-800 block">{req.label || req.capability}</span>
                        <span className="text-[11px] text-slate-500">{req.reason}</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                        Must
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nice-To-Have Requirements */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-ai-600" />
                  Nice-To-Have Capabilities
                </h3>
                <div className="space-y-1.5">
                  {plan.niceToHaveRequirements.length > 0 ? (
                    plan.niceToHaveRequirements.map((req, i) => (
                      <div key={i} className="text-xs bg-white p-2.5 rounded-lg border border-slate-200 flex items-start justify-between gap-2">
                        <div>
                          <span className="font-semibold text-slate-800 block">{req.label || req.capability}</span>
                          <span className="text-[11px] text-slate-500">{req.reason}</span>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                          Nice
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 p-2">None identified for this scope.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Parts To Bring Yourself Card */}
            {plan.partsToBring.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-amber-600" />
                  External Parts to Bring Yourself
                </h3>
                <p className="text-xs text-amber-800">
                  The campus provides laboratory bench instruments, power supplies, and compute workstations. You will need to bring consumables and dedicated modular sensors:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {plan.partsToBring.map((part, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-white text-slate-700 border border-amber-200 shadow-2xs"
                    >
                      <Check className="w-3 h-3 text-amber-600" />
                      {part}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recommended Verified Equipment Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-heading font-bold text-slate-900 tracking-tight">
                  Recommended Campus Equipment ({plan.recommendedEquipment.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Ranked by compatibility percentage with your required prototype plan capabilities.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {plan.recommendedEquipment.map(item => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-ai-300 hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden group"
                >
                  <div>
                    {/* Visual 4:3 Photograph */}
                    <div className="relative">
                      <ImageWithFallback
                        src={item.imageUrl}
                        alt={item.imageAlt || item.name}
                        category={item.category}
                      />
                      <div className="absolute top-3 left-3">
                        <span className="text-[10px] font-bold uppercase bg-navy-950/80 backdrop-blur text-white px-2.5 py-0.5 rounded-full border border-white/10">
                          {item.departmentName}
                        </span>
                      </div>
                      <div className="absolute bottom-3 right-3">
                        <span className="text-xs font-black text-ai-700 bg-ai-50 px-2.5 py-0.5 rounded-full border border-ai-200 shadow-2xs">
                          {item.matchPercentage}% Match
                        </span>
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
                          <span>{item.category}</span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.2 rounded-full ${
                              item.matchLevel === 'full'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.matchLevel === 'full' ? 'Full Match' : 'Partial'}
                          </span>
                        </div>
                        <h4 className="font-heading font-bold text-slate-900 text-base leading-snug line-clamp-1 group-hover:text-ai-600 transition-colors">
                          {item.name}
                        </h4>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                        {item.relevanceReason}
                      </p>

                      {/* Capabilities Provided */}
                      <div className="flex flex-wrap gap-1">
                        {item.matchedCapabilities.map((c, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-semibold bg-ai-50 text-ai-700 border border-ai-200 px-2 py-0.5 rounded"
                          >
                            ✓ {c}
                          </span>
                        ))}
                      </div>

                      {/* Limitations notice */}
                      {item.limitations.length > 0 && (
                        <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-800">
                          <strong>Note:</strong> {item.limitations.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 truncate max-w-[150px]">
                      {item.lab || item.location}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleBookEquipment(item)}
                      className="px-3.5 py-1.5 rounded-xl bg-ai-600 hover:bg-ai-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      Book with Plan
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
