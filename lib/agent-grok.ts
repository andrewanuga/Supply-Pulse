// ─── Groq (Llama 3.3 70B) agent — automatic fallback for the Gemini agent ──────
// Invoked by runAgentTurn() in lib/agent.ts when Gemini fails (quota, billing,
// network error, etc.). Uses the same system prompt, tool definitions, and tool
// dispatcher — only the LLM call differs.
//
// Groq's API is OpenAI-compatible, so we use the openai-style format.

import Groq from "groq-sdk";
import type { AgentResponse } from "./types";
import { tools, SYSTEM_PROMPT, dispatchTool, detectPhase } from "./agent";

const GROQ_MODEL = "llama-3.3-70b-versatile";

export async function runGroqTurn(
  userMessage: string,
  history: Array<{ role: string; parts: Array<{ text: string }> }>
): Promise<AgentResponse> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set — cannot run the Groq fallback agent.");
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  // Convert Gemini-format history → OpenAI/Groq format
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((h) => ({
      role: h.role === "model" ? "assistant" : h.role,
      content: h.parts.map((p) => p.text).join(""),
    })),
    { role: "user", content: userMessage },
  ];

  let mapsWasUsed = false;

  // Agentic loop — keep going until Groq stops requesting tool calls
  for (let i = 0; i < 8; i++) {
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: tools as any,
      tool_choice: "auto",
      temperature: 0.3,
      max_tokens: 2048,
    });

    const msg = response.choices[0].message;
    messages.push(msg);

    // No tool calls — final text response
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      const text = msg.content || "";
      return { message: text, phase: detectPhase(text), mapsUsed: mapsWasUsed };
    }

    // Execute all tool calls and push results
    for (const tc of msg.tool_calls) {
      if (tc.function.name === "maps_search_suppliers") mapsWasUsed = true;

      let result: unknown;
      try {
        const args = JSON.parse(tc.function.arguments || "{}");
        result = await dispatchTool(tc.function.name, args);
      } catch (err) {
        result = { error: String(err) };
      }

      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      });
    }
  }

  return {
    message: "I've completed the analysis. Please check the dashboard for results.",
    phase: "verify",
    mapsUsed: mapsWasUsed,
  };
}

// Keep the old export name so the import in agent.ts keeps working
export { runGroqTurn as runGrokTurn };
