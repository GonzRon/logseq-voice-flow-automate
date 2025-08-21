import React, { useState, useEffect } from 'react'

export const ConfigPanel: React.FC = () => {
  const [config, setConfig] = useState<any>({})
  const [projectMappings, setProjectMappings] = useState<string>('{}')

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

  const testIntegration = async (plugin: 'gpt3' | 'todoist') => {
    try {
      if (plugin === 'gpt3') {
        const result = await logseq.App.invokeExternalPlugin(
          'logseq-plugin-gpt3-openai.models.test',
          {}
        )
        logseq.App.showMsg(
          result ? '✅ GPT3-OpenAI plugin connected' : '❌ GPT3-OpenAI plugin not found',
          result ? 'success' : 'error'
        )
      } else {
        const result = await logseq.App.invokeExternalPlugin(
          'logseq-todoist-plugin.models.test',
          {}
        )
        logseq.App.showMsg(
          result ? '✅ Todoist plugin connected' : '❌ Todoist plugin not found',
          result ? 'success' : 'error'
        )
      }
    } catch (error) {
      logseq.App.showMsg(`❌ Plugin not found or not configured`, 'error')
    }
  }

  return (
    <div className="config-panel">
      <h3>Configuration</h3>

      <div className="config-section">
        <h4>Integration Status</h4>
        <div className="integration-buttons">
          <button onClick={() => testIntegration('gpt3')}>
            Test GPT3-OpenAI
          </button>
          <button onClick={() => testIntegration('todoist')}>
            Test Todoist
          </button>
        </div>
      </div>

      <div className="config-section">
        <h4>Project Mappings</h4>
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

      <div className="config-section">
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
      </div>

      <div className="config-section">
        <label>
          Default Mode:
          <select
            value={config.defaultTranscriptionMode}
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
    </div>
  )
}