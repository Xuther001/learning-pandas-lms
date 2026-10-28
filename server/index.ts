
import 'dotenv/config'
import express from 'express'
import { randomUUID } from 'node:crypto'
import cors from 'cors'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  bootstrapAuthStore,
  requireAuth,
  requireAdmin,
  findAccountByUsername,
  hashPassword,
  verifyPassword,
  createSessionCookie,
  clearSessionCookie,
  publicAccount,
  loadAuthStore,
  saveAuthStore,
} from './auth.js'

const app = express()
const PORT = Number(process.env.PORT) || 4002

const currentFile = fileURLToPath(import.meta.url)
const currentDirectory = path.dirname(currentFile)
const DATA_FILE = path.join(currentDirectory, 'data.json')

type Learner = {
  id: string
  name: string
  avatar: string
  createdAt: string
}

const DEFAULT_LEARNER_ID = 'default-learner'
const ALLOWED_AVATARS = ['🐼', '🐻', '🐰', '🦊', '🐸', '🐱', '🐯', '🐨']

app.use(cors({
  origin: [
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    ...(process.env.FRONTEND_ORIGIN
      ? [process.env.FRONTEND_ORIGIN]
      : []),
  ],
  credentials: true,
}))
app.use(express.json({ limit: '1mb' }))

const requireStudent: import('express').RequestHandler = (req, res, next) => {
  const account = req.authAccount
  if (!account || account.role !== 'student' || !account.learnerId) {
    res.status(403).json({ error: 'A student account is required.' })
    return
  }
  next()
}

async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE)
  } catch {
    const initialData = {
      schemaVersion: 1,
      users: [],
      courses: [],
      enrollments: [],
      modules: [],
      lessons: [],
      files: [],
      liveSessions: [],
      quizzes: [],
      quizAttempts: [],
      assignments: [],
      submissions: [],
      progress: [],
      announcements: [],
      auditLogs: [],
    }

    await fs.writeFile(
      DATA_FILE,
      JSON.stringify(initialData, null, 2),
      'utf8',
    )
  }
}

app.post('/api/v1/auth/login', async (req, res) => {
  const username = typeof req.body?.username === 'string'
    ? req.body.username.trim()
    : ''
  const password = typeof req.body?.password === 'string'
    ? req.body.password
    : ''

  if (!username || !password) {
    res.status(400).json({ error: 'Enter your username and password.' })
    return
  }

  try {
    const account = await findAccountByUsername(username)

    if (
      !account
      || !account.active
      || !verifyPassword(password, account.passwordHash)
    ) {
      res.status(401).json({ error: 'Incorrect username or password.' })
      return
    }

    res.setHeader('Set-Cookie', createSessionCookie(account))
    res.json({ account: publicAccount(account) })
  } catch (error) {
    console.error('Login failed:', error)
    res.status(500).json({ error: 'Unable to log in right now.' })
  }
})

app.post('/api/v1/auth/logout', (_req, res) => {
  res.setHeader('Set-Cookie', clearSessionCookie())
  res.json({ success: true })
})

app.get('/api/v1/auth/me', requireAuth, (req, res) => {
  res.json({ account: publicAccount(req.authAccount!) })
})


app.get('/api/v1/admin/users', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const store = await loadAuthStore()
    res.json(store.accounts
      .filter((account) => account.role === 'student')
      .map(publicAccount))
  } catch (error) {
    console.error('Failed to list student accounts:', error)
    res.status(500).json({ error: 'Failed to list student accounts.' })
  }
})

