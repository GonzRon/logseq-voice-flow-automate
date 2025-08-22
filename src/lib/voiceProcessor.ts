// src/lib/voiceProcessor.ts (VoiceFlow Automate, CALLER)
import "@logseq/libs";
import { transcribeCurrentBlock, summarizeTranscript, extractTitleFromSummary } from "./aiProcessor";

function nowLabel(): string {
  // e.g., "Voice Note - 2025-08-22 1133"
  const d = new Date();
  const pad = (n:number)=> String(n).padStart(2,"0");
  return `Voice Note - ${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export async function runVoiceFlow(): Promise<void> {
  console.log("=== VoiceFlowAutomate: Starting transcription ===");

  const current = await logseq.Editor.getCurrentBlock();
  if (!current) {
    logseq.App.showMsg("No current block", "warning");
    return;
  }
  console.log("Current block UUID:", current.uuid);
  console.log("Block content:", (current.content ?? "").substring(0, 120));

  // Quick guard: ensure block has an audio link
  const hasAudio = [".aac", ".mp3", ".m4a", ".wav"].some(ext => (current.content ?? "").includes(ext));
  if (!hasAudio) {
    logseq.App.showMsg("No audio file found in the current block", "error");
    return;
  }

  // 1) Transcribe (zero-arg)
  const transcript = await transcribeCurrentBlock();
  if (!transcript) return;

  // 2) Summarize (primitive key, fallback to JSON-string one-shot)
  const promptKey = "voiceflow.summarize";
  const summary = await summarizeTranscript(promptKey, transcript);
  if (!summary) return;

  // 3) Persist to a page
  const pageName = nowLabel();
  const title = extractTitleFromSummary(summary) || pageName;

  await logseq.Editor.createPage(pageName, {}, { redirect: false, createFirstBlock: true });
  await logseq.Editor.appendBlockInPage(pageName, `Title: ${title}`);
  await logseq.Editor.appendBlockInPage(pageName, "Summary:");
  await logseq.Editor.appendBlockInPage(pageName, summary);

  logseq.App.showMsg(`Transcribed & summarized → ${pageName}`, "success");
}
