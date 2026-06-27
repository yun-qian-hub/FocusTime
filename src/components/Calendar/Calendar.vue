﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { ChevronLeft, ChevronRight, Plus, X, Clock, Calendar as CalendarIcon, CalendarDays, Repeat, Briefcase, BookOpen, Home, FolderKanban, Users, ListTodo, Palette, Star, Check, Eye, EyeOff } from 'lucide-vue-next'
import { useCalendarStore } from '@/stores/calendar'
import { useImportantStore } from '@/stores/important'
import type { CalendarEvent } from '@/types'
import { calendarEventTypeColors } from '@/utils/colors'

const store = useCalendarStore()
const importantStore = useImportantStore()

const showEventModal = ref(false)
const editingEvent = ref<CalendarEvent | null>(null)
const newEvent = ref({
  title: '',
  description: '',
  startTime: '',
  endTime: '',
  allDay: false,
  color: '#6366f1',
  repeat: 'none' as CalendarEvent['repeat'],
  endDate: '',
  eventType: 'task' as CalendarEvent['eventType']
})

const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  day: null as { date: number; month: number; year: number } | null
})

const showColorSettings = ref(false)

const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
const dayNames = ['日', '一', '二', '三', '四', '五', '六']

const NOTE_COLORS = [
  '#fef3c7',
  '#dbeafe',
  '#dcfce7',
  '#fce7f3',
  '#f3e8ff',
  '#fed7aa'
]

const eventColors = NOTE_COLORS

const cellColorPresets = [
  { label: '黄色', color: '#fef3c7' },
  { label: '蓝色', color: '#dbeafe' },
  { label: '绿色', color: '#dcfce7' },
  { label: '粉色', color: '#fce7f3' },
  { label: '紫色', color: '#f3e8ff' },
  { label: '橙色', color: '#fed7aa' }
]

const selectedDefaultColor = ref('#f3e8ff')

function loadColors() {
  const saved = localStorage.getItem('calendar_colors')
  if (saved) {
    const data = JSON.parse(saved)
    selectedDefaultColor.value = data.selectedDefaultColor || '#6366f1'
  }
}

function saveColors() {
  localStorage.setItem('calendar_colors', JSON.stringify({
    selectedDefaultColor: selectedDefaultColor.value
  }))
}

const repeatOptions = [
  { value: 'none', label: '不重复' },
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'yearly', label: '每年' }
]

const eventTypeOptions = [
  { value: 'work', label: '工作', icon: Briefcase, color: calendarEventTypeColors.work },
  { value: 'study', label: '学习', icon: BookOpen, color: calendarEventTypeColors.study },
  { value: 'life', label: '生活', icon: Home, color: calendarEventTypeColors.life },
  { value: 'project', label: '项目', icon: FolderKanban, color: calendarEventTypeColors.project },
  { value: 'meeting', label: '会议', icon: Users, color: calendarEventTypeColors.meeting },
  { value: 'task', label: '任务', icon: ListTodo, color: calendarEventTypeColors.task }
]

const eventTypeIcons: Record<string, typeof Briefcase> = {
  work: Briefcase,
  study: BookOpen,
  life: Home,
  project: FolderKanban,
  meeting: Users,
  task: ListTodo
}

function getEventTypeLabel(type?: CalendarEvent['eventType']) {
  const option = eventTypeOptions.find(o => o.value === type)
  return option ? option.label : '任务'
}

function getEventTypeIcon(type?: CalendarEvent['eventType']) {
  return eventTypeIcons[type || 'task'] || ListTodo
}

