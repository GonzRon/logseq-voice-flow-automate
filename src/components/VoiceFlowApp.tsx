import React, { useState, useEffect } from 'react'
import { ConfigPanel } from './ConfigPanel'
import { StatusDisplay } from './StatusDisplay'

export const VoiceFlowApp: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false)
  // Status state removed since it's not being updated currently
  // Can be added back when status updates are implemented

  useEffect(() => {
    // Listen for UI visibility changes
    const handleVisibilityChange = ({ visible }: { visible: boolean }) => {
      setIsVisible(visible)
    }

    logseq.on('ui:visible:changed', handleVisibilityChange)

    return () => {
      logseq.off('ui:visible:changed', handleVisibilityChange)
    }
  }, [])

  if (!isVisible) return null

  return (
    <div className="voiceflow-container">
      <div className="voiceflow-header">
        <h2>🎤 VoiceFlow Automate</h2>
        <button
          className="close-btn"
          onClick={() => logseq.hideMainUI()}
        >
          ✕
        </button>
      </div>

      <div className="voiceflow-content">
        <StatusDisplay status="idle" message="" />
        <ConfigPanel />
      </div>
    </div>
  )
}