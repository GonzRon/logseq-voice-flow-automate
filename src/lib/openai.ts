// src/lib/openai.ts - Direct OpenAI integration for VoiceFlow Automate
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import "@logseq/libs";
import { backOff } from "exponential-backoff";

export interface OpenAIOptions {
  apiKey: string;
  completionEngine?: string;
  temperature?: number;
  maxCompletionTokens?: number;
  completionEndpoint?: string;
}

const OpenAIDefaults = (apiKey: string): OpenAIOptions => ({
  apiKey,
  completionEngine: "gpt-5-nano",
  temperature: 1,
  maxCompletionTokens: 4000,
  completionEndpoint: "https://api.openai.com/v1"
});

const retryOptions = {
  numOfAttempts: 7,
  retry: (err: any) => {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      console.warn('retrying due to network error', err);
      return true;
    }

    if (!err.response || !err.response.data || !err.response.data.error) {
      return false;
    }
    if (err.response.status === 429) {
      const errorType = err.response.data.error.type;
      if (errorType === "insufficient_quota") {
        return false;
      }
      console.warn("Rate limit exceeded. Retrying...");
      return true;
    }
    return err.response.status >= 500;


  },
};

/**
 * Transcribe audio file using OpenAI Whisper API
 */
export async function whisperTranscribe(file: File, apiKey: string, endpoint?: string): Promise<string> {
  // Extract base URL without the specific endpoint
  let baseURL = endpoint || "https://api.openai.com/v1";
  // Remove /chat/completions or /completions if present to get clean base URL
  baseURL = baseURL.replace(/\/(chat\/)?completions\s*$/, '');
  // Also remove trailing slash if present
  baseURL = baseURL.replace(/\/+$/, '');

  const model = 'whisper-1';

  // Create FormData and append the file
  const formData = new FormData();
  formData.append('model', model);
  formData.append('file', file);

  // Send request to OpenAI API
  const response = await backOff(
    () => fetch(`${baseURL}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    }), retryOptions);

  // Check response status
  if (!response.ok) {
    const errorText = await response.text();
    console.error("[VoiceFlow] Whisper API error:", errorText);
    throw new Error(`Error transcribing audio: ${response.status} - ${errorText}`);
  }

  // Parse response and extract transcription
  const jsonResponse = await response.json();
  return jsonResponse.text;
}

/**
 * Generate text using OpenAI Chat API
 */
export async function generateText(
  input: string,
  openAiOptions: OpenAIOptions
): Promise<string | null> {
  const options = { ...OpenAIDefaults(openAiOptions.apiKey), ...openAiOptions };
  const engine = options.completionEngine!;

  // Extract base URL and construct chat completions endpoint
  let baseURL = options.completionEndpoint || "https://api.openai.com/v1";
  // Remove any existing endpoints
  baseURL = baseURL.replace(/\/(chat\/)?completions\s*$/, '').replace(/\/chat\s*$/, '');
  baseURL = baseURL.replace(/\/+$/, ''); // Remove trailing slash

  // Add /chat/completions endpoint
  const apiEndpoint = `${baseURL}/chat/completions`;

  try {
    // Build messages array
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: "You are a helpful assistant that summarizes and extracts information from transcripts." },
      { role: "user", content: input }
    ];

    // Make direct API call
    const response = await backOff(
      () => fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: engine,
          messages: messages,
          temperature: options.temperature,
          max_completion_tokens: options.maxCompletionTokens || 4000,
        }),
      }), retryOptions);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[VoiceFlow] Chat API error:", errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.choices?.[0]?.message?.content) {
      return data.choices[0].message.content.trim();
    }
    return null;
  } catch (e: any) {
    console.error("[VoiceFlow] OpenAI API error:", e);
    throw e;
  }
}

/**
 * Summarize text with a specific prompt
 */
export async function summarizeText(
  text: string,
  prompt: string,
  apiKey: string,
  options?: Partial<OpenAIOptions>
): Promise<string | null> {
  const fullPrompt = prompt.replace("<<<TRANSCRIPT>>>", text).replace("<<<NOTE>>>", text);

  const openAIOptions: OpenAIOptions = {
    apiKey,
    temperature: 1,
    maxCompletionTokens: 500,
    ...options
  };

  return generateText(fullPrompt, openAIOptions);
}

/**
 * Extract tasks from text using AI
 */
export async function extractTasks(
  text: string,
  apiKey: string,
  options?: Partial<OpenAIOptions>
): Promise<any> {
  const prompt = `You convert a voice note into Todoist tasks. Return STRICT JSON with this schema:
{
  "mode": "single" | "hierarchy",
  "parent": { "title": "<string>" } | null,
  "tasks": [
    { "title": "<string>", "due": "<string|null>" }
  ]
}

Voice note: ${text}

Only output valid JSON, no commentary or markdown.`;

  const openAIOptions: OpenAIOptions = {
    apiKey,
    temperature: 1,
    maxCompletionTokens: 4000,
    ...options
  };

  const result = await generateText(prompt, openAIOptions);

  if (!result) return null;

  try {
    // Clean up the response - remove markdown code blocks if present
    const cleaned = result.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("[VoiceFlow] Failed to parse task JSON:", e, "Raw:", result);
    // Return a simple task if JSON parsing fails
    return {
      mode: "single",
      parent: null,
      tasks: [{ title: text.substring(0, 100), due: null }]
    };
  }
}