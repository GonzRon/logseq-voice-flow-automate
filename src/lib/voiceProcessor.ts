// src/lib/voiceProcessor.ts - Enhanced voice processing with AI metadata extraction
import "@logseq/libs";
import { whisperTranscribe, generateText } from "./openai";
import { getAudioFileWithReplacement } from "./audioHandler";
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
    // Step 1: Get the audio file (and potentially convert/replace it)
    logseq.App.showMsg("Loading audio file...", "info");
    const audioResult = await getAudioFileWithReplacement(current.content, current.uuid);
    if (!audioResult) {
      return;
    }

    const audioFile = audioResult.file;

    // Log conversion info
    if (audioResult.wasConverted) {
      console.log("[VoiceFlow] Audio was converted from AAC to WebM");
      console.log("[VoiceFlow] Original path:", audioResult.originalPath);
      console.log("[VoiceFlow] Converted path:", audioResult.convertedPath);
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

    // Step 3: Use AI to extract metadata AND tasks in one go
    logseq.App.showMsg("Processing with AI...", "info");

    const taskPrompt = getCustomPrompt('tasks', logseq.settings, transcript);
    const taskResult = await generateText(taskPrompt, {
      apiKey,
      completionEngine: logseq.settings?.["openAICompletionEngine"] || "gpt-4o",
      temperature: 1,
      maxCompletionTokens: 4000,
      completionEndpoint: logseq.settings?.["openAIEndpoint"]
    });

    let taskData: any = null;
    let config: any = {
      createTodo: false,
      useAI: false,
      labels: [],
      priority: 1,
      cleanText: transcript,
      extractedTags: []
    };

    if (taskResult) {
      try {
        taskData = JSON.parse(taskResult);
        console.log("[VoiceFlow] AI extracted data:", taskData);

        // Use AI-extracted metadata
        if (taskData.metadata) {
          config.createTodo = taskData.metadata.has_todo_trigger || false;
          config.useAI = taskData.metadata.mode === 'ai';
          config.priority = taskData.metadata.priority || 1;
          config.dueDate = taskData.metadata.due_date;
          config.extractedTags = (taskData.metadata.tags || []).map((t: string) =>
            t.startsWith('#') ? t : `#${t}`
          );

          // Map project tags if configured
          const projectMappings = logseq.settings?.projectMappings || {};
          for (const tag of config.extractedTags) {
            if (projectMappings[tag]) {
              config.projectId = projectMappings[tag].id;
              config.projectName = projectMappings[tag].name;
              break;
            }
          }
        }
      } catch (e) {
        console.error("[VoiceFlow] Failed to parse AI task data:", e);
        // Fall back to simple defaults
        config.createTodo = transcript.toLowerCase().includes('todo') ||
                           transcript.toLowerCase().includes('to do');
      }
    }

    // Step 4: Generate summary (if AI mode or creating page)
    let summary = null;
    let title = generateNoteLabel();

    if (config.useAI || logseq.settings?.["createTranscriptionPage"] !== false) {
      logseq.App.showMsg("Generating summary...", "info");

      const summarizePrompt = getCustomPrompt('summary', logseq.settings, transcript);
      const summaryResult = await generateText(summarizePrompt, {
        apiKey,
        completionEngine: logseq.settings?.["openAICompletionEngine"] || "gpt-4o",
          temperature: 1,
          maxCompletionTokens: 4000,
        completionEndpoint: logseq.settings?.["openAIEndpoint"]
      });

      if (summaryResult) {
        try {
          const parsed = JSON.parse(summaryResult);
          if (parsed.title) {
            title = parsed.title;
          }
          if (parsed.abstract) {
            summary = parsed.abstract;
          }
        } catch {
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
    let masterTaskTitle: string | undefined;

    if (config.createTodo && taskData?.tasks) {
      // Use the AI-generated parent title if available
      if (taskData.tasks.parent?.title) {
        masterTaskTitle = taskData.tasks.parent.title;
        config.masterTaskTitle = masterTaskTitle;
      }

      // Extract subtask titles
      tasks = (taskData.tasks.subtasks || []).map((t: any) => t.title);

      console.log("[VoiceFlow] Tasks to create:", tasks);
      console.log("[VoiceFlow] Master task:", masterTaskTitle);

      // Create tasks in Todoist if configured
      if (tasks.length > 0) {
        try {
          // For Todoist, only add due date to parent task in AI mode
          const todoistConfig = {
            ...config,
            // Only set due date if we have a master task (hierarchical mode)
            dueDate: masterTaskTitle ? config.dueDate : undefined
          };

          const createdTasks = await createTodoistTasks(tasks, todoistConfig);
          if (createdTasks.length > 0) {
            logseq.App.showMsg(`Created ${createdTasks.length} task(s) in Todoist`, "success");
          }
        } catch (error) {
          console.warn("[VoiceFlow] Todoist integration not available or failed:", error);
        }
      }
    }

    // Step 6: Create enhanced transcription page
    if (logseq.settings?.["createTranscriptionPage"] !== false) {
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
            const freshBlock = await logseq.Editor.getBlock(current.uuid);
            if (freshBlock) {
              const updatedContent = freshBlock.content + "\n" + pageReference;
              await logseq.Editor.updateBlock(freshBlock.uuid, updatedContent);
              console.log(`[VoiceFlow] Added inline page reference: ${pageName}`);
            }
          } else if (referenceMode === "child") {
            await logseq.Editor.insertBlock(current.uuid, pageReference, {
              sibling: false,
              before: false
            });
            console.log(`[VoiceFlow] Added child block with page reference: ${pageName}`);
          }
        } catch (error) {
          console.error("[VoiceFlow] Failed to add page reference:", error);
        }

        logseq.App.showMsg(`✅ Transcribed to: ${pageName}`, "success");

        // Optionally open the created page
        if (logseq.settings?.["autoOpenCreatedPage"]) {
          setTimeout(() => {
            logseq.Editor.openPage(pageName);
          }, 500);
        }
      }
    }

    // Step 7: Clean up audio reference if configured
    if (logseq.settings?.["autoDeleteProcessedAudio"]) {
      const referenceMode = logseq.settings?.["addPageReference"] || "inline";
      if (referenceMode !== "inline") {
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

  await logseq.Editor.editBlock(blockUuid);
  await runVoiceFlow();
}