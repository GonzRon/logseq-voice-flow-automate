// src/lib/prompts.ts - Enhanced prompt management with metadata extraction
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
 * Build an enhanced tasks prompt that extracts metadata AND tasks
 */
export function buildEnhancedTasksPrompt(transcript: string): string {
  return `
You are an intelligent task parser. Analyze the transcript and extract:
1) All actionable tasks
2) Metadata like due dates, priorities, and tags
3) Whether tasks should be hierarchical or flat

IMPORTANT: Look for spoken patterns like:
- "hashtag to do" or "hashtag todo" → means create tasks
- "hashtag due date [date]" or "due date [date]" → extract the date
- "hashtag urgent/high/medium/low" → priority levels
- "hashtag [word]" → project or context tags

Output STRICT JSON:
{
  "metadata": {
    "has_todo_trigger": boolean,  // true if "hashtag todo" or similar found
    "due_date": "string or null",  // e.g., "Monday", "tomorrow", "next Friday"
    "priority": 1-4,  // 1=low, 2=normal, 3=medium, 4=high/urgent
    "tags": ["string"],  // extracted hashtags (without #)
    "mode": "ai" | "literal"  // "ai" is always the default, return "literal" if "hashtag direct" or "hashtag literal" is found.
  },
  "tasks": {
    "parent": {
      "title": "string"  // Short, actionable parent task title (if multiple subtasks)
    } | null,
    "subtasks": [
      {
        "title": "string"  // Individual task title
      }
    ]
  }
}

Rules:
- Extract due dates EXACTLY as spoken (e.g., "Monday", "tomorrow", "next week")
- Don't add due dates to individual subtasks
- Create parent task only if there are multiple related subtasks
- Keep task titles concise and actionable
- Remove control words like "hashtag", "todo", etc. from task titles
- If only one clear action, use parent: null and single subtask

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
    return buildSummarizeJSONPrompt(transcript);
  } else {
    const customPrompt = settings?.taskPrompt;
    if (customPrompt) {
      return customPrompt.replace("<<<NOTE>>>", transcript);
    }
    return buildEnhancedTasksPrompt(transcript);
  }
}