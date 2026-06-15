<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Plus, ChevronLeft, ChevronRight, Calendar, Play, CheckCircle2, Circle, Trash2, Edit2, X, Briefcase, BookOpen, Home, FolderKanban, Users, ListTodo, Clock, Tag, Target } from 'lucide-vue-next'
import { usePeriodStore } from '@/stores/period'
import type { PeriodEvent, PeriodSubtask } from '@/types'
import { calendarEventTypeColors } from '@/utils/colors'

const store = usePeriodStore()

const viewStartDate = ref(formatDate(new Date()))
const viewEndDate = ref(formatDate(addDays(new Date(), 30)))
const showForm = ref(false)
const editingEvent = ref<PeriodEvent | null>(null)
const selectedEvent = ref<PeriodEvent | null>(null)
const newSubtaskTitle = ref('')
const editingSubtask = ref<{ eventId: number; subtaskId: number; value: string } | null>(null)

const formData = ref({
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  eventType: 'task' as 'work' | 'study' | 'life' | 'project' | 'meeting' | 'task',
  progress: 0,
  completed: false,
  subtaskCount: 0
})

const eventTypeOptions = [
  { value: 'work', label: '工作', icon: Briefcase },
  { value: 'study', label: '学习', icon: BookOpen },
  { value: 'life', label: '生活', icon: Home },
  { value: 'project', label: '项目', icon: FolderKanban },
  { value: 'meeting', label: '会议', icon: Users },
  { value: 'task', label: '任务', icon: ListTodo }
]

const eventTypeIcons: Record<string, typeof Briefcase> = {
  work: Briefcase,
  study: BookOpen,
  life: Home,
  project: FolderKanban,
  meeting: Users,
  task: ListTodo
}

function getEventTypeColor(eventType?: string): string {
  return calendarEventTypeColors[eventType || 'task'] || '#f1f5f9'
}

function getEventTypeBorderColor(eventType?: string): string {
  const colors: Record<string, string> = {
    work: '#3b82f6',
    study: '#22c55e',
    life: '#f59e0b',
    project: '#ec4899',
    meeting: '#8b5cf6',
    task: '#6b7280'
  }
  return colors[eventType || 'task'] || '#6b7280'
}

function getSubtaskProgress(event: PeriodEvent): { completed: number; total: number; percent: number } {
  if (!event.subtasks || event.subtasks.length === 0) {
    return { completed: event.completed ? 1 : 0, total: 1, percent: event.completed ? 100 : event.progress }
  }
  const completed = event.subtasks.filter(s => s.completed).length
  const total = event.subtasks.length
  return { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 }
}

watch(() => store.periodEvents, (events) => {
  if (selectedEvent.value && !editingSubtask.value) {
    const updatedEvent = events.find(e => e.id === selectedEvent.value!.id)
    if (updatedEvent) {
      selectedEvent.value = { ...updatedEvent }
    }
  }
}, { deep: true })

watch(editingEvent, (event) => {
  if (event) {
    formData.value = {
      title: event.title,
      description: event.description || '',
      startDate: event.startDate,
      endDate: event.endDate,
      eventType: event.eventType || 'task',
      progress: event.progress,
      completed: event.completed,
      subtaskCount: event.subtasks ? event.subtasks.length : 0
    }
  } else {
    formData.value = {
      title: '',
      description: '',
      startDate: formatDate(new Date()),
      endDate: formatDate(addDays(new Date(), 7)),
      eventType: 'task',
      progress: 0,
      completed: false,
      subtaskCount: 0
    }
  }
})

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function getViewDays(): { date: string; displayDate: string; dayOfWeek: string; isWeekend: boolean; isMarked: boolean; isFirstDayOfMonth: boolean }[] {
  const days = []
  const start = new Date(viewStartDate.value)
  const end = new Date(viewEndDate.value)
  const current = new Date(start)
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const daysInRange = getDaysInRange()
  
  while (current <= end) {
    const dayOfWeek = current.getDay()
    const isFirstDayOfMonth = current.getDate() === 1
    const isMarked = daysInRange > 31 ? isFirstDayOfMonth || current.getDate() === 15 : current.getDate() % 3 === 1
    
    let displayDate = ''
    let dayOfWeekDisplay = ''
    
    if (daysInRange > 31) {
      if (isFirstDayOfMonth) {
        displayDate = `${current.getMonth() + 1}月`
      } else if (current.getDate() === 15) {
        displayDate = '15'
      }
    } else {
      displayDate = `${current.getDate()}`
      dayOfWeekDisplay = weekDays[dayOfWeek]
    }
    
    days.push({
      date: formatDate(current),
      displayDate,
      dayOfWeek: dayOfWeekDisplay,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      isMarked,
      isFirstDayOfMonth
    })
    current.setDate(current.getDate() + 1)
  }
  return days
}

