<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, X, Trash2, Calendar, Award, Target, Clock, Star, Circle, AlertCircle, ListTodo, CheckCircle2 } from 'lucide-vue-next'
import { useImportantStore } from '@/stores/important'
import { useTodoStore } from '@/stores/todo'
import type { ImportantEvent } from '@/types'
import { importantEventTypeColors } from '@/utils/colors'

const store = useImportantStore()
const todoStore = useTodoStore()

const showAddModal = ref(false)
const editingEvent = ref<ImportantEvent | null>(null)

const filterSearch = ref('')
const filterType = ref<string>('all')
const filterPriority = ref<string>('all')
const filterDateRange = ref<string>('all')

const selectedIds = ref<Set<number>>(new Set())
const showDeleteConfirm = ref(false)
const deleteCountdown = ref(3)
const deleteConfirmEnabled = ref(false)

const NOTE_COLORS = [
  '#fef3c7',
  '#dbeafe',
  '#dcfce7',
  '#fce7f3',
  '#f3e8ff',
  '#fed7aa'
]

const NEW_EVENT_STORAGE_KEY = 'task_manager_new_event_draft'

function loadNewEventDraft() {
  try {
    const data = localStorage.getItem(NEW_EVENT_STORAGE_KEY)
    if (data) {
      return JSON.parse(data)
    }
  } catch {
    // ignore
  }
  return {
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    type: 'other' as ImportantEvent['type'],
    priority: 'medium' as ImportantEvent['priority'],
    color: importantEventTypeColors.other
  }
}

function saveNewEventDraft() {
  localStorage.setItem(NEW_EVENT_STORAGE_KEY, JSON.stringify(newEvent.value))
}

const newEvent = ref(loadNewEventDraft())

const typeOptions = [
  { value: 'exam', label: '考试', icon: Award, color: importantEventTypeColors.exam },
  { value: 'competition', label: '比赛', icon: Target, color: importantEventTypeColors.competition },
  { value: 'activity', label: '活动', icon: Star, color: importantEventTypeColors.activity },
  { value: 'deadline', label: '截止', icon: Clock, color: importantEventTypeColors.deadline },
  { value: 'other', label: '其他', icon: Circle, color: importantEventTypeColors.other }
]

const priorityColors = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-emerald-500'
}

const priorityLabels = {
  high: '高',
  medium: '中',
  low: '低'
}

const priorityBgColors = {
  high: 'bg-red-50',
  medium: 'bg-amber-50',
  low: 'bg-emerald-50'
}

const priorityTextColors = {
  high: 'text-red-600',
  medium: 'text-amber-600',
  low: 'text-emerald-600'
}

