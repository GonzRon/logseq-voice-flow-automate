import { TodoConfig } from './tagParser'

export interface TodoistTask {
  content: string
  projectId?: string
  labels?: string[]
  priority?: number
  dueString?: string
  parentId?: string
}

export async function createTodoistTasks(
  tasks: string[],
  config: TodoConfig
): Promise {
  const createdTasks = []

  try {
    // Determine if we should create hierarchical structure
    const shouldCreateHierarchy =
      config.useAI &&
      tasks.length > 1 &&
      logseq.settings?.hierarchicalTasks

    let parentTask = null

    if (shouldCreateHierarchy) {
      // Create master task
      parentTask = await createSingleTask({
        content: config.masterTaskTitle || 'Tasks from voice note',
        projectId: config.projectId,
        labels: config.labels,
        priority: config.priority,
        dueString: config.dueDate
      })

      if (parentTask) {
        createdTasks.push(parentTask)
      }
    }

    // Create individual tasks
    for (const task of tasks) {
      const taskData: TodoistTask = {
        content: task,
        projectId: config.projectId,
        labels: config.labels,
        priority: config.priority,
        dueString: config.dueDate,
        parentId: parentTask?.id
      }

      const created = await createSingleTask(taskData)
      if (created) {
        createdTasks.push(created)
      }
    }

    return createdTasks
  } catch (error) {
    console.error('Error creating Todoist tasks:', error)
    logseq.App.showMsg(
      'Failed to create tasks. Please ensure the Todoist plugin is installed and configured.',
      'error'
    )
    return []
  }
}

async function createSingleTask(taskData: TodoistTask): Promise {
  try {
    // Invoke the todoist plugin's send task functionality
    const result = await logseq.App.invokeExternalPlugin(
      'logseq-todoist-plugin.models.sendTask',
      {
        task: taskData.content,
        project: taskData.projectId || logseq.settings?.defaultProject,
        label: taskData.labels || [],
        priority: taskData.priority?.toString() || '1',
        due: taskData.dueString || '',
        uuid: '' // We don't need to link back for voice notes
      }
    )

    return result
  } catch (error) {
    console.error('Error creating single task:', error)

    // Try alternative invocation method
    try {
      const alternativeResult = await logseq.App.invokeExternalPlugin(
        'logseq-todoist-plugin.commands.send-task',
        taskData
      )
      return alternativeResult
    } catch (altError) {
      console.error('Alternative invocation also failed:', altError)
      return null
    }
  }
}