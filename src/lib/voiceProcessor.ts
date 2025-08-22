// src/lib/voiceProcessor.ts - Enhanced voice processing with full gherkin implementation
import "@logseq/libs";
import { whisperTranscribe, summarizeText, extractTasks } from "./openai";
import { getAudioFile } from "./audioHandler";
import { parseTags } from "./tagParser";
import { createTodoistTasks } from "./todoistService";
import { createEnhancedVoicePage } from "./pageCreator";
import { getCustomPrompt } from "./prompts";

/**
 * Extract title from summary text
 */
function extractTitleFromSummary(summary: string): string {
  if (!summary) return "";
  const match = summary.match(/^\s*Title:\s*(.+)\s*$/m);
  return (match?.[1] ?? "").trim();
}

/**
 * Generate a timestamp-based label for the voice note
 */
function generateNoteLabel(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `Voice Note - ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}${pad(d.getMinutes())}`;
}

/**
 * Main voice flow processing function
 */
export async function runVoiceFlow(): Promise<void> {
  console.log("[VoiceFlow] === Starting voice flow processing ===");

  // Check for API key
  const apiKey = logseq.settings?.["openAIKey"];
  if (!apiKey) {
    logseq.App.showMsg("Please configure your OpenAI API key in plugin settings", "error");
    return;
  }

  // Get current block
  const current = await logseq.Editor.getCurrentBlock();
  if (!current) {
    logseq.App.showMsg("No current block selected", "warning");
    return;
  }

  console.log("[VoiceFlow] Current block UUID:", current.uuid);
  console.log("[VoiceFlow] Block content:", (current.content ?? "").substring(0, 120));

  // Check for audio file
  const hasAudio = [".aac", ".mp3", ".m4a", ".wav", ".webm", ".mp4", ".mpeg", ".mpga"]
    .some(ext => (current.content ?? "").includes(ext));

  if (!hasAudio) {
    logseq.App.showMsg("No audio file found in the current block", "error");
    return;
  }

  try {
    // Step 1: Get the audio file
    logseq.App.showMsg("Loading audio file...", "info");
    const audioFile = await getAudioFile(current.content);
    if (!audioFile) {
      return;
    }

    // Step 2: Transcribe the audio
    logseq.App.showMsg("Transcribing audio...", "info");
    const transcript = await whisperTranscribe(
      audioFile,
      apiKey,
      logseq.settings?.["openAIEndpoint"]
    );

    if (!transcript) {
      logseq.App.showMsg("Transcription failed or returned empty", "error");
      return;
    }

    console.log("[VoiceFlow] Transcription successful, length:", transcript.length);
    console.log("[VoiceFlow] Transcript sample:", transcript.substring(0, 200));

    // Step 3: Parse tags from BOTH transcript AND block content
    const config = parseTags(transcript, current.content, logseq.settings);
    console.log("[VoiceFlow] Parsed config:", config);

    // Step 4: Generate summary (if AI mode or creating page)
    let summary = null;
    let title = generateNoteLabel();

    if (config.useAI || logseq.settings?.["createTranscriptionPage"] !== false) {
      logseq.App.showMsg("Generating summary...", "info");

      // Get the appropriate prompt
      const summarizePrompt = getCustomPrompt('summary', logseq.settings, transcript);

      const summaryResult = await summarizeText(
        transcript,
        summarizePrompt,
        apiKey,
        {
          completionEngine: logseq.settings?.["openAICompletionEngine"] || "gpt-4o",
          temperature: 1,
          maxCompletionTokens: 4000,
          completionEndpoint: logseq.settings?.["openAIEndpoint"]
        }
      );

      if (summaryResult) {
        try {
          // Try to parse as JSON first (if using JSON prompt)
          const parsed = JSON.parse(summaryResult);
          if (parsed.title) {
            title = parsed.title;
          }
          if (parsed.abstract) {
            summary = parsed.abstract;
          }
        } catch {
          // Fallback: extract title from text format
          summary = summaryResult;
          const extractedTitle = extractTitleFromSummary(summaryResult);
          if (extractedTitle) {
            title = extractedTitle;
          }
        }
      }
    }

    // Step 5: Create tasks if needed
    let tasks: string[] = [];

    if (config.createTodo) {
      logseq.App.showMsg("Creating tasks...", "info");

      if (config.useAI) {
        // Use AI to extract tasks with proper prompt
        const taskPrompt = getCustomPrompt('tasks', logseq.settings, config.cleanText);

        const taskData = await extractTasks(
          taskPrompt,
          apiKey,
          {
            completionEngine: logseq.settings?.["openAICompletionEngine"] || "gpt-4o",
            completionEndpoint: logseq.settings?.["openAIEndpoint"]
          }
        );

        if (taskData) {
          // Handle both formats (tasks/subtasks)
          const taskList = taskData.tasks || taskData.subtasks || [];
          tasks = taskList.map((t: any) => t.title);
          if (taskData.parent?.title) {
            config.masterTaskTitle = taskData.parent.title;
          }

          console.log("[VoiceFlow] Extracted tasks:", tasks);
          console.log("[VoiceFlow] Master task:", config.masterTaskTitle);
        }
      } else {
        // Use literal text as single task
        tasks = [config.cleanText];
      }

      // Create tasks in Todoist if configured
      if (tasks.length > 0) {
        try {
          const createdTasks = await createTodoistTasks(tasks, config);
          if (createdTasks.length > 0) {
            logseq.App.showMsg(`Created ${createdTasks.length} task(s) in Todoist`, "success");
          }
        } catch (error) {
          console.warn("[VoiceFlow] Todoist integration not available or failed:", error);
          // Continue - tasks will still be added to the page
        }
      }
    }

    // Step 6: Create enhanced transcription page
    if (logseq.settings?.["createTranscriptionPage"] !== false) {
      // Get current page for source reference
      const currentPage = await logseq.Editor.getCurrentPage();
      const sourceBlock = currentPage?.name ? `[[${currentPage.name}]]` : undefined;

      const pageName = await createEnhancedVoicePage({
        title,
        summary,
        transcript,
        config,
        tasks,
        sourceBlock
      });

      if (pageName) {
        // Add reference to the new page based on settings
        const referenceMode = logseq.settings?.["addPageReference"] || "inline";
        const referenceFormat = logseq.settings?.["pageReferenceFormat"] || "📝 [[{title}]]";
        const pageReference = referenceFormat.replace("{title}", pageName);

        try {
          if (referenceMode === "inline") {
            // Re-fetch the current block to ensure we have the latest content
            const freshBlock = await logseq.Editor.getBlock(current.uuid);
            if (freshBlock) {
              // Add reference inline in the same block
              const updatedContent = freshBlock.content + "\n" + pageReference;
              await logseq.Editor.updateBlock(freshBlock.uuid, updatedContent);
              console.log(`[VoiceFlow] Added inline page reference: ${pageName}`);
            }
          } else if (referenceMode === "child") {
            // Add reference as a child block
            await logseq.Editor.insertBlock(current.uuid, pageReference, {
              sibling: false,
              before: false
            });
            console.log(`[VoiceFlow] Added child block with page reference: ${pageName}`);
          }
          // If "none", don't add any reference
        } catch (error) {
          console.error("[VoiceFlow] Failed to add page reference:", error);
          // Continue anyway - the page was created successfully
        }

        logseq.App.showMsg(`✅ Transcribed to: ${pageName}`, "success");

        // Optionally open the created page
        if (logseq.settings?.["autoOpenCreatedPage"]) {
          setTimeout(() => {
            logseq.Editor.openPage(pageName);
          }, 500); // Small delay to ensure page is fully created
        }
      }
    }

    // Step 7: Clean up audio reference if configured (DISABLED if page reference is added inline)
    if (logseq.settings?.["autoDeleteProcessedAudio"]) {
      const referenceMode = logseq.settings?.["addPageReference"] || "inline";

      // Only delete if we're not adding the reference inline
      if (referenceMode !== "inline") {
        // Re-fetch block and remove audio file reference
        const freshBlock = await logseq.Editor.getBlock(current.uuid);
        if (freshBlock) {
          const cleanedContent = freshBlock.content.replace(/!\[.*?\]\(.+\.(aac|mp3|m4a|wav|webm)\)/i, "");
          await logseq.Editor.updateBlock(freshBlock.uuid, cleanedContent.trim());
          console.log("[VoiceFlow] Removed audio file reference");
        }
      } else {
        console.log("[VoiceFlow] Skipping audio deletion - page reference added inline");
      }
    }

  } catch (error) {
    console.error("[VoiceFlow] Error in voice flow:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Provide helpful error messages
    if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
      logseq.App.showMsg("Invalid OpenAI API key. Please check your settings.", "error");
    } else if (errorMessage.includes("429") || errorMessage.includes("quota")) {
      logseq.App.showMsg("OpenAI API quota exceeded. Please check your usage.", "error");
    } else if (errorMessage.includes("400") || errorMessage.includes("Bad Request")) {
      logseq.App.showMsg("API request error. Please check your settings and try again.", "error");
    } else {
      logseq.App.showMsg(`Error: ${errorMessage}`, "error");
    }
  }
}

/**
 * Process voice note from a specific block
 */
export async function processVoiceNote(blockUuid: string): Promise<void> {
  const block = await logseq.Editor.getBlock(blockUuid);
  if (!block) {
    logseq.App.showMsg("Block not found", "error");
    return;
  }

  // Temporarily set the editing cursor to this block
  await logseq.Editor.editBlock(blockUuid);

  // Run the voice flow
  await runVoiceFlow();
}