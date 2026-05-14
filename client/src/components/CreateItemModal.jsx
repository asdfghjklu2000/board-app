import { useState, useEffect } from 'react'
import { marked } from 'marked'
import { useIsMobile } from '../useIsMobile'
import Modal from './Modal'
import './CreateItemModal.css'

const BACKLOG_TYPES = ['User Story', 'Product Backlog Item', 'Feature', 'Bug']
const DEFAULT_AREA = 'LaaS\\LaaS Dev Team'

function toDateInput(value) {
  return value ? String(value).slice(0, 10) : ''
}

function buildInitialForm({ isTask, defaultIterationPath, defaultAssignedTo, isMobile, itemData }) {
  return {
    workItemType: itemData?.workItemType || (isTask ? 'Task' : 'User Story'),
    title: itemData?.title || '',
    iterationPath: itemData?.iterationPath || defaultIterationPath || '',
    areaPath: itemData?.areaPath || DEFAULT_AREA,
    description: itemData?.description || '',
    descMode: itemData ? 'html' : (isMobile ? 'markdown' : 'html'),
    storyPoints: itemData?.storyPointLevel || '',
    assignedTo: itemData?.assignedTo || defaultAssignedTo || '',
    estimatedHours: itemData?.estimatedHours === '' || itemData?.estimatedHours === undefined || itemData?.estimatedHours === null
      ? ''
      : String(itemData.estimatedHours),
    remainingWork: itemData?.remainingWork === '' || itemData?.remainingWork === undefined || itemData?.remainingWork === null
      ? ''
      : String(itemData.remainingWork),
    startDate: toDateInput(itemData?.startDate),
    dueDate: toDateInput(itemData?.dueDate),
    requirementSource: itemData?.requirementSource || '',
  }
}

export default function CreateItemModal({
  mode,
  action = 'create',
  itemId,
  iterations,
  teamMembers,
  defaultIterationPath,
  defaultAssignedTo,
  parent,
  onClose,
  onSubmit,
  adoFetch,
}) {
  const isTask = mode === 'task'
  const isMobile = useIsMobile()
  const isEdit = action === 'edit'

  const [form, setForm] = useState(() => buildInitialForm({
    isTask,
    defaultIterationPath,
    defaultAssignedTo,
    isMobile,
  }))
  const [spLevelOptions, setSpLevelOptions] = useState([])
  const [areaOptions, setAreaOptions] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [loadingItem, setLoadingItem] = useState(false)
  const [error, setError] = useState(null)

  const title = isEdit
    ? `Edit ${isTask ? 'Task' : 'Backlog'} #${itemId}`
    : (isTask ? `New Task${parent ? ` under #${parent.id}` : ''}` : 'New Backlog Item')

  useEffect(() => {
    if (!adoFetch) return
    if (!isTask) {
      adoFetch('/api/fields/Custom.StoryPointLevel/allowed-values')
        .then(r => r.json())
        .then(data => setSpLevelOptions(data.allowedValues || []))
        .catch(() => setSpLevelOptions([]))
    }
    adoFetch('/api/areas')
      .then(r => r.json())
      .then(data => setAreaOptions(data.areas || []))
      .catch(() => setAreaOptions([]))
  }, [adoFetch, isTask])

  useEffect(() => {
    if (!isEdit || !adoFetch || !itemId) {
      setForm(buildInitialForm({ isTask, defaultIterationPath, defaultAssignedTo, isMobile }))
      return
    }

    setLoadingItem(true)
    setError(null)
    adoFetch(`/api/workitems/${itemId}`)
      .then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load item')
        setForm(buildInitialForm({
          isTask,
          defaultIterationPath,
          defaultAssignedTo,
          isMobile,
          itemData: data,
        }))
      })
      .catch(err => setError(err.message))
      .finally(() => setLoadingItem(false))
  }, [adoFetch, defaultAssignedTo, defaultIterationPath, isEdit, isMobile, isTask, itemId])

  const set = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }))
  const setDescMode = (descMode) => setForm(prev => ({ ...prev, descMode }))

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
      let description = form.description.trim()
      if (description && form.descMode === 'markdown') {
        description = marked.parse(description)
      }
      await onSubmit({
        id: itemId,
        workItemType: form.workItemType,
        title: form.title.trim(),
        iterationPath: form.iterationPath || '',
        areaPath: form.areaPath || '',
        description,
        storyPointLevel: form.storyPoints || '',
        assignedTo: form.assignedTo || '',
        estimatedHours: form.estimatedHours === '' ? '' : Number(form.estimatedHours),
        remainingWork: form.remainingWork === '' ? '' : Number(form.remainingWork),
        startDate: form.startDate || '',
        dueDate: form.dueDate || '',
        requirementSource: form.requirementSource.trim(),
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

      {loadingItem ? (
        <div className="cim-loading">Loading work item…</div>
      ) : (
        <form className="cim-form" onSubmit={handleSubmit}>
          {!isTask && !isEdit && (
            <div className="cim-field">
              <label>Type</label>
              <select value={form.workItemType} onChange={set('workItemType')}>
                {BACKLOG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}

          {isEdit && (
            <div className="cim-field">
              <label>Type</label>
              <input type="text" value={form.workItemType} readOnly />
            </div>
          )}

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

          <div className="cim-field">
            <label>Iteration</label>
            <select value={form.iterationPath} onChange={set('iterationPath')}>
              <option value="">— None —</option>
              {iterations.map(it => (
                <option key={it.id} value={it.path}>{it.name}</option>
              ))}
            </select>
          </div>

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

          {isTask && (
            <>
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
            </>
          )}

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

          {!isTask && (
            <>
              <div className="cim-field">
                <label>Story Point Level</label>
                <select value={form.storyPoints} onChange={set('storyPoints')}>
                  <option value="">— None —</option>
                  {spLevelOptions.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="cim-field">
                <label>需求來源 <span className="cim-required">*</span></label>
                <input
                  type="text"
                  value={form.requirementSource}
                  onChange={set('requirementSource')}
                  placeholder="請輸入需求來源"
                />
              </div>
            </>
          )}

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
              {submitting ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save' : 'Create')}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
