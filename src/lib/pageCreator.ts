// src/lib/pageCreator.ts - Enhanced page creation with task integration
import "@logseq/libs";
import { TodoConfig } from "./tagParser";

interface PageCreationOptions {
  title: string;
  summary: string | null;
  transcript: string;
  config: TodoConfig;
  tasks: string[];
  sourceBlock?: string;
}

/**
 * Create or update a voice transcription page with enhanced content
 */
export async function createEnhancedVoicePage(options: PageCreationOptions): Promise<string | null> {
  try {
    const { title, summary, transcript, config, tasks, sourceBlock } = options;
    const safeTitle = (title || "").trim() || "Untitled Voice Note";

    // Check if page exists
    let page = await logseq.Editor.getPage(safeTitle);

    if (!page) {
      // Create new page with enhanced properties
      const properties: any = {
        "source": "voice-transcription",
        "plugin": "voiceflow-automate",
        "created": new Date().toISOString(),
        "transcription-mode": config.useAI ? "ai" : "literal"
      };

      // Add project info if available
      if (config.projectName) {
        properties["project"] = config.projectName;
      }

      // Add priority if set
      if (config.priority > 1) {
        properties["priority"] = config.priority === 4 ? "high" : config.priority === 3 ? "medium" : "low";
      }

      // Add due date if extracted
      if (config.dueDate) {
        properties["due"] = config.dueDate;
      }

      await logseq.Editor.createPage(
        safeTitle,
        properties,
        { redirect: false, createFirstBlock: false }
      );
      page = await logseq.Editor.getPage(safeTitle);
    }

    if (!page) {
      console.error("[VoiceFlow] Failed to create page");
      return null;
    }

    // Add tags block with extracted tags
    const allTags = ["#voice-note", "#transcription", ...config.extractedTags];
    const uniqueTags = [...new Set(allTags)];
    await logseq.Editor.appendBlockInPage(page.uuid, `tags:: ${uniqueTags.join(" ")}`);

    // Add source reference if available
    if (sourceBlock) {
      await logseq.Editor.appendBlockInPage(page.uuid, `source:: ${sourceBlock}`);
    }

    // Add Summary section if available
    if (summary) {
      const summaryBlock = await logseq.Editor.appendBlockInPage(page.uuid, "## Summary");
      if (summaryBlock) {
        await logseq.Editor.insertBlock(summaryBlock.uuid, summary, {
          sibling: false,
          before: false
        });
      }
    }

    // Add Tasks section if tasks were created
    if (tasks && tasks.length > 0) {
      const tasksBlock = await logseq.Editor.appendBlockInPage(page.uuid, "## Tasks");
      if (tasksBlock) {
        // Add master task if exists
        if (config.masterTaskTitle && config.useAI && tasks.length > 1) {
          const masterBlock = await logseq.Editor.insertBlock(
            tasksBlock.uuid,
            `TODO ${config.masterTaskTitle}${config.dueDate ? ` [${config.dueDate}]` : ''}`,
            { sibling: false, before: false }
          );

          // Add subtasks under master
          if (masterBlock) {
            for (const task of tasks) {
              await logseq.Editor.insertBlock(
                masterBlock.uuid,
                `TODO ${task}`,
                { sibling: false, before: false }
              );
            }
          }
        } else {
          // Add tasks as individual items
          for (const task of tasks) {
            await logseq.Editor.insertBlock(
              tasksBlock.uuid,
              `TODO ${task}${config.dueDate ? ` [${config.dueDate}]` : ''}`,
              { sibling: false, before: false }
            );
          }
        }
      }
    } else if (logseq.settings?.["addTasksSection"]) {
      // Add empty Tasks section if configured
      await logseq.Editor.appendBlockInPage(page.uuid, "## Tasks\n");
    }

    // Add Transcript section
    const transcriptBlock = await logseq.Editor.appendBlockInPage(page.uuid, "## Transcript");
    if (transcriptBlock) {
      // Add transcript in a code block for better formatting
      const transcriptContent = logseq.settings?.["appendTranscriptionTimestamp"]
        ? `${transcript}\n\n_Transcribed at: ${new Date().toLocaleString()}_`
        : transcript;

      await logseq.Editor.insertBlock(transcriptBlock.uuid, transcriptContent, {
        sibling: false,
        before: false
      });
    }

    // Add Notes section for user additions
    await logseq.Editor.appendBlockInPage(page.uuid, "## Notes\n");

    // Add Related section if there are project or context links
    if (config.projectName || config.extractedTags.length > 0) {
      const relatedBlock = await logseq.Editor.appendBlockInPage(page.uuid, "## Related");
      if (relatedBlock && config.projectName) {
        await logseq.Editor.insertBlock(
          relatedBlock.uuid,
          `Project: [[${config.projectName}]]`,
          { sibling: false, before: false }
        );
      }
    }

    console.log(`[VoiceFlow] Created/updated enhanced page: ${safeTitle}`);
    return safeTitle;
  } catch (e) {
    console.error("[VoiceFlow] createEnhancedVoicePage error:", e);
    return null;
  }
}

/**
 * Create or update a simple voice page (backward compatibility)
 */
export async function createOrUpdateVoicePage(
  title: string,
  summary: string | null,
  transcript: string
): Promise<string | null> {
  // Use enhanced version with minimal config
  return createEnhancedVoicePage({
    title,
    summary,
    transcript,
    config: {
      createTodo: false,
      useAI: false,
      labels: [],
      priority: 1,
      cleanText: transcript,
      masterTaskTitle: undefined,
      extractedTags: []
    },
    tasks: [],
    sourceBlock: undefined
  });
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