import React, { useState } from 'react';
import { apiRequest } from '../../api/client.js';
import { ProjectAnalysis, Equipment } from '../../lib/types.js';
import { EquipmentCard } from '../../components/EquipmentCard.js';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';

export const ProjectAssistant: React.FC = () => {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null);
  const [recommendations, setRecommendations] = useState<Equipment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const samplePrompts = [
    {
      label: 'Deep Learning ViT',
      text: 'We are training a 600M parameter vision transformer for satellite image segmentation using PyTorch and CUDA.',
    },
    {
      label: 'Antenna & RF Debug',
      text: 'Measuring S11 return loss, impedance matching, and spurious RF harmonics on a custom 2.4GHz microstrip antenna.',
    },
    {
      label: 'High-Strength Cobot Gripper',
      text: 'Prototyping a custom SLA resin microfluidic channel and 3D printing continuous carbon-fiber robotic end-effectors.',
    },
    {
      label: 'Biomolecular Assay',
      text: 'Measuring UV-Vis double beam absorbance spectra and fluorescence lifetime for protein nanoparticle binding.',
    },
  ];

  const handleAnalyze = async (textToAnalyze?: string) => {
    const text = textToAnalyze || prompt;
    if (!text.trim()) return;

    setLoading(true);
    setError(null);
    try {
      // 1. Analyze project with Gemini or keyword fallback
      const analysisRes = await apiRequest<ProjectAnalysis>('/ai/analyze-project', {
        method: 'POST',
        body: JSON.stringify({ projectDescription: text }),
      });
      setAnalysis(analysisRes);

      // 2. Query ranked matching equipment
      const recRes = await apiRequest<{ recommendations: Equipment[] }>('/discovery/recommend', {
        method: 'POST',
        body: JSON.stringify({
          capabilities: analysisRes.requiredCapabilities,
        }),
      });
      setRecommendations(recRes.recommendations);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze project description');
    } finally {
      setLoading(false);
    }
  };

  const handleUseEquipment = (eq: Equipment) => {
    navigate('/requests/new', {
      state: {
        prefillEquipmentId: eq.id,
        prefillTitle: analysis?.summary || prompt.slice(0, 50),
        prefillDescription: prompt,
        prefillDurationHours: analysis?.estimatedSessionHours || 2,
        prefillCapabilities: analysis?.requiredCapabilities || [],
      },
    });
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
          <Sparkles className="w-3.5 h-3.5 text-brand-600" />
          Intelligent Resource Assistant
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          AI Project Equipment Matcher
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl">
          Describe your academic research project or capstone goals in plain English. LabLink automatically extracts technical capability requirements and ranks campus laboratories with matching instruments.
        </p>
      </div>

      {/* Input Box */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
          Describe your project requirements & objectives
        </label>
        <textarea
          rows={4}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="e.g. I need to synthesize Verilog logic on an FPGA board and capture high-speed 1GHz clock transients using an oscilloscope for my senior design..."
          className="w-full p-4 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500 placeholder:text-slate-400"
        />

        {/* Sample chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold">Try sample:</span>
          {samplePrompts.map(s => (
            <button
              key={s.label}
              type="button"
              onClick={() => {
                setPrompt(s.text);
                handleAnalyze(s.text);
              }}
              className="text-xs font-medium bg-slate-100 hover:bg-brand-50 hover:text-brand-700 px-3 py-1 rounded-lg text-slate-600 transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" /> Deterministic tag overlap ranking
          </span>

          <button
            type="button"
            onClick={() => handleAnalyze()}
            disabled={loading || !prompt.trim()}
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm flex items-center gap-2 transition-all"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analyzing requirements...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Extract Requirements & Match Resources
              </>
            )}
          </button>
        </div>
      </div>

      {/* Analysis Results Display */}
      {analysis && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Extracted Metadata Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Extracted Laboratory Requirements
              </h2>
              {/* Mandatory AI vs Fallback Badge */}
              {analysis.source === 'ai' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  AI Powered (Gemini)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <Cpu className="w-3.5 h-3.5 text-amber-600" />
                  Basic Matching (Keyword Fallback)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Summary */}
              <div className="md:col-span-2 space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Technical Summary
                </span>
                <p className="text-sm text-slate-800 leading-relaxed font-medium">
                  {analysis.summary}
                </p>
                {analysis.notes && (
                  <p className="text-xs text-slate-500 italic">
                    Note: {analysis.notes}
                  </p>
                )}
              </div>

              {/* Session Estimate */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Recommended Session Length
                  </span>
                  <div className="text-2xl font-black text-brand-600 mt-1 flex items-baseline gap-1">
                    {analysis.estimatedSessionHours} <span className="text-sm font-semibold text-slate-500">hours</span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 mt-2">
                  Avoids slot fragmentation and maximizes fair allocation score.
                </div>
              </div>
            </div>

            {/* Extracted Capabilities Tags */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Extracted Capability Tags ({analysis.requiredCapabilities.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {analysis.requiredCapabilities.map(cap => (
                  <span
                    key={cap}
                    className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200"
                  >
                    #{cap}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Ranked Matching Equipment Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Ranked Equipment Recommendations
                </h3>
                <p className="text-xs text-slate-500">
                  Ranked deterministically based on capability tag overlap.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {recommendations.length} matching resources found
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {recommendations.map(eq => (
                <div key={eq.id} className="relative flex flex-col justify-between">
                  <EquipmentCard equipment={eq} highlightMatch={true} />
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => handleUseEquipment(eq)}
                      className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Use this Equipment (Prefill Booking)
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
