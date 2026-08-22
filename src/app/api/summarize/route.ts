import { NextRequest, NextResponse } from "next/server";
import { generateDocumentSummary } from "@/lib/ai/provider";
import { SYSTEM_PROMPTS } from "@/lib/ai/prompts";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { text, mode = "medium" } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }
    
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "AI service is currently unavailable. Please configure GROQ_API_KEY in your hosting environment variables." },
        { status: 503 }
      );
    }

    // Limit text length to prevent context window overflow
    const truncatedText = text.slice(0, 30000);

    const result = await generateDocumentSummary(
      truncatedText, 
      mode as "short" | "medium" | "long", 
      SYSTEM_PROMPTS.summary
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Summarization error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate summary from AI service." }, 
      { status: 500 }
    );
  }
}
