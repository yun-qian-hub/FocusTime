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

export type TabType = 'calendar' | 'todo' | 'notes' | 'alarm' | 'important' | 'datamanager'