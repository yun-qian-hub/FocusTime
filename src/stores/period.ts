import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PeriodEvent } from '@/types'
import { getPeriodEvents, savePeriodEvents } from '@/utils/storage'
import { useCalendarStore } from './calendar'

export const usePeriodStore = defineStore('period', () => {
  const periodEvents = ref<PeriodEvent[]>(cleanupPeriodEvents(getPeriodEvents()))

  function cleanupPeriodEvents(events: PeriodEvent[]): PeriodEvent[] {
    const seen = new Set<number>()
    return events.filter(event => {
      if (seen.has(event.id)) return false
      seen.add(event.id)
      return true
    })
  }

  function addPeriodEvent(event: Omit<PeriodEvent, 'id' | 'createdAt'>) {
    const newEvent: PeriodEvent = { ...event, id: Date.now(), createdAt: new Date().toISOString() }
    periodEvents.value.push(newEvent)
    savePeriodEvents(periodEvents.value)
    syncToCalendar(newEvent)
  }

  function updatePeriodEvent(id: number, updates: Partial<PeriodEvent>) {
    const index = periodEvents.value.findIndex(e => e.id === id)
    if (index !== -1) {
      const oldEvent = periodEvents.value[index]
      periodEvents.value[index] = { ...periodEvents.value[index], ...updates }
      savePeriodEvents(periodEvents.value)
      if (updates.startDate || updates.endDate || updates.title || updates.color) {
        removeFromCalendar(oldEvent)
        syncToCalendar(periodEvents.value[index])
      }
    }
  }

  function deletePeriodEvent(id: number) {
    const event = periodEvents.value.find(e => e.id === id)
    if (event) {
      removeFromCalendar(event)
    }
    periodEvents.value = periodEvents.value.filter(e => e.id !== id)
    savePeriodEvents(periodEvents.value)
  }

  function generateDays(startDate: string, endDate: string): string[] {
    const days: string[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)
    const current = new Date(start)
    
    while (current <= end) {
      days.push(formatDate(current))
      current.setDate(current.getDate() + 1)
    }
    return days
  }

  function formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
  }

  function syncToCalendar(event: PeriodEvent) {
    const calendarStore = useCalendarStore()
    const days = generateDays(event.startDate, event.endDate)
    
    days.forEach(day => {
      const existingEvent = calendarStore.events.find(
        e => e.startTime.startsWith(day) && e.title === event.title && e.allDay
      )
      if (!existingEvent) {
        calendarStore.addEvent({
          title: event.title,
          description: event.description,
          startTime: `${day}T00:00:00`,
          allDay: true,
          color: event.color,
          eventType: event.eventType
        })
      }
    })
  }

  function removeFromCalendar(event: PeriodEvent) {
    const calendarStore = useCalendarStore()
    const days = generateDays(event.startDate, event.endDate)
    
    days.forEach(day => {
      const calendarEvent = calendarStore.events.find(
        e => e.startTime.startsWith(day) && e.title === event.title && e.allDay
      )
      if (calendarEvent) {
        calendarStore.deleteEvent(calendarEvent.id)
      }
    })
  }

  const sortedEvents = computed(() => {
    return [...periodEvents.value].sort((a, b) => {
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    })
  })

  return {
    periodEvents,
    sortedEvents,
    addPeriodEvent,
    updatePeriodEvent,
    deletePeriodEvent,
    generateDays,
    formatDate
  }
})