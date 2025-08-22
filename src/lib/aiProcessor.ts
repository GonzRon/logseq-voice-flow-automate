import "@logseq/libs";
import { getPrompt } from "./prompts";

/**
 * All interaction with the GPT3-OpenAI plugin models lives here.
 * We default to the { uuid } payload so the bridge won’t drop it;
 * we still keep fallbacks to be robust on different builds.
 */
const OPENAI_PLUGIN_ID = "_79n711y6e";

async function ensureOpenAIReady(): Promise<boolean> {
  try {
    await logseq.App.getExternalPlugin(OPENAI_PLUGIN_ID as any).catch(() => {});
    const pong = await logseq.App.invokeExternalPlugin(`${OPENAI_PLUGIN_ID}.models.ping`);
    return pong === "pong";
  } catch {
    return false;
  }
}

export async function whisperTranscribeFromCurrentOrArgs(): Promise<string | null> {
  const ok = await ensureOpenAIReady();
  if (!ok) {
    logseq.App.showMsg("GPT3-OpenAI plugin not available", "error");
    return null;
  }

  // Prefer current block UUID (we own the outer flow)
  const current = await logseq.Editor.getCurrentBlock();
  const uuid = current?.uuid;
  if (!uuid) {
    logseq.App.showMsg("No current block", "warning");
    return null;
  }

  // Primary: object payload (structured-clone friendly)
  let result: unknown = await logseq.App.invokeExternalPlugin(
    `${OPENAI_PLUGIN_ID}.models.whisperTranscribeFromBlock`,
    { uuid }
  );

  // Fallback 1: raw UUID (some builds do accept it)
  if (typeof result !== "string" || !result.trim()) {
    result = await logseq.App.invokeExternalPlugin(
      `${OPENAI_PLUGIN_ID}.models.whisperTranscribeFromBlock`,
      uuid
    );
  }

  // If the model still fell back internally, it may still return a good string.
  if (typeof result === "string" && result.trim()) return result;
  logseq.App.showMsg("Transcription failed or returned empty result", "error");
  return null;
}

export async function processTextWithPrompt(promptKeyOrText: string, text: string): Promise<string | null> {
  const ok = await ensureOpenAIReady();
  if (!ok) {
    logseq.App.showMsg("GPT3-OpenAI plugin not available", "error");
    return null;
  }
  const p = getPrompt(promptKeyOrText);
  try {
    const out = await logseq.App.invokeExternalPlugin(
      `${OPENAI_PLUGIN_ID}.models.processText`,
      p.prompt,
      text
    );
    if (typeof out === "string" && out.trim()) return out;
    return null;
  } catch (e) {
    console.error("[voiceflow] processTextWithPrompt error:", e);
    return null;
  }
}

/**
 * Extract a Title line from the summarizer output:
 * expects:
 *   Title: <title>
 *   Summary:
 *   - ...
 */
export function extractTitleFromSummary(summary: string): string {
  if (!summary) return "";
  const m = summary.match(/^\s*Title:\s*(.+)\s*$/m);
  return (m?.[1] ?? "").trim();
}
