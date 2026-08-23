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
    return groq(modelOverride || "openai/gpt-oss-120b");
  }

  if (geminiKey) {
    const google = createGoogleGenerativeAI({ apiKey: geminiKey });
    return google("gemini-1.5-flash");
  }

  return null;
}

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

  const truncated = text.slice(0, 10000);
  const prompt = `${systemPrompt}

Mode: ${mode}

Document Text:
${truncated}

Respond ONLY with valid JSON in this exact format, no other text:
{"summary": "...", "keyPoints": ["point1", "point2", "point3"], "documentType": "..."}`;

  const candidateModels = groqKey
    ? ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.6-27b", "groq/compound-mini"]
    : ["gemini-1.5-flash"];

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
