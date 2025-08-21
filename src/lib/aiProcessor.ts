export interface AIProcessResult {
  tasks: string[]
  summary?: string
}

export async function generateTitle(text: string, settings: any): Promise {
  try {
    const prompt = `Generate a concise, descriptive title (max 6 words) for this voice note:\n\n${text}`

    const result = await logseq.App.invokeExternalPlugin(
      'logseq-plugin-gpt3-openai.models.processText',
      {
        text: text,
        prompt: prompt,
        temperature: 0.7,
        maxTokens: 50
      }
    )

    if (result && typeof result === 'string') {
      // Clean up the title
      const title = result.trim()
        .replace(/^["']|["']$/g, '') // Remove quotes
        .replace(/^Title:\s*/i, '') // Remove "Title:" prefix if present
        .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
        .trim()

      // Add timestamp to ensure uniqueness
      const timestamp = new Date().toISOString().slice(0, 10)
      return `${title} - ${timestamp}`
    }

    // Fallback title
    return `Voice Note - ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`
  } catch (error) {
    console.error('Error generating title:', error)
    return `Voice Note - ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`
  }
}

export async function generateSummary(text: string, settings: any): Promise {
  try {
    const prompt = `Provide a clear, concise summary (2-3 sentences) of the following voice note:\n\n${text}`

    const result = await logseq.App.invokeExternalPlugin(
      'logseq-plugin-gpt3-openai.models.processText',
      {
        text: text,
        prompt: prompt,
        temperature: 0.7,
        maxTokens: 150
      }
    )

    if (result && typeof result === 'string') {
      return result.trim()
    }

    // Fallback to simple summary
    return text.length > 200 ? text.substring(0, 200) + '...' : text
  } catch (error) {
    console.error('Error generating summary:', error)
    // Return first few sentences as fallback
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
    return sentences.slice(0, 2).join(' ').trim()
  }
}

export async function processWithAI(
  text: string,
  settings: any
): Promise<AIProcessResult> {
  try {
    const customPrompt = settings?.aiPrompt || getDefaultPrompt()

    // Invoke GPT3-OpenAI plugin for AI processing
    const result = await logseq.App.invokeExternalPlugin(
      'logseq-plugin-gpt3-openai.models.processText',
      {
        text: text,
        prompt: customPrompt,
        temperature: 0.7,
        maxTokens: 500
      }
    )

    if (result) {
      return parseAIResponse(result)
    }

    // Fallback to alternative invocation
    const altResult = await logseq.App.invokeExternalPlugin(
      'logseq-plugin-gpt3-openai.commands.gpt',
      {
        content: `${customPrompt}\n\n${text}`
      }
    )

    if (altResult) {
      return parseAIResponse(altResult)
    }

    // If AI processing fails, return original text as single task
    return {
      tasks: [text],
      summary: text
    }
  } catch (error) {
    console.error('AI processing error:', error)
    // Fallback to simple processing
    return simpleTaskExtraction(text)
  }
}

function getDefaultPrompt(): string {
  return `Extract actionable tasks from the following voice note. 
If multiple tasks are present, list them separately.
Format the response as:
SUMMARY: [brief summary]
TASKS:
- [task 1]
- [task 2]
...

Voice note:`
}

function parseAIResponse(response: string): AIProcessResult {
  const lines = response.split('\n')
  const tasks: string[] = []
  let summary = ''
  let inTaskSection = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith('SUMMARY:')) {
      summary = trimmed.substring(8).trim()
    } else if (trimmed === 'TASKS:') {
      inTaskSection = true
    } else if (inTaskSection && trimmed.startsWith('-')) {
      tasks.push(trimmed.substring(1).trim())
    } else if (inTaskSection && trimmed.startsWith('•')) {
      tasks.push(trimmed.substring(1).trim())
    } else if (inTaskSection && trimmed.length > 0) {
      // Handle tasks without bullet points
      tasks.push(trimmed)
    }
  }

  // If no tasks found, treat the whole response as a single task
  if (tasks.length === 0) {
    tasks.push(summary || response)
  }

  return { tasks, summary }
}

function simpleTaskExtraction(text: string): AIProcessResult {
  // Simple heuristic-based task extraction
  const tasks: string[] = []

  // Split by common separators
  const separators = [';', ',', ' and ', ' also ', ' then ']
  let segments = [text]

  for (const separator of separators) {
    const newSegments: string[] = []
    for (const segment of segments) {
      newSegments.push(...segment.split(separator))
    }
    segments = newSegments
  }

  // Filter and clean segments
  for (const segment of segments) {
    const cleaned = segment.trim()
    if (cleaned.length > 5) { // Minimum task length
      tasks.push(cleaned)
    }
  }

  // If no meaningful segments, return whole text
  if (tasks.length === 0) {
    tasks.push(text)
  }

  return {
    tasks,
    summary: tasks.length > 1 ? `${tasks.length} tasks identified` : text
  }
}