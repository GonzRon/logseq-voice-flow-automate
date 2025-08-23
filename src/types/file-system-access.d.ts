// src/lib/audioHandler.ts - Enhanced audio file handling with replacement and deletion
import "@logseq/libs";

// Type definitions for File System Access API
declare global {
  interface Window {
    showDirectoryPicker(options?: {
      id?: string;
      mode?: 'read' | 'readwrite';
      startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
    }): Promise<FileSystemDirectoryHandle>;
  }

  interface FileSystemDirectoryHandle {
    kind: 'directory';
    name: string;
    getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
    getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
    removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
  }

  interface FileSystemFileHandle {
    kind: 'file';
    name: string;
    getFile(): Promise<File>;
    createWritable(): Promise<FileSystemWritableFileStream>;
  }

  interface FileSystemWritableFileStream extends WritableStream {
    write(data: BufferSource | Blob | string): Promise<void>;
    close(): Promise<void>;
  }
}

export interface AudioConversionConfig {
  converterHost?: string;
  converterPort?: number;
  timeout?: number;
}

export interface AudioFileResult {
  file: File;
  originalPath?: string;
  convertedPath?: string;
  wasConverted: boolean;
}

// Store directory handle for file operations
let graphDirHandle: FileSystemDirectoryHandle | null = null;

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

  async convertAACToWebM(aacBlob: Blob, filename: string): Promise<Blob> {
    const formData = new FormData();
    formData.append('file', aacBlob, filename);
    formData.append('output_format', 'webm');

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
      console.error('AAC to WebM conversion failed:', error);
      throw error;
    }
  }
}

/**
 * Get or request directory handle for the graph
 */
async function getGraphDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    // If we already have a handle, verify it still works
    if (graphDirHandle) {
      // Try to verify the handle is still valid
      try {
        await graphDirHandle.getDirectoryHandle('assets');
        return graphDirHandle;
      } catch {
        // Handle is no longer valid
        graphDirHandle = null;
      }
    }

    // Check if we should auto-request permission
    if (!logseq.settings?.["autoRequestFileAccess"]) {
      return null;
    }

    // Request directory access
    logseq.App.showMsg("Please select your Logseq graph folder to enable file management", "info");

    const dirHandle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents'
    });

    if (dirHandle.kind !== 'directory') {
      logseq.App.showMsg('Please select a directory', 'error');
      return null;
    }

    // Verify this is a Logseq graph directory (should have assets folder)
    try {
      await dirHandle.getDirectoryHandle('assets');
      graphDirHandle = dirHandle;
      logseq.App.showMsg('File access granted! AAC files can now be automatically managed.', 'success');
      return dirHandle;
    } catch {
      logseq.App.showMsg('Selected directory does not appear to be a Logseq graph (no assets folder found)', 'error');
      return null;
    }

  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log('[VoiceFlow] User cancelled directory selection');
    } else {
      console.error('[VoiceFlow] Failed to get directory handle:', error);
    }
    return null;
  }
}

/**
 * Delete a file using File System Access API
 */
async function deleteFileFromAssets(filepath: string): Promise<boolean> {
  try {
    const dirHandle = await getGraphDirectoryHandle();
    if (!dirHandle) {
      console.log('[VoiceFlow] No directory handle available for file deletion');
      return false;
    }

    // Parse the file path (e.g., "assets/2025-08-22-19-50-45.aac")
    const pathParts = filepath.split('/');

    // Navigate to the correct directory
    let currentHandle: FileSystemDirectoryHandle = dirHandle;
    for (let i = 0; i < pathParts.length - 1; i++) {
      currentHandle = await currentHandle.getDirectoryHandle(pathParts[i]);
    }

    // Delete the file
    const fileName = pathParts[pathParts.length - 1];
    await currentHandle.removeEntry(fileName);

    console.log(`[VoiceFlow] Successfully deleted file: ${filepath}`);
    return true;

  } catch (error) {
    console.error('[VoiceFlow] Failed to delete file:', error);
    return false;
  }
}

/**
 * Save a file to Logseq assets folder using File System Access API
 */
