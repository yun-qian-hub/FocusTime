import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PomodoroSession, PomodoroSettings } from '@/types'

const DEFAULT_SETTINGS: PomodoroSettings = {
  focusTime: 25,
  shortBreak: 5,
  longBreak: 15,
  cyclesBeforeLongBreak: 4,
  targetCycles: 4,
  autoStartBreak: false,
  autoStartFocus: false,
  soundEnabled: true
}

function getSettings(): PomodoroSettings {
  try {
    const data = localStorage.getItem('task_manager_pomodoro_settings')
    if (data) {
      const saved = JSON.parse(data)
      const migrated = { ...DEFAULT_SETTINGS, ...saved }
      if (saved.focusTime && saved.focusTime >= 5) {
        migrated.focusTime = Math.min(saved.focusTime, 60)
      }
      if (saved.shortBreak && saved.shortBreak >= 1) {
        migrated.shortBreak = Math.min(saved.shortBreak, 30)
      }
      if (!migrated.targetCycles) {
        migrated.targetCycles = DEFAULT_SETTINGS.targetCycles
      }
      return migrated
    }
    return DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

function saveSettings(settings: PomodoroSettings): void {
  localStorage.setItem('task_manager_pomodoro_settings', JSON.stringify(settings))
}

function getSessions(): PomodoroSession[] {
  try {
    const data = localStorage.getItem('task_manager_pomodoro_sessions')
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveSessions(sessions: PomodoroSession[]): void {
  localStorage.setItem('task_manager_pomodoro_sessions', JSON.stringify(sessions))
}

interface TimerState {
  timeLeft: number
  isRunning: boolean
  currentStatus: 'focus' | 'shortBreak' | 'longBreak' | 'idle'
  completedCycles: number
  lastSaveTime: number
  accumulatedFocusSeconds: number
  endTime: number
}

function getTimerState(): TimerState | null {
  try {
    const data = localStorage.getItem('task_manager_pomodoro_timer_state')
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

function saveTimerState(state: TimerState): void {
  localStorage.setItem('task_manager_pomodoro_timer_state', JSON.stringify(state))
}

function clearTimerState(): void {
  localStorage.removeItem('task_manager_pomodoro_timer_state')
}

export const usePomodoroStore = defineStore('pomodoro', () => {
  const settings = ref<PomodoroSettings>(getSettings())
  const sessions = ref<PomodoroSession[]>(getSessions())
  const currentSession = ref<PomodoroSession | null>(null)
  const timeLeft = ref(0)
  const isRunning = ref(false)
  const currentStatus = ref<'focus' | 'shortBreak' | 'longBreak' | 'idle'>('idle')
  const completedCycles = ref(0)
  const totalFocusTime = ref(0)
  const accumulatedFocusSeconds = ref(0)
  const endTime = ref(Date.now())
  
  let timerInterval: ReturnType<typeof setInterval> | null = null

  const todaySessions = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return sessions.value.filter(s => s.date === today)
  })

  const todayFocusMinutes = computed(() => {
    return todaySessions.value.reduce((sum, session) => sum + session.focusTime, 0)
  })

  const todayCompletedCycles = computed(() => {
    return todaySessions.value.reduce((sum, session) => sum + session.completedCycles, 0)
  })

  function getTotalTime(): number {
    switch (currentStatus.value) {
      case 'focus':
        return settings.value.focusTime * 60
      case 'shortBreak':
        return settings.value.shortBreak * 60
      case 'longBreak':
        return settings.value.longBreak * 60
      default:
        return settings.value.focusTime * 60
    }
  }

  function updateSettings(newSettings: Partial<PomodoroSettings>) {
    settings.value = { ...settings.value, ...newSettings }
    saveSettings(settings.value)
    if (!isRunning.value) {
      resetTimer()
    }
  }

  function startSession() {
    if (!currentSession.value) {
      const now = new Date()
      currentSession.value = {
        id: Date.now(),
        date: now.toISOString().split('T')[0],
        focusTime: 0,
        shortBreak: 0,
        longBreak: 0,
        cycles: settings.value.cyclesBeforeLongBreak,
        completedCycles: 0,
        status: 'focus',
        createdAt: now.toISOString()
      }
    }
    
    if (currentStatus.value === 'idle') {
      currentStatus.value = 'focus'
      resetTimer()
    }
    
    isRunning.value = true
    endTime.value = Date.now() + timeLeft.value * 1000
    
    if (!timerInterval) {
      startTimer()
    }
  }

  function pauseSession() {
    isRunning.value = false
    endTime.value = Date.now() + timeLeft.value * 1000
    stopTimer()
    saveTimerState({
      timeLeft: timeLeft.value,
      isRunning: false,
      currentStatus: currentStatus.value,
      completedCycles: completedCycles.value,
      lastSaveTime: Date.now(),
      accumulatedFocusSeconds: accumulatedFocusSeconds.value,
      endTime: endTime.value
    })
  }

  function stopSession() {
    isRunning.value = false
    stopTimer()
    clearTimerState()
    if (currentSession.value) {
      sessions.value.unshift(currentSession.value)
      saveSessions(sessions.value)
    }
    currentSession.value = null
    currentStatus.value = 'idle'
    completedCycles.value = 0
    accumulatedFocusSeconds.value = 0
    resetTimer()
  }

  function resetTimer() {
    timeLeft.value = getTotalTime()
    accumulatedFocusSeconds.value = 0
    endTime.value = Date.now() + timeLeft.value * 1000
  }

  function startTimer() {
    if (timerInterval) return
    
    timerInterval = setInterval(() => {
      if (!isRunning.value) return
      
      const now = Date.now()
      const newTimeLeft = Math.max(0, Math.round((endTime.value - now) / 1000))
      
      if (newTimeLeft !== timeLeft.value) {
        const diff = timeLeft.value - newTimeLeft
        
        if (diff > 0 && currentStatus.value === 'focus') {
          accumulatedFocusSeconds.value += diff
          if (currentSession.value) {
            currentSession.value.focusTime = accumulatedFocusSeconds.value / 60
          }
        }
        
        timeLeft.value = newTimeLeft
        
        if (timeLeft.value % 5 === 0 || timeLeft.value <= 10) {
          saveTimerState({
            timeLeft: timeLeft.value,
            isRunning: true,
            currentStatus: currentStatus.value,
            completedCycles: completedCycles.value,
            lastSaveTime: Date.now(),
            accumulatedFocusSeconds: accumulatedFocusSeconds.value,
            endTime: endTime.value
          })
        }
      }

      if (timeLeft.value <= 0) {
        handleTimerComplete()
      }
    }, 1000)
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  }

  function handleTimerComplete() {
    stopTimer()
    
    if (currentSession.value) {
      if (currentStatus.value === 'focus') {
        completedCycles.value++
        currentSession.value.completedCycles = completedCycles.value
        
        sessions.value.unshift(currentSession.value)
        saveSessions(sessions.value)
        
        accumulatedFocusSeconds.value = 0
        
        const now = new Date()
        currentSession.value = {
          id: Date.now(),
          date: now.toISOString().split('T')[0],
          focusTime: 0,
          shortBreak: 0,
          longBreak: 0,
          cycles: settings.value.targetCycles,
          completedCycles: completedCycles.value,
          status: 'shortBreak',
          createdAt: now.toISOString()
        }
        
        currentStatus.value = 'shortBreak'
        
        if (settings.value.soundEnabled) {
          playNotificationSound()
        }
        
        resetTimer()
        
        if (settings.value.autoStartBreak) {
          isRunning.value = true
          endTime.value = Date.now() + timeLeft.value * 1000
          startTimer()
        } else {
          isRunning.value = false
          saveTimerState({
            timeLeft: timeLeft.value,
            isRunning: false,
            currentStatus: currentStatus.value,
            completedCycles: completedCycles.value,
            lastSaveTime: Date.now(),
            accumulatedFocusSeconds: accumulatedFocusSeconds.value,
            endTime: endTime.value
          })
        }
      } else {
        currentStatus.value = 'focus'
        currentSession.value.status = 'focus'
        
        if (settings.value.soundEnabled) {
          playNotificationSound()
        }
        
        resetTimer()
        
        if (settings.value.autoStartFocus) {
          isRunning.value = true
          endTime.value = Date.now() + timeLeft.value * 1000
          startTimer()
        } else {
          isRunning.value = false
          saveTimerState({
            timeLeft: timeLeft.value,
            isRunning: false,
            currentStatus: currentStatus.value,
            completedCycles: completedCycles.value,
            lastSaveTime: Date.now(),
            accumulatedFocusSeconds: accumulatedFocusSeconds.value,
            endTime: endTime.value
          })
        }
      }
    }
  }

  function playNotificationSound() {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  }

  function switchToFocus() {
    currentStatus.value = 'focus'
    completedCycles.value = 0
    accumulatedFocusSeconds.value = 0
    resetTimer()
    saveTimerState({
      timeLeft: timeLeft.value,
      isRunning: false,
      currentStatus: currentStatus.value,
      completedCycles: completedCycles.value,
      lastSaveTime: Date.now(),
      accumulatedFocusSeconds: accumulatedFocusSeconds.value,
      endTime: endTime.value
    })
  }

  function switchToShortBreak() {
    currentStatus.value = 'shortBreak'
    resetTimer()
    saveTimerState({
      timeLeft: timeLeft.value,
      isRunning: false,
      currentStatus: currentStatus.value,
      completedCycles: completedCycles.value,
      lastSaveTime: Date.now(),
      accumulatedFocusSeconds: accumulatedFocusSeconds.value,
      endTime: endTime.value
    })
  }

  function switchToLongBreak() {
    currentStatus.value = 'longBreak'
    resetTimer()
    saveTimerState({
      timeLeft: timeLeft.value,
      isRunning: false,
      currentStatus: currentStatus.value,
      completedCycles: completedCycles.value,
      lastSaveTime: Date.now(),
      accumulatedFocusSeconds: accumulatedFocusSeconds.value,
      endTime: endTime.value
    })
  }

  function getFormattedTime(): string {
    const minutes = Math.floor(timeLeft.value / 60)
    const seconds = timeLeft.value % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  function getProgress(): number {
    const totalTime = getTotalTime()
    return ((totalTime - timeLeft.value) / totalTime) * 100
  }

  function initializeTimer() {
    const savedState = getTimerState()
    
    if (savedState) {
      currentStatus.value = savedState.currentStatus
      completedCycles.value = savedState.completedCycles
      accumulatedFocusSeconds.value = savedState.accumulatedFocusSeconds
      
      const now = Date.now()
      
      if (savedState.endTime > now + 1000) {
        endTime.value = savedState.endTime
        timeLeft.value = Math.max(0, Math.round((savedState.endTime - now) / 1000))
        
        if (savedState.isRunning) {
          isRunning.value = true
          if (!timerInterval) {
            startTimer()
          }
        } else {
          isRunning.value = false
        }
      } else {
        resetTimer()
        isRunning.value = false
        clearTimerState()
      }
    } else {
      resetTimer()
      isRunning.value = false
    }
  }

  function cleanTimer() {
    saveTimerState({
      timeLeft: timeLeft.value,
      isRunning: isRunning.value,
      currentStatus: currentStatus.value,
      completedCycles: completedCycles.value,
      lastSaveTime: Date.now(),
      accumulatedFocusSeconds: accumulatedFocusSeconds.value,
      endTime: endTime.value
    })
  }

  return {
    settings,
    sessions,
    currentSession,
    timeLeft,
    isRunning,
    currentStatus,
    completedCycles,
    totalFocusTime,
    todaySessions,
    todayFocusMinutes,
    todayCompletedCycles,
    updateSettings,
    startSession,
    pauseSession,
    stopSession,
    resetTimer,
    startTimer,
    stopTimer,
    switchToFocus,
    switchToShortBreak,
    switchToLongBreak,
    getFormattedTime,
    getProgress,
    initializeTimer,
    cleanTimer
  }
})