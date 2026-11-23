import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';

export const ProjectAnalysisSchema = z.object({
  summary: z.string(),
  requiredCapabilities: z.array(z.string()),
  suggestedCategories: z.array(z.string()),
  estimatedSessionHours: z.number().min(0.5).max(6),
  notes: z.string(),
  source: z.enum(['ai', 'fallback']).default('fallback'),
});

export type ProjectAnalysis = z.infer<typeof ProjectAnalysisSchema>;

// In-memory cache for prompt analyses
const analysisCache = new Map<string, ProjectAnalysis>();

/**
 * Fallback NLP Keyword Extraction Engine
 * Provides robust, intelligent requirement extraction even without an active Gemini API key.
 */
export function analyzeWithKeywordFallback(projectText: string): ProjectAnalysis {
  const lower = projectText.toLowerCase();

  const capabilities = new Set<string>();
  const categories = new Set<string>();
  let estimatedHours = 2;

  // GPU / AI / ML
  if (
    lower.includes('deep learning') ||
    lower.includes('pytorch') ||
    lower.includes('neural') ||
    lower.includes('llm') ||
    lower.includes('gpu') ||
    lower.includes('vision') ||
    lower.includes('transformer') ||
    lower.includes('training')
  ) {
    capabilities.add('gpu');
    capabilities.add('cuda');
    capabilities.add('deep-learning');
    capabilities.add('pytorch');
    categories.add('AI & GPU Compute');
    estimatedHours = Math.max(estimatedHours, 3);
  }

  // RF / Oscilloscope / Test
  if (
    lower.includes('oscilloscope') ||
    lower.includes('signal') ||
    lower.includes('rf') ||
    lower.includes('waveform') ||
    lower.includes('frequency') ||
    lower.includes('transient') ||
    lower.includes('hardware debug')
  ) {
    capabilities.add('oscilloscope');
    capabilities.add('signal-analysis');
    capabilities.add('hardware-debugging');
    categories.add('Test & Measurement');
    estimatedHours = Math.max(estimatedHours, 2);
  }

  // Spectrum Analyzer
  if (lower.includes('spectrum') || lower.includes('antenna') || lower.includes('wireless') || lower.includes('emc')) {
    capabilities.add('spectrum-analyzer');
    capabilities.add('rf');
    capabilities.add('wireless');
    categories.add('Test & Measurement');
    estimatedHours = Math.max(estimatedHours, 2.5);
  }

  // FPGA / Embedded
  if (
    lower.includes('fpga') ||
    lower.includes('verilog') ||
    lower.includes('vhdl') ||
    lower.includes('zynq') ||
    lower.includes('embedded') ||
    lower.includes('microcontroller')
  ) {
    capabilities.add('fpga');
    capabilities.add('embedded');
    capabilities.add('dsp');
    categories.add('Embedded & FPGA');
    estimatedHours = Math.max(estimatedHours, 2.5);
  }

  // 3D Printing / Prototyping
  if (
    lower.includes('3d print') ||
    lower.includes('enclosure') ||
    lower.includes('cad') ||
    lower.includes('resin') ||
    lower.includes('sla') ||
    lower.includes('fdm') ||
    lower.includes('chassis')
  ) {
    capabilities.add('3d-printing');
    capabilities.add('prototyping');
    categories.add('Additive Manufacturing');
    estimatedHours = Math.max(estimatedHours, 2);
  }

  // Robotics
  if (
    lower.includes('robot') ||
    lower.includes('cobot') ||
    lower.includes('ros') ||
    lower.includes('arm') ||
    lower.includes('kinematics') ||
    lower.includes('manipulator')
  ) {
    capabilities.add('robotics');
    capabilities.add('ros2');
    capabilities.add('manipulator');
    categories.add('Robotics & Automation');
    estimatedHours = Math.max(estimatedHours, 2.5);
  }

  // Spectroscopy & Bio
  if (
    lower.includes('spectro') ||
    lower.includes('absorbance') ||
    lower.includes('fluorescence') ||
    lower.includes('protein') ||
    lower.includes('nanoparticle') ||
    lower.includes('biochemical')
  ) {
    capabilities.add('spectrophotometer');
    capabilities.add('biochemical');
    categories.add('Analytical Spectroscopy');
    estimatedHours = Math.max(estimatedHours, 1.5);
  }

  // Optics
  if (lower.includes('optics') || lower.includes('laser') || lower.includes('interferometer')) {
    capabilities.add('optics');
    capabilities.add('laser');
    capabilities.add('interferometer');
    categories.add('Optics & Photonics');
    estimatedHours = Math.max(estimatedHours, 2);
  }

  // CNC / Machining
  if (lower.includes('cnc') || lower.includes('milling') || lower.includes('aluminum') || lower.includes('pcb mill')) {
    capabilities.add('cnc');
    capabilities.add('machining');
    capabilities.add('prototyping');
    categories.add('Precision Machining');
    estimatedHours = Math.max(estimatedHours, 2);
  }

  // Default fallback if no specific terms matched
  if (capabilities.size === 0) {
    capabilities.add('hardware-debugging');
    capabilities.add('prototyping');
    categories.add('Test & Measurement');
  }

  // Generate crisp 1-sentence summary
  const summary = projectText.length > 120
    ? `${projectText.trim().slice(0, 117)}...`
    : projectText.trim();

  return {
    summary,
    requiredCapabilities: Array.from(capabilities),
    suggestedCategories: Array.from(categories),
    estimatedSessionHours: estimatedHours,
    notes: 'Parsed using LabLink deterministic campus keyword NLP parser.',
    source: 'fallback',
  };
}

