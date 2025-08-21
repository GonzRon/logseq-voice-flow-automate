import React, { useState, useEffect } from 'react'
import { ConfigPanel } from './ConfigPanel'
import { StatusDisplay } from './StatusDisplay'

export const VoiceFlowApp: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleShow = () => setIsVisible(true)
    const handleHide = () => setIsVisible(false)

    // Listen for UI events
    logseq.on('ui:visible:changed', ({ visible }) => {
      setIsVisible(visible)
    })

    // Listen for processing status updates
    logseq.on('voiceflow:status', ({ status, message }) => {
      setStatus(status)
      setMessage(message)
    })

    return () => {
      logseq.off('ui:visible:changed', handleShow)
      logseq.off('voiceflow:status', handleHide)
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
        <StatusDisplay status={status} message={message} />
        <ConfigPanel />
      </div>
    </div>
  )
}