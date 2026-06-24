export interface TodoSubtask {
  id: number
  title: string
  completed: boolean
}

export interface Todo {
  id: number
  title: string
  description?: string
  priority: 'high' | 'medium' | 'low'
  completed: boolean
  dueDate?: string
  createdAt: string
  updatedAt: string
  parentId?: number
  eventType?: 'work' | 'study' | 'life' | 'project' | 'meeting' | 'task'
  subtasks?: TodoSubtask[]
  displayMode?: 'progress' | 'checkbox' | 'none'
  color?: string
}

export interface CalendarEvent {
  id: number
  title: string
  description?: string
  startTime: string
  endTime?: string
  allDay: boolean
  color: string
  createdAt: string
  repeat?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
  endDate?: string
  eventType?: 'work' | 'study' | 'life' | 'project' | 'meeting' | 'task'
  completed?: boolean
}

export interface Note {
  id: number
  content: string
  color: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface Alarm {
  id: number
  time: string
  label?: string
  enabled: boolean
  repeat: 'none' | 'daily' | 'weekday' | 'weekend' | string[]
  ringtone: string
  createdAt: string
}

export interface ImportantEvent {
  id: number
  title: string
  description?: string
  date: string
  type: 'exam' | 'competition' | 'activity' | 'deadline' | 'other'
  priority: 'high' | 'medium' | 'low'
  color: string
  createdAt: string
}

export interface PeriodSubtask {
  id: number
  title: string
  completed: boolean
}

export interface PeriodEvent {
  id: number
  title: string
  description?: string
  startDate: string
  endDate: string
  color: string
  progress: number
  completed: boolean
  createdAt: string
  eventType?: 'work' | 'study' | 'life' | 'project' | 'meeting' | 'task'
  subtasks?: PeriodSubtask[]
}

export interface ScheduleCourse {
  id: number
  title: string
  teacher?: string
  classroom?: string
  dayOfWeek: number
  startTime: string
  endTime: string
  weekType: 'all' | 'odd' | 'even'
  color: string
  createdAt: string
  remark?: string
}

export interface ScheduleOverride {
  id: number
  courseId: number | null
  date: string
  action: 'remove' | 'add' | 'modify'
  title?: string
  teacher?: string
  classroom?: string
  startTime?: string
  endTime?: string
  color?: string
  remark?: string
  createdAt: string
}

export interface ScheduleSettings {
  startDate: string
  baseWeekNumber: number
  baseWeekType: 'odd' | 'even'
  startTime: string
  endTime: string
}

export interface PomodoroSession {
  id: number
  date: string
  focusTime: number
  shortBreak: number
  longBreak: number
  cycles: number
  completedCycles: number
  status: 'focus' | 'shortBreak' | 'longBreak' | 'idle'
  createdAt: string
}

export interface PomodoroSettings {
  focusTime: number
  shortBreak: number
  longBreak: number
  cyclesBeforeLongBreak: number
  targetCycles: number
  autoStartBreak: boolean
  autoStartFocus: boolean
  soundEnabled: boolean
}

export type TabType = 'calendar' | 'todo' | 'notes' | 'alarm' | 'important' | 'datamanager' | 'period' | 'schedule' | 'pomodoro'