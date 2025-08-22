// src/lib/aiProcessor.ts (VoiceFlow Automate, CALLER)
import "@logseq/libs";

const OPENAI_PLUGIN_ID = "_79n711y6e"; // GPT3-OpenAI callee

async function ensureOpenAIReady(): Promise<boolean> {
  try {
    await logseq.App.getExternalPlugin(OPENAI_PLUGIN_ID as any).catch(() => {});
    const pong = await logseq.App.invokeExternalPlugin(`${OPENAI_PLUGIN_ID}.models.ping`);
    return pong === "pong";
  } catch {
    return false;
  }
}

export async function transcribeCurrentBlock(): Promise<string | null> {
  const ok = await ensureOpenAIReady();
  if (!ok) {
    logseq.App.showMsg("GPT3-OpenAI plugin not available", "error");
    return null;
  }

  // Zero-arg: no payload to drop
  const result: unknown = await logseq.App.invokeExternalPlugin(
    `${OPENAI_PLUGIN_ID}.models.whisperTranscribeCurrent`
  );

  if (typeof result === "string" && result.trim()) {
    console.log("[voiceflow] Transcription successful, length:", result.length);
    return result;
  }
  logseq.App.showMsg("Transcription failed or returned empty result", "error");
  return null;
}

/**
 * Prefer the zero-arg + primitive summarizer.
 * If needed, fallback to a single JSON-string payload call.
 */
export async function summarizeTranscript(promptKeyOrText: string, transcript?: string): Promise<string | null> {
  const ok = await ensureOpenAIReady();
  if (!ok) {
    logseq.App.showMsg("GPT3-OpenAI plugin not available", "error");
    return null;
  }

  // Preferred: primitive only (callee uses cached _lastTranscript)
  try {
    console.log("[voiceflow] Summarizing cached transcript with key:", promptKeyOrText);
    const out = await logseq.App.invokeExternalPlugin(
      `${OPENAI_PLUGIN_ID}.models.summarizeLastTranscriptWithPromptKey`,
      String(promptKeyOrText) // primitive survives
    );
    if (typeof out === "string" && out.trim()) return out;
    console.warn("[voiceflow] summarizeLastTranscriptWithPromptKey returned empty");
  } catch (e) {
    console.warn("[voiceflow] summarizeLastTranscriptWithPromptKey error:", e);
  }

  // Fallback: single JSON string payload to processTextWithPrompt
  if (typeof transcript === "string" && transcript.trim()) {
    try {
      const isKey = promptKeyOrText.includes(".") || promptKeyOrText.length < 50;
      const payload = isKey
        ? JSON.stringify({ text: transcript, promptKey: promptKeyOrText })
        : JSON.stringify({ text: transcript, customPrompt: promptKeyOrText });

      console.log("[voiceflow] Fallback summarization via JSON-string payload");
      const out2 = await logseq.App.invokeExternalPlugin(
        `${OPENAI_PLUGIN_ID}.models.processTextWithPrompt`,
        payload
      );
      if (typeof out2 === "string" && out2.trim()) return out2;
    } catch (e) {
      console.error("[voiceflow] Fallback processTextWithPrompt error:", e);
    }
  }

  logseq.App.showMsg("Summarization failed", "error");
  return null;
}

export function extractTitleFromSummary(summary: string): string {
  if (!summary) return "";
  const m = summary.match(/^\s*Title:\s*(.+)\s*$/m);
  return (m?.[1] ?? "").trim();
}
