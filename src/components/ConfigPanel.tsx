// src/components/ConfigPanel.tsx - Configuration panel for VoiceFlow Automate
import React, { useState, useEffect } from 'react'

export const ConfigPanel: React.FC = () => {
  const [config, setConfig] = useState<any>({})
  const [projectMappings, setProjectMappings] = useState<string>('{}')
  const [apiKeyVisible, setApiKeyVisible] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    const settings = logseq.settings
    setConfig(settings || {})
    if (settings?.projectMappings) {
      setProjectMappings(JSON.stringify(settings.projectMappings, null, 2))
    }
  }

  const saveSettings = async () => {
    try {
      const mappings = JSON.parse(projectMappings)
      await logseq.updateSettings({
        ...config,
        projectMappings: mappings
      })
      logseq.App.showMsg('Settings saved successfully', 'success')
    } catch (error) {
      logseq.App.showMsg('Invalid JSON in project mappings', 'error')
    }
  }

  const testOpenAI = async () => {
    if (!config.openAIKey) {
      logseq.App.showMsg('Please configure your OpenAI API key first', 'warning')
      return
    }

    try {
      // Test the API key with a minimal request
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${config.openAIKey}`
        }
      })

      if (response.ok) {
        logseq.App.showMsg('✅ OpenAI API key is valid', 'success')
      } else if (response.status === 401) {
        logseq.App.showMsg('❌ Invalid API key', 'error')
      } else {
        logseq.App.showMsg('❌ API test failed', 'error')
      }
    } catch (error) {
      logseq.App.showMsg('❌ Network error testing API', 'error')
    }
  }

  const testTodoist = async () => {
    try {
      const result = await logseq.App.invokeExternalPlugin(
        'logseq-todoist-plugin.models.test',
        {}
      )
      logseq.App.showMsg(
        result ? '✅ Todoist plugin connected' : '❌ Todoist plugin not found',
        result ? 'success' : 'error'
      )
    } catch (error) {
      logseq.App.showMsg('❌ Todoist plugin not installed', 'warning')
    }
  }

  return (
    <div className="config-panel">
      <h3>Configuration</h3>

      <div className="config-section">
        <h4>OpenAI Setup (Required)</h4>
        <div className="api-key-section">
          <label>
            API Key:
            <div className="api-key-input-group">
              <input
                type={apiKeyVisible ? "text" : "password"}
                value={config.openAIKey || ''}
                onChange={(e) => setConfig({
                  ...config,
                  openAIKey: e.target.value
                })}
                placeholder="sk-..."
              />
              <button
                className="toggle-visibility"
                onClick={() => setApiKeyVisible(!apiKeyVisible)}
              >
                {apiKeyVisible ? '🙈' : '👁️'}
              </button>
            </div>
          </label>
          <button onClick={testOpenAI} className="test-btn">
            Test OpenAI Connection
          </button>
        </div>

        <label>
          Model:
          <select
            value={config.openAICompletionEngine || 'gpt-3.5-turbo'}
            onChange={(e) => setConfig({
              ...config,
              openAICompletionEngine: e.target.value
            })}
          >
            <option value="gpt-4o">GPT-4o (Fast, multimodal, newest default)</option>
            <option value="gpt-4o-latest">GPT-4o Latest</option>
            <option value="gpt-4.1">GPT-4.1 (Advanced, large context, better coding/instructions)</option>
            <option value="gpt-4.1-mini">GPT-4.1 Mini (Fast, cost-efficient)</option>
            <option value="gpt-4.1-nano">GPT-4.1 Nano (Fastest, low-cost, high efficiency)</option>
            <option value="gpt-5">GPT-5 (Best reasoning, multimodal, newest release)</option>
            <option value="gpt-5-mini">GPT-5 Mini (Faster, less expensive for well-defined tasks)</option>
            <option value="gpt-5-nano">GPT-5 Nano (Fastest, most affordable GPT-5 variant)</option>
          </select>
        </label>
      </div>

      <div className="config-section">
        <h4>Todoist Integration (Optional)</h4>
        <button onClick={testTodoist} className="test-btn">
          Test Todoist Connection
        </button>

        <div className="project-mappings">
          <p className="help-text">
            Map hashtags to Todoist projects (JSON format)
          </p>
          <textarea
            value={projectMappings}
            onChange={(e) => setProjectMappings(e.target.value)}
            placeholder='{
  "#work": {"id": "12345", "name": "Work"},
  "#personal": {"id": "67890", "name": "Personal"}
}'
            rows={6}
          />
        </div>
      </div>

      <div className="config-section">
        <h4>Processing Options</h4>
        <label>
          <input
            type="checkbox"
            checked={config.hierarchicalTasks}
            onChange={(e) => setConfig({
              ...config,
              hierarchicalTasks: e.target.checked
            })}
          />
          Create hierarchical tasks in AI mode
        </label>

        <label>
          <input
            type="checkbox"
            checked={config.createTranscriptionPage !== false}
            onChange={(e) => setConfig({
              ...config,
              createTranscriptionPage: e.target.checked
            })}
          />
          Create new page for transcriptions
        </label>

        <label>
          <input
            type="checkbox"
            checked={config.autoOpenCreatedPage}
            onChange={(e) => setConfig({
              ...config,
              autoOpenCreatedPage: e.target.checked
            })}
          />
          Auto-open created pages
        </label>
      </div>

      <div className="config-section">
        <label>
          Default Mode:
          <select
            value={config.defaultTranscriptionMode || 'literal'}
            onChange={(e) => setConfig({
              ...config,
              defaultTranscriptionMode: e.target.value
            })}
          >
            <option value="literal">Literal Transcription</option>
            <option value="ai">AI Summarization</option>
          </select>
        </label>
      </div>

      <button className="save-btn" onClick={saveSettings}>
        Save Settings
      </button>

      <div className="config-footer">
        <p className="version">VoiceFlow Automate v2.0 - Standalone Edition</p>
        <p className="help-text">
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
            Get OpenAI API Key →
          </a>
        </p>
      </div>
    </div>
  )
}