const STORAGE_KEYS = {
  TODOS: 'task_manager_todos',
  EVENTS: 'task_manager_events',
  NOTES: 'task_manager_notes',
  ALARMS: 'task_manager_alarms',
  PERIOD_EVENTS: 'task_manager_period_events',
  SCHEDULE_COURSES: 'task_manager_schedule_courses',
  SCHEDULE_SETTINGS: 'task_manager_schedule_settings',
  SCHEDULE_OVERRIDES: 'task_manager_schedule_overrides',
  SCHEDULE_ZOOM: 'task_manager_schedule_zoom'
}

export function getTodos(): any[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TODOS)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveTodos(todos: any[]): void {
  localStorage.setItem(STORAGE_KEYS.TODOS, JSON.stringify(todos))
}

export function getEvents(): any[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.EVENTS)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveEvents(events: any[]): void {
  localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events))
}

export function getNotes(): any[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.NOTES)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveNotes(notes: any[]): void {
  localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes))
}

export function getAlarms(): any[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ALARMS)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveAlarms(alarms: any[]): void {
  localStorage.setItem(STORAGE_KEYS.ALARMS, JSON.stringify(alarms))
}

export function getPeriodEvents(): any[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PERIOD_EVENTS)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function savePeriodEvents(events: any[]): void {
  localStorage.setItem(STORAGE_KEYS.PERIOD_EVENTS, JSON.stringify(events))
}

export function getScheduleCourses(): any[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SCHEDULE_COURSES)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveScheduleCourses(courses: any[]): void {
  localStorage.setItem(STORAGE_KEYS.SCHEDULE_COURSES, JSON.stringify(courses))
}

export function getScheduleSettings(): any {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SCHEDULE_SETTINGS)
    if (data) {
      const parsed = JSON.parse(data)
      if (parsed.baseWeekNumber !== undefined) {
        return {
          ...parsed,
          startTime: parsed.startTime || '08:00',
          endTime: parsed.endTime || '22:00'
        }
      }
      return {
        startDate: parsed.startDate || '2026-02-23',
        baseWeekNumber: 1,
        baseWeekType: (parsed.currentWeekType || 'odd') as 'odd' | 'even',
        startTime: '08:00',
        endTime: '22:00'
      }
    }
    return { startDate: '2026-02-23', baseWeekNumber: 1, baseWeekType: 'odd' as const, startTime: '08:00', endTime: '22:00' }
  } catch {
    return { startDate: '2026-02-23', baseWeekNumber: 1, baseWeekType: 'odd' as const, startTime: '08:00', endTime: '22:00' }
  }
}

export function saveScheduleSettings(settings: any): void {
  localStorage.setItem(STORAGE_KEYS.SCHEDULE_SETTINGS, JSON.stringify(settings))
}

export function getScheduleOverrides(): any[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SCHEDULE_OVERRIDES)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveScheduleOverrides(overrides: any[]): void {
  localStorage.setItem(STORAGE_KEYS.SCHEDULE_OVERRIDES, JSON.stringify(overrides))
}

export function getScheduleZoom(): number {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SCHEDULE_ZOOM)
    return data ? parseFloat(data) : 0.8
  } catch {
    return 0.8
  }
}

export function saveScheduleZoom(zoom: number): void {
  localStorage.setItem(STORAGE_KEYS.SCHEDULE_ZOOM, zoom.toString())
}