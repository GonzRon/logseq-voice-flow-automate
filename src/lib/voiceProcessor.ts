// src/lib/voiceProcessor.ts - Main voice processing logic for VoiceFlow Automate
import "@logseq/libs";
import { whisperTranscribe, summarizeText, extractTasks } from "./openai";
import { getAudioFile } from "./audioHandler";
import { parseTags } from "./tagParser";
import { createTodoistTasks } from "./todoistService";
import { createOrUpdateVoicePage } from "./pageCreator";
import { getCustomPrompt, buildSummarizeJSONPrompt, buildTasksJSONPrompt } from "./prompts";

// Prompts are now in prompts.ts

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

    // Step 3: Parse tags and configuration
    const config = parseTags(transcript, logseq.settings);

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
          completionEngine: logseq.settings?.["openAICompletionEngine"] || "gpt-5-nano",
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
    if (config.createTodo) {
      logseq.App.showMsg("Creating tasks...", "info");

      let tasks: string[] = [];

      if (config.useAI) {
        // Use AI to extract tasks with proper prompt
        const taskPrompt = getCustomPrompt('tasks', logseq.settings, config.cleanText);

        const taskData = await extractTasks(
          taskPrompt,
          apiKey,
          {
            completionEngine: logseq.settings?.["openAICompletionEngine"] || "gpt-5-nano",
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
        }
      } else {
        // Use literal text as single task
        tasks = [config.cleanText];
      }

      if (tasks.length > 0) {
        const createdTasks = await createTodoistTasks(tasks, config);
        if (createdTasks.length > 0) {
          logseq.App.showMsg(`Created ${createdTasks.length} task(s) in Todoist`, "success");
        }
      }
    }

    // Step 6: Create transcription page
    if (logseq.settings?.["createTranscriptionPage"] !== false) {
      const pageName = await createOrUpdateVoicePage(title, summary, transcript);
      if (pageName) {
        // Add reference to the new page in current block
        const reference = `[[${pageName}]]`;
        const updatedContent = current.content + "\n" + reference;
        await logseq.Editor.updateBlock(current.uuid, updatedContent);

        logseq.App.showMsg(`✅ Transcribed to: ${pageName}`, "success");

        // Optionally open the created page
        if (logseq.settings?.["autoOpenCreatedPage"]) {
          await logseq.Editor.openPage(pageName);
        }
      }
    }

    // Step 7: Clean up audio reference if configured
    if (logseq.settings?.["autoDeleteProcessedAudio"]) {
      // Remove audio file reference from block
      const cleanedContent = current.content.replace(/!\[.*?\]\(.+\.(aac|mp3|m4a|wav|webm)\)/i, "");
      await logseq.Editor.updateBlock(current.uuid, cleanedContent);
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