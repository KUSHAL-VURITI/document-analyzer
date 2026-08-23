import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export interface SummaryResult {
  summary: string;
  keyPoints: string[];
  documentType: string;
}

export function getAiModel(modelOverride?: string) {
  const groqKey = (
    process.env.GROQ_API_KEY || 
    process.env.NEXT_PUBLIC_GROQ_API_KEY || 
    process.env.groq_api_key
  )?.trim();

  const geminiKey = (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY || 
    process.env.GEMINI_API_KEY || 
    process.env.NEXT_PUBLIC_GEMINI_API_KEY
  )?.trim();

  if (groqKey) {
    const groq = createGroq({ apiKey: groqKey });
    return groq(modelOverride || "llama-3.3-70b-versatile");
  }

  if (geminiKey) {
    const google = createGoogleGenerativeAI({ apiKey: geminiKey });
    return google(modelOverride || "gemini-1.5-flash");
  }

  return null;
}

const LENGTH_INSTRUCTIONS: Record<'short' | 'medium' | 'long', string> = {
  short: "Length Mode: SHORT\nRequirement: Provide a 1-paragraph summary consisting of exactly 2-3 concise sentences giving a high-level overview.",
  medium: "Length Mode: MEDIUM\nRequirement: Provide a comprehensive executive summary structured across 2 to 3 informative paragraphs covering key themes, methods, and outcomes.",
  long: "Length Mode: LONG\nRequirement: Provide a detailed, in-depth multi-paragraph analysis covering all major sections, findings, and nuances systematically."
};

export async function generateDocumentSummary(
  text: string, 
  mode: "short" | "medium" | "long",
  systemPrompt: string
): Promise<SummaryResult> {
  const groqKey = (
    process.env.GROQ_API_KEY || 
    process.env.NEXT_PUBLIC_GROQ_API_KEY || 
    process.env.groq_api_key
  )?.trim();

  const geminiKey = (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY || 
    process.env.GEMINI_API_KEY || 
    process.env.NEXT_PUBLIC_GEMINI_API_KEY
  )?.trim();

  if (!groqKey && !geminiKey) {
    throw new Error("No AI API key found. Please configure GROQ_API_KEY in your hosting environment variables.");
  }

  const truncated = text.slice(0, 15000);
  const lengthInstruction = LENGTH_INSTRUCTIONS[mode] || LENGTH_INSTRUCTIONS.medium;

  const prompt = `${systemPrompt}

${lengthInstruction}

Document Text:
${truncated}

Output Format:
Respond ONLY with valid JSON in this exact structure, with no markdown code blocks or additional text:
{
  "summary": "...",
  "keyPoints": [
    "Critical key point 1",
    "Critical key point 2",
    "Critical key point 3"
  ],
  "documentType": "Document Classification (e.g. Technical Lecture Notes, Research Paper, Resume, Invoice, Legal Contract, Financial Report)"
}`;

  const candidateModels = groqKey
    ? ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "gemma2-9b-it"]
    : ["gemini-1.5-flash", "gemini-2.0-flash"];

  let lastError: any = null;

  for (const modelName of candidateModels) {
    try {
      const model = getAiModel(modelName);
      if (!model) continue;

      const { text: rawOutput } = await generateText({
        model,
        prompt,
      });

      // Extract JSON from the response
      let jsonStr = rawOutput.trim();
      const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) {
        jsonStr = fenceMatch[1].trim();
      }
      const jsonStart = jsonStr.indexOf('{');
      const jsonEnd = jsonStr.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        jsonStr = jsonStr.slice(jsonStart, jsonEnd + 1);
      }

      const parsed = JSON.parse(jsonStr);
      return {
        summary: parsed.summary || "Summary generated successfully.",
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
        documentType: parsed.documentType || "General Document"
      };
    } catch (err: any) {
      console.warn(`Model ${modelName} failed, trying next candidate:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error("Failed to generate summary from available AI models.");
}
