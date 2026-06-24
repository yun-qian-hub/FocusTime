import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PlanItem, PeriodSubtask } from '@/types'
import { useCalendarStore } from './calendar'

const STORAGE_KEY = 'task_manager_plan_items'
const LEGACY_KEY = 'task_manager_period_events'

function getPlanItems(): PlanItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) return JSON.parse(data)
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy) {
      const items = JSON.parse(legacy).map((e: any) => ({
        ...e,
        planType: 'period',
        priority: 'medium',
        status: e.completed ? 'done' : (new Date(e.startDate) > new Date() ? 'pending' : 'active'),
        endDate: e.endDate,
        syncToCalendar: true
      }))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
      localStorage.removeItem(LEGACY_KEY)
      return items
    }
    return []
  } catch {
    return []
  }
}

function savePlanItems(items: PlanItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export const usePlanStore = defineStore('plan', () => {
  const items = ref<PlanItem[]>(getPlanItems())

  const sortedItems = computed(() =>
    [...items.value].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  )

  const kanbanGroups = computed(() => ({
    pending: sortedItems.value.filter(i => i.status === 'pending'),
    active: sortedItems.value.filter(i => i.status === 'active'),
    done: sortedItems.value.filter(i => i.status === 'done')
  }))

  const stats = computed(() => ({
    total: items.value.length,
    pending: kanbanGroups.value.pending.length,
    active: kanbanGroups.value.active.length,
    done: kanbanGroups.value.done.length
  }))

  function addItem(item: Omit<PlanItem, 'id' | 'createdAt'>) {
    const newItem: PlanItem = { ...item, id: Date.now(), createdAt: new Date().toISOString() }
    items.value.push(newItem)
    savePlanItems(items.value)
    syncToCalendar(newItem)
  }

  function updateItem(id: number, updates: Partial<PlanItem>) {
    const index = items.value.findIndex(e => e.id === id)
    if (index !== -1) {
      items.value[index] = { ...items.value[index], ...updates }
      savePlanItems(items.value)
      syncToCalendar(items.value[index])
    }
  }

  function deleteItem(id: number) {
    items.value = items.value.filter(e => e.id !== id)
    savePlanItems(items.value)
  }

  function moveToStatus(id: number, status: PlanItem['status']) {
    const item = items.value.find(i => i.id === id)
    if (item) {
      item.status = status
      if (status === 'done') {
        item.progress = 100
        item.subtasks = item.subtasks?.map(s => ({ ...s, completed: true }))
      } else if (status === 'active' && item.progress === 100) {
        item.progress = 0
      }
      savePlanItems(items.value)
    }
  }

  function toggleSubtask(itemId: number, subtaskId: number) {
    const item = items.value.find(i => i.id === itemId)
    if (!item?.subtasks) return
    const updated = item.subtasks.map(s =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    )
    const done = updated.filter(s => s.completed).length
    const pct = Math.round((done / updated.length) * 100)
    updateItem(itemId, { subtasks: updated, progress: pct })
  }

  function addSubtask(itemId: number, title: string) {
    const item = items.value.find(i => i.id === itemId)
    if (!item) return
    const st: PeriodSubtask = { id: Date.now(), title, completed: false }
    const subtasks = [...(item.subtasks || []), st]
    updateItem(itemId, { subtasks })
  }

  function deleteSubtask(itemId: number, subtaskId: number) {
    const item = items.value.find(i => i.id === itemId)
    if (!item?.subtasks) return
    const updated = item.subtasks.filter(s => s.id !== subtaskId)
    const done = updated.filter(s => s.completed).length
    const pct = updated.length > 0 ? Math.round((done / updated.length) * 100) : item.progress
    updateItem(itemId, { subtasks: updated.length > 0 ? updated : undefined, progress: pct })
  }

  function syncToCalendar(item: PlanItem) {
    if (!item.syncToCalendar) return
    const calendarStore = useCalendarStore()
    const existing = calendarStore.events.filter(e =>
      e.title === `[计划] ${item.title}` && e.allDay
    )
    existing.forEach(e => calendarStore.deleteEvent(e.id))

    const start = new Date(item.startDate)
    const end = item.endDate ? new Date(item.endDate) : start
    const current = new Date(start)
    while (current <= end) {
      const ds = formatDate(current)
      calendarStore.addEvent({
        title: `[计划] ${item.title}`,
        startTime: `${ds}T00:00:00`,
        allDay: true,
        color: item.color,
        eventType: item.eventType || 'task'
      })
      current.setDate(current.getDate() + 1)
    }
  }

  function formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  return {
    items, sortedItems, kanbanGroups, stats,
    addItem, updateItem, deleteItem,
    moveToStatus, toggleSubtask, addSubtask, deleteSubtask
  }
})

