import { useEffect, useState } from 'react'
import {
  getApiHealth,
  getAuthMe,
  logout,
  getCourses,
  getLessonProgress,
  saveLessonProgress,
  getLearners,
  createLearner,
  LEARNER_AVATARS,
  type Course,
  type Learner,
  type AuthAccount,
} from './api'
import { LoginScreen, AdminDashboard } from './AuthScreens'
import './App.css'

const navigation = [
  { label: 'Dashboard', icon: '▦' },
  { label: 'My Learning', icon: '▤' },
  { label: 'Courses', icon: '▣' },
  { label: 'Learners', icon: '👥' },
  { label: 'Live Sessions', icon: '◷' },
  { label: 'Assignments', icon: '☑' },
  { label: 'Announcements', icon: '♧' },
]

const LESSONS = [
  {
    id: 'hello-my-name-is', title: 'Hello! My Name Is…',
    category: 'MY FIRST ENGLISH WORDS', icon: '👋', color: 'mint',
    targetWord: 'HELLO', alternativeWord: 'GOODBYE',
    intro: 'Let’s learn your first English greeting with Panda.',
    pandaMessage: 'My name is Panda. Can you say Hello?',
    listeningPrompt: 'Listen and choose the word.',
    readingPrompt: 'Tap the word Panda says.',
    speakingPrompt: 'Say Hello. Microphone practice is optional.',
    writingPrompt: 'Tap the letters in order to spell HELLO.',
    praise: 'You found HELLO! ⭐',
  },
  {
    id: 'rainbow-colors', title: 'Rainbow Colors',
    category: 'COLORS ALL AROUND US', icon: '🌈', color: 'lavender',
    targetWord: 'RED', alternativeWord: 'BLUE',
    intro: 'Discover bright colors with Panda.',
    pandaMessage: 'Red like an apple! Can you say RED?',
    listeningPrompt: 'Listen carefully. Which color did you hear?',
    readingPrompt: 'Find the color Panda says.',
    speakingPrompt: 'Say RED. Microphone practice is optional.',
    writingPrompt: 'Tap the letters in order to spell RED.',
    praise: 'You found RED! ⭐',
  },
  {
    id: 'lets-count', title: "Let's Count!",
    category: 'NUMBERS FOR LITTLE LEARNERS', icon: '🔢', color: 'peach',
    targetWord: 'TWO', alternativeWord: 'THREE',
    intro: 'Count along with Panda.',
    pandaMessage: 'One, two! Can you say TWO?',
    listeningPrompt: 'Listen to the number and choose it.',
    readingPrompt: 'Find the number word Panda says.',
    speakingPrompt: 'Say TWO. Microphone practice is optional.',
    writingPrompt: 'Tap the letters in order to spell TWO.',
    praise: 'You found TWO! ⭐',
  },
  {
    id: 'animal-friends', title: 'Animal Friends',
    category: 'MEET THE ANIMALS', icon: '🐱', color: 'mint',
    targetWord: 'CAT', alternativeWord: 'DOG',
    intro: 'Meet friendly animals and learn their names.',
    pandaMessage: 'Meow! This is a CAT. Can you say CAT?',
    listeningPrompt: 'Listen and choose the animal.',
    readingPrompt: 'Find the animal Panda says.',
    speakingPrompt: 'Say CAT. Microphone practice is optional.',
    writingPrompt: 'Tap the letters in order to spell CAT.',
    praise: 'You found CAT! ⭐',
  },
  {
    id: 'my-family', title: 'My Family',
    category: 'PEOPLE I LOVE', icon: '👨‍👩‍👧', color: 'peach',
    targetWord: 'MUM', alternativeWord: 'DAD',
    intro: 'Learn simple words for your family.',
    pandaMessage: 'I love my MUM. Can you say MUM?',
    listeningPrompt: 'Listen and choose the family word.',
    readingPrompt: 'Find the family word Panda says.',
    speakingPrompt: 'Say MUM. Microphone practice is optional.',
    writingPrompt: 'Tap the letters in order to spell MUM.',
    praise: 'You found MUM! ⭐',
  },
  {
    id: 'yummy-food', title: 'Yummy Food',
    category: 'FOOD AND FRUIT', icon: '🍎', color: 'lavender',
    targetWord: 'APPLE', alternativeWord: 'BANANA',
    intro: 'Explore yummy food with Panda.',
    pandaMessage: 'Crunch, crunch! I see an APPLE.',
    listeningPrompt: 'Listen and choose the food.',
    readingPrompt: 'Find the food word Panda says.',
    speakingPrompt: 'Say APPLE. Microphone practice is optional.',
    writingPrompt: 'Tap the letters in order to spell APPLE.',
    praise: 'You found APPLE! ⭐',
  },
  {
    id: 'shapes-around-us', title: 'Shapes Around Us',
    category: 'LEARN SHAPES', icon: '🔵', color: 'mint',
    targetWord: 'CIRCLE', alternativeWord: 'SQUARE',
    intro: 'Look for shapes in the world around you.',
    pandaMessage: 'A ball is round like a CIRCLE!',
    listeningPrompt: 'Listen and choose the shape.',
    readingPrompt: 'Find the shape word Panda says.',
    speakingPrompt: 'Say CIRCLE. Microphone practice is optional.',
    writingPrompt: 'Tap the letters in order to spell CIRCLE.',
    praise: 'You found CIRCLE! ⭐',
  },
  {
    id: 'pandas-big-review', title: "Panda's Big Review",
    category: 'LET’S PRACTISE TOGETHER', icon: '🐼', color: 'peach',
    targetWord: 'PANDA', alternativeWord: 'TIGER',
    intro: 'Celebrate what you have learned with Panda.',
    pandaMessage: 'I am PANDA! You are doing great!',
    listeningPrompt: 'Listen and choose the animal name.',
    readingPrompt: 'Find the word Panda says.',
    speakingPrompt: 'Say PANDA. Microphone practice is optional.',
    writingPrompt: 'Tap the letters in order to spell PANDA.',
    praise: 'You found PANDA! ⭐',
  },
]

