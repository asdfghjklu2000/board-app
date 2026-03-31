import { useState, useEffect } from 'react'
import { marked } from 'marked'
import { useIsMobile } from '../useIsMobile'
import Modal from './Modal'
import './CreateItemModal.css'

const BACKLOG_TYPES = ['User Story', 'Product Backlog Item', 'Feature', 'Bug']
const DEFAULT_AREA = 'LaaS\\LaaS Dev Team'

// mode: 'backlog' | 'task'
export default function CreateItemModal({ mode, iterations, teamMembers, defaultIterationPath, defaultAssignedTo, parent, onClose, onSubmit, adoFetch }) {
  const isTask = mode === 'task'
  const isMobile = useIsMobile()
  const title = isTask ? `New Task${parent ? ` under #${parent.id}` : ''}` : 'New Backlog Item'

  const [form, setForm] = useState({
    workItemType: isTask ? 'Task' : 'User Story',
    title: '',
    iterationPath: defaultIterationPath || '',
    areaPath: DEFAULT_AREA,
    description: '',
    descMode: isMobile ? 'markdown' : 'html',
    storyPoints: '',
    assignedTo: defaultAssignedTo || '',
    estimatedHours: '',
    remainingWork: '',
    startDate: '',
    dueDate: '',
    requirementSource: '',
  })
  const [spLevelOptions, setSpLevelOptions] = useState([])
  const [areaOptions, setAreaOptions] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Fetch Story Point Level options (backlog only)
  useEffect(() => {
    if (isTask || !adoFetch) return
    adoFetch('/api/fields/Custom.StoryPointLevel/allowed-values')
      .then(r => r.json())
      .then(data => setSpLevelOptions(data.allowedValues || []))
      .catch(() => setSpLevelOptions([]))
  }, [isTask])

  // Fetch Area options
  useEffect(() => {
    if (!adoFetch) return
    adoFetch('/api/areas')
      .then(r => r.json())
      .then(data => setAreaOptions(data.areas || []))
      .catch(() => setAreaOptions([]))
  }, [])

  const set = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }))
  const setDescMode = (mode) => setForm(prev => ({ ...prev, descMode: mode }))

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
      // Convert markdown to HTML if needed
      let description = form.description.trim() || undefined
      if (description && form.descMode === 'markdown') {
        description = marked.parse(description)
      }
      await onSubmit({
        workItemType: form.workItemType,
        title: form.title.trim(),
        iterationPath: form.iterationPath || undefined,
        areaPath: form.areaPath || undefined,
        description,
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

        {/* Area */}
        <div className="cim-field">
          <label>Area</label>
          <select value={form.areaPath} onChange={set('areaPath')}>
            {areaOptions.length === 0 && (
              <option value={DEFAULT_AREA}>{DEFAULT_AREA}</option>
            )}
            {areaOptions.map(a => (
              <option key={a.id} value={a.path}>{a.path}</option>
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

        {/* Description with HTML/Markdown toggle */}
        <div className="cim-field">
          <div className="cim-desc-header">
            <label>Description</label>
            <div className="cim-desc-mode-toggle">
              <button
                type="button"
                className={`cim-mode-btn${form.descMode === 'html' ? ' cim-mode-btn--active' : ''}`}
                onClick={() => setDescMode('html')}
              >HTML</button>
              <button
                type="button"
                className={`cim-mode-btn${form.descMode === 'markdown' ? ' cim-mode-btn--active' : ''}`}
                onClick={() => setDescMode('markdown')}
              >Markdown</button>
            </div>
          </div>
          <textarea
            value={form.description}
            onChange={set('description')}
            rows={5}
            placeholder={form.descMode === 'markdown'
              ? '支援 Markdown 格式，例如 **粗體**、`程式碼`…'
              : '支援 HTML 格式，例如 <b>粗體</b>、<ul><li>項目</li></ul>…'}
            className="cim-desc-textarea"
            spellCheck={false}
          />
          {form.descMode === 'markdown' && form.description.trim() && (
            <details className="cim-preview">
              <summary>預覽</summary>
              <div
                className="cim-preview-body"
                dangerouslySetInnerHTML={{ __html: marked.parse(form.description) }}
              />
            </details>
          )}
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
