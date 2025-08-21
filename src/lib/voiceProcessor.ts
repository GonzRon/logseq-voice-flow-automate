import { BlockEntity } from '@logseq/libs/dist/LSPlugin.user'
import { transcribeAudio } from './transcriptionService'
import { parseTags, TodoConfig } from './tagParser'
import { createTodoistTasks } from './todoistService'
import { processWithAI, generateTitle, generateSummary } from './aiProcessor'
import { createTranscriptionPage, addTasksToPage } from './pageCreator'

export async function processVoiceNote(block: BlockEntity) {
  const settings = logseq.settings as any

  // Step 1: Transcribe audio using gpt3-openai plugin
  const transcription = await transcribeAudio(block.content)

  if (!transcription) {
    throw new Error('Failed to transcribe audio')
  }

  // Step 2: Parse tags and configuration from transcription
  const config = parseTags(transcription, settings)

  let pageRef: string | null = null
  let aiTitle = ''
  let aiSummary = ''

  // Step 3: Create page if enabled in settings
  if (settings?.createTranscriptionPage !== false) {
    // Generate AI title and summary
    aiTitle = await generateTitle(transcription, settings)
    aiSummary = await generateSummary(transcription, settings)

    // Create new page with transcription and summary
    pageRef = await createTranscriptionPage({
      title: aiTitle,
      transcription: transcription,
      summary: aiSummary,
      parentBlock: block
    })
  }

  // Step 4: Process tasks if todo tag found
  if (!config.createTodo) {
    // Add page reference or transcription to the original block
    if (pageRef) {
      await logseq.Editor.insertBlock(block.uuid, `**${aiTitle}**`, {
        sibling: false
      })
      await logseq.Editor.insertBlock(block.uuid, `📄 [[${aiTitle}]]`, {
        sibling: false
      })

      // Auto-open the created page if configured
      if (settings?.autoOpenCreatedPage) {
        await logseq.Editor.scrollToBlockInPage(pageRef)
      }
    } else {
      await logseq.Editor.insertBlock(block.uuid, `Transcription: ${config.cleanText}`, {
        sibling: false
      })
    }
    return
  }

  // Step 5: Process text based on configuration for todos
  let processedText = config.cleanText
  let tasks: string[] = []

  if (config.useAI) {
    // Use AI to process and extract tasks
    const aiResult = await processWithAI(config.cleanText, settings)
    tasks = aiResult.tasks
    processedText = aiResult.summary || config.cleanText
  } else {
    // Use literal transcription
    tasks = [config.cleanText]
  }

  // Step 6: Create tasks in Todoist
  const createdTasks = await createTodoistTasks(tasks, config)

  // Step 7: Add tasks to the created page if it exists
  if (pageRef && createdTasks.length > 0) {
    await addTasksToPage(pageRef, tasks, createdTasks, config)
  }

  // Step 8: Update Logseq block with results and page reference
  if (pageRef) {
    await updateBlockWithResults(block, aiTitle, pageRef, createdTasks, config)

    // Auto-open the created page if configured
    if (settings?.autoOpenCreatedPage) {
      await logseq.Editor.scrollToBlockInPage(pageRef)
    }
  } else {
    await updateBlockWithSimpleResults(block, transcription, processedText, createdTasks, config)
  }
}

async function updateBlockWithSimpleResults(
  block: BlockEntity,
  transcription: string,
  processedText: string,
  createdTasks: any[],
  config: TodoConfig
) {
  const results = [
    `**Transcription:** ${transcription}`,
    `**Processed:** ${processedText}`,
    `✅ Created ${createdTasks.length} task(s) in Todoist`
  ]

  if (config.projectName) {
    results.push(`📁 Project: ${config.projectName}`)
  }

  if (config.dueDate) {
    results.push(`📅 Due: ${config.dueDate}`)
  }

  // Insert results as child blocks
  for (const result of results) {
    await logseq.Editor.insertBlock(block.uuid, result, {
      sibling: false
    })
  }
}

async function updateBlockWithResults(
  block: BlockEntity,
  pageTitle: string,
  pageRef: string,
  createdTasks: any[],
  config: TodoConfig
) {
  const results = [
    `**${pageTitle}**`,
    `📄 [[${pageTitle}]]`,
    `✅ Created ${createdTasks.length} task(s) in Todoist`
  ]

  if (config.projectName) {
    results.push(`📁 Project: ${config.projectName}`)
  }

  if (config.dueDate) {
    results.push(`📅 Due: ${config.dueDate}`)
  }

  // Insert results as child blocks
  for (const result of results) {
    await logseq.Editor.insertBlock(block.uuid, result, {
      sibling: false
    })
  }
}