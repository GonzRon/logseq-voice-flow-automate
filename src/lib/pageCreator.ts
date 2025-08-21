import { BlockEntity } from '@logseq/libs/dist/LSPlugin.user'

export interface PageCreationOptions {
  title: string
  transcription: string
  summary: string
  parentBlock: BlockEntity
}

export async function createTranscriptionPage(options: PageCreationOptions): Promise {
  const { title, transcription, summary, parentBlock } = options
  const settings = logseq.settings as any

  try {
    // Create a new page with the AI-generated title
    const pageName = sanitizePageName(title)

    // Check if page already exists
    let page = await logseq.Editor.getPage(pageName)

    if (!page) {
      // Create new page
      page = await logseq.Editor.createPage(
        pageName,
        {},
        {
          createFirstBlock: false,
          redirect: false
        }
      )
    } else {
      // Make title unique if page exists
      const uniquePageName = `${pageName} ${Date.now()}`
      page = await logseq.Editor.createPage(
        uniquePageName,
        {},
        {
          createFirstBlock: false,
          redirect: false
        }
      )
    }

    if (!page) {
      throw new Error('Failed to create page')
    }

    // Add metadata block
    await logseq.Editor.appendBlockInPage(page.uuid, '---')
    await logseq.Editor.appendBlockInPage(page.uuid, `tags:: #voice-note #transcription`)
    await logseq.Editor.appendBlockInPage(page.uuid, `created:: ${new Date().toISOString()}`)

    // Link to original block if available
    if (parentBlock.page) {
      const parentPage = await logseq.Editor.getPage(parentBlock.page.id)
      if (parentPage) {
        await logseq.Editor.appendBlockInPage(page.uuid, `source:: [[${parentPage.name}]]`)
      }
    }

    await logseq.Editor.appendBlockInPage(page.uuid, '---')
    await logseq.Editor.appendBlockInPage(page.uuid, '')

    // Add transcription section
    await logseq.Editor.appendBlockInPage(page.uuid, '# Transcription')
    await logseq.Editor.appendBlockInPage(page.uuid, '')

    // Split long transcriptions into paragraphs for better readability
    const transcriptionParagraphs = splitIntoParagraphs(transcription)
    for (const paragraph of transcriptionParagraphs) {
      await logseq.Editor.appendBlockInPage(page.uuid, paragraph)
      await logseq.Editor.appendBlockInPage(page.uuid, '')
    }

    // Add summary section
    await logseq.Editor.appendBlockInPage(page.uuid, '# Summary')
    await logseq.Editor.appendBlockInPage(page.uuid, '')
    await logseq.Editor.appendBlockInPage(page.uuid, summary)
    await logseq.Editor.appendBlockInPage(page.uuid, '')

    // Add tasks section placeholder
    if (settings?.addTasksSection) {
      await logseq.Editor.appendBlockInPage(page.uuid, '# Tasks')
      await logseq.Editor.appendBlockInPage(page.uuid, '')
      await logseq.Editor.appendBlockInPage(page.uuid, '_Tasks will be added here if #todo tag is present_')
      await logseq.Editor.appendBlockInPage(page.uuid, '')
    }

    // Add notes section for user additions
    await logseq.Editor.appendBlockInPage(page.uuid, '# Notes')
    await logseq.Editor.appendBlockInPage(page.uuid, '')
    await logseq.Editor.appendBlockInPage(page.uuid, '_Add your notes here..._')

    // Log success
    if (settings?.debugMode) {
      console.log(`Created page: ${page.name}`)
    }

    return page.name
  } catch (error) {
    console.error('Error creating transcription page:', error)
    throw new Error(`Failed to create page: ${error.message}`)
  }
}

export async function addTasksToPage(
  pageName: string,
  tasks: string[],
  createdTasks: any[],
  config: any
): Promise {
  try {
    const page = await logseq.Editor.getPage(pageName)
    if (!page) {
      console.error(`Page not found: ${pageName}`)
      return
    }

    // Get all blocks in the page
    const pageBlocks = await logseq.Editor.getPageBlocksTree(pageName)

    // Find the Tasks section
    let tasksBlock = null
    for (const block of pageBlocks) {
      if (block.content === '# Tasks') {
        tasksBlock = block
        break
      }
    }

    if (!tasksBlock) {
      // Create Tasks section if it doesn't exist
      await logseq.Editor.appendBlockInPage(page.uuid, '')
      await logseq.Editor.appendBlockInPage(page.uuid, '# Tasks')
      const newBlocks = await logseq.Editor.getPageBlocksTree(pageName)
      tasksBlock = newBlocks.find(b => b.content === '# Tasks')
    }

    if (!tasksBlock) return

    // Clear placeholder text if present
    if (tasksBlock.children && tasksBlock.children.length > 0) {
      const firstChild = tasksBlock.children[0]
      if (typeof firstChild === 'object' && 'content' in firstChild) {
        if (firstChild.content.includes('_Tasks will be added here')) {
          await logseq.Editor.removeBlock(firstChild.uuid)
        }
      }
    }

    // Add task status
    await logseq.Editor.insertBlock(tasksBlock.uuid, `✅ **${createdTasks.length} task(s) created in Todoist**`, {
      sibling: false
    })

    if (config.projectName) {
      await logseq.Editor.insertBlock(tasksBlock.uuid, `📁 Project: ${config.projectName}`, {
        sibling: false
      })
    }

    if (config.dueDate) {
      await logseq.Editor.insertBlock(tasksBlock.uuid, `📅 Due: ${config.dueDate}`, {
        sibling: false
      })
    }

    await logseq.Editor.insertBlock(tasksBlock.uuid, '', {
      sibling: false
    })

    // Add the actual tasks
    for (const task of tasks) {
      await logseq.Editor.insertBlock(tasksBlock.uuid, `- [ ] ${task}`, {
        sibling: false
      })
    }

  } catch (error) {
    console.error('Error adding tasks to page:', error)
  }
}

function sanitizePageName(title: string): string {
  // Remove or replace characters that might cause issues in page names
  let sanitized = title
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
    .replace(/\[\[|\]\]/g, '') // Remove Logseq page reference brackets
    .replace(/^\.+/, '') // Remove leading dots
    .replace(/\.+$/, '') // Remove trailing dots
    .trim()

  // Ensure the page name is not empty
  if (!sanitized) {
    sanitized = `Voice Note ${new Date().toISOString().slice(0, 10)}`
  }

  // Limit length to prevent overly long page names
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 97) + '...'
  }

  return sanitized
}

function splitIntoParagraphs(text: string, maxLength: number = 500): string[] {
  const paragraphs: string[] = []

  // First try to split by natural paragraph breaks
  const naturalParagraphs = text.split(/\n\n+/)

  for (const para of naturalParagraphs) {
    if (para.length <= maxLength) {
      paragraphs.push(para.trim())
    } else {
      // Split long paragraphs by sentences
      const sentences = para.match(/[^.!?]+[.!?]+/g) || [para]
      let currentParagraph = ''

      for (const sentence of sentences) {
        if (currentParagraph.length + sentence.length <= maxLength) {
          currentParagraph += sentence
        } else {
          if (currentParagraph) {
            paragraphs.push(currentParagraph.trim())
          }
          currentParagraph = sentence
        }
      }

      if (currentParagraph) {
        paragraphs.push(currentParagraph.trim())
      }
    }
  }

  return paragraphs.filter(p => p.length > 0)
}