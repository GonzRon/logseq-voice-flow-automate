import "@logseq/libs";

/**
 * Create (or update) a page whose title comes from the transcript summary.
 * Ensures we create ONE page, and we don’t leave behind “Voice Note - date” pages.
 */
export async function createOrUpdateVoicePage(title: string, content: string): Promise<string | null> {
  try {
    const safeTitle = (title || "").trim() || "Untitled Voice Note";
    // If page exists, append; else create.
    const page = await logseq.Editor.getPage(safeTitle);
    if (!page) {
      await logseq.Editor.createPage(safeTitle, { "voiceflow/source": "transcript" }, { redirect: false, createFirstBlock: true });
    }
    const created = await logseq.Editor.getPage(safeTitle);
    if (!created) return null;

    // Write the content into the page (append as a block)
    await logseq.Editor.appendBlockInPage(created.uuid, content);
    return safeTitle;
  } catch (e) {
    console.error("[voiceflow] createOrUpdateVoicePage error:", e);
    return null;
  }
}
