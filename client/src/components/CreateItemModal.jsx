import { useState, useEffect } from 'react'
import Modal from './Modal'
import './CreateItemModal.css'

const BACKLOG_TYPES = ['User Story', 'Product Backlog Item', 'Feature', 'Bug']

// mode: 'backlog' | 'task'
export default function CreateItemModal({ mode, iterations, teamMembers, defaultIterationPath, parent, onClose, onSubmit, adoFetch }) {
  const isTask = mode === 'task'
  const title = isTask ? `New Task${parent ? ` under #${parent.id}` : ''}` : 'New Backlog Item'

  const [form, setForm] = useState({
    workItemType: isTask ? 'Task' : 'User Story',
    title: '',
    iterationPath: defaultIterationPath || '',
    description: '',
    storyPoints: '',
    assignedTo: '',
    estimatedHours: '',
    remainingWork: '',
    startDate: '',
    dueDate: '',
    requirementSource: '',
  })
  const [spLevelOptions, setSpLevelOptions] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Fetch Story Point Level options once when backlog modal opens
  useEffect(() => {
    if (isTask || !adoFetch) return
    adoFetch('/api/fields/Custom.StoryPointLevel/allowed-values')
      .then(r => r.json())
      .then(data => setSpLevelOptions(data.allowedValues || []))
      .catch(() => setSpLevelOptions([]))
  }, [isTask])

  const set = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('Title is required.'); return }
    if (!isTask && !form.requirementSource.trim()) { setError('需求來源 is required.'); return }
    if (isTask && form.remainingWork === '') { setError('Remaining Work is required.'); return }
    if (isTask && !form.startDate) { setError('Start Date is required.'); return }
    if (isTask && !form.dueDate) { setError('Due Date is required.'); return }
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        workItemType: form.workItemType,
        title: form.title.trim(),
        iterationPath: form.iterationPath || undefined,
        description: form.description.trim() || undefined,
        storyPointLevel: form.storyPoints || undefined,
        assignedTo: form.assignedTo || undefined,
        estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined,
        remainingWork: form.remainingWork ? Number(form.remainingWork) : undefined,
        startDate: form.startDate || undefined,
        dueDate: form.dueDate || undefined,
        requirementSource: form.requirementSource.trim() || undefined,
        parentId: parent?.id || undefined,
      })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      {parent && (
        <div className="cim-parent-info">
          <span className="cim-parent-label">Parent</span>
          <span className="cim-parent-value">#{parent.id} {parent.title}</span>
        </div>
      )}

      <form className="cim-form" onSubmit={handleSubmit}>
        {/* Work item type — only for backlog */}
        {!isTask && (
          <div className="cim-field">
            <label>Type</label>
            <select value={form.workItemType} onChange={set('workItemType')}>
              {BACKLOG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}

        {/* Title */}
        <div className="cim-field">
          <label>Title <span className="cim-required">*</span></label>
          <input
            type="text"
            value={form.title}
            onChange={set('title')}
            placeholder={isTask ? 'Task title' : 'Backlog item title'}
            autoFocus
          />
        </div>

        {/* Iteration */}
        <div className="cim-field">
          <label>Iteration</label>
          <select value={form.iterationPath} onChange={set('iterationPath')}>
            <option value="">— None —</option>
            {iterations.map(it => (
              <option key={it.id} value={it.path}>{it.name}</option>
            ))}
          </select>
        </div>

        {/* Assigned To */}
        <div className="cim-field">
          <label>Assigned To</label>
          <select value={form.assignedTo} onChange={set('assignedTo')}>
            <option value="">— Unassigned —</option>
            {teamMembers.map(m => (
              <option key={m.identity?.id} value={m.identity?.uniqueName}>
                {m.identity?.displayName}
              </option>
            ))}
            </select>
          </div>

        {/* Estimated Hours — task only */}
        {isTask && (
          <div className="cim-field">
            <label>Estimated Hours</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={form.estimatedHours}
              onChange={set('estimatedHours')}
              placeholder="0"
            />
          </div>
        )}

        {/* Remaining Work / Start Date / Due Date — task only */}
        {isTask && (
          <div className="cim-field">
            <label>Remaining Work <span className="cim-required">*</span></label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={form.remainingWork}
              onChange={set('remainingWork')}
              placeholder="0"
            />
          </div>
        )}
        {/* Start Date / Due Date — required for task, optional for backlog */}
        <div className="cim-field-row">
          <div className="cim-field">
            <label>Start Date {isTask && <span className="cim-required">*</span>}</label>
            <input
              type="date"
              value={form.startDate}
              onChange={set('startDate')}
            />
          </div>
          <div className="cim-field">
            <label>Due Date {isTask && <span className="cim-required">*</span>}</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={set('dueDate')}
            />
          </div>
        </div>

        {/* Story Point Level — backlog only */}
        {!isTask && (
          <div className="cim-field">
            <label>Story Point Level</label>
            <select value={form.storyPoints} onChange={set('storyPoints')}>
              <option value="">— None —</option>
              {spLevelOptions.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        )}

        {/* 需求來源 — backlog only, required */}
        {!isTask && (
          <div className="cim-field">
            <label>需求來源 <span className="cim-required">*</span></label>
            <input
              type="text"
              value={form.requirementSource}
              onChange={set('requirementSource')}
              placeholder="請輸入需求來源"
            />
          </div>
        )}

        {/* Description */}
        <div className="cim-field">
          <label>Description</label>
          <textarea
            value={form.description}
            onChange={set('description')}
            rows={3}
            placeholder="Optional description…"
          />
        </div>

        {error && <div className="cim-error">⚠️ {error}</div>}

        <div className="cim-actions">
          <button type="button" className="cim-btn cim-btn--cancel" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="cim-btn cim-btn--submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