function getDaysInRange(): number {
  const start = new Date(viewStartDate.value)
  const end = new Date(viewEndDate.value)
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

function setViewRange(range: 'week' | 'month' | 'quarter') {
  const today = new Date()
  viewStartDate.value = formatDate(today)
  switch (range) {
    case 'week':
      viewEndDate.value = formatDate(addDays(today, 6))
      break
    case 'month':
      viewEndDate.value = formatDate(addDays(today, 30))
      break
    case 'quarter':
      viewEndDate.value = formatDate(addDays(today, 90))
      break
  }
}

function prevWeek() {
  const start = new Date(viewStartDate.value)
  const end = new Date(viewEndDate.value)
  const daysDiff = getDaysInRange()
  viewStartDate.value = formatDate(addDays(start, -daysDiff))
  viewEndDate.value = formatDate(addDays(end, -daysDiff))
}

function nextWeek() {
  const start = new Date(viewStartDate.value)
  const end = new Date(viewEndDate.value)
  const daysDiff = getDaysInRange()
  viewStartDate.value = formatDate(addDays(start, daysDiff))
  viewEndDate.value = formatDate(addDays(end, daysDiff))
}

function getGanttPosition(event: PeriodEvent): { left: string; width: string; visible: boolean } {
  const viewStart = new Date(viewStartDate.value).getTime()
  const viewEnd = new Date(viewEndDate.value).getTime()
  const eventStart = new Date(event.startDate).getTime()
  const eventEnd = new Date(event.endDate).getTime()
  
  const viewTotal = viewEnd - viewStart
  const left = Math.max(0, eventStart - viewStart)
  const right = Math.min(viewTotal, eventEnd - viewStart)
  
  if (right <= 0 || left >= viewTotal) {
    return { left: '0%', width: '0%', visible: false }
  }
  
  const leftPercent = (left / viewTotal) * 100
  const widthPercent = ((right - left) / viewTotal) * 100
  
  return { left: `${leftPercent}%`, width: `${widthPercent}%`, visible: true }
}

function openForm(event?: PeriodEvent) {
  editingEvent.value = event || null
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingEvent.value = null
}

function handleSave() {
  const eventData: Omit<PeriodEvent, 'id' | 'createdAt'> = {
    title: formData.value.title,
    description: formData.value.description || undefined,
    startDate: formData.value.startDate,
    endDate: formData.value.endDate,
    color: getEventTypeColor(formData.value.eventType),
    progress: parseInt(formData.value.progress.toString(), 10),
    completed: formData.value.completed,
    eventType: formData.value.eventType
  }

  if (formData.value.subtaskCount > 0) {
    const existingSubtasks = editingEvent.value?.subtasks || []
    const newSubtasks: PeriodSubtask[] = []
    
    for (let i = 0; i < formData.value.subtaskCount; i++) {
      if (existingSubtasks[i]) {
        newSubtasks.push(existingSubtasks[i])
      } else {
        newSubtasks.push({
          id: Date.now() + i,
          title: `子任务 ${i + 1}`,
          completed: false
        })
      }
    }
    eventData.subtasks = newSubtasks
  } else if (editingEvent.value?.subtasks) {
    eventData.subtasks = undefined
  }

  if (editingEvent.value) {
    store.updatePeriodEvent(editingEvent.value.id, eventData)
  } else {
    store.addPeriodEvent(eventData)
  }
  closeForm()
}

function handleDelete(id: number) {
  if (confirm('确定要删除这个周期事件吗？')) {
    store.deletePeriodEvent(id)
    selectedEvent.value = null
  }
}

function toggleComplete(event: PeriodEvent) {
  store.updatePeriodEvent(event.id, {
    completed: !event.completed,
    progress: !event.completed ? 100 : 0,
    subtasks: event.subtasks?.map(s => ({ ...s, completed: !event.completed }))
  })
}

function toggleSubtask(event: PeriodEvent, subtaskId: number) {
  const updatedSubtasks = event.subtasks?.map(s => 
    s.id === subtaskId ? { ...s, completed: !s.completed } : s
  )
  
  if (updatedSubtasks) {
    const completed = updatedSubtasks.filter(s => s.completed).length
    const total = updatedSubtasks.length
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0
    
    store.updatePeriodEvent(event.id, {
      subtasks: updatedSubtasks,
      progress,
      completed: progress >= 100
    })
  }
}

function addSubtask(event: PeriodEvent) {
  if (!newSubtaskTitle.value.trim()) return
  
  const newSubtask: PeriodSubtask = {
    id: Date.now(),
    title: newSubtaskTitle.value.trim(),
    completed: false
  }
  
  const updatedSubtasks = [...(event.subtasks || []), newSubtask]
  
  store.updatePeriodEvent(event.id, {
    subtasks: updatedSubtasks
  })
  
  newSubtaskTitle.value = ''
}

function editSubtaskStart(eventId: number, subtaskId: number, value: string) {
  editingSubtask.value = { eventId, subtaskId, value }
}

function editSubtaskEnd(event: PeriodEvent) {
  if (!editingSubtask.value) return
  
  const updatedSubtasks = event.subtasks?.map(s =>
    s.id === editingSubtask.value!.subtaskId ? { ...s, title: editingSubtask.value!.value } : s
  )
  
  if (updatedSubtasks) {
    store.updatePeriodEvent(event.id, { subtasks: updatedSubtasks })
  }
  
  editingSubtask.value = null
}

function deleteSubtask(event: PeriodEvent, subtaskId: number) {
  const updatedSubtasks = event.subtasks?.filter(s => s.id !== subtaskId)
  
  if (updatedSubtasks !== undefined) {
    const completed = updatedSubtasks.filter(s => s.completed).length
    const total = updatedSubtasks.length
    const progress = total > 0 ? Math.round((completed / total) * 100) : event.progress
    
    store.updatePeriodEvent(event.id, {
      subtasks: updatedSubtasks.length > 0 ? updatedSubtasks : undefined,
      progress,
      completed: progress >= 100
    })
  }
}

function formatDuration(startDate: string, endDate: string): string {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  
  if (diffDays === 1) return '1天'
  if (diffDays < 7) return `${diffDays}天`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周${diffDays % 7 > 0 ? `${diffDays % 7}天` : ''}`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月${diffDays % 30 > 0 ? `${diffDays % 30}天` : ''}`
  return `${Math.floor(diffDays / 365)}年${diffDays % 365 > 0 ? `${Math.floor((diffDays % 365) / 30)}个月` : ''}`
}

const viewDays = computed(() => getViewDays())
</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <header class="p-6 border-b border-gray-200 bg-white">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">周期图</h1>
          <p class="text-gray-500 mt-1">长期项目追踪，甘特图布局展示</p>
        </div>
        <button
          @click="openForm()"
          class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-secondary transition-colors"
        >
          <Plus :size="20" />
          新建周期事件
        </button>
      </div>
      
      <div class="flex items-center justify-between mt-4">
        <div class="flex items-center gap-2">
          <button
            @click="prevWeek"
            class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft :size="20" class="text-gray-600" />
          </button>
          <div class="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl">
            <Calendar :size="18" class="text-gray-500" />
            <span class="text-sm font-medium text-gray-700">
              {{ viewStartDate }} ~ {{ viewEndDate }}
            </span>
          </div>
          <button
            @click="nextWeek"
            class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight :size="20" class="text-gray-600" />
          </button>
        </div>
        
        <div class="flex items-center gap-2">
          <button
            @click="setViewRange('week')"
            class="px-3 py-1.5 text-sm rounded-lg transition-colors"
            :class="getDaysInRange() === 7 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          >
            本周
          </button>
          <button
            @click="setViewRange('month')"
            class="px-3 py-1.5 text-sm rounded-lg transition-colors"
            :class="getDaysInRange() === 31 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          >
            本月
          </button>
          <button
            @click="setViewRange('quarter')"
            class="px-3 py-1.5 text-sm rounded-lg transition-colors"
            :class="getDaysInRange() === 91 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          >
            季度
          </button>
        </div>
      </div>
    </header>
    
    <div class="flex-1 overflow-auto p-6">
      <div class="flex-1 min-w-[600px]">
        <div class="h-10 bg-gray-50 rounded-t-lg border border-b-0 border-gray-200 flex">
          <div class="w-[220px] flex-shrink-0 flex items-center px-4 border-r border-gray-200">
            <span class="text-sm font-medium text-gray-600">项目</span>
          </div>
          <div
            v-for="(day, index) in viewDays"
            :key="day.date"
            class="flex-shrink-0 flex flex-col items-center justify-center relative"
            :style="{ width: `${100 / viewDays.length}%` }"
          >
            <span v-if="day.dayOfWeek" class="text-xs text-gray-400">{{ day.dayOfWeek }}</span>
            <span
              class="text-xs font-medium"
              :class="day.isWeekend ? 'text-red-400' : 'text-gray-700'"
              :style="day.isMarked ? {} : { opacity: 0.4 }"
            >
              {{ day.displayDate }}
            </span>
            <div v-if="day.isMarked && getDaysInRange() > 31" class="absolute bottom-0 left-0 right-0 h-px bg-gray-200" />
          </div>
        </div>
        
        <div class="border border-gray-200 rounded-b-lg relative">
          <div class="absolute inset-0 bg-grid-pattern pointer-events-none" />
          
          <div
            v-for="event in store.sortedEvents"
            :key="event.id"
            class="h-[70px] relative flex items-center border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors"
          >
            <div class="w-[220px] flex-shrink-0 flex flex-col justify-center px-4 border-r border-gray-200 bg-gray-50/30">
              <div class="flex items-center gap-2">
                <div
                  class="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                  :style="{ backgroundColor: getEventTypeColor(event.eventType) }"
                >
                  <component :is="eventTypeIcons[event.eventType || 'task']" :size="10" :style="{ color: getEventTypeBorderColor(event.eventType) }" />
                </div>
                <span class="text-sm font-medium text-gray-800 truncate">{{ event.title }}</span>
              </div>
              <div class="flex items-center gap-1 mt-0.5">
                <span class="text-xs text-gray-500">{{ event.startDate }}</span>
                <span class="text-xs text-gray-400">~</span>
                <span class="text-xs text-gray-500">{{ event.endDate }}</span>
              </div>
            </div>
            
            <div class="flex-1 relative h-full flex items-center">
              <template v-if="getGanttPosition(event).visible">
                <div
                  class="absolute h-[50px] rounded-xl border-2 transition-all cursor-pointer hover:shadow-md"
                  :class="[selectedEvent?.id === event.id ? 'ring-2 ring-primary ring-offset-1' : '']"
                  :style="{
                    left: getGanttPosition(event).left,
                    width: getGanttPosition(event).width,
                    backgroundColor: getEventTypeColor(event.eventType),
                    borderColor: getEventTypeBorderColor(event.eventType)
                  }"
                  @click="selectedEvent = event"
                >
                  <div
                    class="h-full rounded-xl transition-all"
                    :style="{
                      width: `${event.progress}%`,
                      backgroundColor: getEventTypeBorderColor(event.eventType) + '40'
                    }"
                  />
                  
                  <div class="absolute inset-0 flex items-center px-3">
                    <div class="flex items-center gap-2 overflow-hidden">
                      <span class="text-xs font-medium text-gray-700 truncate">{{ event.title }}</span>
                      <span
                        class="text-xs font-bold px-1.5 py-0.5 rounded text-white flex-shrink-0"
                        :style="{ backgroundColor: getEventTypeBorderColor(event.eventType) }"
                      >
                        {{ event.progress }}%
                      </span>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
          
          <div
            v-if="store.sortedEvents.length === 0"
            class="h-[400px] flex items-center justify-center"
          >
            <div class="text-center text-gray-400">
              <Play :size="32" class="mx-auto mb-2 opacity-50" />
              <p class="text-sm">暂无周期事件</p>
              <p class="text-xs">点击右上角按钮创建</p>
            </div>
          </div>
        </div>
      </div>
      
      <div
        v-if="selectedEvent"
        class="mt-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm"
      >
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            <div
              class="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
              :style="{ backgroundColor: getEventTypeColor(selectedEvent.eventType) }"
            >
              <component :is="eventTypeIcons[selectedEvent.eventType || 'task']" :size="12" :style="{ color: getEventTypeBorderColor(selectedEvent.eventType) }" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-lg font-bold text-gray-800">{{ selectedEvent.title }}</h3>
                <span
                  v-if="selectedEvent.completed"
                  class="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700"
                >
                  已完成
                </span>
              </div>
              <div class="flex items-center gap-3 mt-1">
                <span class="text-sm text-gray-500 flex items-center gap-1">
                  <Calendar :size="14" />
                  {{ selectedEvent.startDate }} ~ {{ selectedEvent.endDate }}
                </span>
                <span class="text-sm text-gray-500 flex items-center gap-1">
                  <Clock :size="14" />
                  {{ formatDuration(selectedEvent.startDate, selectedEvent.endDate) }}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="grid grid-cols-3 gap-4 mt-4">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center" :style="{ backgroundColor: getEventTypeColor(selectedEvent.eventType) }">
              <Tag :size="16" :style="{ color: getEventTypeBorderColor(selectedEvent.eventType) }" />
            </div>
            <div>
              <p class="text-xs text-gray-500">类型</p>
              <p class="text-sm font-medium text-gray-700">
                {{ eventTypeOptions.find(o => o.value === selectedEvent.eventType)?.label || '任务' }}
              </p>
            </div>
          </div>
          
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Target :size="16" class="text-blue-600" />
            </div>
            <div>
              <p class="text-xs text-gray-500">进度</p>
              <p class="text-sm font-medium" :style="{ color: getEventTypeBorderColor(selectedEvent.eventType) }">
                {{ selectedEvent.progress }}%
              </p>
            </div>
          </div>
          
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
              <ListTodo :size="16" class="text-purple-600" />
            </div>
            <div>
              <p class="text-xs text-gray-500">子任务</p>
              <p class="text-sm font-medium text-gray-700">
                {{ selectedEvent.subtasks ? `${getSubtaskProgress(selectedEvent).completed}/${selectedEvent.subtasks.length}` : '0' }}
              </p>
            </div>
          </div>
        </div>
        
        <div v-if="selectedEvent.description" class="mt-4 p-3 bg-gray-50 rounded-lg">
          <p class="text-sm text-gray-600">{{ selectedEvent.description }}</p>
        </div>
        
        <div v-if="selectedEvent.subtasks && selectedEvent.subtasks.length > 0" class="mt-4">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-medium text-gray-700">子任务</h4>
            <span class="text-xs text-gray-500">
              {{ getSubtaskProgress(selectedEvent).completed }}/{{ selectedEvent.subtasks.length }} 完成
            </span>
          </div>
          
          <div class="space-y-2">
            <div
              v-for="subtask in selectedEvent.subtasks"
              :key="subtask.id"
              class="flex items-center gap-3 p-3 rounded-lg transition-colors"
              :class="subtask.completed ? 'bg-gray-50' : 'hover:bg-gray-50'"
            >
              <button
                @click="toggleSubtask(selectedEvent, subtask.id)"
                class="flex-shrink-0"
              >
                <CheckCircle2
                  v-if="subtask.completed"
                  :size="18"
                  :style="{ color: getEventTypeBorderColor(selectedEvent.eventType) }"
                />
                <Circle v-else :size="18" class="text-gray-300" />
              </button>
              
              <div class="flex-1">
                <input
                  v-if="editingSubtask?.subtaskId === subtask.id"
                  v-model="editingSubtask.value"
                  @blur="editSubtaskEnd(selectedEvent)"
                  @keyup.enter="editSubtaskEnd(selectedEvent)"
                  class="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                  autofocus
                />
                <span
                  v-else
                  class="text-sm"
                  :class="subtask.completed ? 'text-gray-400 line-through' : 'text-gray-700'"
                  @click="editSubtaskStart(selectedEvent.id, subtask.id, subtask.title)"
                >
                  {{ subtask.title }}
                </span>
              </div>
              
              <button
                @click="deleteSubtask(selectedEvent, subtask.id)"
                class="flex-shrink-0 p-1 rounded-lg hover:bg-red-50 opacity-60 hover:opacity-100 transition-opacity"
              >
                <Trash2 :size="14" class="text-red-500" />
              </button>
            </div>
          </div>
        </div>
        
        <div class="mt-4">
          <div class="flex items-center gap-2">
            <input
              v-model="newSubtaskTitle"
              type="text"
              class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary"
              placeholder="添加子任务..."
              @keyup.enter="addSubtask(selectedEvent)"
            />
            <button
              @click="addSubtask(selectedEvent)"
              class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              添加
            </button>
          </div>
        </div>
        
        <div class="flex gap-2 mt-4 pt-4 border-t border-gray-100">
          <button
            @click="toggleComplete(selectedEvent)"
            class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors"
            :class="selectedEvent.completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'"
          >
            <CheckCircle2 v-if="selectedEvent.completed" :size="16" />
            <Circle v-else :size="16" />
            {{ selectedEvent.completed ? '已完成' : '标记完成' }}
          </button>
          <button
            @click="openForm(selectedEvent)"
            class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-primary text-white hover:bg-secondary transition-colors"
          >
            <Edit2 :size="16" />
            编辑
          </button>
          <button
            @click="handleDelete(selectedEvent.id)"
            class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
          >
            <Trash2 :size="16" />
            删除
          </button>
        </div>
      </div>
    </div>
    
    <Teleport to="body">
      <div
        v-if="showForm"
        class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        @click.self="closeForm"
      >
        <div class="bg-white w-full max-w-md rounded-2xl shadow-xl p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-gray-800">{{ editingEvent ? '编辑周期事件' : '新建周期事件' }}</h2>
            <button
              @click="closeForm"
              class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"
            >
              <X :size="18" class="text-gray-500" />
            </button>
          </div>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">事件名称</label>
              <input
                v-model="formData.title"
                type="text"
                class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                placeholder="输入事件名称"
              />
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">开始日期</label>
                <input
                  v-model="formData.startDate"
                  type="date"
                  class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">结束日期</label>
                <input
                  v-model="formData.endDate"
                  type="date"
                  class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                />
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">标签类型</label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="option in eventTypeOptions"
                  :key="option.value"
                  @click="formData.eventType = option.value as 'work' | 'study' | 'life' | 'project' | 'meeting' | 'task'"
                  class="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border-2 transition-all"
                  :class="formData.eventType === option.value ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300'"
                >
                  <component :is="option.icon" :size="14" :style="{ color: getEventTypeBorderColor(option.value) }" />
                  <span class="text-sm">{{ option.label }}</span>
                </button>
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">描述（可选）</label>
              <textarea
                v-model="formData.description"
                rows="3"
                class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all resize-none"
                placeholder="输入事件描述"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">子任务数量</label>
              <div class="flex items-center gap-4">
                <input
                  type="range"
                  v-model="formData.subtaskCount"
                  min="0"
                  max="10"
                  class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span class="text-sm font-medium w-8 text-right">{{ formData.subtaskCount }}</span>
              </div>
              <p class="text-xs text-gray-500 mt-1">设置子任务数量，创建后可编辑具体内容</p>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">进度</label>
              <div class="flex items-center gap-4">
                <input
                  type="range"
                  v-model="formData.progress"
                  min="0"
                  max="100"
                  class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span class="text-sm font-medium w-12 text-right" :style="{ color: getEventTypeBorderColor(formData.eventType) }">
                  {{ formData.progress }}%
                </span>
              </div>
            </div>
          </div>
          
          <div class="flex gap-3 mt-6">
            <button
              @click="closeForm"
              class="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all font-medium"
            >
              取消
            </button>
            <button
              @click="handleSave"
              class="flex-1 px-4 py-3 rounded-xl bg-primary text-white hover:bg-secondary transition-all font-medium"
            >
              {{ editingEvent ? '保存' : '创建' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.bg-grid-pattern {
  background-image: 
    linear-gradient(to right, #e5e7eb 1px, transparent 1px),
    linear-gradient(to bottom, #e5e7eb 1px, transparent 1px);
  background-size: calc(100% / 31) 70px;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: white;
  border: 2px solid #6366f1;
  border-radius: 50%;
  cursor: pointer;
}

input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: white;
  border: 2px solid #6366f1;
  border-radius: 50%;
  cursor: pointer;
}
</style>