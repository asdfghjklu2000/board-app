import { useState, useMemo } from 'react'
import WorkItemCard from './WorkItemCard'
import ParentCard from './ParentCard'
import './Board.css'

const STATES = ['To Do', 'In Progress', 'Done']

const PARENT_STATE_COLORS = {
  Committed: '#0078d4',
  Done: '#5c8a00',
  Active: '#d83b01',
  Approved: '#5c2d91',
  'In Sprint': '#0078d4',
  New: '#888',
}

export default function Board({ data, onTaskStateChange }) {
  const [collapsedRows, setCollapsedRows] = useState(new Set())
  const [allCollapsed, setAllCollapsed] = useState(false)
  const [draggingId, setDraggingId] = useState(null)
  const [dropTarget, setDropTarget] = useState(null) // { state }

  const handleDragStart = (taskId) => setDraggingId(taskId)
  const handleDragEnd = () => { setDraggingId(null); setDropTarget(null) }

  const handleDragOver = (e, state) => {
    e.preventDefault()
    setDropTarget(state)
  }
  const handleDragLeave = () => setDropTarget(null)

  const handleDrop = (e, targetState) => {
    e.preventDefault()
    setDropTarget(null)
    if (!draggingId) return
    const task = data.tasks.find(t => t.id === draggingId)
    if (!task || task.state === targetState) return
    onTaskStateChange(draggingId, targetState)
  }

  // Group tasks by parent, sort by parent ID
  const groups = useMemo(() => {
    const map = new Map()
    data.tasks.forEach(task => {
      const key = task.parentId ?? 0
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(task)
    })
    return [...map.entries()]
      .map(([parentId, tasks]) => ({
        parentId: parentId || null,
        parent: parentId ? data.parents[parentId] : null,
        tasks,
      }))
      .sort((a, b) => (a.parentId || Infinity) - (b.parentId || Infinity))
  }, [data])

  const toggleAll = () => {
    if (allCollapsed) {
      setCollapsedRows(new Set())
    } else {
      setCollapsedRows(new Set(groups.map(g => g.parentId ?? 0)))
    }
    setAllCollapsed(v => !v)
  }

  const toggleRow = key => {
    setCollapsedRows(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  if (!data.tasks.length) {
    return (
      <div className="board-empty">
        No tasks found for the selected sprint and filters.
      </div>
    )
  }

  return (
    <div className="board">
      {/* Column headers */}
      <div className="board-header">
        <div className="board-header-left">
          <button className="collapse-all-btn" onClick={toggleAll}>
            {allCollapsed ? '▶' : '▼'}&nbsp;
            {allCollapsed ? 'Expand all' : 'Collapse all'}
          </button>
        </div>
        {STATES.map(s => (
          <div key={s} className="board-col-header">{s}</div>
        ))}
      </div>

      {/* Data rows */}
      {groups.map(group => {
        const rowKey = group.parentId ?? 0
        const isCollapsed = collapsedRows.has(rowKey)
        const tasksByState = Object.fromEntries(
          STATES.map(s => [s, group.tasks.filter(t => t.state === s)])
        )
        const borderColor = PARENT_STATE_COLORS[group.parent?.state] || '#888'

        return (
          <div key={rowKey} className="board-row">
            {/* Parent cell */}
            <div className="board-parent-cell" style={{ borderTopColor: borderColor }}>
              <button
                className="row-toggle-btn"
                onClick={() => toggleRow(rowKey)}
                title={isCollapsed ? 'Expand' : 'Collapse'}
              >
                {isCollapsed ? '▶' : '▼'}
              </button>
              <ParentCard
                parent={group.parent}
                parentId={group.parentId}
                tasks={group.tasks}
              />
            </div>

            {/* Task state columns */}
            {STATES.map(state => {
              const isDragOver = dropTarget === state && draggingId !== null
              const draggingTask = draggingId ? data.tasks.find(t => t.id === draggingId) : null
              const isDraggingSameState = draggingTask?.state === state
              return (
                <div
                  key={state}
                  className={`board-task-cell ${isCollapsed ? 'board-task-cell--collapsed' : ''} ${isDragOver && !isDraggingSameState ? 'board-task-cell--drag-over' : ''}`}
                  onDragOver={isCollapsed ? undefined : e => handleDragOver(e, state)}
                  onDragLeave={isCollapsed ? undefined : handleDragLeave}
                  onDrop={isCollapsed ? undefined : e => handleDrop(e, state)}
                >
                  {isCollapsed ? (
                    tasksByState[state].length > 0 && (
                      <span className="collapsed-badge">{tasksByState[state].length}</span>
                    )
                  ) : (
                    <>
                      {tasksByState[state].map(task => (
                        <WorkItemCard
                          key={task.id}
                          task={task}
                          dragging={draggingId === task.id}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                        />
                      ))}
                      {isDragOver && !isDraggingSameState && (
                        <div className="drop-placeholder">
                          Move here → {state}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
