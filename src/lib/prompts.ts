// src/lib/prompts.ts - Prompt management for VoiceFlow Automate
import toml from "toml";
import promptsToml from "./prompts.toml?raw";

interface PromptConfig {
  voiceflow_summarize?: string;
  voiceflow_tasks?: string;
}

// Parse TOML prompts
let tomlPrompts: PromptConfig = {};
try {
  tomlPrompts = toml.parse(promptsToml);
} catch (e) {
  console.warn("[VoiceFlow] Failed to parse prompts.toml, using defaults");
}

/**
 * Build a summarization prompt using TOML template or fallback
 */
export function buildSummarizePrompt(transcript: string): string {
  // Try to use TOML prompt first
  if (tomlPrompts.voiceflow_summarize) {
    return tomlPrompts.voiceflow_summarize.replace("<<<TRANSCRIPT>>>", transcript);
  }

  // Fallback to hardcoded prompt
  return `
You are a helpful note summarizer.
Given the transcript below, produce:

1) A single-line Title (concise, proper case) prefixed exactly with 'Title: '.
2) A 3–6 bullet Summary (succinct, factual).
3) Key Tags as a comma-separated list prefixed with 'Tags: ' (optional).

Rules:
- Do NOT include the #todo or control hashtags in the output.
- Keep Title under 80 characters.
- Keep bullets short; no fluff.

Transcript:
${transcript}
`.trim();
}

/**
 * Build a strict-JSON summarization prompt that returns:
 * { "title": string, "abstract": string }
 */
export function buildSummarizeJSONPrompt(transcript: string): string {
  return `
You are a note summarizer. Given a raw transcript, produce:
1) a short, specific title suitable for a filename and page title,
2) a clear 2–5 sentence abstract that captures the core intent and outcomes.

Rules:
- Title: <= 70 chars, filesystem-safe (no / \\ : * ? " < > |), no quotes.
- Abstract: brief, concrete, no filler.
- Do NOT include control hashtags (e.g., #todo, #ai, #direct).
- Output STRICT JSON only.

JSON schema:
{
  "title": "string (<=70 chars, filesystem-safe)",
  "abstract": "string (2–5 sentences)"
}

Return ONLY valid JSON. No explanations.

TRANSCRIPT:
<<<
${transcript}
>>>
`.trim();
}

/**
 * Build a tasks extraction prompt using TOML template or fallback
 */
export function buildTasksPrompt(transcript: string): string {
  // Try to use TOML prompt first
  if (tomlPrompts.voiceflow_tasks) {
    return tomlPrompts.voiceflow_tasks.replace("<<<NOTE>>>", transcript);
  }

  // Fallback to hardcoded prompt
  return `
You turn a short note into Todoist-ready tasks.

Output JSON ONLY, with this shape:
{
  "parent": { "title": "Master task title (if needed)" } | null,
  "tasks": [
     { "title": "Actionable task", "due": "optional natural date", "projectTag": "optional mapped tag" }
  ]
}

Guidelines:
- Create a small, balanced set of tasks (3–7 usually). Not too granular; not too vague.
- If it's a single clear action, prefer one task and parent=null.
- If multiple coherent actions: use a short parent summary and place the actions in tasks[].
- Remove control hashtags like #todo, #ai, #direct and project tags from task titles.
- Due dates: infer reasonable due phrases only if user said something like 'tomorrow', 'next Friday', 'in two weeks'.
- Do NOT invent deadlines that weren't implied.

Now convert this note:
${transcript}
`.trim();
}

/**
 * Build a strict-JSON tasks prompt
 */
export function buildTasksJSONPrompt(transcript: string): string {
  return `
You turn a short note into Todoist-ready tasks.

Output STRICT JSON ONLY:
{
  "parent": { "title": "Master task title (if needed)", "due_date": "YYYY-MM-DD or null" } | null,
  "subtasks": [
     { "title": "Actionable task", "due_date": "YYYY-MM-DD or null" }
  ]
}

Guidelines:
- 2–8 concrete tasks when there are multiple actions; a single task if only one clear action exists.
- Remove control hashtags (#todo, #ai, #direct, project tags) from titles.
- Infer due dates only if clearly stated ("tomorrow", "next Friday"); otherwise null.
- Do NOT invent dates.

Return ONLY valid JSON. No explanations.

TRANSCRIPT:
<<<
${transcript}
>>>
`.trim();
}

/**
 * Get a custom prompt from settings or use default
 */
export function getCustomPrompt(
  type: 'summary' | 'tasks',
  settings: any,
  transcript: string
): string {
  if (type === 'summary') {
    const customPrompt = settings?.aiPrompt;
    if (customPrompt) {
      return customPrompt.replace("<<<TRANSCRIPT>>>", transcript);
    }
    // Use JSON prompt for better structured output
    return buildSummarizeJSONPrompt(transcript);
  } else {
    const customPrompt = settings?.taskPrompt;
    if (customPrompt) {
      return customPrompt.replace("<<<NOTE>>>", transcript);
    }
    return buildTasksJSONPrompt(transcript);
  }
}