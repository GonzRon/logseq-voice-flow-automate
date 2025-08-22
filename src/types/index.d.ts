// src/types/index.d.ts - Type definitions for VoiceFlow Automate

// Allow importing TOML files as raw text
declare module "*.toml?raw" {
  const content: string;
  export default content;
}

export interface VoiceFlowSettings {
  openAIKey?: string
  openAICompletionEngine?: string
  openAIEndpoint?: string
  todoTriggerTags?: string
  defaultTranscriptionMode?: 'literal' | 'ai'
  hierarchicalTasks?: boolean
  defaultProject?: string
  projectMappings?: Record<string, ProjectMapping>
  aiPrompt?: string
  taskPrompt?: string
  createTranscriptionPage?: boolean
  addTasksSection?: boolean
  pageTemplate?: string
  converterHost?: string
  converterPort?: number
  voiceFlowShortcut?: string
  autoDeleteProcessedAudio?: boolean
  appendTranscriptionTimestamp?: boolean
  autoOpenCreatedPage?: boolean
  debugMode?: boolean
}

export interface ProjectMapping {
  id: string
  name: string
}

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

export interface TodoistTask {
  content: string
  projectId?: string
  labels?: string[]
  priority?: number
  dueString?: string
  parentId?: string
}

export interface AudioConversionConfig {
  converterHost?: string
  converterPort?: number
  timeout?: number
}

export interface OpenAIOptions {
  apiKey: string
  completionEngine?: string
  temperature?: number
  maxTokens?: number
  completionEndpoint?: string
}