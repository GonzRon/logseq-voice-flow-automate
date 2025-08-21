export interface TodoConfig {
  createTodo: boolean
  useAI: boolean
  projectId?: string
  projectName?: string
  labels: string[]
  priority: number
  dueDate?: string
  cleanText: string
  masterTaskTitle?: string
}

export function parseTags(text: string, settings: any): TodoConfig {
  const config: TodoConfig = {
    createTodo: false,
    useAI: settings?.defaultTranscriptionMode === 'ai',
    labels: [],
    priority: 1,
    cleanText: text
  }

  // Check for todo trigger
  const todoTriggers = settings?.todoTriggerTags || ['#todo', '#task']
  for (const trigger of todoTriggers) {
    if (text.toLowerCase().includes(trigger)) {
      config.createTodo = true
      break
    }
  }

  // Parse transcription mode overrides
  if (text.includes('#ai')) {
    config.useAI = true
  } else if (text.includes('#direct') || text.includes('#literal')) {
    config.useAI = false
  }

  // Parse project tags
  const projectMappings = settings?.projectMappings || {}
  for (const [tag, projectInfo] of Object.entries(projectMappings)) {
    if (text.includes(tag)) {
      config.projectId = (projectInfo as any).id
      config.projectName = (projectInfo as any).name
      break
    }
  }

  // Parse due date
  config.dueDate = extractDueDate(text)

  // Parse priority
  if (text.includes('#urgent') || text.includes('#high')) {
    config.priority = 4
  } else if (text.includes('#medium')) {
    config.priority = 3
  } else if (text.includes('#low')) {
    config.priority = 1
  }

  // Clean text by removing all tags
  config.cleanText = removeAllTags(text)

  // Extract master task title if using AI
  if (config.useAI && text.includes(':')) {
    const colonIndex = config.cleanText.indexOf(':')
    if (colonIndex > 0 && colonIndex < 50) {
      config.masterTaskTitle = config.cleanText.substring(0, colonIndex).trim()
    }
  }

  return config
}

function extractDueDate(text: string): string | undefined {
  // Common due date patterns
  const patterns = [
    /due date?\s+(\w+)/i,
    /by\s+(\w+)/i,
    /deadline\s+(\w+)/i,
    /due\s+(\w+\s+\d+)/i
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  // Check for specific keywords
  if (text.includes('tomorrow')) return 'tomorrow'
  if (text.includes('today')) return 'today'
  if (text.includes('next week')) return 'next week'
  if (text.includes('next month')) return 'next month'

  return undefined
}

function removeAllTags(text: string): string {
  // Remove hashtags and special markers
  let cleaned = text
    .replace(/#\w+/g, '')
    .replace(/hashtag\s+\w+/gi, '')
    .replace(/due date?\s+\w+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  return cleaned
}