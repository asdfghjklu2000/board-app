import { useRef } from 'react'
import { getAvatarColor, getInitials, formatDate } from '../utils'
import './WorkItemCard.css'

const STATES = ['To Do', 'In Progress', 'Done']

const STATE_BORDER = {
  Done: '#ffb900',
  'In Progress': '#5c2d91',
}

const STATE_LABEL = {
  'To Do': 'To Do',
  'In Progress': 'In Progress',
  Done: 'Done',
}

export default function WorkItemCard({ task, dragging, onDragStart, onDragEnd, isMobile, onStateChange, onEdit }) {
  const borderColor = STATE_BORDER[task.state] || '#0078d4'
  const href = `https://dev.azure.com/laash/LaaS/_workitems/edit/${task.id}`
  const wasDragging = useRef(false)

  const cardBody = (
    <>
      <div className="wic-header">
        <span className="wic-icon">{task.state === 'Done' ? '✅' : '📋'}</span>
        <span className="wic-title">{task.title}</span>
        <div className="wic-actions">
          {onEdit && (
            <button
              type="button"
              className="wic-action-btn"
              title="Edit work item"
              onClick={e => {
                e.stopPropagation()
                onEdit()
              }}
            >✎</button>
          )}
          <a
            className="wic-link"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in Azure DevOps"
            onClick={e => e.stopPropagation()}
          >↗</a>
        </div>
      </div>

      <div className="wic-body">
        {task.assignedTo && (
          <div className="wic-row">
            <span
              className="wic-avatar"
              style={{ backgroundColor: getAvatarColor(task.assignedTo) }}
              title={task.assignedTo}
            >
              {getInitials(task.assignedTo)}
            </span>
            <span className="wic-assignee" title={task.assignedTo}>
              {task.assignedTo}
            </span>
          </div>
        )}

        <div className="wic-meta">
          <span className="wic-label">Actual H…</span>
          <span className="wic-value">{task.actualHours || 0}</span>
        </div>

        {task.estimatedHours > 0 && (
          <div className="wic-meta">
            <span className="wic-label">Estimate…</span>
            <span className="wic-value">{task.estimatedHours}</span>
          </div>
        )}

        {task.startDate && (
          <div className="wic-meta">
            <span className="wic-label">Start Date</span>
            <span className="wic-value">{formatDate(task.startDate)}</span>
          </div>
        )}

        {task.dueDate && (
          <div className="wic-meta">
            <span className="wic-label">Due Date</span>
            <span className="wic-value">{formatDate(task.dueDate)}</span>
          </div>
        )}
      </div>

      {isMobile && onStateChange && (
        <div className="wic-state-btns">
          {STATES.map(s => (
            <button
              key={s}
              className={`wic-state-btn${task.state === s ? ' wic-state-btn--active' : ''}`}
              onClick={e => { e.stopPropagation(); if (task.state !== s) onStateChange(s) }}
            >
              {STATE_LABEL[s]}
            </button>
          ))}
        </div>
      )}
    </>
  )

  if (isMobile) {
    return (
      <div
        className="wic"
        style={{ borderLeftColor: borderColor }}
      >
        {cardBody}
      </div>
    )
  }

  return (
    <div
      className={`wic${dragging ? ' wic--dragging' : ''}`}
      style={{ borderLeftColor: borderColor }}
      draggable
      onDragStart={e => {
        e.dataTransfer.effectAllowed = 'move'
        wasDragging.current = false
        onDragStart(task.id)
      }}
      onDragEnd={e => {
        wasDragging.current = true
        window.getSelection()?.removeAllRanges()
        onDragEnd(e)
        setTimeout(() => { wasDragging.current = false }, 300)
      }}
      onClick={e => {
        if (wasDragging.current) {
          e.preventDefault()
          e.stopPropagation()
        }
      }}
    >
      {cardBody}
    </div>
  )
}
