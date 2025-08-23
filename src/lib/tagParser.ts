// src/lib/tagParser.ts - Enhanced tag parsing for spoken and written hashtags
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
  extractedTags: string[]
}

/**
 * Parse tags from transcript (spoken hashtags) and block content (written hashtags)
 */
export function parseTags(transcript: string, blockContent: string, settings: any): TodoConfig {
  // Combine both sources for tag detection
  const combinedText = `${transcript} ${blockContent}`;

  const config: TodoConfig = {
    createTodo: false,
    useAI: settings?.defaultTranscriptionMode === 'ai',
    labels: [],
    priority: 1,
    cleanText: transcript,
    extractedTags: []
  }

  // Normalize spoken hashtags to actual hashtags for processing
  // Handle variations like "to-do" vs "todo" vs "to do" (with space)
  let normalizedText = combinedText
    // IMPORTANT: Handle "hashtag to do" with space FIRST before general pattern
    .replace(/hashtag\s+to\s+do/gi, '#todo')  // Handle "hashtag to do" with space
    .replace(/hash\s+tag\s+to\s+do/gi, '#todo')  // Handle "hash tag to do" with space
    // Then handle general hashtag patterns
    .replace(/hashtag\s+(\w+(-\w+)*)/gi, '#$1')
    .replace(/hash\s+tag\s+(\w+(-\w+)*)/gi, '#$1')
    // Handle written variations
    .replace(/#to-do/gi, '#todo')  // Normalize to-do to todo
    .replace(/#to\s+do/gi, '#todo')  // Handle written "#to do" with space
    .replace(/hashtag to-do/gi, '#todo');  // Handle spoken "hashtag to-do"

  // Check for todo triggers (both spoken and written)
  const todoTriggers = Array.isArray(settings?.todoTriggerTags)
    ? settings.todoTriggerTags
    : (settings?.todoTriggerTags || '#todo, #task').split(',').map((t: string) => t.trim());

  // Also check for common variations
  const todoVariations = ['#todo', '#to-do', '#task', '#todos', '#tasks'];

  for (const trigger of [...todoTriggers, ...todoVariations]) {
    if (normalizedText.toLowerCase().includes(trigger.toLowerCase())) {
      config.createTodo = true;
      config.extractedTags.push('#todo');  // Normalize to #todo
      console.log(`[VoiceFlow] Found todo trigger: ${trigger}`);
      break;
    }
  }

  // Parse transcription mode overrides - handle "last one wins" scenario
  const aiIndex = Math.max(
    normalizedText.lastIndexOf('#ai'),
    normalizedText.toLowerCase().lastIndexOf('hashtag ai')
  );
  const directIndex = Math.max(
    normalizedText.lastIndexOf('#direct'),
    normalizedText.lastIndexOf('#literal'),
    normalizedText.toLowerCase().lastIndexOf('hashtag direct'),
    normalizedText.toLowerCase().lastIndexOf('hashtag literal')
  );

  if (aiIndex > directIndex && aiIndex > -1) {
    config.useAI = true;
    config.extractedTags.push('#ai');
  } else if (directIndex > aiIndex && directIndex > -1) {
    config.useAI = false;
    config.extractedTags.push('#direct');
  }

  // Parse project tags
  const projectMappings = settings?.projectMappings || {};
  for (const [tag, projectInfo] of Object.entries(projectMappings)) {
    if (normalizedText.includes(tag)) {
      config.projectId = (projectInfo as any).id;
      config.projectName = (projectInfo as any).name;
      config.extractedTags.push(tag);
      break;
    }
  }

  // Parse due date from spoken phrases - handle "hashtag due date" pattern
  config.dueDate = extractDueDate(transcript);
  if (config.dueDate) {
    console.log(`[VoiceFlow] Extracted due date: ${config.dueDate}`);
  }

  // Parse priority
  if (normalizedText.includes('#urgent') || normalizedText.includes('#high') ||
      normalizedText.toLowerCase().includes('hashtag urgent') ||
      normalizedText.toLowerCase().includes('hashtag high')) {
    config.priority = 4;
    config.extractedTags.push('#urgent');
  } else if (normalizedText.includes('#medium') ||
             normalizedText.toLowerCase().includes('hashtag medium')) {
    config.priority = 3;
    config.extractedTags.push('#medium');
  } else if (normalizedText.includes('#low') ||
             normalizedText.toLowerCase().includes('hashtag low')) {
    config.priority = 1;
    config.extractedTags.push('#low');
  }

  // Clean transcript by removing spoken hashtags and control tags
  config.cleanText = removeSpokenTags(transcript);

  // Extract master task title if using AI and colon pattern exists
  if (config.useAI && config.cleanText.includes(':')) {
    const colonIndex = config.cleanText.indexOf(':');
    if (colonIndex > 0 && colonIndex < 50) {
      config.masterTaskTitle = config.cleanText.substring(0, colonIndex).trim();
    }
  }

  console.log(`[VoiceFlow] Tag parsing complete:`, {
    createTodo: config.createTodo,
    useAI: config.useAI,
    dueDate: config.dueDate,
    extractedTags: config.extractedTags
  });

  return config;
}

/**
 * Extract due date from natural language
 */
function extractDueDate(text: string): string | undefined {
  // Handle spoken "hashtag due date" pattern more explicitly
  // Look for "hashtag due date [date]" or "due date [date]"
  const dueDatePatterns = [
    /hashtag\s+due\s+date\s+(.+?)(?:\s*hashtag|$)/i,
    /hash\s+tag\s+due\s+date\s+(.+?)(?:\s*hashtag|$)/i,
    /due\s+date\s+(.+?)(?:\s*hashtag|$)/i,
    /by\s+(.+?)(?:\s+hashtag|\s+hash tag|$)/i,
    /deadline\s+(.+?)(?:\s+hashtag|\s+hash tag|$)/i,
    /due\s+(.+?)(?:\s+hashtag|\s+hash tag|$)/i
  ];

  for (const pattern of dueDatePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let duePhrase = match[1].trim();

      // Clean up the phrase - remove trailing punctuation or "hashtag" words
      duePhrase = duePhrase
        .replace(/[.,;]?\s*$/, '')  // Remove trailing punctuation
        .replace(/\s*(hashtag|hash tag).*$/i, '');  // Remove any trailing hashtag mentions

      // If we got a valid date phrase, return it
      if (duePhrase && !duePhrase.includes('#')) {
        console.log(`[VoiceFlow] Extracted due date from pattern: "${duePhrase}"`);
        return duePhrase;
      }
    }
  }

  // Check for specific date keywords anywhere in text
  const dateKeywords = [
    { pattern: /\btomorrow\b/i, value: 'tomorrow' },
    { pattern: /\btoday\b/i, value: 'today' },
    { pattern: /\bnext week\b/i, value: 'next week' },
    { pattern: /\bnext month\b/i, value: 'next month' },
    { pattern: /\bnext friday\b/i, value: 'next Friday' },
    { pattern: /\bthis friday\b/i, value: 'this Friday' },
    { pattern: /\bmonday\b/i, value: 'Monday' },
    { pattern: /\btuesday\b/i, value: 'Tuesday' },
    { pattern: /\bwednesday\b/i, value: 'Wednesday' },
    { pattern: /\bthursday\b/i, value: 'Thursday' },
    { pattern: /\bfriday\b/i, value: 'Friday' },
    { pattern: /\bsaturday\b/i, value: 'Saturday' },
    { pattern: /\bsunday\b/i, value: 'Sunday' },
    { pattern: /\bin (\d+) days?\b/i, value: (m: RegExpMatchArray) => `in ${m[1]} days` },
    { pattern: /\bin (\d+) weeks?\b/i, value: (m: RegExpMatchArray) => `in ${m[1]} weeks` },
    { pattern: /\bjanuary \d+/i, value: (m: RegExpMatchArray) => m[0] },
    { pattern: /\bfebruary \d+/i, value: (m: RegExpMatchArray) => m[0] },
    { pattern: /\bmarch \d+/i, value: (m: RegExpMatchArray) => m[0] },
    { pattern: /\bapril \d+/i, value: (m: RegExpMatchArray) => m[0] },
    { pattern: /\bmay \d+/i, value: (m: RegExpMatchArray) => m[0] },
    { pattern: /\bjune \d+/i, value: (m: RegExpMatchArray) => m[0] },
    { pattern: /\bjuly \d+/i, value: (m: RegExpMatchArray) => m[0] },
    { pattern: /\baugust \d+/i, value: (m: RegExpMatchArray) => m[0] },
    { pattern: /\bseptember \d+/i, value: (m: RegExpMatchArray) => m[0] },
    { pattern: /\boctober \d+/i, value: (m: RegExpMatchArray) => m[0] },
    { pattern: /\bnovember \d+/i, value: (m: RegExpMatchArray) => m[0] },
    { pattern: /\bdecember \d+/i, value: (m: RegExpMatchArray) => m[0] }
  ];

  for (const { pattern, value } of dateKeywords) {
    const match = text.match(pattern);
    if (match) {
      if (typeof value === 'function') {
        return value(match);
      }
      return value;
    }
  }

  return undefined;
}

/**
 * Remove spoken hashtags and control tags from text
 */
function removeSpokenTags(text: string): string {
  let cleaned = text
    // Remove spoken hashtags (including variations with spaces)
    .replace(/hashtag\s+to\s+do/gi, '')  // Remove "hashtag to do" with space
    .replace(/hash\s+tag\s+to\s+do/gi, '')  // Remove "hash tag to do" with space
    .replace(/hashtag\s+[\w-]+/gi, '')  // Remove other hashtags
    .replace(/hash\s+tag\s+[\w-]+/gi, '')
    // Remove written hashtags
    .replace(/#[\w-]+/g, '')
    .replace(/#to\s+do/gi, '')  // Remove written "#to do" with space
    // Remove due date phrases (but keep the actual task text)
    .replace(/,?\s*(hashtag\s+)?due\s+date\s+[\w\s]+(?=\.|,|$)/gi, '')
    .replace(/deadline\s+[\w\s]+(?=\.|,|$)/gi, '')
    // Clean up extra whitespace and punctuation
    .replace(/\s+/g, ' ')
    .replace(/,\s*,/g, ',')  // Remove double commas
    .replace(/,\s*\./g, '.')  // Clean up comma before period
    .replace(/\s*,\s*$/g, '')  // Remove trailing comma
    .trim();

  return cleaned;
}

/**
 * Parse tags only from block content (for non-transcription use)
 */
export function parseBlockTags(blockContent: string, settings: any): Partial<TodoConfig> {
  const config: Partial<TodoConfig> = {
    extractedTags: []
  };

  // Check for written hashtags in block
  const tagPattern = /#(\w+)/g;
  let match;
  while ((match = tagPattern.exec(blockContent)) !== null) {
    config.extractedTags!.push(`#${match[1]}`);
  }

  return config;
}