// src/lib/todoistService.ts - Enhanced Todoist integration with proper due date handling
import { TodoConfig } from './tagParser'

interface TodoistApiTask {
  id?: string
  content: string
  project_id?: string
  labels?: string[]
  priority?: number
  due_string?: string
  parent_id?: string
}

interface TodoistApiResponse {
  id: string
  content: string
  project_id: string
  [key: string]: any
}

/**
 * Direct Todoist API client
 */
class TodoistAPIClient {
  private apiToken: string
  private baseUrl = 'https://api.todoist.com/rest/v2'

  constructor(apiToken: string) {
    this.apiToken = apiToken
  }

  /**
   * Create a task in Todoist
   */
  async createTask(task: TodoistApiTask): Promise<TodoistApiResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(task)
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('[VoiceFlow] Todoist API error:', error)
        console.error('[VoiceFlow] Task data that failed:', task)
        throw new Error(`Todoist API error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('[VoiceFlow] Failed to create Todoist task:', error)
      return null
    }
  }

  async getProjects(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/projects`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get projects: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('[VoiceFlow] Failed to get projects:', error)
      return []
    }
  }

  async getLabels(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/labels`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get labels: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('[VoiceFlow] Failed to get labels:', error)
      return []
    }
  }
}

/**
 * Get or validate Todoist API token from settings
 */
function getTodoistApiToken(): string | null {
  const apiToken = logseq.settings?.todoistApiToken
  if (!apiToken || apiToken === '') {
    console.log('[VoiceFlow] No Todoist API token configured')
    return null
  }
  return apiToken
}

/**
 * Validate and clean due date string for Todoist
 */
function validateDueDate(dueDate: string | undefined): string | undefined {
  if (!dueDate) return undefined;

  // Trim and validate the due date isn't too long (Todoist has limits)
  const cleaned = dueDate.trim();

  // If it's longer than 50 characters, it's probably not a valid date
  if (cleaned.length > 50) {
    console.warn(`[VoiceFlow] Due date too long, ignoring: "${cleaned.substring(0, 50)}..."`);
    return undefined;
  }

  // List of valid date patterns Todoist understands
  const validPatterns = [
    'today', 'tomorrow', 'monday', 'tuesday', 'wednesday', 'thursday',
    'friday', 'saturday', 'sunday', 'next week', 'next month',
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
    /^\d{1,2}\/\d{1,2}/,  // MM/DD format
    /^in \d+ (day|week|month)/i
  ];

  // Check if it matches any valid pattern
  const isValid = validPatterns.some(pattern => {
    if (typeof pattern === 'string') {
      return cleaned.toLowerCase() === pattern;
    }
    return pattern.test(cleaned);
  });

  if (!isValid && cleaned.length > 20) {
    console.warn(`[VoiceFlow] Due date doesn't match known patterns: "${cleaned}"`);
    return undefined;
  }

  return cleaned;
}

/**
 * Create tasks in Todoist using direct API integration
 */
export async function createTodoistTasks(
  tasks: string[],
  config: TodoConfig
): Promise<any[]> {
  const createdTasks = []

  const apiToken = getTodoistApiToken()
  if (!apiToken) {
    console.log('[VoiceFlow] Todoist integration not configured - skipping task creation')
    return []
  }

  const todoistApi = new TodoistAPIClient(apiToken)

  try {
    // Validate the due date once
    const validatedDueDate = validateDueDate(config.dueDate);

    // Determine if we should create hierarchical structure
    const shouldCreateHierarchy =
      config.useAI &&
      tasks.length > 1 &&
      config.masterTaskTitle &&
      logseq.settings?.hierarchicalTasks

    let parentTask: TodoistApiResponse | null = null

    if (shouldCreateHierarchy && config.masterTaskTitle) {
      // Create master task WITH due date
      const masterTaskData: TodoistApiTask = {
        content: config.masterTaskTitle,
        project_id: config.projectId,
        labels: config.labels,
        priority: config.priority,
        // Only add due_string if it's valid
        ...(validatedDueDate && { due_string: validatedDueDate })
      }

      console.log('[VoiceFlow] Creating master task:', masterTaskData)
      parentTask = await todoistApi.createTask(masterTaskData)

      if (parentTask) {
        createdTasks.push(parentTask)
        console.log('[VoiceFlow] Created master task:', parentTask.content)
      }
    }

    // Create individual tasks
    for (const task of tasks) {
      const taskData: TodoistApiTask = {
        content: task,
        project_id: config.projectId,
        labels: config.labels,
        priority: config.priority,
        // Don't add due date to subtasks when there's a parent
        ...(parentTask ? { parent_id: parentTask.id } :
            (!shouldCreateHierarchy && validatedDueDate ? { due_string: validatedDueDate } : {}))
      }

      console.log('[VoiceFlow] Creating task:', taskData)
      const created = await todoistApi.createTask(taskData)
      if (created) {
        createdTasks.push(created)
        console.log('[VoiceFlow] Created task:', created.content)
      }
    }

    if (createdTasks.length > 0) {
      logseq.App.showMsg(
        `✅ Created ${createdTasks.length} task(s) in Todoist`,
        'success'
      )
    }

    return createdTasks
  } catch (error) {
    console.error('[VoiceFlow] Error creating Todoist tasks:', error)
    logseq.App.showMsg(
      'Failed to create Todoist tasks. Check console for details.',
      'warning'
    )
    return []
  }
}

/**
 * Verify Todoist connection
 */
export async function verifyTodoistConnection(): Promise<boolean> {
  const apiToken = getTodoistApiToken()
  if (!apiToken) return false

  const todoistApi = new TodoistAPIClient(apiToken)

  try {
    const projects = await todoistApi.getProjects()
    return projects.length >= 0
  } catch (error) {
    console.error('[VoiceFlow] Todoist connection test failed:', error)
    return false
  }
}

/**
 * Get available Todoist projects
 */
export async function getTodoistProjects(): Promise<{ id: string; name: string }[]> {
  const apiToken = getTodoistApiToken()
  if (!apiToken) return []

  const todoistApi = new TodoistAPIClient(apiToken)

  try {
    const projects = await todoistApi.getProjects()
    return projects.map(p => ({
      id: p.id,
      name: p.name
    }))
  } catch (error) {
    console.error('[VoiceFlow] Failed to get Todoist projects:', error)
    return []
  }
}

/**
 * Get available Todoist labels
 */
export async function getTodoistLabels(): Promise<string[]> {
  const apiToken = getTodoistApiToken()
  if (!apiToken) return []

  const todoistApi = new TodoistAPIClient(apiToken)

  try {
    const labels = await todoistApi.getLabels()
    return labels.map(l => l.name)
  } catch (error) {
    console.error('[VoiceFlow] Failed to get Todoist labels:', error)
    return []
  }
}

/**
 * Test Todoist integration
 */
export async function testTodoistIntegration(): Promise<boolean> {
  try {
    const isConnected = await verifyTodoistConnection()

    if (isConnected) {
      const projects = await getTodoistProjects()
      logseq.App.showMsg(
        `✅ Todoist connected! Found ${projects.length} project(s)`,
        'success'
      )
      return true
    } else {
      logseq.App.showMsg(
        '❌ Todoist connection failed. Please check your API token.',
        'error'
      )
      return false
    }
  } catch (error) {
    console.error('[VoiceFlow] Todoist test failed:', error)
    logseq.App.showMsg(
      '❌ Todoist test failed. Please check your settings.',
      'error'
    )
    return false
  }
}