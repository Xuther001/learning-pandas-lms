const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:4002'
).replace(/\/$/, '')

export const API_URL = `${API_BASE_URL}/api/v1`

export type AuthAccount = {
  id: string
  username: string
  role: 'admin' | 'student'
  learnerId: string | null
  displayName: string
  active: boolean
  createdAt: string
}

async function readApiError(response: Response, fallback: string): Promise<string> {
  const result = await response.json().catch(() => ({})) as { error?: string }
  return result.error || fallback
}

export async function login(username: string, password: string): Promise<AuthAccount> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!response.ok) throw new Error(await readApiError(response, 'Login failed.'))
  const result = await response.json() as { account: AuthAccount }
  return result.account
}

export async function logout(): Promise<void> {
  const response = await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!response.ok) throw new Error('Could not log out.')
}

export async function getAuthMe(): Promise<AuthAccount> {
  const response = await fetch(`${API_URL}/auth/me`, {
    credentials: 'include',
  })
  if (!response.ok) throw new Error('Not logged in.')
  const result = await response.json() as { account: AuthAccount }
  return result.account
}

export async function getAdminUsers(): Promise<AuthAccount[]> {
  const response = await fetch(`${API_URL}/admin/users`, {
    credentials: 'include',
  })
  if (!response.ok) throw new Error(await readApiError(response, 'Could not load accounts.'))
  return response.json() as Promise<AuthAccount[]>
}

export async function createStudentAccount(input: {
  username: string
  password: string
  displayName: string
  avatar: string
}): Promise<AuthAccount> {
  const response = await fetch(`${API_URL}/admin/users`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) throw new Error(await readApiError(response, 'Could not create account.'))
  const result = await response.json() as { account: AuthAccount }
  return result.account
}

export async function setStudentActive(id: string, active: boolean): Promise<AuthAccount> {
  const response = await fetch(`${API_URL}/admin/users/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active }),
  })
  if (!response.ok) throw new Error(await readApiError(response, 'Could not update account.'))
  const result = await response.json() as { account: AuthAccount }
  return result.account
}

export async function resetStudentPassword(id: string, password: string): Promise<void> {
  const response = await fetch(
    `${API_URL}/admin/users/${encodeURIComponent(id)}/reset-password`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    },
  )
  if (!response.ok) throw new Error(await readApiError(response, 'Could not reset password.'))
}

export type ApiHealth = {
  status: string
  application: string
  timestamp: string
}

export async function getApiHealth(): Promise<ApiHealth> {
  const response = await fetch(`${API_URL}/health`)

  if (!response.ok) {
    throw new Error(`API health check failed: ${response.status}`)
  }

  return response.json() as Promise<ApiHealth>
}


export type Learner = {
  id: string
  name: string
  avatar: string
  createdAt: string
}

export const LEARNER_AVATARS = ['🐼', '🐻', '🐰', '🦊', '🐸', '🐱', '🐯', '🐨']

export async function getLearners(): Promise<Learner[]> {
  const response = await fetch(`${API_URL}/learners`, {
    credentials: 'include' })
  if (!response.ok) throw new Error(`Learner request failed: ${response.status}`)
  return response.json() as Promise<Learner[]>
}

export async function createLearner(name: string, avatar: string): Promise<Learner> {
  const response = await fetch(`${API_URL}/learners`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, avatar }),
  })
  if (!response.ok) {
    const result = await response.json().catch(() => ({})) as { error?: string }
    throw new Error(result.error || `Could not create learner: ${response.status}`)
  }
  return response.json() as Promise<Learner>
}

export type LessonProgress = {
  lessonId: string
  courseId: number
  completedActivities: string[]
  updatedAt: string | null
}

const LESSON_ID = 'hello-my-name-is'

export async function getLessonProgress(
  userId = 'default-learner',
  lessonId = LESSON_ID,
): Promise<LessonProgress> {
  const response = await fetch(
    `${API_URL}/progress/${encodeURIComponent(lessonId)}?userId=${encodeURIComponent(userId)}`,
    { credentials: 'include' },
  )

  if (!response.ok) {
    throw new Error(`Progress request failed: ${response.status}`)
  }

  return response.json() as Promise<LessonProgress>
}

export async function saveLessonProgress(
  completedActivities: string[],
  userId = 'default-learner',
  lessonId = LESSON_ID,
): Promise<LessonProgress> {
  const response = await fetch(
    `${API_URL}/progress/${encodeURIComponent(lessonId)}?userId=${encodeURIComponent(userId)}`,
    {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completedActivities }),
    },
  )

  if (!response.ok) {
    throw new Error(`Progress save failed: ${response.status}`)
  }

  return response.json() as Promise<LessonProgress>
}

export type Course = {
  id: number
  title: string
  category: string
  instructor: string
  progress: number
  lessons: number
  completed: number
  color: string
  icon: string
  level: string
  ageRange: string
  skills: string[]
  description: string
}

export async function getCourses(userId = 'default-learner'): Promise<Course[]> {
  const response = await fetch(`${API_URL}/courses?userId=${encodeURIComponent(userId)}`, { credentials: 'include' })

  if (!response.ok) {
    throw new Error(`Course request failed: ${response.status}`)
  }

  return response.json() as Promise<Course[]>
}
