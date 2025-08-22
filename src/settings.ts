// src/settings.ts - Settings schema for VoiceFlow Automate
import { SettingSchemaDesc } from '@logseq/libs/dist/LSPlugin'

export const settingsSchema: SettingSchemaDesc[] = [
  // OpenAI Settings
  {
    key: 'openAIKey',
    type: 'string',
    default: '',
    title: 'OpenAI API Key',
    description: 'Your OpenAI API key. Get one at https://platform.openai.com/api-keys',
  },
  {
    key: 'openAICompletionEngine',
    type: 'string',
    default: 'gpt-5-nano',
    title: 'OpenAI Model',
    description: 'OpenAI model to use (e.g., gpt-5-nano, gpt-5-mini, gpt-5, gpt-4-turbo, gpt-3.5-turbo)',
  },
  {
    key: 'openAIEndpoint',
    type: 'string',
    default: 'https://api.openai.com/v1',
    title: 'OpenAI API Endpoint',
    description: 'OpenAI API endpoint (change only if using a proxy)',
  },
  // Todoist Settings
  {
    key: 'todoistApiToken',
    type: 'string',
    default: '',
    title: 'Todoist API Token',
    description: 'Your Todoist API token. Get it from https://todoist.com/app/settings/integrations/developer',
  },
  {
    key: 'defaultProject',
    type: 'string',
    default: '',
    title: 'Default Todoist Project',
    description: 'Default project ID for tasks (leave empty to use inbox)',
  },
  {
    key: 'projectMappings',
    type: 'object',
    default: {},
    title: 'Project Tag Mappings',
    description: 'Map hashtags to Todoist projects (configure in UI)',
  },
  // Transcription Settings
  {
    key: 'todoTriggerTags',
    type: 'string',
    default: '#todo, #to-do, #task, #tasks',
    title: 'Todo Trigger Tags',
    description: 'Comma-separated tags that trigger todo creation (e.g., #todo, #to-do, #task)',
  },
  {
    key: 'defaultTranscriptionMode',
    type: 'enum',
    default: 'literal',
    enumChoices: ['literal', 'ai'],
    enumPicker: 'select',
    title: 'Default Transcription Mode',
    description: 'Default mode for processing voice notes',
  },
  {
    key: 'hierarchicalTasks',
    type: 'boolean',
    default: true,
    title: 'Create Hierarchical Tasks',
    description: 'Create master task with subtasks when using AI mode',
  },
  // AI Prompts
  {
    key: 'aiPrompt',
    type: 'string',
    default: '',
    title: 'Custom AI Summary Prompt',
    description: 'Custom prompt for AI summarization (leave empty for default)',
  },
  {
    key: 'taskPrompt',
    type: 'string',
    default: '',
    title: 'Custom Task Extraction Prompt',
    description: 'Custom prompt for AI task extraction (leave empty for default)',
  },
  // Page Creation Settings
  {
    key: 'createTranscriptionPage',
    type: 'boolean',
    default: true,
    title: 'Create Transcription Page',
    description: 'Create a new page with transcription and AI summary for each voice note',
  },
  {
    key: 'addPageReference',
    type: 'enum',
    default: 'inline',
    enumChoices: ['inline', 'child', 'none'],
    enumPicker: 'select',
    title: 'Add Page Reference',
    description: 'How to add the page reference: inline (same block), child (new block below), or none',
  },
  {
    key: 'pageReferenceFormat',
    type: 'string',
    default: '📝 [[{title}]]',
    title: 'Page Reference Format',
    description: 'Format for page reference. Use {title} for page name. Example: "→ [[{title}]]"',
  },
  {
    key: 'addTasksSection',
    type: 'boolean',
    default: true,
    title: 'Add Tasks Section to Page',
    description: 'Add a Tasks section to the created transcription page',
  },
  {
    key: 'pageTemplate',
    type: 'string',
    default: '',
    title: 'Page Template Name',
    description: 'Optional template to use for created pages (leave empty for default structure)',
  },
  // AAC Converter Settings
  {
    key: 'converterHost',
    type: 'string',
    default: '127.0.0.1',
    title: 'AAC Converter Host',
    description: 'Host address for optional AAC converter service',
  },
  {
    key: 'converterPort',
    type: 'number',
    default: 3456,
    title: 'AAC Converter Port',
    description: 'Port for optional AAC converter service',
  },
  // Keyboard Shortcuts
  {
    key: 'voiceFlowShortcut',
    type: 'string',
    default: 'mod+shift+v',
    title: 'Keyboard Shortcut',
    description: 'Keyboard shortcut for VoiceFlow command',
  },
  // Advanced Settings
  {
    key: 'autoDeleteProcessedAudio',
    type: 'boolean',
    default: false,
    title: 'Auto-delete Processed Audio',
    description: 'Automatically remove audio file reference after processing',
  },
  {
    key: 'appendTranscriptionTimestamp',
    type: 'boolean',
    default: true,
    title: 'Append Timestamp',
    description: 'Add timestamp to transcription results',
  },
  {
    key: 'autoOpenCreatedPage',
    type: 'boolean',
    default: false,
    title: 'Auto-open Created Page',
    description: 'Automatically open the created transcription page after processing',
  },
  {
    key: 'debugMode',
    type: 'boolean',
    default: false,
    title: 'Debug Mode',
    description: 'Enable detailed logging for troubleshooting',
  }
]