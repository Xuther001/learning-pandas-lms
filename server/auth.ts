import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Request, RequestHandler } from 'express'

const directory = path.dirname(fileURLToPath(import.meta.url))
const AUTH_FILE = path.join(directory, 'auth.json')
const SESSION_COOKIE = 'fluentpath_session'
const SESSION_SECONDS = 7 * 24 * 60 * 60

export type AuthAccount = {
  id: string
  username: string
  passwordHash: string
  role: 'admin' | 'student'
  learnerId: string | null
  displayName: string
  active: boolean
  createdAt: string
}

type AuthStore = { accounts: AuthAccount[] }

declare global {
  namespace Express {
    interface Request {
      authAccount?: AuthAccount
    }
  }
}

function secret(): string {
  const value = process.env.SESSION_SECRET
  if (!value || value.length < 32) {
    throw new Error('SESSION_SECRET must be configured with at least 32 characters.')
  }
  return value
}

export async function loadAuthStore(): Promise<AuthStore> {
  try {
    const contents = await fs.readFile(AUTH_FILE, 'utf8')
    const parsed = JSON.parse(contents) as AuthStore
    if (!Array.isArray(parsed.accounts)) parsed.accounts = []
    return parsed
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    return { accounts: [] }
  }
}

export async function saveAuthStore(store: AuthStore): Promise<void> {
  await fs.writeFile(AUTH_FILE, JSON.stringify(store, null, 2), {
    encoding: 'utf8',
    mode: 0o600,
  })
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, expectedHex] = stored.split(':')
  if (!salt || !expectedHex || !/^[a-f0-9]+$/i.test(expectedHex)) return false

  const expected = Buffer.from(expectedHex, 'hex')
  const actual = scryptSync(password, salt, expected.length)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export async function bootstrapAuthStore(): Promise<void> {
  const username = process.env.ADMIN_USERNAME?.trim()
  const password = process.env.ADMIN_PASSWORD

  if (!username || !password) {
    throw new Error(
      'Set ADMIN_USERNAME and ADMIN_PASSWORD in your private .env file before starting FluentPath.',
    )
  }
  if (username.length > 40 || password.length < 12) {
    throw new Error('Admin username must be at most 40 characters and admin password at least 12 characters.')
  }

  // Validate the session secret before the API begins listening.
  secret()

  const store = await loadAuthStore()
  const existingAdmin = store.accounts.find((account) => account.role === 'admin')

  if (!existingAdmin) {
    store.accounts.push({
      id: randomBytes(16).toString('hex'),
      username,
      passwordHash: hashPassword(password),
      role: 'admin',
      learnerId: null,
      displayName: 'FluentPath Administrator',
      active: true,
      createdAt: new Date().toISOString(),
    })
    await saveAuthStore(store)
    console.log(`Created the initial administrator account: ${username}`)
  } else {
    console.log(`Administrator account is already configured: ${existingAdmin.username}`)
  }
}

export async function findAccountByUsername(username: string): Promise<AuthAccount | undefined> {
  const store = await loadAuthStore()
  return store.accounts.find(
    (account) => account.username.toLowerCase() === username.trim().toLowerCase(),
  )
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

export function createSessionCookie(account: AuthAccount): string {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS
  const payload = `${account.id}.${expiresAt}`
  const token = `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_SECONDS}${secure}`
}

export function clearSessionCookie(): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`
}

function readCookie(req: Request): string | undefined {
  const header = req.headers.cookie
  if (!header) return undefined

  for (const part of header.split(';')) {
    const [name, ...value] = part.trim().split('=')
    if (name === SESSION_COOKIE) return value.join('=')
  }
  return undefined
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const token = readCookie(req)
    if (!token) {
      res.status(401).json({ error: 'Please log in to continue.' })
      return
    }

    const separator = token.lastIndexOf('.')
    if (separator < 1) {
      res.status(401).json({ error: 'Your session is invalid. Please log in again.' })
      return
    }

    const encodedPayload = token.slice(0, separator)
    const suppliedSignature = token.slice(separator + 1)
    const payload = Buffer.from(encodedPayload, 'base64url').toString('utf8')
    const expectedSignature = sign(payload)
    const supplied = Buffer.from(suppliedSignature)
    const expected = Buffer.from(expectedSignature)

    if (
      supplied.length !== expected.length
      || !timingSafeEqual(supplied, expected)
    ) {
      res.status(401).json({ error: 'Your session is invalid. Please log in again.' })
      return
    }

    const lastDot = payload.lastIndexOf('.')
    const accountId = payload.slice(0, lastDot)
    const expiresAt = Number(payload.slice(lastDot + 1))

    if (!accountId || !Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
      res.status(401).json({ error: 'Your session has expired. Please log in again.' })
      return
    }

    const store = await loadAuthStore()
    const account = store.accounts.find(
      (item) => item.id === accountId && item.active,
    )

    if (!account) {
      res.status(401).json({ error: 'This account is inactive or no longer exists.' })
      return
    }

    req.authAccount = account
    next()
  } catch (error) {
    next(error)
  }
}

export const requireAdmin: RequestHandler = (req, res, next) => {
  if (req.authAccount?.role !== 'admin') {
    res.status(403).json({ error: 'Administrator access is required.' })
    return
  }
  next()
}

export function publicAccount(account: AuthAccount) {
  return {
    id: account.id,
    username: account.username,
    role: account.role,
    learnerId: account.learnerId,
    displayName: account.displayName,
    active: account.active,
    createdAt: account.createdAt,
  }
}
