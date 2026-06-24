import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PlanItem, PlanSubModule, PeriodSubtask, PlanResource } from '@/types'
import { useCalendarStore } from './calendar'

const STORAGE_KEY = 'task_manager_plan_items'
const STATUSES_KEY = 'task_manager_plan_statuses'
const LEGACY_KEY = 'task_manager_period_events'

const DEFAULT_STATUSES = ['待开始', '进行中', '已完成']

function getPlanItems(): PlanItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      return JSON.parse(data).map((e: any) => ({
        ...e,
        progressMode: e.progressMode || 'task',
        status: e.status || '待开始'
      }))
    }
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy) {
      const items = JSON.parse(legacy).map((e: any) => ({
        title: e.title,
        description: e.description,
        planType: 'period',
        startDate: e.startDate,
        endDate: e.endDate,
        color: e.color,
        priority: 'medium',
        status: e.completed ? '已完成' : (new Date(e.startDate) > new Date() ? '待开始' : '进行中'),
        progress: e.progress || 0,
        progressMode: 'task' as const,
        eventType: e.eventType || 'task',
        subtasks: e.subtasks,
        syncToCalendar: true,
        id: e.id,
        createdAt: e.createdAt
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

function getStatuses(): string[] {
  try {
    const data = localStorage.getItem(STATUSES_KEY)
    if (data) return JSON.parse(data)
    return [...DEFAULT_STATUSES]
  } catch {
    return [...DEFAULT_STATUSES]
  }
}

function savePlanItems(items: PlanItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function saveStatuses(statuses: string[]): void {
  localStorage.setItem(STATUSES_KEY, JSON.stringify(statuses))
}

/** time-based progress: elapsed / total duration */
function calcTimeProgress(startDate: string, endDate?: string): number {
  if (!endDate) return 0
  const now = new Date().getTime()
  const s = new Date(startDate).getTime()
  const e = new Date(endDate).getTime()
  if (now <= s) return 0
  if (now >= e) return 100
  return Math.round(((now - s) / (e - s)) * 100)
}

/** sub-module time progress: weighted by duration */
function calcSubModuleTimeProgress(sm: PlanSubModule): number {
  if (!sm.endDate) return 0
  return calcTimeProgress(sm.startDate, sm.endDate)
}

/** Aggregate progress from subModules, or fall back to item-level */
function calcAggregatedProgress(item: PlanItem): number {
  if (!item.subModules || item.subModules.length === 0) {
    return item.progressMode === 'time' ? calcTimeProgress(item.startDate, item.endDate) : item.progress
  }

  if (item.progressMode === 'time') {
    // Weighted average by duration of each subModule
    let totalWeight = 0
    let weightedSum = 0
    for (const sm of item.subModules) {
      const smStart = new Date(sm.startDate).getTime()
      const smEnd = sm.endDate ? new Date(sm.endDate).getTime() : smStart
      const duration = Math.max(1, (smEnd - smStart) / 86400000 + 1)
      const smProgress = sm.progressMode === 'time' ? calcSubModuleTimeProgress(sm) : sm.progress
      weightedSum += smProgress * duration
      totalWeight += duration
    }
    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0
  }

  // Task mode: total completed subtasks / total subtasks across subModules
  let totalDone = 0
  let totalTasks = 0
  for (const sm of item.subModules) {
    if (sm.subtasks?.length) {
      totalDone += sm.subtasks.filter(s => s.completed).length
      totalTasks += sm.subtasks.length
    }
  }
  // Also count item-level subtasks
  if (item.subtasks?.length) {
    totalDone += item.subtasks.filter(s => s.completed).length
    totalTasks += item.subtasks.length
  }
  return totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : item.progress
}

export const usePlanStore = defineStore('plan', () => {
  const items = ref<PlanItem[]>(getPlanItems())
  const statuses = ref<string[]>(getStatuses())

  const sortedItems = computed(() =>
    [...items.value].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  )

  /** items with real-time aggregated progress */
  const resolvedItems = computed(() =>
    sortedItems.value.map(item => ({
      ...item,
      progress: calcAggregatedProgress(item)
    }))
  )

  /** dynamic kanban columns keyed by status name */
  const kanbanGroups = computed(() => {
    const groups: Record<string, PlanItem[]> = {}
    for (const st of statuses.value) groups[st] = []
    for (const item of resolvedItems.value) {
      if (!groups[item.status]) groups[item.status] = []
      groups[item.status].push(item)
    }
    return groups
  })

  const stats = computed(() => {
    const total = items.value.length
    const done = resolvedItems.value.filter(i => i.status === statuses.value[statuses.value.length - 1] || i.status === '已完成').length
    return { total, done }
  })

  // ---- Status management ----
  function addStatus(name: string) {
    if (!name.trim() || statuses.value.includes(name.trim())) return
    statuses.value.push(name.trim())
    saveStatuses(statuses.value)
  }

  function removeStatus(name: string) {
    if (statuses.value.length <= 1) return
    statuses.value = statuses.value.filter(s => s !== name)
    saveStatuses(statuses.value)
  }

  function renameStatus(oldName: string, newName: string) {
    const trimmed = newName.trim()
    if (!trimmed || trimmed === oldName) return
    if (statuses.value.includes(trimmed) && trimmed !== oldName) return
    const idx = statuses.value.indexOf(oldName)
    if (idx === -1) return
    statuses.value[idx] = trimmed
    for (const item of items.value) {
      if (item.status === oldName) item.status = trimmed
    }
    saveStatuses(statuses.value)
    savePlanItems(items.value)
  }

  // ---- CRUD ----
  function addItem(item: Omit<PlanItem, 'id' | 'createdAt'>) {
    const newItem: PlanItem = {
      ...item,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      progressMode: item.progressMode || 'task'
    }
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

  function moveToStatus(id: number, status: string) {
    const item = items.value.find(i => i.id === id)
    if (!item) return
    item.status = status
    const last = statuses.value[statuses.value.length - 1]
    if (status === last) {
      item.progress = 100
      item.subtasks = item.subtasks?.map(s => ({ ...s, completed: true }))
    } else if (item.progress >= 100 && item.progressMode === 'task') {
      item.progress = 0
      item.subtasks = item.subtasks?.map(s => ({ ...s, completed: false }))
    }
    savePlanItems(items.value)
  }

  // ---- Subtask ----
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

  // ---- Sub-module ----
  function addSubModule(itemId: number, sm: Omit<PlanSubModule, 'id'>) {
    const item = items.value.find(i => i.id === itemId)
    if (!item) return
    const newSm: PlanSubModule = { ...sm, id: Date.now() }
    const modules = [...(item.subModules || []), newSm]
    modules.sort((a, b) => a.order - b.order)
    updateItem(itemId, { subModules: modules })
  }

  function updateSubModule(itemId: number, smId: number, updates: Partial<PlanSubModule>) {
    const item = items.value.find(i => i.id === itemId)
    if (!item?.subModules) return
    const updated = item.subModules.map(sm => sm.id === smId ? { ...sm, ...updates } : sm)
    updateItem(itemId, { subModules: updated })
  }

  function deleteSubModule(itemId: number, smId: number) {
    const item = items.value.find(i => i.id === itemId)
    if (!item?.subModules) return
    const updated = item.subModules.filter(sm => sm.id !== smId)
    updateItem(itemId, { subModules: updated.length > 0 ? updated : undefined })
  }

  function toggleSubModuleComplete(itemId: number, smId: number) {
    const item = items.value.find(i => i.id === itemId)
    if (!item?.subModules) return
    const sm = item.subModules.find(s => s.id === smId)
    if (!sm) return
    updateSubModule(itemId, smId, {
      completed: !sm.completed,
      progress: !sm.completed ? 100 : 0,
      subtasks: sm.subtasks?.map(s => ({ ...s, completed: !sm.completed }))
    })
  }

  function toggleSubModuleSubtask(itemId: number, smId: number, subtaskId: number) {
    const item = items.value.find(i => i.id === itemId)
    const sm = item?.subModules?.find(s => s.id === smId)
    if (!sm?.subtasks) return
    const updated = sm.subtasks.map(s =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    )
    const done = updated.filter(s => s.completed).length
    const pct = Math.round((done / updated.length) * 100)
    updateSubModule(itemId, smId, { subtasks: updated, progress: pct })
  }

  function addSubModuleSubtask(itemId: number, smId: number, title: string) {
    const item = items.value.find(i => i.id === itemId)
    const sm = item?.subModules?.find(s => s.id === smId)
    if (!sm) return
    const st: PeriodSubtask = { id: Date.now(), title, completed: false }
    const subtasks = [...(sm.subtasks || []), st]
    updateSubModule(itemId, smId, { subtasks })
  }

  function deleteSubModuleSubtask(itemId: number, smId: number, subtaskId: number) {
    const item = items.value.find(i => i.id === itemId)
    const sm = item?.subModules?.find(s => s.id === smId)
    if (!sm?.subtasks) return
    const updated = sm.subtasks.filter(s => s.id !== subtaskId)
    const done = updated.filter(s => s.completed).length
    const pct = updated.length > 0 ? Math.round((done / updated.length) * 100) : sm.progress
    updateSubModule(itemId, smId, { subtasks: updated.length > 0 ? updated : undefined, progress: pct })
  }

  function addSubModuleResource(itemId: number, smId: number, resource: PlanResource) {
    const item = items.value.find(i => i.id === itemId)
    const sm = item?.subModules?.find(s => s.id === smId)
    if (!sm) return
    const resources = [...(sm.resources || []), resource]
    updateSubModule(itemId, smId, { resources })
  }

  function deleteSubModuleResource(itemId: number, smId: number, index: number) {
    const item = items.value.find(i => i.id === itemId)
    const sm = item?.subModules?.find(s => s.id === smId)
    if (!sm?.resources) return
    const resources = sm.resources.filter((_, i) => i !== index)
    updateSubModule(itemId, smId, { resources: resources.length > 0 ? resources : undefined })
  }

  // ---- Calendar ----
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
    items, sortedItems, resolvedItems, kanbanGroups, stats, statuses,
    addStatus, removeStatus, renameStatus,
    addItem, updateItem, deleteItem,
    moveToStatus, toggleSubtask, addSubtask, deleteSubtask,
    addSubModule, updateSubModule, deleteSubModule, toggleSubModuleComplete,
    toggleSubModuleSubtask, addSubModuleSubtask, deleteSubModuleSubtask,
    addSubModuleResource, deleteSubModuleResource
  }
})