export async function analyzeProjectRequirements(projectDescription: string): Promise<ProjectAnalysis> {
  const cacheKey = projectDescription.trim().toLowerCase();
  if (analysisCache.has(cacheKey)) {
    return analysisCache.get(cacheKey)!;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();

  // If no API key configured, use the keyword fallback
  if (!apiKey) {
    const result = analyzeWithKeywordFallback(projectDescription);
    analysisCache.set(cacheKey, result);
    return result;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are the LabLink AI Campus Laboratory Project Assistant.
Analyze this student project description and extract laboratory equipment requirements.
Respond ONLY with a valid JSON object matching this schema:
{
  "summary": "1-2 sentence technical summary of the project goals",
  "requiredCapabilities": ["list", "of", "standardized", "lowercase", "capability", "tags"],
  "suggestedCategories": ["AI & GPU Compute" | "Test & Measurement" | "Embedded & FPGA" | "Additive Manufacturing" | "Robotics & Automation" | "Analytical Spectroscopy" | "Optics & Photonics" | "Precision Machining"],
  "estimatedSessionHours": 2.5,
  "notes": "Brief technical advice or safety precautions for equipment usage"
}

Student Project Description:
"""
${projectDescription}
"""`;

    // 8 second timeout
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI request timed out')), 8000)
    );

    const apiCallPromise = ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const response = (await Promise.race([apiCallPromise, timeoutPromise])) as any;
    const responseText = response.text || '';

    const parsedJson = JSON.parse(responseText);
    const validated = ProjectAnalysisSchema.parse({
      ...parsedJson,
      source: 'ai',
    });

    analysisCache.set(cacheKey, validated);
    return validated;
  } catch (error) {
    console.warn('Gemini AI API call failed or timed out. Falling back to keyword engine:', (error as Error).message);
    const fallback = analyzeWithKeywordFallback(projectDescription);
    analysisCache.set(cacheKey, fallback);
    return fallback;
  }
}

/**
 * Optional Gemini narrative generation for faculty review explanation
 */
export async function generateAllocationNarrative(breakdownContext: any): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return '';

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are the LabLink AI Allocation Engine. Write a 2-3 sentence neutral, professional, and transparent explanation for a faculty reviewer evaluating competing student requests for laboratory resources.
Here is the deterministic score breakdown:
${JSON.stringify(breakdownContext, null, 2)}
Explain why the recommended winner was selected based strictly on the provided score factors (Urgency, Suitability, Fairness, Efficiency). Mention the concrete alternatives proposed for competing applicants. Do not invent any numbers.`;

    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return res.text?.trim() || '';
  } catch (e) {
    return '';
  }
}
