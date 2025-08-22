// src/components/VoiceFlowApp.tsx - Main UI component for VoiceFlow Automate
import React, { useState, useEffect } from 'react'
import { ConfigPanel } from './ConfigPanel'
import { StatusDisplay } from './StatusDisplay'

export const VoiceFlowApp: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [status] = useState<{
    type: 'idle' | 'processing' | 'success' | 'error'
    message: string
  }>({ type: 'idle', message: '' })

  useEffect(() => {
    // Listen for UI visibility changes
    const handleVisibilityChange = ({ visible }: { visible: boolean }) => {
      setIsVisible(visible)
    }

    // Type assertion for the event handler
    logseq.on('ui:visible:changed' as any, handleVisibilityChange as any)

    return () => {
      logseq.off('ui:visible:changed' as any, handleVisibilityChange as any)
    }
  }, [])

  if (!isVisible) return null

  return (
    <div className="voiceflow-container">
      <div className="voiceflow-header">
        <h2>🎤 VoiceFlow Automate v2.0</h2>
        <button
          className="close-btn"
          onClick={() => logseq.hideMainUI()}
        >
          ✕
        </button>
      </div>

      <div className="voiceflow-content">
        <div className="voiceflow-info">
          <p>Standalone voice transcription plugin for Logseq</p>
          <p className="version-info">No external dependencies required!</p>
        </div>
        <StatusDisplay status={status.type} message={status.message} />
        <ConfigPanel />
      </div>
    </div>
  )
}