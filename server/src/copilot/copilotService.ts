import { db } from '../db/connection.js';
import { routeFallbackIntent } from './fallbackRouter.js';
import { applyGroundingGuard } from './groundingGuard.js';
import { CopilotUserContext, COPILOT_TOOLS } from './toolRegistry.js';

export interface CopilotMessageRequest {
  userId: number;
  userName: string;
  role: 'student' | 'faculty' | 'admin';
  departmentId: number | null;
  sessionId: string;
  message: string;
}

export interface CopilotMessageResponse {
  reply: string;
  cards: any[];
  toolTraces: any[];
  source: 'gemini' | 'deterministic_rules';
}

export async function processCopilotMessage(
  req: CopilotMessageRequest
): Promise<CopilotMessageResponse> {
  const context: CopilotUserContext = {
    userId: req.userId,
    userName: req.userName,
    role: req.role,
    departmentId: req.departmentId,
  };

  // 1. Record user message in chat_messages table
  db.prepare(`
    INSERT INTO chat_messages (user_id, session_id, role, content, source)
    VALUES (?, ?, 'user', ?, 'rules')
  `).run(req.userId, req.sessionId, req.message);

  let replyText = '';
  let cards: any[] = [];
  let toolTraces: any[] = [];
  let source: 'gemini' | 'deterministic_rules' = 'deterministic_rules';

  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  const forceBasic = process.env.DEMO_FORCE_BASIC === 'true';

  if (hasGeminiKey && !forceBasic) {
    try {
      // Use official @google/genai SDK
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      // Build tool declarations for Gemini
      const toolDeclarations = Object.values(COPILOT_TOOLS)
        .filter(t => t.allowedRoles.includes(context.role))
        .map(t => ({
          name: t.name,
          description: t.description,
        }));

      // Initial AI prompt
      const systemInstruction = `You are LabLink Copilot, an expert AI assistant for university laboratory resource sharing.
Always ground your answers in the database. Never hallucinate availability or invent equipment.
Operating hours are Monday to Saturday, 09:00 - 17:00.
IMPORTANT: You have read-only access. You can prepare booking proposals, but YOU CANNOT DIRECTLY CONFIRM BOOKINGS. Students must click confirm manually.`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: req.message,
        config: {
          systemInstruction,
        },
      });

      if (aiResponse && aiResponse.text) {
        replyText = aiResponse.text;
        source = 'gemini';
      }
    } catch {
      // Fallback on error
      source = 'deterministic_rules';
    }
  }

  // If Gemini wasn't used, failed, or fallback forced:
  if (!replyText) {
    const fallbackRes = await routeFallbackIntent(req.message, context);
    replyText = fallbackRes.reply;
    cards = fallbackRes.cards;
    toolTraces = fallbackRes.toolTraces;
    source = 'deterministic_rules';
  }

  // Apply grounding guard
  const guard = applyGroundingGuard(replyText, toolTraces);
  const finalReply = guard.sanitizedMessage;

  // Record assistant response in database
  db.prepare(`
    INSERT INTO chat_messages (user_id, session_id, role, content, cards_json, tool_trace_json, source)
    VALUES (?, ?, 'assistant', ?, ?, ?, ?)
  `).run(
    req.userId,
    req.sessionId,
    finalReply,
    JSON.stringify(cards),
    JSON.stringify(toolTraces),
    source === 'gemini' ? 'ai' : 'rules'
  );

  return {
    reply: finalReply,
    cards,
    toolTraces,
    source,
  };
}

export function getCopilotChatHistory(userId: number, sessionId: string) {
  const rows = db.prepare(`
    SELECT id, role, content, cards_json, tool_trace_json, source, created_at
    FROM chat_messages
    WHERE user_id = ? AND session_id = ?
    ORDER BY id ASC
  `).all(userId, sessionId) as any[];

  return rows.map(r => ({
    id: r.id,
    role: r.role,
    content: r.content,
    cards: r.cards_json ? JSON.parse(r.cards_json) : [],
    toolTraces: r.tool_trace_json ? JSON.parse(r.tool_trace_json) : [],
    source: r.source,
    createdAt: r.created_at,
  }));
}
