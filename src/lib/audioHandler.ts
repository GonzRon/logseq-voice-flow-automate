// src/lib/audioHandler.ts - Audio file handling for VoiceFlow Automate
import "@logseq/libs";

export interface AudioConversionConfig {
  converterHost?: string;
  converterPort?: number;
  timeout?: number;
}

export class AudioConverter {
  private serverUrl: string;
  private timeout: number;

  constructor(config: AudioConversionConfig = {}) {
    const host = config.converterHost || '127.0.0.1';
    const port = config.converterPort || 3456;
    this.timeout = config.timeout || 30000;
    this.serverUrl = `http://${host}:${port}`;
  }

  async checkServerHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.serverUrl}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return data.status === 'running' && data.ffmpeg_available;
      }
      return false;
    } catch (error) {
      console.error('AAC Converter server health check failed:', error);
      return false;
    }
  }

  async convertAACToM4A(aacBlob: Blob, filename: string): Promise<Blob> {
    const formData = new FormData();
    formData.append('file', aacBlob, filename);
    formData.append('output_format', 'm4a');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.serverUrl}/convert`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Conversion failed: ${response.status} - ${errorText}`);
      }

      return await response.blob();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Conversion timed out');
      }
      console.error('AAC to M4A conversion failed:', error);
      throw error;
    }
  }
}

/**
 * Get audio file from Logseq block content with AAC support
 */
export async function getAudioFile(content: string): Promise<File | null> {
  // Updated regex to include AAC files
  const regex = /!\[.*?\]\((.+\.(mp3|mp4|mpeg|mpga|m4a|wav|webm|aac))\)/i;
  const path = (await logseq.App.getCurrentGraph())?.path;
  const match = regex.exec(content);

  if (!match || !match[1]) {
    console.log('No audio file found in content:', content);
    return null;
  }

  // Get extension from file path
  const extension = match[1].split(".").pop()?.toLowerCase();
  if (!extension) {
    console.error('No file extension found');
    return null;
  }

  // Remove ../ from path and clean up
  const filepath = match[1].replace("../", "").replace(/^assets\//, "assets/");
  // Get filename from path
  const filename = filepath.split('/').pop() || `audio.${extension}`;
  const fullFilename = "file://" + path + "/" + filepath;

  console.log('[VoiceFlow] Processing audio file:', { filepath, filename, extension, fullFilename });

  try {
    const response = await fetch(fullFilename);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio file: ${response.status} ${response.statusText}`);
    }

    const audioBlob = await response.blob();
    console.log('[VoiceFlow] Audio blob loaded:', { size: audioBlob.size, type: audioBlob.type });

    // If it's an AAC file, try to convert it
    if (extension === 'aac') {
      return await handleAACFile(audioBlob, filename);
    }

    // For non-AAC files, return as-is
    const file = new File([audioBlob], filename, { type: `audio/${extension}` });
    return file;

  } catch (error) {
    console.error('[VoiceFlow] Failed to get audio file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logseq.App.showMsg(`Failed to load audio file: ${errorMessage}`, "error");
    return null;
  }
}

/**
 * Handle AAC file conversion
 */
async function handleAACFile(aacBlob: Blob, filename: string): Promise<File | null> {
  try {
    // Get converter configuration from settings
    const converterHost = logseq.settings?.["converterHost"] || '127.0.0.1';
    const converterPort = logseq.settings?.["converterPort"] || 3456;

    console.log('[VoiceFlow] AAC conversion config:', { converterHost, converterPort });

    const converter = new AudioConverter({
      converterHost,
      converterPort,
      timeout: 60000
    });

    // Check if server is available
    logseq.App.showMsg("Checking AAC converter availability...", "info");
    const serverAvailable = await converter.checkServerHealth();

    if (!serverAvailable) {
      const errorMsg = `AAC Converter not available. Please ensure the converter service is running at ${converterHost}:${converterPort}`;
      console.warn('[VoiceFlow]', errorMsg);
      logseq.App.showMsg(errorMsg, "warning");

      // Return AAC file as-is and let Whisper handle it
      console.log('[VoiceFlow] Attempting to send AAC directly to Whisper API');
      return new File([aacBlob], filename, { type: 'audio/aac' });
    }

    // Convert the file
    logseq.App.showMsg("Converting AAC to M4A...", "info");
    const m4aBlob = await converter.convertAACToM4A(aacBlob, filename);
    const m4aFilename = filename.replace(/\.aac$/i, '.m4a');

    console.log('[VoiceFlow] AAC conversion successful:', {
      originalSize: aacBlob.size,
      convertedSize: m4aBlob.size
    });

    logseq.App.showMsg("AAC conversion successful!", "success");
    return new File([m4aBlob], m4aFilename, { type: 'audio/m4a' });

  } catch (error) {
    console.error('[VoiceFlow] AAC conversion failed:', error);
    // const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Try sending AAC directly as fallback
    console.log('[VoiceFlow] Fallback: sending AAC directly to Whisper');
    logseq.App.showMsg("AAC conversion failed, attempting direct transcription...", "warning");

    return new File([aacBlob], filename, { type: 'audio/aac' });
  }
}