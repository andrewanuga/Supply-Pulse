// ─── Grok (xAI) agent — automatic fallback for the Gemini agent ───────────────
// xAI's API is OpenAI-compatible (https://api.x.ai/v1), so the same OpenAI-style
// tool definitions, system prompt, and tool dispatcher from lib/agent.ts are reused
// verbatim. This module is only invoked by runAgentTurn() when Gemini fails and
// XAI_API_KEY is set.

import type { AgentResponse } from "./types";
import { tools, SYSTEM_PROMPT, dispatchTool, detectPhase } from "./agent";

const XAI_BASE_URL = "https://api.x.ai/v1";
// grok-4.3 is the current flagship. Older slugs (grok-3, grok-4) redirect to it.
// Override with GROK_MODEL in .env.local if you have access to a specific model.
const GROK_MODEL = process.env.GROK_MODEL || "grok-4.3";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChatMessage = any;

export async function runGrokTurn(
  userMessage: string,
  history: Array<{ role: string; parts: Array<{ text: string }> }>
): Promise<AgentResponse> {
  if (!process.env.XAI_API_KEY) {
    throw new Error("XAI_API_KEY is not set — cannot run the Grok fallback agent.");
  }

  // Convert history from Gemini format ({ role, parts:[{text}] }) to OpenAI/Grok format
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((h) => ({
      role: h.role === "model" ? "assistant" : h.role,
      content: h.parts.map((p) => p.text).join(""),
    })),
    { role: "user", content: userMessage },
  ];

  let mapsWasUsed = false;

  // Agentic loop — keep going until Grok stops requesting tool calls
  for (let i = 0; i < 8; i++) {
    const res = await fetch(`${XAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROK_MODEL,
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.3,
        // Reasoning models (e.g. grok-4.x) require max_completion_tokens, not max_tokens
        max_completion_tokens: 2048,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Grok API error ${res.status}: ${body}`);
    }

    const data = await res.json();
    const msg = data.choices?.[0]?.message;
    if (!msg) throw new Error("Grok API returned no message");

    // Push assistant message (with any tool_calls) into history
    messages.push(msg);

    // No tool calls — final text response
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      const text = msg.content || "";
      return { message: text, phase: detectPhase(text), mapsUsed: mapsWasUsed };
    }

    // Execute all tool calls and push results
    for (const tc of msg.tool_calls) {
      if (tc.type && tc.type !== "function") continue;
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
