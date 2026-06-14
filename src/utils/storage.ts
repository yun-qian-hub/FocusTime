const STORAGE_KEYS = {
  TODOS: 'task_manager_todos',
  EVENTS: 'task_manager_events',
  NOTES: 'task_manager_notes',
  ALARMS: 'task_manager_alarms'
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