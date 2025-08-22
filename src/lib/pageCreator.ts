// src/lib/pageCreator.ts - Page creation utilities for VoiceFlow Automate
import "@logseq/libs";

/**
 * Create or update a voice transcription page
 */
export async function createOrUpdateVoicePage(
  title: string,
  summary: string | null,
  transcript: string
): Promise<string | null> {
  try {
    const safeTitle = (title || "").trim() || "Untitled Voice Note";

    // Check if page exists
    let page = await logseq.Editor.getPage(safeTitle);

    if (!page) {
      // Create new page with properties
      await logseq.Editor.createPage(
        safeTitle,
        {
          "source": "voice-transcription",
          "plugin": "voiceflow-automate",
          "created": new Date().toISOString()
        },
        { redirect: false, createFirstBlock: false }
      );
      page = await logseq.Editor.getPage(safeTitle);
    }

    if (!page) {
      console.error("[VoiceFlow] Failed to create page");
      return null;
    }

    // Add tags block
    const tags = "#voice-note #transcription";
    await logseq.Editor.appendBlockInPage(page.uuid, `tags:: ${tags}`);

    // Add Summary section if available
    if (summary) {
      const summaryContent = `## Summary\n${summary}`;
      await logseq.Editor.appendBlockInPage(page.uuid, summaryContent);
    }

    // Add Transcript section
    const transcriptContent = `## Transcript\n${transcript}`;
    await logseq.Editor.appendBlockInPage(page.uuid, transcriptContent);

    // Add Notes section for user additions
    await logseq.Editor.appendBlockInPage(page.uuid, "## Notes\n");

    // Add Tasks section if configured
    if (logseq.settings?.["addTasksSection"]) {
      await logseq.Editor.appendBlockInPage(page.uuid, "## Tasks\n");
    }

    console.log(`[VoiceFlow] Created/updated page: ${safeTitle}`);
    return safeTitle;
  } catch (e) {
    console.error("[VoiceFlow] createOrUpdateVoicePage error:", e);
    return null;
  }
}

/**
 * Create a simple transcription block
 */
export async function createTranscriptionBlock(
  blockUuid: string,
  transcript: string,
  summary?: string
): Promise<void> {
  try {
    let content = transcript;

    if (summary) {
      content = `**Summary:** ${summary}\n\n**Transcript:** ${transcript}`;
    }

    if (logseq.settings?.["appendTranscriptionTimestamp"]) {
      const timestamp = new Date().toLocaleString();
      content = `${content}\n\n_Transcribed at: ${timestamp}_`;
    }

    await logseq.Editor.insertBlock(blockUuid, content, {
      sibling: false,
    });
  } catch (e) {
    console.error("[VoiceFlow] createTranscriptionBlock error:", e);
  }
}