// src/lib/transcriptionService.ts (VoiceFlow Automate, CALLER)
import "@logseq/libs";

const OPENAI_PLUGIN_ID = "_79n711y6e";

export async function transcribeAudio(): Promise<string | null> {
  try {
    console.log("=== VoiceFlowAutomate: Starting transcription ===");

    const currentBlock = await logseq.Editor.getCurrentBlock();
    if (!currentBlock) {
      console.error("No current block found");
      logseq.App.showMsg("No block selected", "error");
      return null;
    }

    console.log("Current block UUID:", currentBlock.uuid);
    console.log("Block content:", currentBlock.content.substring(0, 100));

    const hasAudio = [".aac", ".mp3", ".m4a", ".wav"].some(ext => currentBlock.content.includes(ext));
    if (!hasAudio) {
      console.error("No audio file found in block");
      logseq.App.showMsg("No audio file found in the current block", "error");
      return null;
    }

    // Ensure callee is available
    try {
      await logseq.App.getExternalPlugin(OPENAI_PLUGIN_ID as any);
      await new Promise(r => setTimeout(r, 0));
    } catch (e) {
      console.warn("getExternalPlugin failed or unavailable:", e);
    }

    // Ping models
    try {
      console.log("Testing GPT3-OpenAI plugin connection (models)...");
      const ping = await logseq.App.invokeExternalPlugin(`${OPENAI_PLUGIN_ID}.models.ping`);
      if (ping !== "pong") throw new Error(String(ping));
      console.log("✅ GPT3-OpenAI plugin connected successfully");
    } catch (err) {
      console.error("Failed to connect to GPT3-OpenAI plugin (models):", err);
      logseq.App.showMsg("GPT3-OpenAI plugin not available", "error");
      return null;
    }

    // Zero-arg transcription
    const result: unknown = await logseq.App.invokeExternalPlugin(
      `${OPENAI_PLUGIN_ID}.models.whisperTranscribeCurrent`
    );

    console.log("[Caller] typeof result:", typeof result);
    const text = typeof result === "string" ? result : "";
    if (!text.trim()) {
      console.error("Transcription failed or returned empty result");
      logseq.App.showMsg("Transcription failed or returned empty result", "error");
      return null;
    }
    return text;
  } catch (error) {
    console.error("Critical error in transcribeAudio:", error);
    logseq.App.showMsg("Transcription service error", "error");
    return null;
  }
}