async function saveToAssets(blob: Blob, filename: string): Promise<string | null> {
  try {
    const dirHandle = await getGraphDirectoryHandle();
    if (!dirHandle) {
      console.log('[VoiceFlow] No directory handle available for file saving');
      return null;
    }

    // Get the assets directory
    const assetsHandle = await dirHandle.getDirectoryHandle('assets');

    // Create the file
    const fileHandle = await assetsHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();

    // Write the blob
    await writable.write(blob);
    await writable.close();

    console.log('[VoiceFlow] Successfully saved file to assets:', filename);
    return `assets/${filename}`;

  } catch (error) {
    console.error('[VoiceFlow] Failed to save to assets:', error);
    return null;
  }
}

/**
 * Get audio file from Logseq block content with AAC support and optional replacement
 */
export async function getAudioFileWithReplacement(
  content: string,
  blockUuid: string
): Promise<AudioFileResult | null> {
  // Check if replacement behavior is enabled
  const enableReplacement = logseq.settings?.["enableAACReplacement"] !== false; // Default true

  // If replacement is disabled, use original behavior
  if (!enableReplacement) {
    console.log('[VoiceFlow] AAC replacement disabled, using original behavior');
    const file = await getAudioFileOriginal(content);
    if (file) {
      return {
        file,
        wasConverted: false
      };
    }
    return null;
  }

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

    // If it's an AAC file, convert and replace
    if (extension === 'aac') {
      return await handleAACFileWithReplacement(audioBlob, filename, filepath, blockUuid);
    }

    // For non-AAC files, return as-is
    const file = new File([audioBlob], filename, { type: `audio/${extension}` });
    return {
      file,
      originalPath: filepath,
      wasConverted: false
    };

  } catch (error) {
    console.error('[VoiceFlow] Failed to get audio file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logseq.App.showMsg(`Failed to load audio file: ${errorMessage}`, "error");
    return null;
  }
}

/**
 * Original audio file handler (no replacement)
 */
