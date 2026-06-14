import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ImportantEvent } from '@/types'

const STORAGE_KEY = 'task_manager_important_events'

function getImportantEvents(): ImportantEvent[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveImportantEvents(events: ImportantEvent[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
}

export const useImportantStore = defineStore('important', () => {
  const events = ref<ImportantEvent[]>(getImportantEvents())
  
  const sortedEvents = computed(() => {
    return [...events.value].sort((a, b) => {
      const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime()
      if (dateCompare !== 0) return dateCompare
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  })
  
  const upcomingEvents = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return sortedEvents.value.filter(e => e.date >= today).slice(0, 5)
  })
  
  const stats = computed(() => ({
    total: events.value.length,
    today: events.value.filter(e => e.date === new Date().toISOString().split('T')[0]).length,
    upcoming: upcomingEvents.value.length
  }))
  
  function addEvent(eventData: Omit<ImportantEvent, 'id' | 'createdAt'>) {
    const newEvent: ImportantEvent = {
      ...eventData,
      id: Date.now(),
      createdAt: new Date().toISOString()
    }
    events.value.push(newEvent)
    saveImportantEvents(events.value)
    return newEvent
  }
  
  function updateEvent(id: number, updates: Partial<ImportantEvent>) {
    const index = events.value.findIndex(e => e.id === id)
    if (index !== -1) {
      events.value[index] = { ...events.value[index], ...updates }
      saveImportantEvents(events.value)
    }
  }
  
  function deleteEvent(id: number) {
    events.value = events.value.filter(e => e.id !== id)
    saveImportantEvents(events.value)
  }
  
  return {
    events,
    sortedEvents,
    upcomingEvents,
    stats,
    addEvent,
    updateEvent,
    deleteEvent
  }
})