app.post('/api/v1/admin/users', requireAuth, requireAdmin, async (req, res) => {
  const username = typeof req.body?.username === 'string'
    ? req.body.username.trim()
    : ''
  const password = typeof req.body?.password === 'string'
    ? req.body.password
    : ''
  const displayName = typeof req.body?.displayName === 'string'
    ? req.body.displayName.trim()
    : ''
  const requestedAvatar = typeof req.body?.avatar === 'string'
    ? req.body.avatar
    : '🐼'

  if (username.length < 3 || username.length > 40) {
    res.status(400).json({ error: 'Username must contain 3 to 40 characters.' })
    return
  }
  if (password.length < 12) {
    res.status(400).json({ error: 'Password must be at least 12 characters.' })
    return
  }
  if (!displayName || displayName.length > 40) {
    res.status(400).json({ error: 'Student name must contain 1 to 40 characters.' })
    return
  }

  try {
    const store = await loadAuthStore()
    if (store.accounts.some(
      (account) => account.username.toLowerCase() === username.toLowerCase(),
    )) {
      res.status(409).json({ error: 'That username is already in use.' })
      return
    }

    const contents = await fs.readFile(DATA_FILE, 'utf8')
    const data = JSON.parse(contents) as { users?: Learner[] }
    if (!Array.isArray(data.users)) data.users = []

    const learner: Learner = {
      id: randomUUID(),
      name: displayName,
      avatar: ALLOWED_AVATARS.includes(requestedAvatar) ? requestedAvatar : '🐼',
      createdAt: new Date().toISOString(),
    }

    const account = {
      id: randomUUID(),
      username,
      passwordHash: hashPassword(password),
      role: 'student' as const,
      learnerId: learner.id,
      displayName,
      active: true,
      createdAt: new Date().toISOString(),
    }

    data.users.push(learner)
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8')
    store.accounts.push(account)
    await saveAuthStore(store)

    res.status(201).json({ account: publicAccount(account), learner })
  } catch (error) {
    console.error('Failed to create student account:', error)
    res.status(500).json({ error: 'Failed to create student account.' })
  }
})

app.patch('/api/v1/admin/users/:id/status', requireAuth, requireAdmin, async (req, res) => {
  if (typeof req.body?.active !== 'boolean') {
    res.status(400).json({ error: 'active must be true or false.' })
    return
  }

  try {
    const store = await loadAuthStore()
    const account = store.accounts.find(
      (item) => item.id === req.params.id && item.role === 'student',
    )
    if (!account) {
      res.status(404).json({ error: 'Student account not found.' })
      return
    }

    account.active = req.body.active
    await saveAuthStore(store)
    res.json({ account: publicAccount(account) })
  } catch (error) {
    console.error('Failed to update student status:', error)
    res.status(500).json({ error: 'Failed to update student status.' })
  }
})

app.post('/api/v1/admin/users/:id/reset-password', requireAuth, requireAdmin, async (req, res) => {
  const password = typeof req.body?.password === 'string'
    ? req.body.password
    : ''
  if (password.length < 12) {
    res.status(400).json({ error: 'New password must be at least 12 characters.' })
    return
  }

  try {
    const store = await loadAuthStore()
    const account = store.accounts.find(
      (item) => item.id === req.params.id && item.role === 'student',
    )
    if (!account) {
      res.status(404).json({ error: 'Student account not found.' })
      return
    }

    account.passwordHash = hashPassword(password)
    await saveAuthStore(store)
    res.json({ success: true })
  } catch (error) {
    console.error('Failed to reset student password:', error)
    res.status(500).json({ error: 'Failed to reset student password.' })
  }
})

app.get('/api/v1/learners', requireAuth, async (req, res) => {
  try {
    const contents = await fs.readFile(DATA_FILE, 'utf8')
    const data = JSON.parse(contents) as {
      users?: Learner[]
      progress?: StoredProgress[]
    }

    if (!Array.isArray(data.users)) data.users = []
    if (!Array.isArray(data.progress)) data.progress = []

    if (data.users.length === 0) {
      data.users.push({
        id: DEFAULT_LEARNER_ID,
        name: 'My Learner',
        avatar: '🐼',
        createdAt: new Date().toISOString(),
      })
    }

    // Preserve existing progress by assigning older records to the
    // default learner the first time profiles are enabled.
    const owner = data.users.find(
      (learner) => learner.id === DEFAULT_LEARNER_ID,
    ) ?? data.users[0]

    let migrated = false
    for (const record of data.progress) {
      if (!record.userId) {
        record.userId = owner.id
        migrated = true
      }
    }

    if (migrated || !contents.includes('"users"')) {
      await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8')
    } else {
      // Save a newly created default learner even when there was no progress.
      await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8')
    }

    res.json(
      req.authAccount?.role === 'admin'
        ? data.users
        : data.users.filter(
            (learner) => learner.id === req.authAccount?.learnerId,
          ),
    )
  } catch (error) {
    console.error('Failed to load learners:', error)
    res.status(500).json({ error: 'Failed to load learners' })
  }
})