async function getAudioFileOriginal(content: string): Promise<File | null> {
  const regex = /!\[.*?\]\((.+\.(mp3|mp4|mpeg|mpga|m4a|wav|webm|aac))\)/i;
  const path = (await logseq.App.getCurrentGraph())?.path;
  const match = regex.exec(content);

  if (!match || !match[1]) {
    console.log('No audio file found in content:', content);
    return null;
  }

  const extension = match[1].split(".").pop()?.toLowerCase();
  if (!extension) {
    console.error('No file extension found');
    return null;
  }

  const filepath = match[1].replace("../", "").replace(/^assets\//, "assets/");
  const filename = filepath.split('/').pop() || `audio.${extension}`;
  const fullFilename = "file://" + path + "/" + filepath;

  console.log('[VoiceFlow] Processing audio file (original mode):', { filepath, filename, extension });

  try {
    const response = await fetch(fullFilename);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio file: ${response.status} ${response.statusText}`);
    }

    const audioBlob = await response.blob();
    console.log('[VoiceFlow] Audio blob loaded:', { size: audioBlob.size, type: audioBlob.type });

    // If it's an AAC file, convert but don't replace
    if (extension === 'aac') {
      const converterHost = logseq.settings?.["converterHost"] || '127.0.0.1';
      const converterPort = logseq.settings?.["converterPort"] || 3456;

      const converter = new AudioConverter({
        converterHost,
        converterPort,
        timeout: 60000
      });

      logseq.App.showMsg("Checking AAC converter availability...", "info");
      const serverAvailable = await converter.checkServerHealth();

      if (!serverAvailable) {
        const errorMsg = `AAC Converter not available at ${converterHost}:${converterPort}`;
        console.warn('[VoiceFlow]', errorMsg);
        logseq.App.showMsg(errorMsg, "warning");
        return null;
      }

      logseq.App.showMsg("Converting AAC to WebM...", "info");
      const webmBlob = await converter.convertAACToWebM(audioBlob, filename);
      const webmFilename = filename.replace(/\.aac$/i, '.webm');

      console.log('[VoiceFlow] AAC conversion successful (original mode)');
      logseq.App.showMsg("AAC conversion successful!", "success");

      return new File([webmBlob], webmFilename, { type: 'audio/webm' });
    }

    // For non-AAC files, return as-is
    return new File([audioBlob], filename, { type: `audio/${extension}` });

  } catch (error) {
    console.error('[VoiceFlow] Failed to get audio file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logseq.App.showMsg(`Failed to load audio file: ${errorMessage}`, "error");
    return null;
  }
}

/**
 * Handle AAC file conversion and replacement
 */
async function handleAACFileWithReplacement(
  aacBlob: Blob,
  filename: string,
  originalPath: string,
  blockUuid: string
): Promise<AudioFileResult | null> {
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
      logseq.App.showMsg("AAC conversion failed...", "error");
      return null;
    }

    // Convert the file
    logseq.App.showMsg("Converting AAC to WebM...", "info");
    const webmBlob = await converter.convertAACToWebM(aacBlob, filename);
    const webmFilename = filename.replace(/\.aac$/i, '.webm');
    const webmPath = originalPath.replace(/\.aac$/i, '.webm');

    console.log('[VoiceFlow] AAC conversion successful:', {
      originalSize: aacBlob.size,
      convertedSize: webmBlob.size
    });

    // Try to save the WebM file to assets
    const savedPath = await saveToAssets(webmBlob, webmFilename);

    // Update the block with the new file reference if enabled
    const shouldUpdateBlock = logseq.settings?.["replaceAACWithWebM"] !== false; // Default true
    if (blockUuid && shouldUpdateBlock) {
      await updateBlockAudioReference(blockUuid, originalPath, webmPath);
    }

    // Delete the original AAC file if enabled and we have file access
    const shouldDeleteOriginal = logseq.settings?.["deleteOriginalAAC"] === true;
    if (shouldDeleteOriginal && savedPath) {
      const deleted = await deleteFileFromAssets(originalPath);
      if (deleted) {
        logseq.App.showMsg("✅ AAC converted to WebM and original file deleted!", "success");
      } else {
        logseq.App.showMsg("✅ AAC converted to WebM! (Original file kept - no file access)", "success");
      }
    } else {
      logseq.App.showMsg("✅ AAC conversion successful!", "success");
    }

    return {
      file: new File([webmBlob], webmFilename, { type: 'audio/webm' }),
      originalPath: originalPath,
      convertedPath: savedPath || webmPath,
      wasConverted: true
    };

  } catch (error) {
    console.error('[VoiceFlow] AAC conversion failed:', error);
    logseq.App.showMsg("AAC conversion failed...", "error");
    return null;
  }
}

/**
 * Update block content to replace audio file reference
 */
async function updateBlockAudioReference(
  blockUuid: string,
  oldPath: string,
  newPath: string
): Promise<void> {
  try {
    const block = await logseq.Editor.getBlock(blockUuid);
    if (!block) {
      console.error('[VoiceFlow] Block not found for audio reference update');
      return;
    }

    // Create the new reference - maintaining the same format
    const oldReference = block.content.match(/!\[.*?\]\((.+?)\)/)?.[0];
    if (!oldReference) {
      console.error('[VoiceFlow] Could not find audio reference in block');
      return;
    }

    // Replace the old path with the new path
    const newReference = oldReference.replace(oldPath, newPath);
    const updatedContent = block.content.replace(oldReference, newReference);

    // Update the block
    await logseq.Editor.updateBlock(blockUuid, updatedContent);
    console.log(`[VoiceFlow] Updated block audio reference from ${oldPath} to ${newPath}`);

  } catch (error) {
    console.error('[VoiceFlow] Failed to update block audio reference:', error);
  }
}

/**
 * Initialize file access on plugin load
 */
export async function initializeFileAccess(): Promise<void> {
  if (logseq.settings?.["autoRequestFileAccess"]) {
    // Small delay to ensure UI is ready
    setTimeout(async () => {
      const handle = await getGraphDirectoryHandle();
      if (handle) {
        console.log('[VoiceFlow] File access initialized successfully');
      }
    }, 1000);
  }
}

/**
 * Get audio file from Logseq block content (backward compatibility)
 */
export async function getAudioFile(content: string): Promise<File | null> {
  // For backward compatibility, use the current block's UUID if available
  const current = await logseq.Editor.getCurrentBlock();
  const blockUuid = current?.uuid || '';

  const result = await getAudioFileWithReplacement(content, blockUuid);
  return result?.file || null;
}