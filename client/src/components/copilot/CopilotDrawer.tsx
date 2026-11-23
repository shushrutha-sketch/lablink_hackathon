import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../../api/client.js';
import { useAuth } from '../../auth/AuthContext.js';
import { ImageWithFallback } from '../ImageWithFallback.js';
import {
  Sparkles,
  X,
  Send,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Wrench,
  Package,
  RotateCcw,
} from 'lucide-react';

interface CopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  cards?: any[];
  source?: string;
  createdAt?: string;
}

export const CopilotDrawer: React.FC<CopilotDrawerProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmedProposals, setConfirmedProposals] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionId = `sess-${user?.id || 1}-session`;

  // Fetch chat history on open
  useEffect(() => {
    if (isOpen) {
      apiRequest<{ history: ChatMessage[] }>(`/copilot/history?sessionId=${sessionId}`)
        .then(res => {
          if (res.history && res.history.length > 0) {
            setMessages(res.history);
          } else {
            // Initial friendly greeting
            setMessages([
              {
                role: 'assistant',
                content: `Hello ${user?.name || 'Student'}! I am **LabLink Copilot**, your GenAI laboratory assistant.\n\nI can help you explore verified campus hardware, check live instrument availability, generate prototype plans, find compatible alternatives, or prepare reservation proposals.`,
                cards: [],
                source: 'deterministic_rules',
              },
            ]);
          }
        })
        .catch(() => {
          // ignore history load error
        });
    }
  }, [isOpen, user]);

  // Scroll to bottom on message updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSendMessage = async (msgText?: string) => {
    const text = msgText || input;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: text,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await apiRequest<{
        reply: string;
        cards: any[];
        source: 'gemini' | 'deterministic_rules';
      }>('/copilot/message', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          sessionId,
        }),
      });

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: res.reply,
          cards: res.cards || [],
          source: res.source,
        },
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, I encountered an error processing your request: ${err.message || 'Server error'}. Please try asking about available equipment or prototype planning.`,
          cards: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmProposal = async (proposal: any) => {
    const key = `${proposal.equipmentId}-${proposal.startTime}`;
    try {
      await apiRequest('/copilot/confirm-booking', {
        method: 'POST',
        body: JSON.stringify({ proposal }),
      });
      setConfirmedProposals(prev => ({ ...prev, [key]: true }));
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `✅ **Reservation Confirmed!** Your access request for **${proposal.equipmentName}** (${proposal.date} at ${proposal.startTime.split('T')[1]}) has been submitted to the faculty review queue.`,
          cards: [],
        },
      ]);
    } catch (err: any) {
      alert(err.message || 'Failed to confirm reservation');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-navy-950/40 backdrop-blur-xs flex justify-end">
      {/* Drawer Container */}
      <div
        className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-in slide-in-from-right duration-300"
        role="dialog"
        aria-label="LabLink Copilot Assistant"
      >
        {/* Drawer Header */}
        <div className="p-4 bg-gradient-to-r from-navy-950 via-ai-950 to-navy-950 text-white flex items-center justify-between border-b border-navy-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-ai-600 flex items-center justify-center text-white shadow-md shadow-ai-900/50">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-sm tracking-tight text-white">
                  LabLink Copilot
                </span>
                <span className="text-[10px] font-semibold bg-ai-500/30 text-ai-300 border border-ai-400/30 px-2 py-0.2 rounded-full">
                  AI + Grounded
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Grounded Campus Laboratory Assistant
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close Copilot"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message List Area */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50"
          role="log"
          aria-live="polite"
        >
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} space-y-2`}
            >
              {/* Message Bubble */}
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-electric-600 text-white shadow-xs rounded-br-none'
                    : 'bg-white text-slate-800 border border-slate-200 shadow-2xs rounded-bl-none space-y-1.5'
                }`}
              >
                {/* Assistant Source Pill */}
                {m.role === 'assistant' && (
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1 border-b border-slate-100">
                    <span className="flex items-center gap-1 font-semibold text-ai-700">
                      <Sparkles className="w-3 h-3 text-ai-600" />
                      {m.source === 'gemini' ? 'Gemini 2.5' : 'Deterministic Rules'}
                    </span>
                    <span className="text-slate-400">Grounding Guard Verified</span>
                  </div>
                )}
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>

              {/* Embedded Typed Cards */}
              {m.cards && m.cards.length > 0 && (
                <div className="w-full space-y-2.5 max-w-[95%]">
                  {m.cards.map((card, cIdx) => {
                    // 1. Availability Card
                    if (card.type === 'availability_card') {
                      return (
                        <div key={cIdx} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-heading font-bold text-slate-800">{card.data.equipmentName}</span>
                            <span className="text-[10px] text-slate-500 font-medium">{card.data.date}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {card.data.availableTimes && card.data.availableTimes.map((t: string) => (
                              <span key={t} className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    // 2. Substitutes Card
                    if (card.type === 'substitutes_card') {
                      return (
                        <div key={cIdx} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                          <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-slate-500 block">
                            Compatible Substitutes ({card.data.substitutes?.length || 0})
                          </span>
                          <div className="space-y-2">
                            {card.data.substitutes?.slice(0, 2).map((sub: any) => (
                              <div key={sub.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                                <div>
                                  <span className="font-bold text-xs text-slate-900 block">{sub.name}</span>
                                  <span className="text-[10px] text-slate-500">{sub.departmentName}</span>
                                </div>
                                <span className="text-xs font-black text-ai-700 bg-ai-50 px-2 py-0.5 rounded-full border border-ai-200">
                                  {sub.compatibilityScore}% Compat
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    // 3. Booking Proposal Card (Safety Invariant: Requires explicit student confirmation)
                    if (card.type === 'booking_proposal_card') {
                      const p = card.data;
                      const pKey = `${p.equipmentId}-${p.startTime}`;
                      const isConfirmed = confirmedProposals[pKey];

                      return (
                        <div key={cIdx} className="bg-gradient-to-b from-white to-ai-50/30 p-4 rounded-xl border border-ai-200 shadow-sm space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-ai-700 bg-ai-100 px-2 py-0.5 rounded-full">
                              Explicit Booking Proposal
                            </span>
                            <span className="text-[11px] font-semibold text-slate-600">{p.date}</span>
                          </div>

                          <div>
                            <h4 className="font-heading font-bold text-slate-900 text-sm">{p.equipmentName}</h4>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {p.startTime.split('T')[1]} – {p.endTime.split('T')[1]} ({p.durationMinutes} mins)
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] text-slate-500">Manual student action required</span>
                            {isConfirmed ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-100">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Confirmed
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleConfirmProposal(p)}
                                className="px-3.5 py-1.5 rounded-lg bg-ai-600 hover:bg-ai-500 text-white text-xs font-semibold shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                Confirm Reservation
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // 4. Prototype Plan Card
                    if (card.type === 'prototype_plan_card') {
                      return (
                        <div key={cIdx} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-heading font-bold text-slate-800">Prototype Plan</span>
                            <span className="text-xs font-extrabold text-ai-700 bg-ai-50 px-2 py-0.5 rounded-full border border-ai-200">
                              {card.data.coveragePercentage}% Coverage
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-2">{card.data.projectSummary}</p>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs w-32">
              <div className="w-2 h-2 rounded-full bg-ai-600 animate-ping" />
              <span className="text-xs text-slate-500">Thinking...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Pills */}
        <div className="p-2.5 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[11px]">
          {[
            'Is an oscilloscope available tomorrow?',
            'What can I use instead of DSO?',
            'Help me plan a smart agriculture node',
            'Show my booking requests',
          ].map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSendMessage(prompt)}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-ai-50 hover:text-ai-700 text-slate-600 shrink-0 border border-slate-200 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            placeholder="Ask Copilot (e.g. check availability, match project, find substitutes)..."
            className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ai-500 focus:bg-white transition-all"
          />
          <button
            type="button"
            disabled={!input.trim() || loading}
            onClick={() => handleSendMessage()}
            className="p-2.5 rounded-xl bg-ai-600 hover:bg-ai-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
