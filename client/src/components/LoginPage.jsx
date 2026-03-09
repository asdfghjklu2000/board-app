import { useState } from 'react'
import './LoginPage.css'

const DEFAULT_ORG = 'laash'
const DEFAULT_PROJECT = 'LaaS'
const DEFAULT_TEAM = 'LaaS Dev Team'

export default function LoginPage({ onLogin }) {
  const [form, setForm] = useState({
    org: DEFAULT_ORG,
    project: DEFAULT_PROJECT,
    team: DEFAULT_TEAM,
    user: '',
    pat: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const set = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.user.trim() || !form.pat.trim()) {
      setError('User name and Personal Access Token are required.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: {
          'x-ado-org': form.org.trim(),
          'x-ado-project': form.project.trim(),
          'x-ado-team': form.team.trim(),
          'x-ado-user': form.user.trim(),
          'x-ado-pat': form.pat.trim(),
        },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Authentication failed')
      onLogin({
        org: form.org.trim(),
        project: form.project.trim(),
        team: form.team.trim(),
        user: form.user.trim(),
        pat: form.pat.trim(),
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="login-logo-icon">📋</span>
          <h1 className="login-title">Azure DevOps</h1>
          <p className="login-subtitle">Taskboard Viewer</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} autoComplete="off">
          <div className="login-section-label">Organization settings</div>

          <div className="login-field">
            <label htmlFor="org">Organization</label>
            <input
              id="org"
              type="text"
              value={form.org}
              placeholder={DEFAULT_ORG}
              onChange={set('org')}
              autoComplete="off"
            />
          </div>

          <div className="login-field">
            <label htmlFor="project">Project</label>
            <input
              id="project"
              type="text"
              value={form.project}
              placeholder={DEFAULT_PROJECT}
              onChange={set('project')}
              autoComplete="off"
            />
          </div>

          <div className="login-field">
            <label htmlFor="team">Team</label>
            <input
              id="team"
              type="text"
              value={form.team}
              placeholder={DEFAULT_TEAM}
              onChange={set('team')}
              autoComplete="off"
            />
          </div>

          <div className="login-divider" />

          <div className="login-section-label">Credentials</div>

          <div className="login-field">
            <label htmlFor="user">User name</label>
            <input
              id="user"
              type="text"
              value={form.user}
              onChange={set('user')}
              autoComplete="username"
              spellCheck={false}
            />
          </div>

          <div className="login-field">
            <label htmlFor="pat">Personal Access Token</label>
            <input
              id="pat"
              type="password"
              value={form.pat}
              onChange={set('pat')}
              autoComplete="current-password"
            />
          </div>

          {error && <div className="login-error">⚠️ {error}</div>}

          <button
            className="login-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