app.post('/api/v1/learners', requireAuth, requireAdmin, async (req, res) => {
  const name = typeof req.body?.name === 'string'
    ? req.body.name.trim()
    : ''
  const requestedAvatar = typeof req.body?.avatar === 'string'
    ? req.body.avatar
    : '🐼'

  if (!name || name.length > 40) {
    res.status(400).json({
      error: 'Learner name must contain between 1 and 40 characters',
    })
    return
  }

  const avatar = ALLOWED_AVATARS.includes(requestedAvatar)
    ? requestedAvatar
    : '🐼'

  try {
    const contents = await fs.readFile(DATA_FILE, 'utf8')
    const data = JSON.parse(contents) as { users?: Learner[] }

    if (!Array.isArray(data.users)) data.users = []

    const learner: Learner = {
      id: randomUUID(),
      name,
      avatar,
      createdAt: new Date().toISOString(),
    }

    data.users.push(learner)
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8')
    res.status(201).json(learner)
  } catch (error) {
    console.error('Failed to create learner:', error)
    res.status(500).json({ error: 'Failed to create learner' })
  }
})

app.get('/api/v1/courses', requireAuth, requireStudent, async (req, res) => {
  try {
    const contents = await fs.readFile(DATA_FILE, 'utf8')
    const data = JSON.parse(contents) as {
      courses?: Array<{
        id: number
        lessons?: number
        completed?: number
        progress?: number
        [key: string]: unknown
      }>
      progress?: Array<{
        userId?: string
        lessonId: string
        courseId: number
        completedActivities: string[]
      }>
    }
    const userId = req.authAccount!.learnerId!
    const completedRecords = (data.progress ?? []).filter(
      (record) =>
        (record.userId ?? DEFAULT_LEARNER_ID) === userId
        && VALID_ACTIVITIES.every((activity) =>
          record.completedActivities.includes(activity),
        ),
    )
    const completedByCourse = new Map<number, Set<string>>()
    for (const record of completedRecords) {
      const lessons = completedByCourse.get(record.courseId) ?? new Set<string>()
      lessons.add(record.lessonId)
      completedByCourse.set(record.courseId, lessons)
    }
    const courses = (data.courses ?? []).map((course) => {
      const totalLessons = Math.max(1, Number(course.lessons) || 1)
      const completed = Math.min(
        totalLessons,
        completedByCourse.get(course.id)?.size ?? 0,
      )
      return {
        ...course,
        completed,
        progress: Math.round((completed / totalLessons) * 100),
      }
    })
    res.json(courses)
  } catch (error) {
    console.error('Failed to load courses:', error)
    res.status(500).json({ error: 'Failed to load courses' })
  }
})


const LESSON_IDS = [
  'hello-my-name-is',
  'rainbow-colors',
  'lets-count',
  'animal-friends',
  'my-family',
  'yummy-food',
  'shapes-around-us',
  'pandas-big-review',
]
const VALID_ACTIVITIES = ['listening', 'reading', 'speaking', 'writing']

type StoredProgress = {
  userId?: string
  lessonId: string
  courseId: number
  completedActivities: string[]
  updatedAt: string
}

type ProgressData = {
  progress?: StoredProgress[]
  courses?: Array<{
    id: number
    lessons?: number
    completed?: number
    progress?: number
  }>
}

