// src/lib/pageCreator.ts
import "@logseq/libs";

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
      // Create new page with property
      await logseq.Editor.createPage(
        safeTitle, 
        { "source": "transcript" },
        { redirect: false, createFirstBlock: false }
      );
      page = await logseq.Editor.getPage(safeTitle);
    }
    
    if (!page) return null;

    // Create Summary as a top-level block
    const summaryContent = `## Summary\n${summary || "_(no summary)_"}`;
    await logseq.Editor.appendBlockInPage(page.uuid, summaryContent);

    // Create Transcript as a SEPARATE top-level block
    const transcriptContent = `## Transcript\n${transcript}`;
    await logseq.Editor.appendBlockInPage(page.uuid, transcriptContent);

    return safeTitle;
  } catch (e) {
    console.error("[voiceflow] createOrUpdateVoicePage error:", e);
    return null;
  }
}