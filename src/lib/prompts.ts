/**
 * Minimal prompts loader for VoiceFlow Automate.
 * - No ?raw import (avoids Vite/TSC errors); embed sane defaults.
 * - You can later add TOML parsing if you want—this compiles cleanly now.
 */

export type PromptMap = Record<string, { prompt: string; temperature?: number }>;

const DEFAULT_PROMPTS: PromptMap = {
  "voiceflow.summarize": {
    prompt:
`You are an expert meeting/voice-note summarizer.
Summarize the transcript into:
1) Title: a concise, specific, useful title (<= 10 words).
2) Summary: 3–6 bullet points capturing the core ideas and decisions.
3) Key tags: 3–8 #tags that naturally describe topics.

Format STRICTLY as:
Title: <title>
Summary:
- <bullet>
- <bullet>
Tags: #tag1 #tag2 #tag3`,
    temperature: 0.2,
  },

  "voiceflow.todo-ai": {
    prompt:
`You convert a voice note into Todoist tasks based on these rules:

- If the note implies a single clear action, return a single task.
- If there are multiple actions, create ONE parent task (a short project-style title)
  then 2–8 balanced, concrete subtasks (not too tiny, not too vague).
- Do NOT include hashtags in task text.
- If dates are mentioned, extract them in natural language (e.g., "tomorrow", "next Friday", or "January 15, 2026").

Return STRICT JSON with this schema:
{
  "mode": "single" | "hierarchy",
  "parent": { "title": "<string>" } | null,
  "tasks": [
    { "title": "<string>", "due": "<string|null>" }
  ]
}

Only output JSON, no commentary.`,
    temperature: 0.2,
  },
};

export function getPrompt(keyOrText: string): { prompt: string; temperature?: number } {
  const k = keyOrText?.trim();
  if (!k) return { prompt: "" };

  // If caller passed a known key, return that
  if (DEFAULT_PROMPTS[k]) return DEFAULT_PROMPTS[k];

  // Otherwise, treat the input as a literal prompt
  return { prompt: k };
}

// Optional helper if you want simple {{var}} substitution without replaceAll
export function fillPrompt(template: string, vars: Record<string, string>): string {
  let out = template || "";
  for (const [k, v] of Object.entries(vars || {})) {
    // replace all {{k}} with v (global)
    const re = new RegExp(`\\{\\{\\s*${escapeRegExp(k)}\\s*\\}\\}`, "g");
    out = out.replace(re, v);
  }
  return out;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
