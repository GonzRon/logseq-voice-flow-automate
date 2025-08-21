import '@logseq/libs'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { VoiceFlowApp } from './components/VoiceFlowApp'
import { registerCommands } from './commands'
import { settingsSchema } from './settings'
import './styles/index.css'

// Main plugin entry point
async function main() {
  console.log('VoiceFlow Automate Plugin loaded')

  // Register settings
  logseq.useSettingsSchema(settingsSchema)

  // Mount React app
  const root = ReactDOM.createRoot(document.getElementById('app')!)
  root.render(
    <React.StrictMode>
      <VoiceFlowApp />
    </React.StrictMode>
  )

  // Register commands
  await registerCommands()

  // Set up UI
  logseq.setMainUIInlineStyle({
    zIndex: 11,
  })

  // Log successful initialization
  console.log('VoiceFlow Automate initialized successfully')
}

// Plugin model
function createModel() {
  return {
    show() {
      logseq.showMainUI({ autoFocus: true })
    },
    hide() {
      logseq.hideMainUI()
    }
  }
}

logseq.provideModel(createModel())
logseq.ready(main).catch(console.error)