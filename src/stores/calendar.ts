import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CalendarEvent, ImportantEvent } from '@/types'
import { getEvents, saveEvents } from '@/utils/storage'
import { useImportantStore } from './important'

export const useCalendarStore = defineStore('calendar', () => {
  const events = ref<CalendarEvent[]>(getEvents())
  const currentDate = ref(new Date())
  const selectedDate = ref(new Date())
  
  const currentMonth = computed(() => currentDate.value.getMonth())
  const currentYear = computed(() => currentDate.value.getFullYear())
  
  const daysInMonth = computed(() => new Date(currentYear.value, currentMonth.value + 1, 0).getDate())
  const firstDayOfMonth = computed(() => new Date(currentYear.value, currentMonth.value, 1).getDay())
  const daysInPreviousMonth = computed(() => new Date(currentYear.value, currentMonth.value, 0).getDate())

  function isRecurringEvent(event: CalendarEvent, date: Date): boolean {
    if (!event.repeat || event.repeat === 'none') return false
    const eventStart = new Date(event.startTime)
    const dateStr = date.toISOString().split('T')[0]
    const eventDateStr = eventStart.toISOString().split('T')[0]
    if (dateStr < eventDateStr) return false
    if (event.endDate) {
      const endDate = new Date(event.endDate)
      const endDateStr = endDate.toISOString().split('T')[0]
      if (dateStr > endDateStr) return false
    }
    switch (event.repeat) {
      case 'daily': return true
      case 'weekly': return date.getDay() === eventStart.getDay()
      case 'monthly': return date.getDate() === eventStart.getDate()
      case 'yearly': return date.getDate() === eventStart.getDate() && date.getMonth() === eventStart.getMonth()
      default: return false
    }
  }
  
  const calendarDays = computed(() => {
    const days: { date: number; month: number; year: number; isCurrentMonth: boolean; isToday: boolean; events: CalendarEvent[] }[] = []
    
    for (let i = firstDayOfMonth.value - 1; i >= 0; i--) {
      const date = daysInPreviousMonth.value - i
      const month = currentMonth.value - 1
      const year = month < 0 ? currentYear.value - 1 : currentYear.value
      days.push({ date, month: month < 0 ? 11 : month, year: month < 0 ? year : currentYear.value, isCurrentMonth: false, isToday: isToday(year, month < 0 ? 11 : month, date), events: getEventsForDate(new Date(year, month, date)) })
    }
    
    for (let i = 1; i <= daysInMonth.value; i++) {
      days.push({ date: i, month: currentMonth.value, year: currentYear.value, isCurrentMonth: true, isToday: isToday(currentYear.value, currentMonth.value, i), events: getEventsForDate(new Date(currentYear.value, currentMonth.value, i)) })
    }
    
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      const month = currentMonth.value + 1
      const year = month > 11 ? currentYear.value + 1 : currentYear.value
      days.push({ date: i, month: month > 11 ? 0 : month, year: month > 11 ? year : currentYear.value, isCurrentMonth: false, isToday: isToday(year, month > 11 ? 0 : month, i), events: getEventsForDate(new Date(year, month > 11 ? 0 : month, i)) })
    }
    
    return days
  })
  
  const selectedDateEvents = computed(() => getEventsForDate(selectedDate.value))
  
  function isToday(year: number, month: number, date: number): boolean {
    const today = new Date()
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === date
  }
  
  function getEventsForDate(date: Date): (CalendarEvent | Omit<CalendarEvent, 'startTime' | 'endTime' | 'repeat' | 'endDate'> & { isImportant: true })[] {
    const dateStr = date.toISOString().split('T')[0]
    const calendarEvents = events.value.filter(e => {
      const eventDate = e.startTime.split('T')[0]
      if (eventDate === dateStr) return true
      return isRecurringEvent(e, date)
    })
    
    const importantStore = useImportantStore()
    const importantEvents = importantStore.events
      .filter(e => e.date === dateStr)
      .map(e => ({
        id: e.id,
        title: e.title,
        description: e.description,
        priority: e.priority,
        isImportant: true as const,
        createdAt: e.createdAt,
        type: e.type
      }))
    
    return [...calendarEvents, ...importantEvents]
  }
  
  function addEvent(event: Omit<CalendarEvent, 'id' | 'createdAt'>) {
    const newEvent: CalendarEvent = { ...event, id: Date.now(), createdAt: new Date().toISOString() }
    events.value.push(newEvent)
    saveEvents(events.value)
  }
  
  function updateEvent(id: number, updates: Partial<CalendarEvent>) {
    const index = events.value.findIndex(e => e.id === id)
    if (index !== -1) {
      events.value[index] = { ...events.value[index], ...updates }
      saveEvents(events.value)
    }
  }
  
  function deleteEvent(id: number) {
    events.value = events.value.filter(e => e.id !== id)
    saveEvents(events.value)
  }
  
  function setCurrentDate(date: Date) { currentDate.value = date }
  function setSelectedDate(date: Date) { selectedDate.value = date }
  
  function nextMonth() {
    const newDate = new Date(currentDate.value)
    newDate.setMonth(newDate.getMonth() + 1)
    currentDate.value = newDate
  }
  
  function prevMonth() {
    const newDate = new Date(currentDate.value)
    newDate.setMonth(newDate.getMonth() - 1)
    currentDate.value = newDate
  }
  
  function goToToday() {
    currentDate.value = new Date()
    selectedDate.value = new Date()
  }
  
  return { events, currentDate, selectedDate, currentMonth, currentYear, calendarDays, selectedDateEvents, addEvent, updateEvent, deleteEvent, setCurrentDate, setSelectedDate, nextMonth, prevMonth, goToToday }
})