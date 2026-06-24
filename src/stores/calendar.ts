import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CalendarEvent, ImportantEvent } from '@/types'
import { getEvents, saveEvents } from '@/utils/storage'
import { useImportantStore } from './important'

export const useCalendarStore = defineStore('calendar', () => {
  const events = ref<CalendarEvent[]>(getEvents())
  const currentDate = ref(new Date())
  const selectedDate = ref(new Date())
  const showCompleted = ref(true)
  
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
    const days: { date: number; month: number; year: number; isCurrentMonth: boolean; isToday: boolean; events: any[] }[] = []
    
    for (let i = firstDayOfMonth.value - 1; i >= 0; i--) {
      const date = daysInPreviousMonth.value - i
      const month = currentMonth.value - 1
      const year = month < 0 ? currentYear.value - 1 : currentYear.value
      const monthAdj = month < 0 ? 11 : month
      days.push({ date, month: monthAdj, year, isCurrentMonth: false, isToday: isToday(year, monthAdj, date), events: getFilteredEvents(getEventsForDate(new Date(year, monthAdj, date))) })
    }
    
    for (let i = 1; i <= daysInMonth.value; i++) {
      days.push({ date: i, month: currentMonth.value, year: currentYear.value, isCurrentMonth: true, isToday: isToday(currentYear.value, currentMonth.value, i), events: getFilteredEvents(getEventsForDate(new Date(currentYear.value, currentMonth.value, i))) })
    }
    
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      const month = currentMonth.value + 1
      const year = month > 11 ? currentYear.value + 1 : currentYear.value
      const monthAdj = month > 11 ? 0 : month
      days.push({ date: i, month: monthAdj, year, isCurrentMonth: false, isToday: isToday(year, monthAdj, i), events: getFilteredEvents(getEventsForDate(new Date(year, monthAdj, i))) })
    }
    
    return days
  })
  
  const selectedDateEvents = computed(() => getEventsForDate(selectedDate.value))
  
  function getFilteredEvents(eventsList: any[]) {
    if (showCompleted.value) return eventsList
    return eventsList.filter(e => !e.completed)
  }
  
  const selectedDateFilteredEvents = computed(() => getFilteredEvents(selectedDateEvents.value))
  
  function isToday(year: number, month: number, date: number): boolean {
    const today = new Date()
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === date
  }
  
  function formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    return year + '-' + (month < 10 ? '0' + month : month) + '-' + (day < 10 ? '0' + day : day)
  }
  
  function getEventsForDate(date: Date): (CalendarEvent | Omit<CalendarEvent, 'startTime' | 'endTime' | 'repeat' | 'endDate'> & { isImportant: true })[] {
    const dateStr = formatDate(date)
    const calendarEvents = events.value.filter(e => {
      const eventDate = e.startTime.split('T')[0]
      if (eventDate === dateStr) return true
      return isRecurringEvent(e, date)
    })
    
    const importantEvents = useImportantStore().events
      .filter(e => e.date === dateStr)
      .map(e => ({
        id: e.id,
        title: e.title,
        description: e.description,
        priority: e.priority,
        isImportant: true as const,
        createdAt: e.createdAt,
        type: e.type,
        color: e.color
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
  
  function toggleEventCompleted(id: number) {
    const event = events.value.find(e => e.id === id)
    if (event) {
      event.completed = !event.completed
      saveEvents(events.value)
    }
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
  
  return { events, currentDate, selectedDate, showCompleted, currentMonth, currentYear, calendarDays, selectedDateEvents, selectedDateFilteredEvents, addEvent, updateEvent, deleteEvent, toggleEventCompleted, setCurrentDate, setSelectedDate, nextMonth, prevMonth, goToToday }
})