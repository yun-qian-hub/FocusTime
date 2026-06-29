<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, X, Trash2, Calendar, Award, Target, Clock, Star, Circle, AlertCircle, ListTodo, CheckCircle2, BarChart3, Flame, Sparkles, Rocket, Search } from 'lucide-vue-next'
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
      <div class="stat-card stat-card-blue">
        <div class="stat-card-icon"><BarChart3 :size="20" class="text-blue-500" /></div>
        <div class="stat-card-content">
          <span class="stat-card-num">{{ store.stats.total }}</span>
          <span class="stat-card-label">总事件</span>
        </div>
      </div>
      <div class="stat-card stat-card-red">
        <div class="stat-card-icon"><Flame :size="20" class="text-red-500" /></div>
        <div class="stat-card-content">
          <span class="stat-card-num">{{ store.stats.today }}</span>
          <span class="stat-card-label">今日事件</span>
        </div>
      </div>
      <div class="stat-card stat-card-amber">
        <div class="stat-card-icon"><Sparkles :size="20" class="text-amber-500" /></div>
        <div class="stat-card-content">
          <span class="stat-card-num">{{ store.stats.upcoming }}</span>
          <span class="stat-card-label">近期事件</span>
        </div>
      </div>
      <div class="stat-card stat-card-emerald">
        <div class="stat-card-icon"><Rocket :size="20" class="text-emerald-500" /></div>
        <div class="stat-card-content">
          <span class="stat-card-num">{{ store.sortedEvents.filter(e => e.priority === 'high').length }}</span>
          <span class="stat-card-label">高优先级</span>
        </div>
      </div>
    </div>
    
    <div class="glass-card p-6 flex-1 overflow-hidden flex flex-col">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-2 flex-1">
          <span class="text-sm font-medium text-gray-600">共 {{ filteredEvents.length }} 个事件</span>
          <span v-if="filteredEvents.length !== store.sortedEvents.length" class="text-sm text-gray-400">(筛选后)</span>
          
          <div class="flex-1 flex items-center gap-3 ml-6">
            <div class="relative flex-1 max-w-[200px]">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                v-model="filterSearch"
                type="text"
                class="filter-input"
                placeholder="搜索事件..."
              />
            </div>
            
            <select v-model="filterType" class="filter-select">
              <option value="all">全部类型</option>
              <option value="exam">考试</option>
              <option value="competition">比赛</option>
              <option value="activity">活动</option>
              <option value="deadline">截止</option>
              <option value="other">其他</option>
            </select>
            
            <select v-model="filterPriority" class="filter-select">
              <option value="all">优先级</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
            
            <select v-model="filterDateRange" class="filter-select">
              <option value="all">全部日期</option>
              <option value="today">今天</option>
              <option value="week">本周</option>
              <option value="month">本月</option>
              <option value="overdue">已过期</option>
            </select>
            
            <button
              v-if="filterSearch || filterType !== 'all' || filterPriority !== 'all' || filterDateRange !== 'all'"
              @click="filterSearch = ''; filterType = 'all'; filterPriority = 'all'; filterDateRange = 'all'"
              class="filter-reset-btn"
            >
              <X :size="14" />
              清除
            </button>
          </div>
        </div>
        
        <div class="flex items-center gap-3">
          <button
            v-if="selectedIds.size > 0"
            @click="batchDelete"
            class="action-btn action-btn-danger"
          >
            <Trash2 :size="16" />
            删除选中 ({{ selectedIds.size }})
          </button>
          <button
            @click="openAddModal()"
            class="action-btn action-btn-primary"
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
        <div class="timeline-wrapper">
          <div class="timeline-line"></div>
          
          <div v-for="group in eventsByDate" :key="group.date" class="timeline-group">
            <div 
              class="timeline-node"
              :class="[
                group.isToday ? 'timeline-node-today' : '',
                group.isOverdue ? 'timeline-node-overdue' : ''
              ]"
            ></div>
            
            <div class="timeline-header">
              <h3 
                class="timeline-date"
                :class="[
                  group.isToday ? 'text-primary' : group.isOverdue ? 'text-gray-400' : 'text-gray-700'
                ]"
              >
                {{ formatDate(group.date) }}
              </h3>
              <span 
                v-if="group.isToday" 
                class="timeline-badge timeline-badge-today"
              >
                今天
              </span>
              <span 
                v-else-if="group.isOverdue" 
                class="timeline-badge timeline-badge-overdue"
              >
                已过期
              </span>
              <span 
                v-else 
                class="timeline-countdown"
              >
                {{ getDaysUntil(group.date) }}天后
              </span>
            </div>
            
            <div class="timeline-events">
              <div
                v-for="event in group.events"
                :key="event.id"
                class="event-card"
                :class="[
                  event.completed ? 'event-card-completed' : '',
                  selectedIds.has(event.id) ? 'event-card-selected' : ''
                ]"
                :style="{ '--event-color': event.completed ? '#10b981' : (event.color || '#f3e8ff') }"
                @click="openAddModal(event)"
              >
                <div class="event-card-icon">
                  <component 
                    :is="getTypeInfo(event.type).icon" 
                    :size="20" 
                    :style="{ color: getTypeInfo(event.type).color, opacity: event.completed ? 0.5 : 1 }"
                  />
                </div>
                
                <div class="event-card-content">
                  <div class="event-card-header">
                    <h3 class="event-card-title" :class="[event.completed ? 'text-gray-400 line-through' : '']">{{ event.title }}</h3>
                    <span 
                      class="event-priority-dot"
                      :class="priorityColors[event.priority]"
                    />
                  </div>
                  <p v-if="event.description" class="event-card-desc" :class="[event.completed ? 'line-through opacity-50' : '']">{{ event.description }}</p>
                  
                  <div class="event-card-meta">
                    <span class="event-meta-item">
                      <Calendar :size="12" />
                      {{ formatDate(event.date) }}
                    </span>
                    <span 
                      class="event-meta-badge"
                      :class="[event.completed ? 'event-meta-completed' : 'event-meta-' + event.priority]"
                    >
                      {{ event.completed ? '已完成' : priorityLabels[event.priority] }}
                    </span>
                    <span v-if="!event.completed && !group.isOverdue && !group.isToday" class="event-meta-countdown" :class="[getDaysUntil(event.date) <= 3 ? 'event-meta-urgent' : '']">
                      {{ getDaysUntil(event.date) }}天后
                    </span>
                  </div>
                </div>
                
                <div class="event-card-actions">
                  <input
                    type="checkbox"
                    :checked="selectedIds.has(event.id)"
                    @click.stop="toggleSelect(event.id)"
                    class="event-action-checkbox"
                  />
                  <button
                    @click.stop="store.toggleComplete(event.id)"
                    class="event-action-btn event-action-complete"
                    :class="[event.completed ? 'event-action-done' : '']"
                    :title="event.completed ? '标记为未完成' : '标记为已完成'"
                  >
                    <CheckCircle2 :size="16" v-if="event.completed" />
                    <Circle :size="16" v-else />
                  </button>
                  <button
                    @click.stop="importToTodo(event)"
                    class="event-action-btn event-action-todo"
                    title="导入待办"
                  >
                    <ListTodo :size="14" />
                  </button>
                  <button
                    @click.stop="deleteEvent(event.id)"
                    class="event-action-btn event-action-delete"
                  >
                    <Trash2 :size="14" />
                  </button>
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

