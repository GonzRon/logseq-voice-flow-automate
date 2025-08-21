export async function transcribeAudio(blockContent: string): Promise {
  try {
    // Use the gpt3-openai plugin's whisper functionality
    const result = await logseq.App.invokeExternalPlugin(
      'logseq-plugin-gpt3-openai.models.whisperTranscribe',
      blockContent
    )

    if (result && typeof result === 'string') {
      return result
    }

    // Fallback: Try direct invocation
    const whisperResult = await logseq.App.invokeExternalPlugin(
      'logseq-plugin-gpt3-openai.commands.whisper',
      { content: blockContent }
    )

    return whisperResult?.transcription || null
  } catch (error) {
    console.error('Error invoking whisper transcription:', error)

    // Show helpful error message
    logseq.App.showMsg(
      'Failed to transcribe audio. Please ensure the GPT3-OpenAI plugin is installed and configured.',
      'error'
    )

    return null
  }
}