function App() {
  const [authChecking, setAuthChecking] = useState(true)
  const [authAccount, setAuthAccount] = useState<AuthAccount | null>(null)
  const [activePage, setActivePage] = useState('Dashboard')
  const [activeLessonId, setActiveLessonId] = useState('hello-my-name-is')
  const [lessonProgressById, setLessonProgressById] = useState<Record<string, string[]>>({})
  const [search, setSearch] = useState('')
  const [courses, setCourses] = useState<Course[]>([])
  const [learners, setLearners] = useState<Learner[]>([])
  const [activeLearnerId, setActiveLearnerId] = useState(() => {
    try {
      return window.localStorage.getItem('pandaLearn-active-learner') || 'default-learner'
    } catch {
      return 'default-learner'
    }
  })
  const [newLearnerName, setNewLearnerName] = useState('')
  const [newLearnerAvatar, setNewLearnerAvatar] = useState(LEARNER_AVATARS[0])
  const [learnerError, setLearnerError] = useState('')
  const [learnerSaving, setLearnerSaving] = useState(false)
  const [done, setDone] = useState<string[]>([])
  const [progressSaveStatus, setProgressSaveStatus] = useState<
    'loading' | 'saved' | 'error'
  >('loading')
  const [reading, setReading] = useState('')
  const [listening, setListening] = useState('')
  const [letters, setLetters] = useState('')
  const [speaking, setSpeaking] = useState('Try saying Hello!')
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  const activeLesson = LESSONS.find((lesson) => lesson.id === activeLessonId) ?? LESSONS[0]

  useEffect(() => {
    let cancelled = false

    getAuthMe()
      .then((account) => {
        if (!cancelled) setAuthAccount(account)
      })
      .catch(() => {
        if (!cancelled) setAuthAccount(null)
      })
      .finally(() => {
        if (!cancelled) setAuthChecking(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (
      authAccount?.role === 'student' &&
      authAccount.learnerId &&
      activeLearnerId !== authAccount.learnerId
    ) {
      setActiveLearnerId(authAccount.learnerId)
    }
  }, [authAccount?.id, authAccount?.learnerId, authAccount?.role, activeLearnerId])

  useEffect(() => {
    if (!learners.some((learner) => learner.id === activeLearnerId)) return
    try {
      window.localStorage.setItem('pandaLearn-active-learner', activeLearnerId)
    } catch {
      // The app can still work if browser storage is unavailable.
    }
  }, [activeLearnerId, learners])

  useEffect(() => {
    let cancelled = false

    getApiHealth()
      .then(() => {
        if (!cancelled) setApiStatus('online')
      })
      .catch(() => {
        if (!cancelled) setApiStatus('offline')
      })

    if (authAccount?.role === 'student') {
      getLearners()
        .then((loadedLearners) => {
          if (cancelled) return
          setLearners(loadedLearners)
          if (
            authAccount.learnerId &&
            loadedLearners.some((learner) => learner.id === authAccount.learnerId)
          ) {
            setActiveLearnerId(authAccount.learnerId)
          } else {
            setActiveLearnerId(loadedLearners[0]?.id ?? '')
          }
        })
        .catch((error: unknown) => {
          if (!cancelled) console.error('Failed to load learners:', error)
        })
    }

    return () => {
      cancelled = true
    }
  }, [authAccount?.id, authAccount?.role])


  useEffect(() => {
    if (
      authAccount?.role !== 'student' ||
      !authAccount.learnerId
    ) {
      return
    }

    const learnerId = authAccount.learnerId
    let cancelled = false
    setDone([])
    setProgressSaveStatus('loading')
    setReading('')
    setListening('')
    setLetters('')
    setSpeaking(`Try saying ${activeLesson.targetWord}!`)

    getCourses(learnerId)
      .then((loadedCourses) => {
        if (!cancelled) setCourses(loadedCourses)
      })
      .catch((error: unknown) => {
        console.error('Failed to load courses:', error)
      })

    Promise.all(
      LESSONS.map((lesson) => getLessonProgress(learnerId, lesson.id)),
    )
      .then((records) => {
        if (cancelled) return

        const progress: Record<string, string[]> = {}
        for (const record of records) {
          progress[record.lessonId] = record.completedActivities
        }

        setLessonProgressById(progress)
        setDone(progress[activeLessonId] ?? [])
        setProgressSaveStatus('saved')
      })
      .catch((error: unknown) => {
        console.error('Failed to load learner progress:', error)
        if (!cancelled) setProgressSaveStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [authAccount?.id, authAccount?.role, authAccount?.learnerId, activeLessonId])

  async function handleLogout() {
    try {
      await logout()
    } catch (error) {
      console.error('Logout request failed:', error)
    } finally {
      setAuthAccount(null)
      setLearners([])
      setCourses([])
      setLessonProgressById({})
      setDone([])
    }
  }

  async function handleCreateLearner(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLearnerError('')
    setLearnerSaving(true)
    try {
      const learner = await createLearner(newLearnerName.trim(), newLearnerAvatar)
      setLearners((current) => [...current, learner])
      setNewLearnerName('')
      setNewLearnerAvatar(LEARNER_AVATARS[0])
      setActiveLearnerId(learner.id)
      setActivePage('Dashboard')
    } catch (error) {
      setLearnerError(error instanceof Error ? error.message : 'Could not create learner.')
    } finally {
      setLearnerSaving(false)
    }
  }

  function finishActivity(name: string) {
    if (done.includes(name)) return

    const next = [...done, name]
    setDone(next)
    setLessonProgressById((current) => ({
      ...current,
      [activeLessonId]: next,
    }))
    setProgressSaveStatus('loading')

    saveLessonProgress(next, activeLearnerId, activeLessonId)
      .then(() => getCourses(activeLearnerId))
      .then((loadedCourses) => {
        setCourses(loadedCourses)
        setProgressSaveStatus('saved')
      })
      .catch((error: unknown) => {
        console.error('Failed to save lesson progress:', error)
        setProgressSaveStatus('error')
      })
  }

  function speak(text: string) {
    if (!('speechSynthesis' in window)) {
      alert('Audio playback is not supported by this browser.')
      return
    }
    window.speechSynthesis.cancel()
    const voice = new SpeechSynthesisUtterance(text)
    voice.lang = 'en-US'
    voice.rate = 0.8
    window.speechSynthesis.speak(voice)
  }

  function practiseSpeaking() {
    type Result = { transcript: string }
    type Recognition = {
      lang: string
      interimResults: boolean
      maxAlternatives: number
      onresult: ((event: { results: ArrayLike<ArrayLike<Result>> }) => void) | null
      onerror: (() => void) | null
      start: () => void
    }
    type Constructor = new () => Recognition
    const browser = window as unknown as {
      SpeechRecognition?: Constructor
      webkitSpeechRecognition?: Constructor
    }
    const Speech = browser.SpeechRecognition ?? browser.webkitSpeechRecognition

    if (!Speech) {
      setSpeaking('Speech recognition is not supported here. Say the word aloud, then tap “I practised”.')
      return
    }

    try {
      const recognition = new Speech()
      recognition.lang = 'en-US'
      recognition.interimResults = false
      recognition.maxAlternatives = 1
      setSpeaking(`Listening… Say ${activeLesson.targetWord} now.`)
      recognition.onresult = (event) => {
        const heard = event.results[0]?.[0]?.transcript ?? ''
        if (heard.toLowerCase().includes(activeLesson.targetWord.toLowerCase())) {
          setSpeaking(`Great job! I heard “${heard}”.`)
          finishActivity('speaking')
        } else {
          setSpeaking(`I heard “${heard}”. Try saying ${activeLesson.targetWord} again.`)
        }
      }
      recognition.onerror = () => setSpeaking('Microphone unavailable. Check browser permission or practise aloud.')
      recognition.start()
    } catch {
      setSpeaking('Could not start the microphone. Check browser permission.')
    }
  }

  const filteredCourses = courses.filter((course) =>
    `${course.title} ${course.category} ${course.instructor}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  )
  const activeLearner = learners.find((learner) => learner.id === activeLearnerId)

  if (authChecking) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <p role="status">Checking your FluentPath session…</p>
      </main>
    )
  }

  if (!authAccount) {
    return <LoginScreen onLogin={setAuthAccount} />
  }

  if (authAccount.role === 'admin') {
    return <AdminDashboard onLogout={handleLogout} />
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={() => setActivePage('Dashboard')}>
          <span className="brand-mark" aria-hidden="true">
            FP
          </span>
          <span className="brand-copy">
            <strong>FluentPath</strong>
            <small>ENGLISH, WITH PURPOSE</small>
          </span>
        </a>

        <div className="workspace-label">WORKSPACE</div>
        <div className="workspace-switcher">
          <span className="workspace-icon">P</span>
          <span>
            <strong>Learning Portal</strong>
            <small>Personal workspace</small>
          </span>
          <span className="switcher-chevron">⌄</span>
        </div>

        <div className="nav-label">MENU</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navigation.filter((item) => item.label !== 'Learners').map((item) => (
            <button
              className={`nav-item ${activePage === item.label ? 'active' : ''}`}
              key={item.label}
              onClick={() => setActivePage(item.label)}
              type="button"
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
              {item.label === 'Assignments' && <span className="nav-count">2</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        <div className="help-card">
          <span className="help-panda">?</span>
          <strong>Need support?</strong>
          <p>Find guidance to keep your learning on track.</p>
          <button type="button" onClick={() => setActivePage('Help & Support')}>
            Visit help center <span aria-hidden="true">↗</span>
          </button>
        </div>

        <button
          className={`nav-item admin-link ${activePage === 'Administration' ? 'active' : ''}`}
          onClick={() => setActivePage('Administration')}
          type="button"
        >
          <span className="nav-icon" aria-hidden="true">⚙</span>
          <span>Administration</span>
        </button>

        <div className="sidebar-footer">
          <span className="status-dot" />
          FluentPath <span className="version">v1.0</span>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="breadcrumb">
            Learning Portal <span>/</span> <strong>{activePage}</strong>
          </div>
          <div className="topbar-actions">
            <div className={`api-status api-status-${apiStatus}`} role="status">
              <span className="api-status-dot" />
              API {apiStatus === 'checking' ? 'Checking' : apiStatus === 'online' ? 'Online' : 'Offline'}
            </div>
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                aria-label="Search courses"
                placeholder="Search courses..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <kbd>⌘ K</kbd>
            </label>
            <button className="icon-button notification-button" type="button" aria-label="Notifications">
              ♧<span className="notification-dot" />
            </button>
            <label className="learner-switcher">
              <span className="learner-switcher-avatar" aria-hidden="true">
                {activeLearner?.avatar && ['🐼', '🐻', '🐰', '🦊', '🐸', '🐱', '🐯', '🐨'].includes(activeLearner.avatar) ? '📘' : (activeLearner?.avatar ?? 'FP')}
              </span>
              <span className="learner-switcher-copy">
                <small>LEARNING AS</small>
                <select
                  aria-label="Switch learner"
                  value={activeLearnerId}
                  onChange={(event) => setActiveLearnerId(event.target.value)}
                >
                  {learners.map((learner) => (
                    <option key={learner.id} value={learner.id}>
                      {learner.name}
                    </option>
                  ))}
                </select>
              </span>
            </label>
            <button
              className="icon-button"
              type="button"
              onClick={handleLogout}
              aria-label="Sign out"
              title="Sign out"
            >
              Sign out
            </button>
          </div>
        </header>

        <div className="page-content">
          {activePage === 'Lessons' ? (
            <section className="lesson-library-page">
              <div className="eyebrow"><span /> YOUR ENGLISH ADVENTURE</div>
              <h1>Choose a lesson</h1>
              <p className="learners-intro">Learn a little English every day. Finish a lesson to unlock the next one.</p>
              <div className="lesson-library-grid">
                {LESSONS.map((lesson, index) => {
                  const activityCount = (lessonProgressById[lesson.id] ?? []).length
                  const completed = activityCount === 4
                  const unlocked = index === 0
                    || (lessonProgressById[LESSONS[index - 1].id] ?? []).length === 4

                  return (
                    <article className={`lesson-library-card ${completed ? 'lesson-library-complete' : ''}`} key={lesson.id}>
                      <div className={`lesson-library-art ${lesson.color}`}>
                        <span aria-hidden="true">{lesson.icon}</span>
                        <small>LESSON {index + 1} OF {LESSONS.length}</small>
                      </div>
                      <div className="lesson-library-copy">
                        <h2>{lesson.title}</h2>
                        <p>{lesson.intro}</p>
                        <div className="lesson-library-progress">
                          <span>{completed ? 'Completed ⭐' : unlocked ? `${activityCount} of 4 activities` : '🔒 Complete the previous lesson first'}</span>
                        </div>
                        <button
                          className="course-button"
                          type="button"
                          disabled={!unlocked}
                          onClick={() => {
                            setActiveLessonId(lesson.id)
                            setActivePage('Lesson')
                          }}
                        >
                          {completed ? 'Practise again' : unlocked ? 'Start lesson' : 'Locked'} <span aria-hidden="true">→</span>
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          ) : activePage === 'Lesson' ? (
            <section className="lesson-page">
              <button className="lesson-back" onClick={() => setActivePage('Lessons')} type="button">← Back to lessons</button>
              <div className="eyebrow"><span /> {activeLesson.category}</div>
              <h1>{activeLesson.title}</h1>
              <p>{activeLesson.intro}</p>
              <p className="lesson-progress">{done.length} of 4 activities complete</p>
              <p className="lesson-save-status" role="status">
                {progressSaveStatus === 'loading'
                  ? 'Saving or loading your progress…'
                  : progressSaveStatus === 'error'
                    ? 'Progress could not be saved. Check that the API is running, then try again.'
                    : 'Progress saved.'}
              </p>
              <div className="progress-track"><span style={{ width: `${done.length * 25}%` }} /></div>

              <div className="lesson-star-rewards" role="status" aria-label={`${done.length} of 4 activities completed`}>
                <div className="lesson-star-heading">
                  <strong>Activity progress</strong>
                  <span>{done.length} of 4 earned</span>
                </div>
                <div className="lesson-star-row">
                  {[
                    { id: 'listening', icon: '👂', label: 'Listening' },
                    { id: 'reading', icon: '📖', label: 'Reading' },
                    { id: 'speaking', icon: '🎤', label: 'Speaking' },
                    { id: 'writing', icon: '✏️', label: 'Writing' },
                  ].map((activity) => (
                    <div
                      className={`lesson-star-item ${done.includes(activity.id) ? 'earned' : ''}`}
                      key={activity.id}
                      aria-label={`${activity.label}: ${done.includes(activity.id) ? 'star earned' : 'star not earned yet'}`}
                    >
                      <span className="lesson-star-icon">{done.includes(activity.id) ? '✓' : '○'}</span>
                      <span>{activity.label}</span>
                    </div>
                  ))}
                </div>
                <p>{done.length === 4
                  ? 'All four activities completed. Excellent work.'
                  : 'Complete each activity to build your skills.'}</p>
              </div>

              <div className="lesson-panda-card">
                <div className="lesson-panda">{activeLesson.icon}</div>
                <div>
                  <h2>Lesson focus</h2>
                  <p>{activeLesson.pandaMessage}</p>
                  <button className="lesson-audio-button" onClick={() => speak(activeLesson.pandaMessage)} type="button">🔊 Listen to prompt</button>
                </div>
              </div>

              <div className="lesson-activity-grid">
                <article className="lesson-activity">
                  <div className="lesson-activity-icon">👂</div><small>ACTIVITY 1 · LISTENING</small>
                  <h2>What did you hear?</h2><p>{activeLesson.listeningPrompt}</p>
                  <button className="lesson-audio-button" onClick={() => speak(activeLesson.targetWord)} type="button">🔊 Play the word</button>
                  <div className="lesson-choice-row">
                    <button className="lesson-choice" onClick={() => { setListening(activeLesson.targetWord); finishActivity('listening') }} type="button">{activeLesson.targetWord}</button>
                    <button className="lesson-choice" onClick={() => setListening(activeLesson.alternativeWord)} type="button">{activeLesson.alternativeWord}</button>
                  </div>
                  {listening && <p>{listening === activeLesson.targetWord ? `Wonderful listening! ${activeLesson.praise}` : 'Try again. Listen once more.'}</p>}
                </article>

                <article className="lesson-activity">
                  <div className="lesson-activity-icon">📖</div><small>ACTIVITY 2 · READING</small>
                  <h2>Find “{activeLesson.targetWord}”</h2><p>{activeLesson.readingPrompt}</p>
                  <div className="lesson-choice-row">
                    <button className="lesson-choice" onClick={() => { setReading(activeLesson.targetWord); finishActivity('reading') }} type="button">{activeLesson.targetWord}</button>
                    <button className="lesson-choice" onClick={() => setReading(activeLesson.alternativeWord)} type="button">{activeLesson.alternativeWord}</button>
                  </div>
                  {reading && <p>{reading === activeLesson.targetWord ? activeLesson.praise : 'Not this one. Try again!'}</p>}
                </article>

                <article className="lesson-activity">
                  <div className="lesson-activity-icon">🎤</div><small>ACTIVITY 3 · SPEAKING</small>
                  <h2>Your turn!</h2><p>{activeLesson.speakingPrompt}</p>
                  <button className="lesson-audio-button" onClick={practiseSpeaking} type="button">🎤 Try saying {activeLesson.targetWord}</button>
                  <p role="status">{speaking}</p>
                  <button className="lesson-text-button" onClick={() => { setSpeaking(`Nice practice! Keep saying ${activeLesson.targetWord} aloud.`); finishActivity('speaking') }} type="button">I practised saying it</button>
                </article>

                <article className="lesson-activity">
                  <div className="lesson-activity-icon">✏️</div><small>ACTIVITY 4 · WRITING</small>
                  <h2>Build the word</h2><p>{activeLesson.writingPrompt}</p>
                  <div className="writing-word">{letters || Array.from({ length: activeLesson.targetWord.length }, () => '·').join(' ')}</div>
                  <div className="letter-choice-row">
                    {activeLesson.targetWord.split('').map((letter, index) => (
                      <button className="letter-choice" key={`${letter}-${index}`} onClick={() => {
                        const next = letters + letter
                        if (next.length <= activeLesson.targetWord.length) {
                          setLetters(next)
                          if (next === activeLesson.targetWord) finishActivity('writing')
                        }
                      }} type="button">{letter}</button>
                    ))}
                  </div>
                  <button className="lesson-text-button" onClick={() => setLetters('')} type="button">Start again</button>
                  {letters === activeLesson.targetWord && <p>Well done! You spelled {activeLesson.targetWord}! ⭐</p>}
                </article>
              </div>

              {done.length === 4
                ? <div className="lesson-finish"><h2>🌟 You did it!</h2><p>You practised all four English skills. Great work!</p><button className="course-button" type="button" onClick={() => setActivePage('Lessons')}>Choose your next lesson →</button></div>
                : <p className="lesson-encouragement">Every try helps you learn. You can repeat any activity. 💚</p>}
            </section>
          ) : activePage === 'Learners' ? (
            <section className="learners-page">
              <div className="eyebrow"><span /> FAMILY LEARNING SPACE</div>
              <h1>Learner profiles</h1>
              <p className="learners-intro">
                Give each learner their own friendly profile and learning progress.
              </p>

              <div className="learner-list">
                {learners.map((learner) => (
                  <article className={`learner-card ${learner.id === activeLearnerId ? 'learner-card-active' : ''}`} key={learner.id}>
                    <div className="learner-card-avatar" aria-hidden="true">{['🐼', '🐻', '🐰', '🦊', '🐸', '🐱', '🐯', '🐨'].includes(learner.avatar) ? '📘' : learner.avatar}</div>
                    <div className="learner-card-copy">
                      <strong>{learner.name}</strong>
                      <small>{learner.id === activeLearnerId ? 'Currently selected' : 'Learner profile'}</small>
                    </div>
                    <button
                      className="learner-select-button"
                      type="button"
                      disabled={learner.id === activeLearnerId}
                      onClick={() => setActiveLearnerId(learner.id)}
                    >
                      {learner.id === activeLearnerId ? 'Selected ✓' : 'Switch learner'}
                    </button>
                  </article>
                ))}
              </div>

              <form className="learner-create-card" onSubmit={handleCreateLearner}>
                <h2>Add a learner</h2>
                <p>Use a nickname. You do not need to enter an email address or date of birth.</p>
                <label className="learner-name-label" htmlFor="learner-name">Learner nickname</label>
                <input
                  id="learner-name"
                  className="learner-name-input"
                  value={newLearnerName}
                  onChange={(event) => setNewLearnerName(event.target.value)}
                  placeholder="e.g. Alex Morgan"
                  maxLength={40}
                  required
                />
                <span className="learner-name-hint">1–40 characters</span>
                <span className="learner-name-label">Choose an avatar</span>
                <div className="learner-avatar-options" role="group" aria-label="Choose an avatar">
                  {LEARNER_AVATARS.map((avatar) => (
                    <button
                      key={avatar}
                      type="button"
                      className={`learner-avatar-option ${newLearnerAvatar === avatar ? 'selected' : ''}`}
                      aria-label={`Choose ${avatar} avatar`}
                      aria-pressed={newLearnerAvatar === avatar}
                      onClick={() => setNewLearnerAvatar(avatar)}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
                {learnerError && <p className="learner-error" role="alert">{learnerError}</p>}
                <button className="primary-button learner-create-button" type="submit" disabled={learnerSaving}>
                  {learnerSaving ? 'Creating profile…' : 'Create learner profile'} <span aria-hidden="true">→</span>
                </button>
              </form>
              <p className="learner-privacy-note">
                Privacy note: these are local prototype profiles, not secure accounts. Use nicknames rather than sensitive personal information.
              </p>
            </section>
          ) : activePage === 'Dashboard' || activePage === 'My Learning' || activePage === 'Courses' ? (
            <>
              <section className="welcome-row">
                <div>
                  <div className="eyebrow"><span /> YOUR LEARNING SPACE</div>
                  <h1>{activePage === 'Dashboard' ? 'Build your English confidence.' : activePage}</h1>
                  <p className="welcome-subtitle">
                    {activePage === 'Dashboard'
                      ? 'Build fluency through focused, consistent practice.'
                      : activePage === 'Courses'
                        ? 'Explore your courses and discover something new.'
                        : 'Pick up where you left off and keep moving forward.'}
                  </p>
                </div>
                <div className="date-chip">
                  <span aria-hidden="true">▦</span> Your learning dashboard
                </div>
              </section>

              <section className="hero-banner">
                <div className="hero-copy">
                  <div className="hero-pill"><span /> YOUR JOURNEY, YOUR PACE</div>
                  <h2>Make your next<br />step <em>count.</em></h2>
                  <p>Develop practical English skills with structured lessons and measurable progress.</p>
                  <button className="primary-button" onClick={() => setActivePage('My Learning')} type="button">
                    Continue learning <span aria-hidden="true">→</span>
                  </button>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="hero-sun" />
                  <div className="hero-leaf leaf-one">✦</div>
                  <div className="hero-leaf leaf-two">✧</div>
                  <div className="hero-circle">
                    <span className="panda-face">FP</span>
                  </div>
                  <div className="hero-book book-one" />
                  <div className="hero-book book-two" />
                  <div className="hero-sparkle sparkle-one">✦</div>
                  <div className="hero-sparkle sparkle-two">✧</div>
                </div>
                <div className="banner-decoration decoration-one" />
                <div className="banner-decoration decoration-two" />
              </section>

              <section className="stats-grid" aria-label="Learning statistics">
                <article className="stat-card">
                  <div className="stat-icon stat-green">▤</div>
                  <div className="stat-info">
                    <span>Enrolled courses</span>
                    <strong>03</strong>
                    <small><span className="stat-positive">Your journey</span> is underway</small>
                  </div>
                  <div className="stat-watermark">▤</div>
                </article>
                <article className="stat-card">
                  <div className="stat-icon stat-yellow">◷</div>
                  <div className="stat-info">
                    <span>Lessons completed</span>
                    <strong>25</strong>
                    <small>One lesson at a time</small>
                  </div>
                  <div className="stat-watermark">◷</div>
                </article>
                <article className="stat-card">
                  <div className="stat-icon stat-purple">♧</div>
                  <div className="stat-info">
                    <span>Learning progress</span>
                    <strong>48<small className="stat-percent">%</small></strong>
                    <small>Keep up the good work</small>
                  </div>
                  <div className="stat-watermark">♧</div>
                </article>
                <article className="stat-card">
                  <div className="stat-icon stat-blue">✧</div>
                  <div className="stat-info">
                    <span>Learning streak</span>
                    <strong>05 <small className="stat-days">days</small></strong>
                    <small><span className="stat-positive">Wonderful!</span> Stay consistent</small>
                  </div>
                  <div className="stat-watermark">✧</div>
                </article>
              </section>

              <section className="learning-section">
                <div className="section-heading">
                  <div>
                    <div className="section-kicker">PICK UP WHERE YOU LEFT OFF</div>
                    <h2>{activePage === 'Courses' ? 'Explore your courses' : 'Continue learning'}</h2>
                    <p>Track your progress and strengthen your English skills over time.</p>
                  </div>
                  <button className="text-button" onClick={() => setActivePage('Courses')} type="button">
                    View all courses <span aria-hidden="true">→</span>
                  </button>
                </div>

                <div className="course-grid">
                  {filteredCourses.map((course) => (
                    <article className="course-card" key={course.id}>
                      <div className={`course-art ${course.color}`}>
                        <span className="course-category">{course.category}</span>
                        <span className="course-illustration" aria-hidden="true">{course.icon}</span>
                        <span className="course-art-decoration art-decoration-one" />
                        <span className="course-art-decoration art-decoration-two" />
                      </div>
                      <div className="course-body">
                        <div className="instructor-row">
                          <span className="mini-avatar">FP</span>
                          <span>{course.instructor}</span>
                        </div>
                        <h3>{course.title}</h3>
                        <p className="course-description">{course.description}</p>
                        <div className="course-skills">
                          {course.skills.map((skill) => (
                            <span key={skill}>{skill}</span>
                          ))}
                        </div>
                        <div className="course-meta">
                          <span>▤ {course.lessons} units</span>
                          <span>{course.ageRange}</span>
                          <span>{course.level}</span>
                        </div>
                        <div className="progress-label">
                          <span>Progress</span>
                          <strong>{course.progress}%</strong>
                        </div>
                        <div
                          className="progress-track"
                          role="progressbar"
                          aria-label={`${course.title} progress`}
                          aria-valuenow={course.progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <span style={{ width: `${course.progress}%` }} />
                        </div>
                        <button
                          className="course-button"
                          onClick={() => setActivePage('Lessons')}
                          type="button"
                        >
                          Continue course <span aria-hidden="true">→</span>
                        </button>
                      </div>
                    </article>
                  ))}
                  {filteredCourses.length === 0 && (
                    <div className="empty-state">
                      <span>🔎</span>
                      <strong>No courses found</strong>
                      <p>Try another search term.</p>
                    </div>
                  )}
                </div>
              </section>

              <footer className="page-footer">
                <span>Designed for lifelong learning</span>
                <span>© 2026 FluentPath · English learning, with purpose</span>
              </footer>
            </>
          ) : (
            <section className="placeholder-page">
              <div className="placeholder-panda">FP</div>
              <div className="eyebrow"><span /> FLUENTPATH WORKSPACE</div>
              <h1>{activePage}</h1>
              <p>This workspace is under development. Additional features will be introduced in future updates.</p>
              <button className="primary-button" onClick={() => setActivePage('Dashboard')} type="button">
                Back to dashboard <span aria-hidden="true">→</span>
              </button>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
