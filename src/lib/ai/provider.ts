import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export interface SummaryResult {
  summary: string;
  keyPoints: string[];
  documentType: string;
}

export function getAiModel() {
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const geminiKey = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY)?.trim();

  if (groqKey) {
    const groq = createGroq({ apiKey: groqKey });
    return groq("llama-3.3-70b-versatile");
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
  const model = getAiModel();
  if (!model) {
    throw new Error("No AI API key found. Please configure GROQ_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY in your hosting environment variables.");
  }

  const truncated = text.slice(0, 10000);

  const { text: rawOutput } = await generateText({
    model,
    prompt: `${systemPrompt}

Mode: ${mode}

Document Text:
${truncated}

Respond ONLY with valid JSON in this exact format, no other text:
{"summary": "...", "keyPoints": ["point1", "point2", "point3"], "documentType": "..."}`
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
    summary: parsed.summary || "Summary could not be generated.",
    keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
    documentType: parsed.documentType || "General Document"
  };
}
