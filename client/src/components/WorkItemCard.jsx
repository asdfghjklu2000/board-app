import { getAvatarColor, getInitials, formatDate } from '../utils'
import './WorkItemCard.css'

const STATE_BORDER = {
  Done: '#ffb900',
  'In Progress': '#5c2d91',
}

export default function WorkItemCard({ task, dragging, onDragStart, onDragEnd }) {
  const borderColor = STATE_BORDER[task.state] || '#0078d4'
  const href = `https://dev.azure.com/laash/LaaS/_workitems/edit/${task.id}`

  return (
    <a
      className={`wic${dragging ? ' wic--dragging' : ''}`}
      style={{ borderLeftColor: borderColor }}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      draggable
      onDragStart={e => {
        e.dataTransfer.effectAllowed = 'move'
        onDragStart(task.id)
      }}
      onDragEnd={onDragEnd}
      onClick={e => {
        // Prevent navigation when a drag just ended
        if (dragging) e.preventDefault()
      }}
    >
      <div className="wic-header">
        <span className="wic-icon">{task.state === 'Done' ? '✅' : '📋'}</span>
        <span className="wic-title">{task.title}</span>
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
    </a>
  )
}
