import { useState, useEffect, useMemo, useCallback } from 'react'
import Board from './components/Board'
import LoginPage from './components/LoginPage'
import './App.css'

export default function App() {
  const [credentials, setCredentials] = useState(null) // null = not logged in

  // ── Board state ─────────────────────────────────────────────────────────────
  const [iterations, setIterations] = useState([])
  const [selectedIterationId, setSelectedIterationId] = useState('')
  const [teamMembers, setTeamMembers] = useState([])
  const [assignedTo, setAssignedTo] = useState('all')
  const [boardData, setBoardData] = useState({ tasks: [], parents: {} })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [stateFilter, setStateFilter] = useState('all')
  const [updateError, setUpdateError] = useState(null)

  // ── Fetch helper — injects credentials headers ───────────────────────────────
  const adoFetch = useCallback((path, options = {}) => {
    if (!credentials) return Promise.reject(new Error('Not authenticated'))
    return fetch(path, {
      ...options,
      headers: {
        ...(options.headers || {}),
        'x-ado-org': credentials.org,
        'x-ado-project': credentials.project,
        'x-ado-team': credentials.team,
        'x-ado-user': credentials.user,
        'x-ado-pat': credentials.pat,
      },
    })
  }, [credentials])

  // ── Logout ───────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    setCredentials(null)
    setIterations([])
    setSelectedIterationId('')
    setTeamMembers([])
    setAssignedTo('all')
    setBoardData({ tasks: [], parents: {} })
    setError(null)
    setUpdateError(null)
    setKeyword('')
    setStateFilter('all')
  }

  // ── Load iterations + team members on login ───────────────────────────────────
  useEffect(() => {
    if (!credentials) return
    Promise.all([
      adoFetch('/api/iterations').then(r => r.json()),
      adoFetch('/api/team-members').then(r => r.json()).catch(() => ({ value: [] })),
    ])
      .then(([iterData, memberData]) => {
        const iters = (iterData.value || []).sort((a, b) => {
          const aDate = a.attributes?.startDate || ''
          const bDate = b.attributes?.startDate || ''
          return bDate.localeCompare(aDate)
        })
        setIterations(iters)
        setTeamMembers(memberData.value || [])
        if (iters.length > 0) {
          const now = new Date()
          const current = iters.find(it => {
            if (!it.attributes?.startDate || !it.attributes?.finishDate) return false
            return now >= new Date(it.attributes.startDate) && now <= new Date(it.attributes.finishDate)
          })
          setSelectedIterationId((current || iters[0]).id)
        }
      })
      .catch(err => setError(err.message))
  }, [credentials, adoFetch])

  const selectedIteration = useMemo(
    () => iterations.find(it => it.id === selectedIterationId),
    [iterations, selectedIterationId]
  )

  // ── Load board data when sprint or assignee filter changes ────────────────────
  useEffect(() => {
    if (!selectedIteration) return
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({ iterationPath: selectedIteration.path })
    if (assignedTo !== 'all') params.set('assignedTo', assignedTo)

    adoFetch(`/api/board?${params}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setBoardData(data)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [selectedIteration, assignedTo, adoFetch])

  // ── Client-side filtering ─────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    let tasks = boardData.tasks
    if (keyword.trim()) {
      const kw = keyword.toLowerCase()
      tasks = tasks.filter(
        t =>
          t.title.toLowerCase().includes(kw) ||
          t.assignedTo.toLowerCase().includes(kw) ||
          String(t.id).includes(kw)
      )
    }
    if (stateFilter !== 'all') {
      tasks = tasks.filter(t => t.state === stateFilter)
    }
    return { ...boardData, tasks }
  }, [boardData, keyword, stateFilter])

  // ── Drag-and-drop state change ────────────────────────────────────────────────
  const handleTaskStateChange = async (taskId, newState) => {
    setBoardData(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? { ...t, state: newState } : t),
    }))
    setUpdateError(null)

    try {
      const res = await adoFetch(`/api/workitems/${taskId}/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: newState }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      setBoardData(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t.id === taskId ? { ...t, state: data.state } : t),
      }))
    } catch (e) {
      setUpdateError(`Failed to update #${taskId}: ${e.message}`)
      // Rollback
      if (selectedIteration) {
        const params = new URLSearchParams({ iterationPath: selectedIteration.path })
        if (assignedTo !== 'all') params.set('assignedTo', assignedTo)
        adoFetch(`/api/board?${params}`)
          .then(r => r.json())
          .then(d => { if (!d.error) setBoardData(d) })
      }
    }
  }

  const hasFilter = keyword || stateFilter !== 'all'

  // ── Login screen ──────────────────────────────────────────────────────────────
  if (!credentials) {
    return <LoginPage onLogin={setCredentials} />
  }

  // ── Board screen ──────────────────────────────────────────────────────────────
  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          <span className="app-title-icon">📋</span>
          <span>{credentials.project} / {credentials.team}</span>
        </div>

        <nav className="app-nav">
          <span className="app-nav-item app-nav-item--active">Taskboard</span>
        </nav>

        <div className="top-controls">
          <select
            className="top-select"
            value={selectedIterationId}
            onChange={e => setSelectedIterationId(e.target.value)}
          >
            {iterations.map(it => (
              <option key={it.id} value={it.id}>{it.name}</option>
            ))}
          </select>

          <select
            className="top-select"
            value={assignedTo}
            onChange={e => setAssignedTo(e.target.value)}
          >
            <option value="all">Person: All</option>
            {teamMembers.map(m => (
              <option key={m.identity?.id} value={m.identity?.uniqueName}>
                {m.identity?.displayName}
              </option>
            ))}
          </select>

          <div className="header-user">
            <span className="header-user-name">{credentials.user}</span>
            <button className="logout-btn" onClick={handleLogout} title="Sign out">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="filter-bar">
        <span className="filter-bar-icon">≡</span>
        <input
          className="filter-keyword"
          placeholder="Filter by keyword"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
        />
        <select
          className="filter-select"
          value={stateFilter}
          onChange={e => setStateFilter(e.target.value)}
        >
          <option value="all">States</option>
          <option value="To Do">To Do</option>
          <option value="In Progress">In Progress</option>
          <option value="Done">Done</option>
        </select>
        {hasFilter && (
          <button
            className="filter-clear-btn"
            onClick={() => { setKeyword(''); setStateFilter('all') }}
            title="Clear filters"
          >
            ✕
          </button>
        )}
      </div>

      <main className="app-main">
        {error && <div className="error-banner">⚠️ {error}</div>}
        {updateError && (
          <div className="error-banner" style={{ marginBottom: 8 }}>
            ⚠️ {updateError}
            <button
              style={{ marginLeft: 12, cursor: 'pointer', background: 'none', border: 'none', color: '#c8000b', fontWeight: 700 }}
              onClick={() => setUpdateError(null)}
            >✕</button>
          </div>
        )}
        {loading
          ? <div className="loading">⏳ Loading board data…</div>
          : <Board data={filteredData} onTaskStateChange={handleTaskStateChange} />
        }
      </main>
    </div>
  )
}

