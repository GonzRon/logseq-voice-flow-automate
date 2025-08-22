// src/components/ConfigPanel.tsx - Configuration panel for VoiceFlow Automate
import React, { useState, useEffect } from 'react'
import { testTodoistIntegration, getTodoistProjects } from '../lib/todoistService'

export const ConfigPanel: React.FC = () => {
  const [config, setConfig] = useState<any>({})
  const [projectMappings, setProjectMappings] = useState<string>('{}')
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const [todoistKeyVisible, setTodoistKeyVisible] = useState(false)
  const [availableProjects, setAvailableProjects] = useState<any[]>([])

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    const settings = logseq.settings
    setConfig(settings || {})
    if (settings?.projectMappings) {
      setProjectMappings(JSON.stringify(settings.projectMappings, null, 2))
    }

    // Load available Todoist projects if API token exists
    if (settings?.todoistApiToken) {
      const projects = await getTodoistProjects()
      setAvailableProjects(projects)
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

      // Reload projects if Todoist token changed
      if (config.todoistApiToken) {
        const projects = await getTodoistProjects()
        setAvailableProjects(projects)
      }
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
    if (!config.todoistApiToken) {
      logseq.App.showMsg('Please configure your Todoist API token first', 'warning')
      return
    }

    const success = await testTodoistIntegration()
    if (success) {
      // Reload available projects
      const projects = await getTodoistProjects()
      setAvailableProjects(projects)
    }
  }

  const loadProjectsForMapping = async () => {
    if (!config.todoistApiToken) {
      logseq.App.showMsg('Configure Todoist API token first', 'warning')
      return
    }

    const projects = await getTodoistProjects()
    if (projects.length > 0) {
      // Generate example mapping
      const exampleMapping: any = {}
      projects.slice(0, 3).forEach(p => {
        const tag = `#${p.name.toLowerCase().replace(/\s+/g, '-')}`
        exampleMapping[tag] = { id: p.id, name: p.name }
      })
      setProjectMappings(JSON.stringify(exampleMapping, null, 2))
      logseq.App.showMsg(`Loaded ${projects.length} projects. Edit tags as needed.`, 'success')
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
            <option value="gpt-4o">GPT-4o (Fast, multimodal)</option>
            <option value="gpt-4o-mini">GPT-4o Mini (Efficient)</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Fast, affordable)</option>
          </select>
        </label>
      </div>

      <div className="config-section">
        <h4>Todoist Integration (Optional)</h4>
        <div className="api-key-section">
          <label>
            API Token:
            <div className="api-key-input-group">
              <input
                type={todoistKeyVisible ? "text" : "password"}
                value={config.todoistApiToken || ''}
                onChange={(e) => setConfig({
                  ...config,
                  todoistApiToken: e.target.value
                })}
                placeholder="Your Todoist API token..."
              />
              <button
                className="toggle-visibility"
                onClick={() => setTodoistKeyVisible(!todoistKeyVisible)}
              >
                {todoistKeyVisible ? '🙈' : '👁️'}
              </button>
            </div>
          </label>
          <div className="help-text">
            <a href="https://todoist.com/app/settings/integrations/developer" target="_blank" rel="noopener noreferrer">
              Get your Todoist API token →
            </a>
          </div>
          <button onClick={testTodoist} className="test-btn">
            Test Todoist Connection
          </button>
        </div>

        {availableProjects.length > 0 && (
          <div className="available-projects">
            <p className="help-text">
              Found {availableProjects.length} Todoist projects
            </p>
          </div>
        )}

        <div className="project-mappings">
          <p className="help-text">
            Map hashtags to Todoist projects (JSON format)
          </p>
          <button onClick={loadProjectsForMapping} className="load-projects-btn">
            Load Projects for Mapping
          </button>
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

        <label>
          Todo Trigger Tags:
          <input
            type="text"
            value={config.todoTriggerTags || '#todo, #task'}
            onChange={(e) => setConfig({
              ...config,
              todoTriggerTags: e.target.value
            })}
            placeholder="#todo, #task, #to-do"
          />
        </label>
      </div>

      <button className="save-btn" onClick={saveSettings}>
        Save Settings
      </button>

      <div className="config-footer">
        <p className="version">VoiceFlow Automate v2.0 - Standalone Edition</p>
        <p className="help-text">
          Direct Todoist API integration - no external plugins required!
        </p>
      </div>
    </div>
  )
}