<style scoped>
.stat-card {
  background: white;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}
.stat-card-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.stat-card-blue .stat-card-icon { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); }
.stat-card-red .stat-card-icon { background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); }
.stat-card-amber .stat-card-icon { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); }
.stat-card-emerald .stat-card-icon { background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); }
.stat-card-content { display: flex; flex-direction: column; }
.stat-card-num { font-size: 20px; font-weight: bold; color: #1e293b; }
.stat-card-label { font-size: 12px; color: #64748b; }

.filter-input {
  width: 100%;
  padding: 8px 12px 8px 32px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 13px;
  color: #334155;
  background: white;
  outline: none;
  transition: all 0.2s ease;
}
.filter-input:focus {
  border-color: #8b5cf6;
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}
.filter-input::placeholder { color: #94a3b8; }

.filter-select {
  appearance: none;
  padding: 8px 28px 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 13px;
  font-medium: 500;
  color: #334155;
  background: white url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E") no-repeat right 10px center;
  cursor: pointer;
  outline: none;
  min-width: 90px;
  transition: all 0.2s ease;
}
.filter-select:focus {
  border-color: #8b5cf6;
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}

.filter-reset-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 13px;
  font-medium: 500;
  color: #64748b;
  background: #f1f5f9;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}
.filter-reset-btn:hover { background: #e2e8f0; color: #475569; }

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
}
.action-btn-primary {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}
.action-btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
}
.action-btn-danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}
.action-btn-danger:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
}

