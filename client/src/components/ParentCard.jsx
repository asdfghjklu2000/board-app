import { getAvatarColor, getInitials } from '../utils'
import './ParentCard.css'

const STATE_COLORS = {
  Committed: '#0078d4',
  Done: '#5c8a00',
  Active: '#d83b01',
  Approved: '#5c2d91',
  'In Sprint': '#0078d4',
  New: '#888',
}

export default function ParentCard({ parent, parentId, tasks, onEdit }) {
  if (!parent) {
    return (
      <div className="pbc pbc--empty">
        <span>Unparented Tasks</span>
        <span className="pbc-empty-count">{tasks.length} task(s)</span>
      </div>
    )
  }

  const stateColor = STATE_COLORS[parent.state] || '#888'
  const totalActual = tasks.reduce((s, t) => s + (t.actualHours || 0), 0)
  const href = `https://dev.azure.com/laash/LaaS/_workitems/edit/${parent.id}`

  return (
    <div className="pbc">
      <div className="pbc-header">
        <span className="pbc-type-icon">📋</span>
        <a className="pbc-id" href={href} target="_blank" rel="noopener noreferrer">
          {parent.id}
        </a>
        <span className="pbc-title" title={parent.title}>{parent.title}</span>
        <div className="pbc-actions">
          {onEdit && (
            <button type="button" className="pbc-action-btn" onClick={onEdit} title="Edit backlog">
              ✎
            </button>
          )}
          <a className="pbc-link" href={href} target="_blank" rel="noopener noreferrer" title="Open in Azure DevOps">
            ↗
          </a>
        </div>
      </div>

      <div className="pbc-state">
        <span className="pbc-state-dot" style={{ backgroundColor: stateColor }} />
        <span style={{ color: stateColor }}>{parent.state}</span>
      </div>

      {parent.assignedTo && (
        <div className="pbc-assignee">
          <span
            className="pbc-avatar"
            style={{ backgroundColor: getAvatarColor(parent.assignedTo) }}
            title={parent.assignedTo}
          >
            {getInitials(parent.assignedTo)}
          </span>
          <span className="pbc-assignee-name" title={parent.assignedTo}>
            {parent.assignedTo}
          </span>
        </div>
      )}

      <div className="pbc-rows">
        {parent.estimatedHours > 0 && (
          <div className="pbc-row">
            <span className="pbc-row-label">Estimate…</span>
            <span className="pbc-row-value">{parent.estimatedHours}</span>
          </div>
        )}
        {parent.storyPoints && (
          <div className="pbc-row">
            <span className="pbc-row-label">Story Poi…</span>
            <span className="pbc-row-value">{parent.storyPoints}</span>
          </div>
        )}
        <div className="pbc-row">
          <span className="pbc-row-label">Actual H…</span>
          <span className="pbc-row-value">{totalActual}</span>
        </div>
      </div>
    </div>
  )
}
