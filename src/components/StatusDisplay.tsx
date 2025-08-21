import React from 'react'

interface StatusDisplayProps {
  status: 'idle' | 'processing' | 'success' | 'error'
  message: string
}

export const StatusDisplay: React.FC<StatusDisplayProps> = ({ status, message }) => {
  if (status === 'idle') return null

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return '⏳'
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      default:
        return ''
    }
  }

  const getStatusClass = () => {
    switch (status) {
      case 'processing':
        return 'status-processing'
      case 'success':
        return 'status-success'
      case 'error':
        return 'status-error'
      default:
        return ''
    }
  }

  return (
    <div className={`status-display ${getStatusClass()}`}>
      <span className="status-icon">{getStatusIcon()}</span>
      <span className="status-message">{message}</span>
    </div>
  )
}