app.get('/api/v1/progress/:lessonId', requireAuth, requireStudent, async (req, res) => {
  const lessonId = Array.isArray(req.params.lessonId)
    ? req.params.lessonId[0]
    : req.params.lessonId

  if (typeof lessonId !== 'string' || !LESSON_IDS.includes(lessonId)) {
    res.status(404).json({ error: 'Lesson progress not found' })
    return
  }

  try {
    const contents = await fs.readFile(DATA_FILE, 'utf8')
    const data = JSON.parse(contents) as ProgressData
    const userId = req.authAccount!.learnerId!

    const record = (data.progress ?? []).find(
      (item) =>
        item.lessonId === lessonId
        && (item.userId ?? DEFAULT_LEARNER_ID) === userId,
    )

    res.json(record ?? {
      lessonId: lessonId,
      courseId: 1,
      completedActivities: [],
      updatedAt: null,
    })
  } catch (error) {
    console.error('Failed to load lesson progress:', error)
    res.status(500).json({ error: 'Failed to load lesson progress' })
  }
})

app.put('/api/v1/progress/:lessonId', requireAuth, requireStudent, async (req, res) => {
  const lessonId = Array.isArray(req.params.lessonId)
    ? req.params.lessonId[0]
    : req.params.lessonId

  if (typeof lessonId !== 'string' || !LESSON_IDS.includes(lessonId)) {
    res.status(404).json({ error: 'Lesson progress not found' })
    return
  }

  const submitted = (req.body as { completedActivities?: unknown })
    ?.completedActivities

  if (
    !Array.isArray(submitted)
    || !submitted.every(
      (item: unknown) =>
        typeof item === 'string'
        && VALID_ACTIVITIES.includes(item),
    )
  ) {
    res.status(400).json({
      error: 'completedActivities must contain valid activity names',
    })
    return
  }

  try {
    const contents = await fs.readFile(DATA_FILE, 'utf8')
    const data = JSON.parse(contents) as ProgressData
    const completedActivities = [...new Set(submitted as string[])]
    const now = new Date().toISOString()
    const userId = req.authAccount!.learnerId!

    const record: StoredProgress = {
      userId,
      lessonId: lessonId,
      courseId: 1,
      completedActivities,
      updatedAt: now,
    }

    if (!Array.isArray(data.progress)) {
      data.progress = []
    }

    const existingIndex = data.progress.findIndex(
      (item) =>
        item.lessonId === lessonId
        && (item.userId ?? DEFAULT_LEARNER_ID) === userId,
    )

    if (existingIndex >= 0) {
      data.progress[existingIndex] = record
    } else {
      data.progress.push(record)
    }

    // Count this lesson as complete only after all four activities are done.
    if (completedActivities.length === VALID_ACTIVITIES.length) {
      const course = data.courses?.find((item) => item.id === 1)

      if (course) {
        course.completed = Math.max(course.completed ?? 0, 1)
        course.progress = Math.round(
          (course.completed / Math.max(course.lessons ?? 8, 1)) * 100,
        )
      }
    }

    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8')
    res.json(record)
  } catch (error) {
    console.error('Failed to save lesson progress:', error)
    res.status(500).json({ error: 'Failed to save lesson progress' })
  }
})

app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'ok',
    application: 'PandaLearn LMS',
    timestamp: new Date().toISOString(),
  })
})

app.get('/api/v1', (_req, res) => {
  res.json({
    name: 'PandaLearn LMS API',
    version: '1.0.0',
    health: '/api/v1/health',
  })
})

async function startServer() {
  await ensureDataFile()
  await bootstrapAuthStore()

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PandaLearn API running at http://localhost:${PORT}`)
    console.log(`Health check: http://localhost:${PORT}/api/v1/health`)
    console.log(`Local data file: ${DATA_FILE}`)
  })
}

startServer().catch((error: unknown) => {
  console.error('Failed to start PandaLearn API:', error)
  process.exitCode = 1
})