.timeline-wrapper {
  position: relative;
  padding-left: 24px;
}
.timeline-line {
  position: absolute;
  left: 7px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(to bottom, #e2e8f0 0%, #cbd5e1 50%, #e2e8f0 100%);
}
.timeline-group { position: relative; margin-bottom: 24px; }
.timeline-group:last-child { margin-bottom: 0; }

.timeline-node {
  position: absolute;
  left: -20px;
  top: 4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
  border: 3px solid #cbd5e1;
  transition: all 0.2s ease;
}
.timeline-node-today {
  border-color: #8b5cf6;
  box-shadow: 0 0 0 6px rgba(139, 92, 246, 0.15);
}
.timeline-node-overdue {
  border-color: #94a3b8;
  background: #f1f5f9;
}

.timeline-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.timeline-date {
  font-size: 15px;
  font-weight: 700;
}
.timeline-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}
.timeline-badge-today {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}
.timeline-badge-overdue {
  background: #f1f5f9;
  color: #64748b;
}
.timeline-countdown {
  font-size: 12px;
  color: #94a3b8;
}

.timeline-events { display: flex; flex-direction: column; gap: 8px; }

.event-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  background: white;
  border: 1px solid #e2e8f0;
  border-left: 4px solid var(--event-color, #f3e8ff);
  cursor: pointer;
  transition: all 0.25s ease;
}
.event-card:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border-color: rgba(139, 92, 246, 0.3);
}
.event-card-completed {
  background: rgba(16, 185, 129, 0.03);
  border-color: rgba(16, 185, 129, 0.2);
}
.event-card-selected {
  box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.3);
}

.event-card-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.03);
}

.event-card-content {
  flex: 1;
  min-width: 0;
}
.event-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.event-card-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.event-priority-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.event-card-desc {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-card-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 6px;
}
.event-meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #94a3b8;
}
.event-meta-badge {
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
}
.event-meta-completed {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}
.event-meta-high {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}
.event-meta-medium {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
}
.event-meta-low {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}
.event-meta-countdown {
  font-size: 11px;
  color: #94a3b8;
}
.event-meta-urgent {
  color: #dc2626;
  font-weight: 600;
}

.event-card-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s ease;
}
.event-card:hover .event-card-actions { opacity: 1; }

.event-action-checkbox {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1.5px solid #cbd5e1;
  cursor: pointer;
  accent-color: #8b5cf6;
}
.event-action-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}
.event-action-complete {
  background: #f1f5f9;
  color: #94a3b8;
}
.event-action-complete:hover { background: #e2e8f0; }
.event-action-done {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}
.event-action-todo {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
}
.event-action-todo:hover { background: rgba(245, 158, 11, 0.2); }
.event-action-delete {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}
.event-action-delete:hover { background: rgba(239, 68, 68, 0.2); }
</style>