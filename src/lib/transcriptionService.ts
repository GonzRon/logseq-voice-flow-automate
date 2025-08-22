/**
 * If you still call this directly elsewhere, it now just calls the model
 * with the object payload by default.
 */
import "@logseq/libs";
const OPENAI_PLUGIN_ID = "_79n711y6e";

export async function transcribeAudio(): Promise<string | null> {
  try {
    const currentBlock = await logseq.Editor.getCurrentBlock();
    if (!currentBlock) {
      logseq.App.showMsg("No block selected", "error");
      return null;
    }
    // quick audio check
    const hasAudio = [".aac", ".mp3", ".m4a", ".wav"].some(ext => currentBlock.content.includes(ext));
    if (!hasAudio) {
      logseq.App.showMsg("No audio file found in the current block", "error");
      return null;
    }

    // ensure ready
    const pong = await logseq.App.invokeExternalPlugin(`${OPENAI_PLUGIN_ID}.models.ping`);
    if (pong !== "pong") {
      logseq.App.showMsg("GPT3-OpenAI plugin not available", "error");
      return null;
    }

    // object payload first
    let out: unknown = await logseq.App.invokeExternalPlugin(
      `${OPENAI_PLUGIN_ID}.models.whisperTranscribeFromBlock`,
      { uuid: currentBlock.uuid }
    );

    // fallback raw
    if (typeof out !== "string" || !out.trim()) {
      out = await logseq.App.invokeExternalPlugin(
        `${OPENAI_PLUGIN_ID}.models.whisperTranscribeFromBlock`,
        currentBlock.uuid
      );
    }

    return (typeof out === "string" && out.trim()) ? out : null;
  } catch (e) {
    console.error("[voiceflow] transcribeAudio error:", e);
    logseq.App.showMsg("Transcription service error", "error");
    return null;
  }
}
