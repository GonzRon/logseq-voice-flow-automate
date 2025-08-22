// src/lib/todoistService.ts - Direct Todoist API integration for VoiceFlow Automate
import { TodoConfig } from './tagParser'

// Todoist API types (minimal implementation)
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

export interface TodoistTask {
  content: string
  projectId?: string
  labels?: string[]
  priority?: number
  dueString?: string
  parentId?: string
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
        throw new Error(`Todoist API error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('[VoiceFlow] Failed to create Todoist task:', error)
      return null
    }
  }

  /**
   * Get all projects
   */
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

  /**
   * Get all labels
   */
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
  // Check if user has configured Todoist API token
  const apiToken = logseq.settings?.todoistApiToken

  if (!apiToken || apiToken === '') {
    console.log('[VoiceFlow] No Todoist API token configured')
    return null
  }

  return apiToken
}

/**
 * Create tasks in Todoist using direct API integration
 */
export async function createTodoistTasks(
  tasks: string[],
  config: TodoConfig
): Promise<any[]> {
  const createdTasks = []

  // Get API token
  const apiToken = getTodoistApiToken()
  if (!apiToken) {
    console.log('[VoiceFlow] Todoist integration not configured - skipping task creation')
    return []
  }

  // Initialize API client
  const todoistApi = new TodoistAPIClient(apiToken)

  try {
    // Determine if we should create hierarchical structure
    const shouldCreateHierarchy =
      config.useAI &&
      tasks.length > 1 &&
      logseq.settings?.hierarchicalTasks

    let parentTask: TodoistApiResponse | null = null

    if (shouldCreateHierarchy && config.masterTaskTitle) {
      // Create master task
      const masterTaskData: TodoistApiTask = {
        content: config.masterTaskTitle,
        project_id: config.projectId,
        labels: config.labels,
        priority: config.priority,
        due_string: config.dueDate
      }

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
        due_string: config.dueDate,
        parent_id: parentTask?.id
      }

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
      'Failed to create Todoist tasks. Please check your API token in settings.',
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
  if (!apiToken) {
    return false
  }

  const todoistApi = new TodoistAPIClient(apiToken)

  try {
    // Try to get projects as a connection test
    const projects = await todoistApi.getProjects()
    return projects.length >= 0 // Even 0 projects means connection works
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
  if (!apiToken) {
    return []
  }

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
  if (!apiToken) {
    return []
  }

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