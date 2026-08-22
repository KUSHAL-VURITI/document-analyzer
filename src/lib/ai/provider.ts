import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface SummaryResult {
  summary: string;
  keyPoints: string[];
  documentType: string;
}

export async function generateDocumentSummary(
  text: string, 
  mode: "short" | "medium" | "long",
  systemPrompt: string
): Promise<SummaryResult> {
  // Groq free tier has very tight token limits (8000 total including input+output).
  // We truncate aggressively and use generateText with manual JSON parsing
  // instead of generateObject (which bloats the prompt with schema instructions).
  const truncated = text.slice(0, 4000);

  const { text: rawOutput } = await generateText({
    model: groq("openai/gpt-oss-120b"),
    prompt: `${systemPrompt}

Mode: ${mode}

Document Text:
${truncated}

Respond ONLY with valid JSON in this exact format, no other text:
{"summary": "...", "keyPoints": ["point1", "point2", "point3"], "documentType": "..."}`
  });

  // Extract JSON from the response (model may wrap it in markdown code fences)
  let jsonStr = rawOutput.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }
  // Also handle case where model outputs thinking tags before JSON
  const jsonStart = jsonStr.indexOf('{');
  const jsonEnd = jsonStr.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1) {
    jsonStr = jsonStr.slice(jsonStart, jsonEnd + 1);
  }

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      summary: parsed.summary || "Summary could not be generated.",
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      documentType: parsed.documentType || "General"
    };
  } catch {
    // If JSON parsing fails, return the raw text as a summary
    return {
      summary: rawOutput.slice(0, 1000),
      keyPoints: [],
      documentType: "General"
    };
  }
}