const selectedDateFormatted = computed(() => {
  const date = store.selectedDate
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekDays[date.getDay()]}`
})

function openEventModal(event?: CalendarEvent) {
  if (event) {
    editingEvent.value = event
    newEvent.value = {
      title: event.title,
      description: event.description || '',
      startTime: event.startTime,
      endTime: event.endTime || '',
      allDay: event.allDay,
      color: event.color,
      repeat: event.repeat || 'none',
      endDate: event.endDate || '',
      eventType: event.eventType || 'task'
    }
  } else {
    editingEvent.value = null
    const date = store.selectedDate.toISOString().split('T')[0]
    newEvent.value = {
      title: '',
      description: '',
      startTime: `${date}T09:00`,
      endTime: `${date}T10:00`,
      allDay: false,
      color: calendarEventTypeColors.task,
      repeat: 'none',
      endDate: '',
      eventType: 'task'
    }
  }
  showEventModal.value = true
}

function saveEvent() {
  if (!newEvent.value.title.trim()) return
  
  if (editingEvent.value) {
    store.updateEvent(editingEvent.value.id, newEvent.value)
  } else {
    store.addEvent(newEvent.value)
  }
  
  closeModal()
}

function deleteEvent() {
  if (editingEvent.value) {
    store.deleteEvent(editingEvent.value.id)
    closeModal()
  }
}

function closeModal() {
  showEventModal.value = false
  editingEvent.value = null
  newEvent.value = {
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    allDay: false,
    color: '#6366f1',
    repeat: 'none',
    endDate: ''
  }
}

function toggleCompleted(eventId: number) {
  store.toggleEventCompleted(eventId)
}

function selectDay(day: { date: number; month: number; year: number }) {
  store.setSelectedDate(new Date(day.year, day.month, day.date))
}

function isSelected(day: { date: number; month: number; year: number }): boolean {
  return (
    store.selectedDate.getFullYear() === day.year &&
    store.selectedDate.getMonth() === day.month &&
    store.selectedDate.getDate() === day.date
  )
}

function handleDayDoubleClick(day: { date: number; month: number; year: number }) {
  store.setSelectedDate(new Date(day.year, day.month, day.date))
  openEventModal()
}

function handleContextMenu(e: MouseEvent, day: { date: number; month: number; year: number }) {
  e.preventDefault()
  contextMenu.value = {
    show: true,
    x: e.clientX,
    y: e.clientY,
    day
  }
}

function handleClickOutside(e: MouseEvent) {
  if (contextMenu.value.show) {
    contextMenu.value.show = false
  }
}

function addEventFromContextMenu() {
  if (contextMenu.value.day) {
    const { date, month, year } = contextMenu.value.day
    store.setSelectedDate(new Date(year, month, date))
    const dateStr = new Date(year, month, date).toISOString().split('T')[0]
    newEvent.value.startTime = `${dateStr}T09:00`
    newEvent.value.endTime = `${dateStr}T10:00`
    closeContextMenu()
    openEventModal()
  }
}

function closeContextMenu() {
  contextMenu.value.show = false
}

function getEventPreview(events: CalendarEvent[]): string {
  if (events.length === 0) return ''
  if (events.length === 1) return events[0].title
  if (events.length === 2) return `${events[0].title}, ${events[1].title}`
  return `${events[0].title} 等${events.length}个`
}

function getRepeatLabel(repeat?: CalendarEvent['repeat']): string {
  if (!repeat || repeat === 'none') return ''
  const option = repeatOptions.find(o => o.value === repeat)
  return option?.label || ''
}

const priorityColors = {
  high: '#fce7f3',
  medium: '#fef3c7',
  low: '#dcfce7'
}

const priorityRank: Record<string, number> = { high: 0, medium: 1, low: 2 }

function topEventsByPriority(events: any[]): any[] {
  return [...events].sort((a, b) => {
    if (a.isImportant && !b.isImportant) return -1
    if (!a.isImportant && b.isImportant) return 1
    const pa = a.priority ? (priorityRank[a.priority] ?? 3) : 3
    const pb = b.priority ? (priorityRank[b.priority] ?? 3) : 3
    return pa - pb
  })
}

function getEventColorForCell(input: any): string {
  const events = input.events ? input.events : input
  
  if (!events || events.length === 0) return 'transparent'
  
  const importantEvent = events.find((e: any) => e.isImportant)
  if (importantEvent) {
    return importantEvent.color || '#f3e8ff'
  }
  
  const firstEvent = events[0]
  if (firstEvent.color) return firstEvent.color
  if (firstEvent.eventType && calendarEventTypeColors[firstEvent.eventType]) {
    return calendarEventTypeColors[firstEvent.eventType]
  }
  if (firstEvent.priority && priorityColors[firstEvent.priority as keyof typeof priorityColors]) {
    return priorityColors[firstEvent.priority as keyof typeof priorityColors]
  }
  return selectedDefaultColor.value
}

function getDayEventsWithColor(day: { events: any[] }) {
  return [...(day.events || [])]
}

function getEventColorForCellDay(day: { events: any[] }): string {
  if (!day.events || day.events.length === 0) return 'transparent'
  
  const importantEvent = day.events.find((e: any) => e.isImportant)
  if (importantEvent) return importantEvent.color || '#f3e8ff'
  
  const first = day.events[0]
  if (first.color) return first.color
  if (first.eventType && calendarEventTypeColors[first.eventType]) return calendarEventTypeColors[first.eventType]
  if (first.priority && priorityColors[first.priority as keyof typeof priorityColors]) return priorityColors[first.priority as keyof typeof priorityColors]
  return selectedDefaultColor.value
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  loadColors()
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="flex-1 flex flex-col p-6" style="height: 100vh;">
    <header class="flex items-center justify-between mb-4" style="height: 10%;">
      <div>
        <h1 class="text-3xl font-bold text-gray-800">{{ monthNames[store.currentMonth] }} {{ store.currentYear }}</h1>
        <p class="text-gray-500 mt-1 text-lg">{{ selectedDateFormatted }}</p>
      </div>
      
      <div class="flex items-center gap-3">
        <button
          @click="showColorSettings = !showColorSettings"
          class="w-12 h-12 rounded-xl bg-white/50 hover:bg-white/70 flex items-center justify-center transition-all shadow-md"
          :class="[showColorSettings ? 'bg-primary/10 text-primary' : '']"
        >
          <Palette :size="24" class="text-gray-600" />
        </button>
        <button
          @click="store.prevMonth"
          class="w-12 h-12 rounded-xl bg-white/50 hover:bg-white/70 flex items-center justify-center transition-all shadow-md"
        >
          <ChevronLeft :size="24" class="text-gray-600" />
        </button>
        <button
          @click="store.goToToday"
          class="px-6 py-2.5 rounded-xl bg-primary text-white hover:bg-secondary transition-all font-medium text-base shadow-lg shadow-gray-400/50"
        >
          今天
        </button>
        <button
          @click="store.nextMonth"
          class="w-12 h-12 rounded-xl bg-white/50 hover:bg-white/70 flex items-center justify-center transition-all shadow-md"
        >
          <ChevronRight :size="24" class="text-gray-600" />
        </button>
        <button
          @click="store.showCompleted = !store.showCompleted"
          class="w-12 h-12 rounded-xl bg-white/50 hover:bg-white/70 flex items-center justify-center transition-all shadow-md"
          :title="store.showCompleted ? '隐藏已完成' : '显示已完成'"
        >
          <Eye v-if="store.showCompleted" :size="20" class="text-green-500" />
          <EyeOff v-else :size="20" class="text-gray-400" />
        </button>
      </div>
    </header>
    
    <Transition name="slide-down">
      <div v-if="showColorSettings" class="glass-card p-4 mb-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Palette :size="20" />
            颜色设置
          </h3>
          <button @click="showColorSettings = false" class="text-gray-400 hover:text-gray-600">
            <X :size="20" />
          </button>
        </div>
        
        <div>
          <p class="text-sm font-medium text-gray-700 mb-2">选中日期的默认颜色</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="preset in cellColorPresets"
              :key="'selected-' + preset.label"
              @click="selectedDefaultColor = preset.color; saveColors()"
              class="w-10 h-10 rounded-full transition-all hover:scale-110"
              :class="[selectedDefaultColor === preset.color ? 'ring-4 ring-offset-2 ring-gray-400 scale-110' : '']"
              :style="{ backgroundColor: preset.color }"
              :title="preset.label"
            />
          </div>
        </div>
      </div>
    </Transition>
    
    <div class="glass-card p-6 mb-4" style="height: 55%; flex-shrink: 0;">
      <div class="grid grid-cols-7 gap-2 mb-3 h-12">
        <div
          v-for="(day, index) in dayNames"
          :key="index"
          class="flex items-center justify-center text-lg font-bold text-gray-500 bg-white/40 rounded-xl"
          :class="[index === 0 || index === 6 ? 'text-gray-600 bg-gray-100/50' : '']"
        >
          {{ day }}
        </div>
      </div>
      
      <div class="grid grid-cols-7 gap-2" style="height: calc(100% - 56px);">
        <div
          v-for="(day, index) in store.calendarDays"
          :key="index"
          @click="selectDay(day)"
          @dblclick="handleDayDoubleClick(day)"
          @contextmenu="handleContextMenu($event, day)"
          class="rounded-xl flex flex-col items-center justify-start p-2.5 transition-all cursor-pointer relative group border"
          :class="[
            !day.isCurrentMonth ? 'bg-gray-50/50 text-gray-400 border-gray-100 hover:bg-gray-100/50' : 'border-gray-200 text-gray-800',
            day.isToday ? 'ring-2 ring-primary ring-offset-1' : '',
            isSelected(day) ? 'ring-2 ring-offset-2 shadow-lg' : '',
            index % 7 === 0 || index % 7 === 6 ? 'bg-gray-50/30' : ''
          ]"
          :style="{
            backgroundColor: day.events.length > 0 ? getEventColorForCellDay(day) : (isSelected(day) ? selectedDefaultColor : (index % 7 === 0 || index % 7 === 6 ? '#f9fafb' : '#ffffff')),
            color: isSelected(day) ? 'white' : '#374151',
            borderColor: isSelected(day) ? selectedDefaultColor : '#e5e7eb'
          }"
        >
          <span class="text-xl font-bold z-10">{{ day.date }}</span>
          
          <div v-if="day.events.length > 0" class="absolute bottom-1 left-1 right-1 z-10" :class="day.events.length === 1 ? '' : day.events.length === 2 ? 'grid grid-cols-2 gap-0.5' : 'grid grid-cols-3 gap-0.5'">
            <template v-for="(event, i) in topEventsByPriority(day.events)" :key="i">
              <span
                v-if="i < 3"
                class="text-[9px] leading-tight font-medium truncate px-1 py-px rounded text-center"
                :style="{ backgroundColor: (event as any).isImportant ? '#fef3c7' : getEventColorForCell([event]) + '60', color: '#374151' }"
                :title="event.title"
              >
                <span v-if="event.completed" class="text-green-600 mr-0.5">✓</span>
                {{ event.title.length > 5 ? event.title.slice(0, 5) + '…' : event.title }}
              </span>
            </template>
            <span v-if="day.events.length > 3" class="text-[8px] text-gray-400 text-center self-center">+{{ day.events.length - 3 }}</span>
          </div>
          
          <div 
            v-if="day.events.length > 0 && !isSelected(day)" 
            class="absolute top-1 right-1 z-10 flex gap-1"
          >
            <span 
              v-for="(event, i) in day.events.slice(0, 3)" 
              :key="i"
              class="w-2 h-2 rounded-full border border-gray-300"
              :style="{ backgroundColor: getEventColorForCell([event]) }"
            />
            <span v-if="day.events.length > 3" class="w-2 h-2 rounded-full bg-gray-200 border border-gray-300" />
          </div>
        </div>
      </div>
    </div>
    
    <div class="glass-card p-6 overflow-hidden flex flex-col" style="height: 35%; flex-shrink: 0;">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CalendarDays :size="20" class="text-primary" />
          </div>
          <div>
            <h2 class="text-xl font-bold text-gray-800">日程安排</h2>
            <p class="text-sm text-gray-500">{{ store.selectedDateFilteredEvents.length }} 个日程</p>
          </div>
        </div>
        
        <div class="flex items-center gap-3">
          <button
            @click="openEventModal()"
            class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white hover:bg-secondary transition-all font-medium text-base shadow-lg shadow-gray-400/50"
          >
            <Plus :size="18" />
            添加日程
          </button>
        </div>
      </div>
      
      <div v-if="store.selectedDateFilteredEvents.length === 0" class="flex-1 flex flex-col items-center justify-center text-gray-400">
        <CalendarIcon :size="48" class="mb-3 opacity-50" />
        <p class="text-base">今天没有日程安排</p>
        <p class="text-sm mt-1">双击或右键添加</p>
      </div>
      
      <div v-else class="flex-1 overflow-y-auto space-y-3 scrollbar-hide">
        <div
          v-for="event in store.selectedDateFilteredEvents"
          :key="event.id"
          class="p-3.5 rounded-xl transition-all cursor-pointer border-l-4"
          :class="[event.completed ? 'opacity-60' : '', (event as any).isImportant ? '' : 'hover:shadow-md']"
          :style="{ backgroundColor: getEventColorForCell([event]) + '50', borderLeftColor: getEventColorForCell([event]) }"
        >
          <div class="flex items-start gap-3">
            <button
              v-if="!(event as any).isImportant"
              @click.stop="toggleCompleted(event.id)"
              class="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all mt-0.5"
              :class="event.completed ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-gray-400'"
            >
              <Check v-if="event.completed" :size="12" class="text-white" />
            </button>
            <span v-if="(event as any).isImportant" class="w-5 h-5 flex-shrink-0 flex items-center justify-center mt-0.5">
              <Star :size="16" class="text-amber-600 fill-amber-600" />
            </span>
            <div class="flex-1 min-w-0" @click="(event as any).isImportant ? null : openEventModal(event)">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="text-base font-bold" :class="event.completed ? 'line-through text-gray-400' : 'text-gray-800'">{{ event.title }}</h3>
                <span
                  v-if="event.repeat && event.repeat !== 'none'"
                  class="flex-shrink-0 flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 text-xs font-medium"
                >
                  <Repeat :size="10" />
                  {{ getRepeatLabel(event.repeat) }}
                </span>
                <span
                  v-if="(event as any).isImportant"
                  class="flex-shrink-0 flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 text-xs font-medium"
                >
                  事件
                </span>
                <span
                  v-if="event.eventType"
                  class="flex-shrink-0 flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium"
                  :style="{ backgroundColor: calendarEventTypeColors[event.eventType] + '30', color: calendarEventTypeColors[event.eventType] }"
                >
                  <component :is="getEventTypeIcon(event.eventType)" :size="10" />
                  {{ getEventTypeLabel(event.eventType) }}
                </span>
              </div>
              <p v-if="event.description" class="text-sm text-gray-500 mt-1.5 line-clamp-2 flex items-start gap-1">
                <Clock :size="12" class="flex-shrink-0 mt-0.5 opacity-60" />
                {{ event.description }}
              </p>
              <div class="flex items-center gap-3 mt-2 text-xs text-gray-400">
                <span v-if="!(event as any).isImportant && !event.allDay">
                  <Clock :size="12" class="inline mr-1" />
                  {{ event.startTime?.split('T')[1]?.slice(0, 5) }}
                  <span v-if="event.endTime"> - {{ event.endTime?.split('T')[1]?.slice(0, 5) }}</span>
                </span>
                <span v-if="event.endDate && event.repeat && event.repeat !== 'none'" class="flex items-center gap-1">
                  至 {{ event.endDate }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <Teleport to="body">
      <div
        v-if="contextMenu.show"
        class="fixed z-[60] glass-card shadow-2xl py-2 min-w-[160px]"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      >
        <button
          @click="addEventFromContextMenu"
          class="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/30 transition-all"
        >
          <Plus :size="18" class="text-primary" />
          <span class="text-gray-700">添加日程</span>
        </button>
        <button
          @click="closeContextMenu"
          class="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/30 transition-all"
        >
          <X :size="18" class="text-gray-400" />
          <span class="text-gray-500">取消</span>
        </button>
      </div>
    </Teleport>
    
    <Teleport to="body">
      <div
        v-if="showEventModal"
        class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        @click.self="closeModal"
      >
        <div class="glass-card w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col animate-scale-in">
          <div class="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 class="text-2xl font-bold text-gray-800">{{ editingEvent ? '编辑日程' : '添加日程' }}</h2>
            <button @click="closeModal" class="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-all">
              <X :size="20" class="text-gray-500" />
            </button>
          </div>
          
          <div class="flex-1 overflow-y-auto p-6 space-y-5">
            <div>
              <label class="block text-base font-medium text-gray-700 mb-2">标题</label>
              <input
                v-model="newEvent.title"
                type="text"
                class="input-field text-lg"
                placeholder="输入日程标题"
                autofocus
              />
            </div>
            
            <div>
              <label class="block text-base font-medium text-gray-700 mb-2">描述</label>
              <textarea
                v-model="newEvent.description"
                class="input-field resize-none text-base"
                rows="3"
                placeholder="输入日程描述（可选）"
              />
            </div>
            
            <div class="flex gap-4">
              <div class="flex-1">
                <label class="block text-base font-medium text-gray-700 mb-2">开始时间</label>
                <input
                  v-model="newEvent.startTime"
                  type="datetime-local"
                  class="input-field text-base"
                />
              </div>
              <div class="flex-1">
                <label class="block text-base font-medium text-gray-700 mb-2">结束时间</label>
                <input
                  v-model="newEvent.endTime"
                  type="datetime-local"
                  class="input-field text-base"
                  :disabled="newEvent.allDay"
                />
              </div>
            </div>
            
            <div class="flex items-center gap-3">
              <input
                v-model="newEvent.allDay"
                type="checkbox"
                class="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label class="text-base font-medium text-gray-700">全天事件</label>
              <span class="text-sm text-gray-400">选择此项后将忽略时间设置</span>
            </div>
            
            <div>
              <label class="block text-base font-medium text-gray-700 mb-2">重复周期</label>
              <select v-model="newEvent.repeat" class="input-field text-base">
                <option v-for="option in repeatOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>
            
            <div v-if="newEvent.repeat && newEvent.repeat !== 'none'">
              <label class="block text-base font-medium text-gray-700 mb-2">结束日期（可选）</label>
              <input
                v-model="newEvent.endDate"
                type="date"
                class="input-field text-base"
              />
            </div>
            
            <div>
              <label class="block text-base font-medium text-gray-700 mb-2">事件类型</label>
              <div class="flex gap-2 flex-wrap">
                <button
                  v-for="option in eventTypeOptions"
                  :key="option.value"
                  @click="newEvent.eventType = option.value as CalendarEvent['eventType']; newEvent.color = option.color"
                  class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  :class="[newEvent.eventType === option.value ? 'text-white' : 'bg-white/50 text-gray-600 hover:bg-white/70']"
                  :style="newEvent.eventType === option.value ? { backgroundColor: option.color } : {}"
                >
                  <component :is="option.icon" :size="14" />
                  {{ option.label }}
                </button>
              </div>
            </div>
            
            <div>
              <label class="block text-base font-medium text-gray-700 mb-3">颜色标记</label>
              <div class="flex gap-3">
                <button
                  v-for="color in eventColors"
                  :key="color"
                  @click="newEvent.color = color"
                  class="w-10 h-10 rounded-full transition-all hover:scale-110"
                  :class="[newEvent.color === color ? 'ring-4 ring-offset-2 ring-gray-400 scale-110' : '']"
                  :style="{ backgroundColor: color }"
                />
              </div>
            </div>
          </div>
          
          <div class="flex gap-3 p-6 border-t border-gray-200">
            <button
              v-if="editingEvent"
              @click="deleteEvent"
              class="flex-1 px-6 py-3 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 transition-all font-medium"
            >
              删除
            </button>
            <button
              @click="closeModal"
              class="flex-1 px-6 py-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all font-medium"
            >
              取消
            </button>
            <button
              @click="saveEvent"
              :disabled="!newEvent.title.trim()"
              class="flex-1 px-6 py-3 rounded-xl bg-primary text-white hover:bg-secondary transition-all font-medium shadow-md shadow-gray-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ editingEvent ? '保存修改' : '添加日程' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>