function getTypeInfo(type: ImportantEvent['type']) {
  return typeOptions.find(o => o.value === type) || typeOptions[4]
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function getDaysUntil(dateStr: string): number {
  const today = new Date().toISOString().split('T')[0]
  const eventDate = dateStr
  const diff = new Date(eventDate).getTime() - new Date(today).getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().split('T')[0]
}

function isOverdue(dateStr: string): boolean {
  const today = new Date().toISOString().split('T')[0]
  return dateStr < today
}

const filteredEvents = computed(() => {
  let result = store.sortedEvents
  
  if (filterSearch.value.trim()) {
    const search = filterSearch.value.toLowerCase()
    result = result.filter(e => 
      e.title.toLowerCase().includes(search) || 
      e.description?.toLowerCase().includes(search)
    )
  }
  
  if (filterType.value !== 'all') {
    result = result.filter(e => e.type === filterType.value)
  }
  
  if (filterPriority.value !== 'all') {
    result = result.filter(e => e.priority === filterPriority.value)
  }
  
  const today = new Date().toISOString().split('T')[0]
  switch (filterDateRange.value) {
    case 'today':
      result = result.filter(e => e.date === today)
      break
    case 'week':
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      result = result.filter(e => e.date >= today && e.date <= nextWeek.toISOString().split('T')[0])
      break
    case 'month':
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      result = result.filter(e => e.date >= today && e.date <= nextMonth.toISOString().split('T')[0])
      break
    case 'overdue':
      result = result.filter(e => e.date < today)
      break
  }
  
  return result
})

function openAddModal(event?: ImportantEvent) {
  if (event) {
    editingEvent.value = event
    newEvent.value = {
      title: event.title,
      description: event.description || '',
      date: event.date,
      type: event.type,
      priority: event.priority,
      color: event.color || '#f3e8ff'
    }
  } else {
    editingEvent.value = null
    const draft = loadNewEventDraft()
    newEvent.value = {
      ...draft,
      date: draft.date || new Date().toISOString().split('T')[0],
      color: draft.color || '#f3e8ff'
    }
  }
  showAddModal.value = true
}

function saveEvent() {
  if (!newEvent.value.title.trim()) return
  
  if (editingEvent.value) {
    store.updateEvent(editingEvent.value.id, newEvent.value)
  } else {
    store.addEvent(newEvent.value)
    localStorage.removeItem(NEW_EVENT_STORAGE_KEY)
  }
  
  closeModal()
}

let deleteTargetIds: number[] = []
let deleteCountdownTimer: ReturnType<typeof setInterval> | null = null

function startDeleteCountdown(targetIds: number[]) {
  deleteTargetIds = targetIds
  showDeleteConfirm.value = true
  deleteCountdown.value = 3
  deleteConfirmEnabled.value = false
  
  if (deleteCountdownTimer) {
    clearInterval(deleteCountdownTimer)
  }
  
  deleteCountdownTimer = setInterval(() => {
    deleteCountdown.value--
    if (deleteCountdown.value <= 0) {
      deleteConfirmEnabled.value = true
      if (deleteCountdownTimer) {
        clearInterval(deleteCountdownTimer)
        deleteCountdownTimer = null
      }
    }
  }, 1000)
}

function confirmDelete() {
  if (!deleteConfirmEnabled.value) return
  deleteTargetIds.forEach(id => store.deleteEvent(id))
  deleteTargetIds = []
  selectedIds.value.clear()
  showDeleteConfirm.value = false
  deleteConfirmEnabled.value = false
}

function cancelDelete() {
  showDeleteConfirm.value = false
  deleteConfirmEnabled.value = false
  deleteTargetIds = []
  if (deleteCountdownTimer) {
    clearInterval(deleteCountdownTimer)
    deleteCountdownTimer = null
  }
}

function deleteEvent(id: number) {
  startDeleteCountdown([id])
}

function toggleSelect(id: number) {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
}

function toggleSelectAll() {
  if (selectedIds.value.size === filteredEvents.value.length && filteredEvents.value.length > 0) {
    selectedIds.value.clear()
  } else {
    filteredEvents.value.forEach(e => selectedIds.value.add(e.id))
  }
}

function batchDelete() {
  if (selectedIds.value.size === 0) return
  startDeleteCountdown(Array.from(selectedIds.value))
}

function importToTodo(event: ImportantEvent) {
  todoStore.addTodo({
    title: event.title,
    description: event.description || '',
    priority: event.priority,
    completed: false,
    dueDate: event.date
  })
}

function closeModal() {
  showAddModal.value = false
  editingEvent.value = null
  if (newEvent.value.title || newEvent.value.description) {
    saveNewEventDraft()
  }
}

const eventsByDate = computed(() => {
  const grouped: Record<string, typeof filteredEvents.value> = {}
  filteredEvents.value.forEach(event => {
    if (!grouped[event.date]) {
      grouped[event.date] = []
    }
    grouped[event.date].push(event)
  })
  const sortedDates = Object.keys(grouped).sort()
  return sortedDates.map(date => ({
    date,
    events: grouped[date],
    isToday: isToday(date),
    isOverdue: isOverdue(date)
  }))
})
</script>

<template>
  <div class="flex-1 flex flex-col gap-6 p-6">
    <header>
      <h1 class="text-2xl font-bold text-gray-800">事件</h1>
      <p class="text-gray-500 mt-1">管理考试、比赛、活动等事件</p>
    </header>
    
    <div class="grid grid-cols-4 gap-4">
      <div class="glass-card p-4 flex flex-col items-center justify-center">
        <span class="text-2xl font-bold text-primary">{{ store.stats.total }}</span>
        <span class="text-sm text-gray-500">总事件</span>
      </div>
      <div class="glass-card p-4 flex flex-col items-center justify-center">
        <span class="text-2xl font-bold text-red-500">{{ store.stats.today }}</span>
        <span class="text-sm text-gray-500">今日事件</span>
      </div>
      <div class="glass-card p-4 flex flex-col items-center justify-center">
        <span class="text-2xl font-bold text-amber-500">{{ store.stats.upcoming }}</span>
        <span class="text-sm text-gray-500">近期事件</span>
      </div>
      <div class="glass-card p-4 flex flex-col items-center justify-center">
        <span class="text-2xl font-bold text-emerald-500">{{ store.sortedEvents.filter(e => e.priority === 'high').length }}</span>
        <span class="text-sm text-gray-500">高优先级</span>
      </div>
    </div>
    
    <div class="glass-card p-6 flex-1 overflow-hidden flex flex-col">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2 flex-1">
          <span class="text-sm text-gray-500">共 {{ filteredEvents.length }} 个事件</span>
          <span v-if="filteredEvents.length !== store.sortedEvents.length" class="text-sm text-gray-400">(筛选后)</span>
          
          <div class="flex-1 flex items-center gap-2 ml-4">
            <div class="relative flex-1">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                v-model="filterSearch"
                type="text"
                class="input-field pl-10"
                placeholder="搜索事件..."
              />
            </div>
            
            <div class="relative">
              <select v-model="filterType" class="appearance-none bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer min-w-[100px]">
                <option value="all">全部类型</option>
                <option value="exam">考试</option>
                <option value="competition">比赛</option>
                <option value="activity">活动</option>
                <option value="deadline">截止</option>
                <option value="other">其他</option>
              </select>
              <svg class="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            
            <div class="relative">
              <select v-model="filterPriority" class="appearance-none bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer min-w-[100px]">
                <option value="all">优先级</option>
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
              <svg class="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            
            <div class="relative">
              <select v-model="filterDateRange" class="appearance-none bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer min-w-[110px]">
                <option value="all">全部日期</option>
                <option value="today">今天</option>
                <option value="week">本周</option>
                <option value="month">本月</option>
                <option value="overdue">已过期</option>
              </select>
              <svg class="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            
            <button
              v-if="filterSearch || filterType !== 'all' || filterPriority !== 'all' || filterDateRange !== 'all'"
              @click="filterSearch = ''; filterType = 'all'; filterPriority = 'all'; filterDateRange = 'all'"
              class="px-3 py-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all text-sm font-medium"
            >
              清除
            </button>
          </div>
        </div>
        
        <div class="flex items-center gap-3">
          <button
            v-if="selectedIds.size > 0"
            @click="batchDelete"
            class="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all font-medium text-sm shadow-md shadow-gray-400/50"
          >
            <Trash2 :size="16" />
            删除选中 ({{ selectedIds.size }})
          </button>
          <button
            @click="openAddModal()"
            class="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white hover:bg-secondary transition-all font-medium text-sm shadow-md shadow-gray-400/50"
          >
            <Plus :size="16" />
            添加事件
          </button>
        </div>
      </div>
      
      <div v-if="filteredEvents.length > 0" class="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          :checked="selectedIds.size === filteredEvents.length && filteredEvents.length > 0"
          @change="toggleSelectAll"
          class="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <span class="text-sm text-gray-500">全选</span>
        <span v-if="selectedIds.size > 0" class="text-sm text-gray-400">已选择 {{ selectedIds.size }} 个</span>
      </div>
      
      <div v-if="filteredEvents.length === 0" class="flex-1 flex flex-col items-center justify-center text-gray-400">
        <AlertCircle :size="48" class="mb-4 opacity-50" />
        <p v-if="store.sortedEvents.length === 0">还没有事件</p>
        <p v-else>没有匹配的事件</p>
        <button @click="openAddModal()" class="mt-4 text-primary hover:underline">
          添加第一个事件
        </button>
      </div>
      
      <div v-else class="flex-1 overflow-y-auto" style="max-height: calc(100vh - 380px);">
        <div class="relative pl-8">
          <div class="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200"></div>
          
          <div v-for="group in eventsByDate" :key="group.date" class="relative mb-8 last:mb-0">
            <div 
              class="absolute -left-[22px] w-4 h-4 rounded-full border-2 flex items-center justify-center"
              :class="[
                group.isToday ? 'border-primary bg-white' : 'border-gray-300 bg-white',
                group.isOverdue ? 'border-gray-400 bg-gray-100' : ''
              ]"
            >
              <div 
                v-if="group.isToday" 
                class="w-2 h-2 rounded-full bg-primary"
              ></div>
            </div>
            
            <div class="mb-3">
              <div class="flex items-center gap-3">
                <h3 
                  class="text-lg font-bold"
                  :class="[
                    group.isToday ? 'text-primary' : group.isOverdue ? 'text-gray-400' : 'text-gray-700'
                  ]"
                >
                  {{ formatDate(group.date) }}
                </h3>
                <span 
                  v-if="group.isToday" 
                  class="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                >
                  今天
                </span>
                <span 
                  v-else-if="group.isOverdue" 
                  class="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs"
                >
                  已过期
                </span>
                <span 
                  v-else 
                  class="text-sm text-gray-400"
                >
                  {{ getDaysUntil(group.date) }}天后
                </span>
              </div>
            </div>
            
            <div class="space-y-3">
              <div
                v-for="event in group.events"
                :key="event.id"
                class="p-4 rounded-xl border transition-all cursor-pointer group"
                :class="[
                  event.completed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-gray-200 hover:border-primary/30',
                  selectedIds.has(event.id) ? 'ring-2 ring-primary/30' : ''
                ]"
                :style="{ borderLeftColor: event.completed ? '#10b981' : (event.color || '#f3e8ff'), borderLeftWidth: '4px' }"
                @click="openAddModal(event)"
              >
                <div class="flex items-center gap-3">
                  <div 
                    class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    :style="{ backgroundColor: getTypeInfo(event.type).color + '15', opacity: event.completed ? 0.5 : 1 }"
                  >
                    <component 
                      :is="getTypeInfo(event.type).icon" 
                      :size="20" 
                      :style="{ color: getTypeInfo(event.type).color, opacity: event.completed ? 0.5 : 1 }"
                    />
                  </div>
                  
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <h3 class="font-bold text-lg" :class="[event.completed ? 'text-gray-400 line-through' : 'text-gray-800']">{{ event.title }}</h3>
                      <span 
                        class="w-2 h-2 rounded-full flex-shrink-0"
                        :class="priorityColors[event.priority]"
                      />
                    </div>
                    <p v-if="event.description" class="text-gray-500 mt-0.5 text-sm" :class="[event.completed ? 'line-through opacity-50' : '']">{{ event.description }}</p>
                    
                    <div class="flex items-center gap-3 mt-2">
                      <span class="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar :size="12" />
                        {{ formatDate(event.date) }}
                      </span>
                      <span 
                        class="px-2 py-0.5 rounded-full text-xs font-medium"
                        :class="[event.completed ? 'bg-emerald-100 text-emerald-600' : priorityBgColors[event.priority] + ' ' + priorityTextColors[event.priority]]"
                      >
                        {{ event.completed ? '已完成' : priorityLabels[event.priority] }}
                      </span>
                      <span v-if="!event.completed && !group.isOverdue && !group.isToday" class="text-xs" :class="[getDaysUntil(event.date) <= 3 ? 'text-red-500 font-bold' : 'text-gray-400']">
                        {{ getDaysUntil(event.date) }}天后
                      </span>
                    </div>
                  </div>
                  
                  <div class="flex items-center gap-1 flex-shrink-0">
                    <input
                      type="checkbox"
                      :checked="selectedIds.has(event.id)"
                      @click.stop="toggleSelect(event.id)"
                      class="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                    <button
                      @click.stop="store.toggleComplete(event.id)"
                      class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all opacity-0 group-hover:opacity-100"
                      :class="[event.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400 hover:bg-gray-200']"
                      :title="event.completed ? '标记为未完成' : '标记为已完成'"
                    >
                      <CheckCircle2 :size="16" v-if="event.completed" />
                      <Circle :size="16" v-else />
                    </button>
                    <button
                      @click.stop="importToTodo(event)"
                      class="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="导入待办"
                    >
                      <ListTodo :size="14" class="text-amber-600" />
                    </button>
                    <button
                      @click.stop="openAddModal(event)"
                      class="w-7 h-7 rounded-lg bg-white/50 hover:bg-white/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg :width="14" :height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      @click.stop="deleteEvent(event.id)"
                      class="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 :size="14" class="text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <Teleport to="body">
      <div
        v-if="showDeleteConfirm"
        class="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        @click.self="showDeleteConfirm = false"
      >
        <div class="glass-card w-full max-w-sm p-6 animate-scale-in">
          <div class="flex flex-col items-center text-center">
            <div class="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <Trash2 :size="32" class="text-red-500" />
            </div>
            <h2 class="text-xl font-bold text-gray-800 mb-2">确认删除</h2>
            <p class="text-gray-500 mb-6">
              {{ selectedIds.size > 0 ? `确定要删除选中的 ${selectedIds.size} 个事件吗？` : '确定要删除这个事件吗？' }}
            </p>
            <div class="flex items-center gap-4">
              <button
                @click="cancelDelete"
                class="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all font-medium"
              >
                取消
              </button>
              <button
                @click="confirmDelete"
                :disabled="!deleteConfirmEnabled"
                class="flex-1 px-4 py-3 rounded-xl font-medium transition-all"
                :class="[deleteConfirmEnabled ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed']"
              >
                {{ deleteConfirmEnabled ? '确认删除' : `请等待 ${deleteCountdown} 秒` }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    
    <Teleport to="body">
      <div
        v-if="showAddModal"
        class="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        @click.self="closeModal"
      >
        <div class="glass-card w-full max-w-md p-6 animate-scale-in">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-gray-800">{{ editingEvent ? '编辑事件' : '添加事件' }}</h2>
            <button @click="closeModal" class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
              <X :size="18" class="text-gray-500" />
            </button>
          </div>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">标题</label>
              <input
                v-model="newEvent.title"
                type="text"
                class="input-field"
                placeholder="输入事件标题"
                autofocus
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">描述</label>
              <textarea
                v-model="newEvent.description"
                class="input-field resize-none"
                rows="3"
                placeholder="输入事件描述"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">日期</label>
              <input
                v-model="newEvent.date"
                type="date"
                class="input-field"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">事件类型</label>
              <div class="flex gap-2 flex-wrap">
                <button
                  v-for="option in typeOptions"
                  :key="option.value"
                  @click="newEvent.type = option.value as ImportantEvent['type']; newEvent.color = option.color"
                  class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  :class="[newEvent.type === option.value ? 'text-white shadow-md shadow-gray-400/50' : 'bg-white/50 text-gray-600 hover:bg-white/70']"
                  :style="newEvent.type === option.value ? { backgroundColor: option.color } : {}"
                >
                  <component :is="option.icon" :size="14" />
                  {{ option.label }}
                </button>
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">优先级</label>
              <select v-model="newEvent.priority" class="input-field">
                <option value="high">高优先级</option>
                <option value="medium">中优先级</option>
                <option value="low">低优先级</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">颜色标记</label>
              <div class="flex gap-3">
                <button
                  v-for="color in NOTE_COLORS"
                  :key="color"
                  @click="newEvent.color = color"
                  class="w-10 h-10 rounded-full transition-all hover:scale-110 border-2"
                  :class="[newEvent.color === color ? 'border-gray-400 scale-110' : 'border-transparent']"
                  :style="{ backgroundColor: color }"
                />
              </div>
            </div>
          </div>
          
          <div class="flex gap-3 mt-6">
            <button
              v-if="editingEvent"
              @click="deleteEvent(editingEvent.id)"
              class="flex-1 px-4 py-3 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 transition-all font-medium"
            >
              删除
            </button>
            <button
              @click="closeModal"
              class="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all font-medium"
            >
              取消
            </button>
            <button
              @click="saveEvent"
              :disabled="!newEvent.title.trim()"
              class="flex-1 px-4 py-3 rounded-xl bg-primary text-white hover:bg-secondary transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-gray-400/50"
            >
              {{ editingEvent ? '保存' : '添加' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>