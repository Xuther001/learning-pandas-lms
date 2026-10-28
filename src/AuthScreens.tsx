
import { useEffect, useState } from 'react'
import {
  login,
  getAdminUsers,
  createStudentAccount,
  setStudentActive,
  resetStudentPassword,
  type AuthAccount,
  LEARNER_AVATARS,
} from './api'

type LoginScreenProps = {
  onLogin: (account: AuthAccount) => void
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      onLogin(await login(username.trim(), password))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main style={styles.page}>
      <form style={styles.card} onSubmit={submit}>
        <div style={styles.logo}>FP</div>
        <p style={styles.eyebrow}>ENGLISH, WITH PURPOSE</p>
        <h1>Welcome to FluentPath</h1>
        <p>Sign in to continue your learning journey.</p>
        <label style={styles.label} htmlFor="login-username">Username</label>
        <input
          id="login-username"
          style={styles.input}
          autoComplete="username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
        />
        <label style={styles.label} htmlFor="login-password">Password</label>
        <input
          id="login-password"
          style={styles.input}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        {error && <p role="alert" style={styles.error}>{error}</p>}
        <button style={styles.button} disabled={busy} type="submit">
          {busy ? 'Signing in…' : 'Sign in →'}
        </button>
      </form>
    </main>
  )
}

type AdminDashboardProps = {
  onLogout: () => void
}

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [users, setUsers] = useState<AuthAccount[]>([])
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false

    getAdminUsers()
      .then(accounts => {
        if (!cancelled) setUsers(accounts)
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load accounts.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [refresh])

  async function createAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    setBusy(true)
    try {
      await createStudentAccount({
        username: username.trim(),
        displayName: displayName.trim(),
        password,
        avatar: LEARNER_AVATARS[0],
      })
      setUsername('')
      setDisplayName('')
      setPassword('')
      setMessage('Student account created.')
      setRefresh(value => value + 1)
      setUsers(await getAdminUsers())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account.')
    } finally {
      setBusy(false)
    }
  }

  async function toggleAccount(user: AuthAccount) {
    try {
      await setStudentActive(user.id, !user.active)
      setUsers(await getAdminUsers())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update account.')
    }
  }

  async function resetPassword(user: AuthAccount) {
    const nextPassword = resetPasswords[user.id] || ''
    if (nextPassword.length < 12) {
      setError('New passwords must contain at least 12 characters.')
      return
    }
    try {
      await resetStudentPassword(user.id, nextPassword)
      setResetPasswords(current => ({ ...current, [user.id]: '' }))
      setMessage(`Password reset for ${user.username}.`)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password.')
    }
  }

  return (
    <main style={styles.adminPage}>
      <header style={styles.adminHeader}>
        <div>
          <div style={styles.logo}>FP</div>
          <h1>FluentPath administration</h1>
          <p>Create and manage student accounts.</p>
        </div>
        <button style={styles.secondaryButton} onClick={onLogout}>Sign out</button>
      </header>

      <form style={styles.card} onSubmit={createAccount}>
        <h2>Create a student account</h2>
        <label style={styles.label}>Display name</label>
        <input style={styles.input} value={displayName}
          onChange={e => setDisplayName(e.target.value)} maxLength={40} required />
        <label style={styles.label}>Username (3–40 characters)</label>
        <input style={styles.input} value={username}
          onChange={e => setUsername(e.target.value)} minLength={3}
          maxLength={40} autoComplete="off" required />
        <label style={styles.label}>Temporary password (at least 12 characters)</label>
        <input style={styles.input} type="password" value={password}
          onChange={e => setPassword(e.target.value)} minLength={12}
          autoComplete="new-password" required />
        <button style={styles.button} disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>

      {error && <p role="alert" style={styles.error}>{error}</p>}
      {message && <p role="status" style={styles.success}>{message}</p>}

      <section style={styles.card}>
        <h2>Student accounts</h2>
        {users.length === 0 && <p>No student accounts yet.</p>}
        {users.map(user => (
          <article key={user.id} style={styles.userRow}>
            <div>
              <strong>{user.displayName}</strong>
              <p>@{user.username} · {user.active ? 'Active' : 'Disabled'}</p>
            </div>
            <button type="button" style={styles.secondaryButton}
              onClick={() => toggleAccount(user)}>
              {user.active ? 'Disable' : 'Activate'}
            </button>
            <input style={styles.input} type="password"
              placeholder="New password (12+ characters)"
              autoComplete="new-password"
              value={resetPasswords[user.id] || ''}
              onChange={e => setResetPasswords(current => ({
                ...current, [user.id]: e.target.value,
              }))} />
            <button type="button" style={styles.secondaryButton}
              onClick={() => resetPassword(user)}>Reset password</button>
          </article>
        ))}
      </section>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh', display: 'grid', placeItems: 'center',
    padding: 24, background: '#f2f7f6', color: '#173b3a',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  card: {
    background: '#fff', padding: 28, borderRadius: 18,
    boxShadow: '0 8px 30px #173b3a12', width: '100%',
    maxWidth: 520, boxSizing: 'border-box', marginBottom: 20,
  },
  logo: {
    display: 'grid', placeItems: 'center', width: 48, height: 48,
    borderRadius: 14, background: '#d9f4e9', color: '#087e68',
    fontWeight: 800,
  },
  eyebrow: { color: '#087e68', fontSize: 12, fontWeight: 700, letterSpacing: 2 },
  label: { display: 'block', marginTop: 16, marginBottom: 6, fontWeight: 600 },
  input: {
    display: 'block', width: '100%', padding: '12px 14px',
    border: '1px solid #cbdad7', borderRadius: 9, boxSizing: 'border-box',
    font: 'inherit', marginBottom: 8,
  },
  button: {
    width: '100%', marginTop: 18, padding: 13, border: 0,
    borderRadius: 9, background: '#087e68', color: '#fff',
    fontWeight: 700, cursor: 'pointer',
  },
  secondaryButton: {
    padding: '10px 14px', border: '1px solid #cbdad7',
    borderRadius: 9, background: '#fff', color: '#173b3a',
    cursor: 'pointer', fontWeight: 600,
  },
  error: { color: '#b42318', padding: 12, background: '#fff0ee', borderRadius: 8 },
  success: { color: '#087e68', padding: 12, background: '#e7f8f0', borderRadius: 8 },
  adminPage: {
    minHeight: '100vh', padding: 24, background: '#f2f7f6',
    color: '#173b3a', fontFamily: 'Inter, system-ui, sans-serif',
  },
  adminHeader: {
    maxWidth: 900, margin: '0 auto 24px', display: 'flex',
    justifyContent: 'space-between', alignItems: 'center', gap: 16,
  },
  userRow: {
    display: 'grid', gridTemplateColumns: '1fr auto', gap: 12,
    alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #e4ece9',
  },
}
