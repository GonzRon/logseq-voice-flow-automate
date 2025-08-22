// src/lib/voiceProcessor.ts
import "@logseq/libs";
import {
  whisperTranscribeFromCurrentOrArgs,
  processTextWithPrompt,
  extractTitleFromSummary,
} from "./aiProcessor";
// NOTE: removed getPrompt import (was unused)
import { createOrUpdateVoicePage } from "./pageCreator";
import { createTodoistTasks } from "./todoistService";

/** Minimal shape your Todoist service expects (deduced from TS errors) */
type TodoConfig = {
  createTodo: boolean;
  useAI: boolean;
  labels: string[];   // we’ll pass project tags here
  priority: number;   // 1..4; pick 1 as a neutral default
  cleanText: string;  // payload text your service will process
};

/** Local, minimal tag parser to avoid import/type drift */
function parseTagsLocally(transcript: string): {
  hasTodo: boolean;
  mode: "ai" | "direct";
  projectTags: string[];
  cleanedText: string;
} {
  const tagRe = /(^|\s)#([a-zA-Z0-9_\-]+)/g;
  const tags: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(transcript))) {
    tags.push(m[2].toLowerCase());
  }

  const hasTodo = tags.includes("todo");
  // last-one-wins between #ai and #direct
  let mode: "ai" | "direct" = "ai";
  for (const t of tags) {
    if (t === "ai") mode = "ai";
    if (t === "direct") mode = "direct";
  }

  // crude “project tag” heuristic — keep everything except control tags
  const control = new Set(["todo", "ai", "direct"]);
  const projectTags = tags.filter((t) => !control.has(t));

  // remove hashtags from the visible text
  const cleanedText = transcript.replace(tagRe, " ").replace(/\s+/g, " ").trim();

  return { hasTodo, mode, projectTags, cleanedText };
}

/** Fallback title if we couldn’t extract one from the summary */
function defaultTitleFromNow(): string {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  return `Voice Note ${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

/**
 * Main flow:
 * 1) Transcribe current block (Whisper via OpenAI plugin model).
 * 2) Summarize → extract Title.
 * 3) Create/update page named by Title; write summary + transcript.
 * 4) Parse tags and call Todoist service once with a TodoConfig.
 */
export async function runVoiceFlow(): Promise<void> {
  console.log("=== VoiceFlowAutomate: Starting transcription ===");

  // 1) Transcribe
  const transcript = await whisperTranscribeFromCurrentOrArgs();
  if (!transcript) return;

  // 2) Summarize
  const summaryText = await processTextWithPrompt("voiceflow.summarize", transcript);
  const title = extractTitleFromSummary(summaryText || "") || defaultTitleFromNow();

  // 3) Create page with SEPARATE summary and transcript
  const pageTitle = await createOrUpdateVoicePage(title, summaryText, transcript);

  if (!pageTitle) {
    logseq.App.showMsg("Failed to create/update the page", "error");
    return;
  }

  // Add backlink
  try {
    const b = await logseq.Editor.getCurrentBlock();
    if (b) {
      await logseq.Editor.insertBlock(b.uuid, `📄 [[${pageTitle}]]`, { sibling: false });
    }
  } catch (e) {
    console.warn("[voiceflow] backlink insert skipped:", e);
  }


  // --- 4) Task generation logic based on tags ---
  const { hasTodo, mode, projectTags, cleanedText } = parseTagsLocally(transcript);

  if (!hasTodo) {
    const b = await logseq.Editor.getCurrentBlock();
    if (b) {
      await logseq.Editor.insertBlock(
        b.uuid,
        "✅ No #todo tag found — skipping Todoist task creation.",
        { sibling: false }
      );
    }
    return;
  }

  // Build TodoConfig for your service
  let config: TodoConfig;

  if (mode === "direct") {
    // literal transcription → single task
    const directTitle = cleanedText || title;
    config = {
      createTodo: true,
      useAI: false,
      labels: projectTags,     // route by tags if your service maps labels→projects
      priority: 1,
      cleanText: directTitle,  // your service can use this as the task text
    };
  } else {
    // AI tasking: feed the cleaned text; the service’s `useAI: true` can branch internally
    // (If your service wants a JSON payload instead, you can pass JSON.stringify here.)
    config = {
      createTodo: true,
      useAI: true,
      labels: projectTags,
      priority: 1,
      cleanText: cleanedText || transcript,
    };
  }

  // IMPORTANT: your service signature is (projectTags: string[], config: TodoConfig)
  // and returns an array of created IDs.
  const ids: string[] = await createTodoistTasks(projectTags, config);
  const createdCount = Array.isArray(ids) ? ids.length : 0;

  const b = await logseq.Editor.getCurrentBlock();
  if (b) {
    await logseq.Editor.insertBlock(
      b.uuid,
      `✅ Created ${createdCount} task(s) in Todoist`,
      { sibling: false }
    );
  }
}
