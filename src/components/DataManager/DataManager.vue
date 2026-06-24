<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Download, Upload, RotateCcw, AlertCircle, CheckCircle, X, Lock, Unlock, Database, ChevronDown, ChevronUp, Zap, Activity, Shield, ArrowRight, BarChart3, PieChart, Target, Calendar, StickyNote, Bell, Star, Repeat, BookOpen, Timer } from 'lucide-vue-next'
import { useTodoStore } from '@/stores/todo'
import { useCalendarStore } from '@/stores/calendar'
import { useNotesStore } from '@/stores/notes'
import { useAlarmStore } from '@/stores/alarm'
import { useImportantStore } from '@/stores/important'
import { usePeriodStore } from '@/stores/period'
import { useScheduleStore } from '@/stores/schedule'
import { useSecureNotesStore } from '@/stores/secureNotes'
import { usePomodoroStore } from '@/stores/pomodoro'
import { encryptData, decryptData } from '@/utils/crypto'
import { compressData, decompressData } from '@/utils/storage'

const todoStore = useTodoStore()
const calendarStore = useCalendarStore()
const notesStore = useNotesStore()
const alarmStore = useAlarmStore()
const importantStore = useImportantStore()
const periodStore = usePeriodStore()
const scheduleStore = useScheduleStore()
const secureNotesStore = useSecureNotesStore()
const pomodoroStore = usePomodoroStore()

const showResetConfirm = ref(false)
const resetCountdown = ref(3)
const resetConfirmEnabled = ref(false)

const showImportModal = ref(false)
const importFile = ref<File | null>(null)
const importMessage = ref('')
const importSuccess = ref(false)
const importPassword = ref('')
const showImportPassword = ref(false)

const showExportModal = ref(false)
const exportPassword = ref('')
const exportConfirmPassword = ref('')
const exportEncrypt = ref(false)
const exportMessage = ref('')
const showExportMessage = ref(false)

const expandedSections = ref({
  overview: true,
  charts: false,
  stats: false,
  operations: true,
  guide: false
})

const isLoaded = ref(false)
const animatedNumbers = ref({
  total: 0,
  focus: 0,
  todos: 0,
  notes: 0
})

const hoveredPieSlice = ref<string | null>(null)
const hoveredCategory = ref<string | null>(null)
const tooltipVisible = ref(false)
const tooltipContent = ref('')
const tooltipPosition = ref({ x: 0, y: 0 })
const selectedCategory = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

onMounted(() => {
  setTimeout(() => {
    isLoaded.value = true
  }, 100)
  animateNumbers()
})

function animateNumbers() {
  const targets = {
    total: totalItems.value,
    focus: todayFocusMinutes.value,
    todos: completedTodos.value,
    notes: stats.value.notes + stats.value.secureNotes
  }
  
  const duration = 1500
  const startTime = Date.now()
  
  function animate() {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easeOut = 1 - Math.pow(1 - progress, 3)
    
    animatedNumbers.value.total = Math.round(targets.total * easeOut)
    animatedNumbers.value.focus = Math.round(targets.focus * easeOut)
    animatedNumbers.value.todos = Math.round(targets.todos * easeOut)
    animatedNumbers.value.notes = Math.round(targets.notes * easeOut)
    
    if (progress < 1) {
      requestAnimationFrame(animate)
    }
  }
  
  requestAnimationFrame(animate)
}

interface ExportData {
  version: string
  exportDate: string
  encrypted: boolean
  compressed?: boolean
  data?: string
  todos?: any[]
  calendarEvents?: any[]
  notes?: any[]
  alarms?: any[]
  importantEvents?: any[]
  periodEvents?: any[]
  scheduleCourses?: any[]
  algorithm?: string
  salt?: string
  iterations?: number
  iv?: string
  tag?: string
}

async function exportData() {
  const rawData = {
    todos: todoStore.todos,
    calendarEvents: calendarStore.events,
    notes: notesStore.notes,
    secureNotes: secureNotesStore.notes,
    alarms: alarmStore.alarms,
    importantEvents: importantStore.events,
    periodEvents: periodStore.periodEvents,
    scheduleCourses: scheduleStore.courses,
    scheduleOverrides: scheduleStore.overrides,
    pomodoroSettings: pomodoroStore.settings,
    pomodoroSessions: pomodoroStore.sessions
  }

  let exportData: ExportData = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    encrypted: false
  }

  if (exportEncrypt.value) {
    if (!exportPassword.value) {
      exportMessage.value = '请输入加密密码'
      showExportMessage.value = true
      setTimeout(() => { showExportMessage.value = false }, 3000)
      return
    }

    try {
      const compressed = await compressData(JSON.stringify(rawData))
      const encrypted = await encryptData(compressed, exportPassword.value)
      exportData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        encrypted: true,
        compressed: true,
        ...encrypted
      }
    } catch {
      exportMessage.value = '加密失败，请重试'
      showExportMessage.value = true
      setTimeout(() => { showExportMessage.value = false }, 3000)
      return
    }
  } else {
    try {
      const compressed = await compressData(JSON.stringify(rawData))
      exportData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        encrypted: false,
        compressed: true,
        data: compressed
      }
    } catch {
      exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        encrypted: false,
        ...rawData
      }
    }
  }

  const blob = new Blob([JSON.stringify(exportData)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const dateStr = new Date().toISOString().split('T')[0]
  a.download = `task_manager_backup_${dateStr}${exportEncrypt.value ? '_encrypted' : ''}.json`
  a.click()
  URL.revokeObjectURL(url)

  showExportModal.value = false
  exportPassword.value = ''
  exportConfirmPassword.value = ''
  exportEncrypt.value = false

  exportMessage.value = '数据导出成功！'
  showExportMessage.value = true
  setTimeout(() => { showExportMessage.value = false }, 3000)
}

let resetTimer: ReturnType<typeof setInterval> | null = null

function startResetCountdown() {
  showResetConfirm.value = true
  resetCountdown.value = 3
  resetConfirmEnabled.value = false

  if (resetTimer) {
    clearInterval(resetTimer)
  }

  resetTimer = setInterval(() => {
    resetCountdown.value--
    if (resetCountdown.value <= 0) {
      resetConfirmEnabled.value = true
      if (resetTimer) {
        clearInterval(resetTimer)
        resetTimer = null
      }
    }
  }, 1000)
}

function confirmReset() {
  if (!resetConfirmEnabled.value) return

  todoStore.todos = []
  calendarStore.events = []
  notesStore.notes = []
  alarmStore.alarms = []
  importantStore.events = []
  periodStore.periodEvents = []
  scheduleStore.courses = []
  secureNotesStore.notes = []
  pomodoroStore.sessions = []

  localStorage.removeItem('task_manager_todos')
  localStorage.removeItem('task_manager_events')
  localStorage.removeItem('task_manager_notes')
  localStorage.removeItem('task_manager_secure_notes')
  localStorage.removeItem('task_manager_alarms')
  localStorage.removeItem('task_manager_important_events')
  localStorage.removeItem('task_manager_period_events')
  localStorage.removeItem('task_manager_schedule_courses')
  localStorage.removeItem('task_manager_schedule_settings')
  localStorage.removeItem('task_manager_schedule_overrides')
  localStorage.removeItem('task_manager_calendar_colors')
  localStorage.removeItem('task_manager_pomodoro_settings')
  localStorage.removeItem('task_manager_pomodoro_sessions')
  localStorage.removeItem('task_manager_pomodoro_timer_state')

  showResetConfirm.value = false
  resetConfirmEnabled.value = false
}

function cancelReset() {
  showResetConfirm.value = false
  resetConfirmEnabled.value = false
  if (resetTimer) {
    clearInterval(resetTimer)
    resetTimer = null
  }
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    importFile.value = target.files[0]
    importPassword.value = ''
    showImportPassword.value = false
  }
}

async function importData() {
  if (!importFile.value) {
    importMessage.value = '请选择要导入的文件'
    importSuccess.value = false
    return
  }

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target?.result as string)

      if (!data.version) {
        importMessage.value = '无效的备份文件格式'
        importSuccess.value = false
        return
      }

      let importData: any = data

      if (data.encrypted) {
        if (!importPassword.value) {
          showImportPassword.value = true
          importMessage.value = '该文件已加密，请输入密码'
          importSuccess.value = false
          return
        }

        try {
          const decrypted = await decryptData({
            algorithm: data.algorithm,
            salt: data.salt,
            iterations: data.iterations,
            iv: data.iv,
            tag: data.tag,
            data: data.data
          }, importPassword.value)
          if (data.compressed) {
            importData = JSON.parse(await decompressData(decrypted))
          } else {
            importData = JSON.parse(decrypted)
          }
        } catch {
          importMessage.value = '密码错误或文件已损坏'
          importSuccess.value = false
          importPassword.value = ''
          return
        }
      } else if (data.compressed && data.data) {
        try {
          const decompressed = await decompressData(data.data)
          importData = JSON.parse(decompressed)
        } catch {
          importMessage.value = '文件解析失败，压缩数据可能已损坏'
          importSuccess.value = false
          return
        }
      }

      localStorage.removeItem('task_manager_todos')
      localStorage.removeItem('task_manager_events')
      localStorage.removeItem('task_manager_notes')
      localStorage.removeItem('task_manager_secure_notes')
      localStorage.removeItem('task_manager_alarms')
      localStorage.removeItem('task_manager_important_events')
      localStorage.removeItem('task_manager_period_events')
      localStorage.removeItem('task_manager_schedule_courses')
      localStorage.removeItem('task_manager_schedule_settings')
      localStorage.removeItem('task_manager_schedule_overrides')
      localStorage.removeItem('task_manager_calendar_colors')
      localStorage.removeItem('task_manager_pomodoro_settings')
      localStorage.removeItem('task_manager_pomodoro_sessions')

      if (importData.todos) {
        localStorage.setItem('task_manager_todos', JSON.stringify(importData.todos))
      }
      if (importData.calendarEvents) {
        localStorage.setItem('task_manager_events', JSON.stringify(importData.calendarEvents))
      }
      if (importData.notes) {
        localStorage.setItem('task_manager_notes', JSON.stringify(importData.notes))
      }
      if (importData.secureNotes) {
        localStorage.setItem('task_manager_secure_notes', JSON.stringify(importData.secureNotes))
      }
      if (importData.importantEvents) {
        const eventsWithColor = importData.importantEvents.map((event: any) => ({
          ...event,
          color: event.color || '#f3e8ff'
        }))
        localStorage.setItem('task_manager_important_events', JSON.stringify(eventsWithColor))
      }
      if (importData.periodEvents) {
        localStorage.setItem('task_manager_period_events', JSON.stringify(importData.periodEvents))
      }
      if (importData.scheduleCourses) {
        localStorage.setItem('task_manager_schedule_courses', JSON.stringify(importData.scheduleCourses))
      }
      if (importData.scheduleOverrides) {
        localStorage.setItem('task_manager_schedule_overrides', JSON.stringify(importData.scheduleOverrides))
      }
      if (importData.pomodoroSettings) {
        localStorage.setItem('task_manager_pomodoro_settings', JSON.stringify(importData.pomodoroSettings))
      }
      if (importData.pomodoroSessions) {
        localStorage.setItem('task_manager_pomodoro_sessions', JSON.stringify(importData.pomodoroSessions))
      }

      importMessage.value = '数据导入成功！页面将刷新'
      importSuccess.value = true

      setTimeout(() => {
        window.location.reload()
      }, 1500)

    } catch (error) {
      importMessage.value = '文件解析失败，请确保是有效的JSON文件'
      importSuccess.value = false
    }
  }
  reader.readAsText(importFile.value)
}

function closeImportModal() {
  showImportModal.value = false
  importFile.value = null
  importMessage.value = ''
  importSuccess.value = false
  importPassword.value = ''
  showImportPassword.value = false
}

function closeExportModal() {
  showExportModal.value = false
  exportPassword.value = ''
  exportConfirmPassword.value = ''
  exportEncrypt.value = false
}

function toggleSection(section: string) {
  expandedSections.value[section as keyof typeof expandedSections.value] = !expandedSections.value[section as keyof typeof expandedSections.value]
}

function showTooltip(e: MouseEvent, content: string) {
  tooltipContent.value = content
  tooltipPosition.value = { x: e.clientX, y: e.clientY }
  tooltipVisible.value = true
}

function hideTooltip() {
  tooltipVisible.value = false
}

function selectCategory(label: string) {
  selectedCategory.value = selectedCategory.value === label ? null : label
}

const stats = computed(() => ({
  todos: todoStore.todos.length,
  calendarEvents: calendarStore.events.length,
  notes: notesStore.notes.length,
  secureNotes: secureNotesStore.notes.length,
  alarms: alarmStore.alarms.length,
  importantEvents: importantStore.events.length,
  periodEvents: periodStore.periodEvents.length,
  scheduleCourses: scheduleStore.courses.length,
  pomodoroSessions: pomodoroStore.sessions.length
}))

const totalItems = computed(() => {
  return Object.values(stats.value).reduce((sum, val) => sum + val, 0)
})

const todayFocusMinutes = computed(() => pomodoroStore.todayFocusMinutes)
const todayCompletedCycles = computed(() => pomodoroStore.todayCompletedCycles)
const completedTodos = computed(() => todoStore.todos.filter(t => t.completed).length)

const pieData = computed(() => {
  const items = [
    { label: '待办', value: stats.value.todos, color: '#3b82f6' },
    { label: '日程', value: stats.value.calendarEvents, color: '#6366f1' },
    { label: '笔记', value: stats.value.notes, color: '#f59e0b' },
    { label: '加密笔记', value: stats.value.secureNotes, color: '#8b5cf6' },
    { label: '闹钟', value: stats.value.alarms, color: '#10b981' },
    { label: '事件', value: stats.value.importantEvents, color: '#f97316' },
    { label: '课程', value: stats.value.scheduleCourses, color: '#14b8a6' },
    { label: '其他', value: stats.value.periodEvents + stats.value.pomodoroSessions, color: '#94a3b8' },
  ].filter(i => i.value > 0)
  
  const total = items.reduce((sum, i) => sum + i.value, 0) || 1
  let currentAngle = 0
  return items.map(i => {
    const angle = (i.value / total) * 360
    const startAngle = currentAngle
    currentAngle += angle
    const midAngle = startAngle + angle / 2
    const percentage = Math.round((i.value / total) * 100)
    const isHighest = percentage === Math.max(...items.map(item => Math.round((item.value / total) * 100)))
    
    return { ...i, startAngle, angle, percentage, midAngle, isHighest }
  })
})

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = (angle - 90) * Math.PI / 180
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad)
  }
}

function describePieSlice(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, startAngle)
  const end = polarToCartesian(cx, cy, r, endAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`
}

const radarData = computed(() => {
  const maxVal = Math.max(
    stats.value.todos,
    stats.value.calendarEvents,
    stats.value.notes + stats.value.secureNotes,
    stats.value.alarms,
    stats.value.importantEvents,
    stats.value.scheduleCourses
  ) || 1
  
  return [
    { label: '待办', value: stats.value.todos, max: maxVal, color: '#3b82f6' },
    { label: '日程', value: stats.value.calendarEvents, max: maxVal, color: '#6366f1' },
    { label: '笔记', value: stats.value.notes + stats.value.secureNotes, max: maxVal, color: '#f59e0b' },
    { label: '闹钟', value: stats.value.alarms, max: maxVal, color: '#10b981' },
    { label: '事件', value: stats.value.importantEvents, max: maxVal, color: '#f97316' },
    { label: '课程', value: stats.value.scheduleCourses, max: maxVal, color: '#14b8a6' },
  ]
})

function getRadarPoint(index: number, total: number, value: number, max: number, radius: number) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2
  const r = (value / max) * radius
  return {
    x: 150 + r * Math.cos(angle),
    y: 150 + r * Math.sin(angle)
  }
}

const activityData = computed(() => {
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  return days.map((day, i) => ({
    day,
    value: Math.floor(Math.random() * 20) + 5,
    color: `hsl(${(i * 50) % 360}, 70%, 60%)`
  }))
})



</script>

<template>
  <div class="flex-1 flex flex-col gap-3 p-4 overflow-auto">
    <header class="flex items-center gap-3 mb-2 animate-fade-in">
      <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
        <Database class="text-white" :size="24" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-gray-800">数据管理</h1>
        <p class="text-sm text-gray-500">导出、导入、重置您的数据</p>
      </div>
    </header>

    <div class="glass-card p-4 animate-slide-up" :class="{ 'animate-slide-up': isLoaded }">
      <button @click="toggleSection('overview')" class="w-full flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <Activity :size="16" class="text-white" />
          </div>
          <div class="text-left">
            <h2 class="font-bold text-gray-800">数据概览</h2>
            <p class="text-xs text-gray-500">共 {{ animatedNumbers.total }} 条记录</p>
          </div>
        </div>
        <component :is="expandedSections.overview ? ChevronUp : ChevronDown" :size="20" class="text-gray-400" />
      </button>
      
      <Transition name="collapse">
        <div v-if="expandedSections.overview" class="mt-6">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="stat-card">
              <div class="stat-icon bg-red-100 text-red-600">
                <Timer :size="20" />
              </div>
              <div class="stat-info">
                <div class="stat-num">{{ animatedNumbers.focus }}</div>
                <div class="stat-unit">分钟</div>
              </div>
              <div class="stat-label">今日专注</div>
              <div class="stat-progress">
                <div class="stat-bar">
                  <div class="stat-fill bg-gradient-to-r from-red-400 to-red-500" :style="{ width: Math.min(100, (todayFocusMinutes / 120) * 100) + '%' }"></div>
                </div>
                <span class="stat-percent">{{ Math.round((todayFocusMinutes / 120) * 100) }}%</span>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon bg-orange-100 text-orange-600">
                <Target :size="20" />
              </div>
              <div class="stat-info">
                <div class="stat-num">{{ todayCompletedCycles }}</div>
                <div class="stat-unit">个</div>
              </div>
              <div class="stat-label">完成番茄</div>
              <div class="stat-progress">
                <div class="stat-bar">
                  <div class="stat-fill bg-gradient-to-r from-orange-400 to-orange-500" :style="{ width: Math.min(100, (todayCompletedCycles / 12) * 100) + '%' }"></div>
                </div>
                <span class="stat-percent">{{ Math.round((todayCompletedCycles / 12) * 100) }}%</span>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon bg-blue-100 text-blue-600">
                <Zap :size="20" />
              </div>
              <div class="stat-info">
                <div class="stat-num">{{ animatedNumbers.todos }}</div>
                <div class="stat-unit">/{{ stats.todos }}</div>
              </div>
              <div class="stat-label">待办完成</div>
              <div class="stat-progress">
                <div class="stat-bar">
                  <div class="stat-fill bg-gradient-to-r from-blue-400 to-blue-500" :style="{ width: Math.min(100, ((completedTodos / (stats.todos || 1)) * 100)) + '%' }"></div>
                </div>
                <span class="stat-percent">{{ Math.round((completedTodos / (stats.todos || 1)) * 100) }}%</span>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon bg-amber-100 text-amber-600">
                <StickyNote :size="20" />
              </div>
              <div class="stat-info">
                <div class="stat-num">{{ animatedNumbers.notes }}</div>
                <div class="stat-unit">条</div>
              </div>
              <div class="stat-label">笔记总数</div>
              <div class="stat-progress">
                <div class="stat-bar">
                  <div class="stat-fill bg-gradient-to-r from-amber-400 to-amber-500" :style="{ width: Math.min(100, ((stats.notes + stats.secureNotes) / 50) * 100) + '%' }"></div>
                </div>
                <span class="stat-percent">{{ Math.round(((stats.notes + stats.secureNotes) / 50) * 100) }}%</span>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <div class="glass-card p-4 animate-slide-up" style="animation-delay: 100ms">
      <button @click="toggleSection('charts')" class="w-full flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
            <BarChart3 :size="16" class="text-white" />
          </div>
          <div class="text-left">
            <h2 class="font-bold text-gray-800">数据可视化</h2>
            <p class="text-xs text-gray-500">图表展示数据分布</p>
          </div>
        </div>
        <component :is="expandedSections.charts ? ChevronUp : ChevronDown" :size="20" class="text-gray-400" />
      </button>
      
      <Transition name="collapse">
        <div v-if="expandedSections.charts" class="mt-6">
          <div class="grid grid-cols-1 gap-6 mb-6">
            <div class="chart-card">
              <h3 class="chart-title">数据占比</h3>
              <div class="pie-chart-wrapper">
                <svg class="pie-chart" viewBox="0 0 200 200">
                  <defs>
                    <filter id="pie-shadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.3" />
                    </filter>
                  </defs>
                  <g filter="url(#pie-shadow)">
                    <path 
                      v-for="(item, index) in pieData" 
                      :key="item.label" 
                      :d="describePieSlice(100, 100, 70, item.startAngle, item.startAngle + item.angle)" 
                      :fill="item.color" 
                      class="pie-slice" 
                      :class="{ 'pie-slice-hover': hoveredPieSlice === item.label, 'pie-slice-selected': selectedCategory === item.label }"
                      :style="{ animationDelay: `${index * 100}ms` }"
                      @mouseenter="hoveredPieSlice = item.label; showTooltip($event, `${item.label}: ${item.value} (${item.percentage}%)`)"
                      @mouseleave="hoveredPieSlice = null; hideTooltip()"
                      @click="selectCategory(item.label)"
                    ></path>
                  </g>
                  <circle cx="100" cy="100" r="50" fill="white"></circle>
                  <text x="100" y="95" text-anchor="middle" class="pie-center-num">{{ animatedNumbers.total }}</text>
                  <text x="100" y="115" text-anchor="middle" class="pie-center-label">总记录</text>
                </svg>
                <div class="pie-legend">
                  <div 
                    v-for="item in pieData" 
                    :key="item.label" 
                    class="legend-item" 
                    :class="{ 'legend-item-hover': hoveredPieSlice === item.label, 'legend-item-selected': selectedCategory === item.label }"
                    @mouseenter="hoveredPieSlice = item.label"
                    @mouseleave="hoveredPieSlice = null"
                    @click="selectCategory(item.label)"
                  >
                    <div class="legend-dot" :style="{ backgroundColor: item.color }"></div>
                    <span class="legend-label">{{ item.label }}</span>
                    <span class="legend-value">{{ item.percentage }}%</span>
                    <span v-if="item.isHighest" class="legend-highlight">最高</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div class="chart-card">
              <h3 class="chart-title">功能雷达图</h3>
              <div class="radar-wrapper">
                <svg viewBox="0 0 300 300" class="radar-chart">
                  <g v-for="level in 5" :key="level">
                    <polygon 
                      :points="radarData.map((d, i) => { const p = getRadarPoint(i, radarData.length, (level / 5) * d.max, d.max, 100); return `${p.x},${p.y}`; }).join(' ')" 
                      fill="none" stroke="#e2e8f0" stroke-width="1"
                    ></polygon>
                  </g>
                  <line 
                    v-for="(d, i) in radarData" 
                    :key="'line-' + i" 
                    x1="150" y1="150" 
                    :x2="getRadarPoint(i, radarData.length, d.max, d.max, 100).x" 
                    :y2="getRadarPoint(i, radarData.length, d.max, d.max, 100).y" 
                    stroke="#e2e8f0" stroke-width="1"
                  ></line>
                  <polygon 
                    :points="radarData.map((d, i) => { const p = getRadarPoint(i, radarData.length, d.value, d.max, 100); return `${p.x},${p.y}`; }).join(' ')" 
                    fill="rgba(139, 92, 246, 0.2)" stroke="#8b5cf6" stroke-width="2" class="radar-area"
                  ></polygon>
                  <circle 
                    v-for="(d, i) in radarData" 
                    :key="'point-' + i" 
                    :cx="getRadarPoint(i, radarData.length, d.value, d.max, 100).x" 
                    :cy="getRadarPoint(i, radarData.length, d.value, d.max, 100).y" 
                    r="4" :fill="d.color" class="radar-point"
                  ></circle>
                  <text 
                    v-for="(d, i) in radarData" 
                    :key="'label-' + i" 
                    :x="getRadarPoint(i, radarData.length, d.max, d.max, 120).x" 
                    :y="getRadarPoint(i, radarData.length, d.max, d.max, 120).y" 
                    text-anchor="middle" class="radar-label"
                  >{{ d.label }}</text>
                </svg>
              </div>
            </div>
            
            <div class="chart-card">
              <h3 class="chart-title">本周活跃度</h3>
              <div class="activity-chart">
                <div v-for="item in activityData" :key="item.day" class="activity-bar-wrapper">
                  <div class="activity-bar-container">
                    <div class="activity-bar" :style="{ height: (item.value / 25) * 100 + '%', backgroundColor: item.color, boxShadow: `0 4px 8px ${item.color}40` }">
                      <span class="activity-value">{{ item.value }}</span>
                    </div>
                  </div>
                  <span class="activity-label">{{ item.day }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="gauge-card compact">
              <div class="gauge-icon">
                <Target :size="18" />
              </div>
              <div class="gauge-label">待办完成率</div>
              <div class="gauge-ring">
                <svg viewBox="0 0 100 100" class="gauge-svg">
                  <circle cx="50" cy="50" r="35" fill="none" stroke="#e2e8f0" stroke-width="8"></circle>
                  <circle 
                    cx="50" cy="50" r="35" fill="none" :stroke="'#3b82f6'" stroke-width="8" stroke-linecap="round" 
                    :stroke-dasharray="`${(completedTodos / (stats.todos || 1)) * 220} 220`" 
                    transform="rotate(-90 50 50)" class="gauge-progress"
                  ></circle>
                  <text x="50" y="48" text-anchor="middle" class="gauge-value">{{ Math.round((completedTodos / (stats.todos || 1)) * 100) }}%</text>
                </svg>
              </div>
            </div>
            
            <div class="gauge-card compact">
              <div class="gauge-icon">
                <Timer :size="18" />
              </div>
              <div class="gauge-label">专注完成度</div>
              <div class="gauge-ring">
                <svg viewBox="0 0 100 100" class="gauge-svg">
                  <circle cx="50" cy="50" r="35" fill="none" stroke="#e2e8f0" stroke-width="8"></circle>
                  <circle 
                    cx="50" cy="50" r="35" fill="none" :stroke="'#ef4444'" stroke-width="8" stroke-linecap="round" 
                    :stroke-dasharray="`${(todayFocusMinutes / 120) * 220} 220`" 
                    transform="rotate(-90 50 50)" class="gauge-progress"
                  ></circle>
                  <text x="50" y="48" text-anchor="middle" class="gauge-value">{{ Math.round((todayFocusMinutes / 120) * 100) }}%</text>
                </svg>
              </div>
            </div>
          </div>

          
        </div>
      </Transition>
    </div>

    <div class="glass-card p-4 animate-slide-up" style="animation-delay: 200ms">
      <button @click="toggleSection('stats')" class="w-full flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
            <PieChart :size="16" class="text-white" />
          </div>
          <div class="text-left">
            <h2 class="font-bold text-gray-800">分类统计</h2>
            <p class="text-xs text-gray-500">各模块数据详情</p>
          </div>
        </div>
        <component :is="expandedSections.stats ? ChevronUp : ChevronDown" :size="20" class="text-gray-400" />
      </button>
      
      <Transition name="collapse">
        <div v-if="expandedSections.stats" class="mt-6">
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div class="mini-stat" style="--color: #3b82f6">
              <div class="mini-stat-icon"><Target :size="18" /></div>
              <div class="mini-stat-value">{{ stats.todos }}</div>
              <div class="mini-stat-label">待办</div>
            </div>
            <div class="mini-stat" style="--color: #6366f1">
              <div class="mini-stat-icon"><Calendar :size="18" /></div>
              <div class="mini-stat-value">{{ stats.calendarEvents }}</div>
              <div class="mini-stat-label">日程</div>
            </div>
            <div class="mini-stat" style="--color: #f59e0b">
              <div class="mini-stat-icon"><StickyNote :size="18" /></div>
              <div class="mini-stat-value">{{ stats.notes }}</div>
              <div class="mini-stat-label">笔记</div>
            </div>
            <div class="mini-stat" style="--color: #8b5cf6">
              <div class="mini-stat-icon"><Shield :size="18" /></div>
              <div class="mini-stat-value">{{ stats.secureNotes }}</div>
              <div class="mini-stat-label">加密笔记</div>
            </div>
            <div class="mini-stat" style="--color: #10b981">
              <div class="mini-stat-icon"><Bell :size="18" /></div>
              <div class="mini-stat-value">{{ stats.alarms }}</div>
              <div class="mini-stat-label">闹钟</div>
            </div>
            <div class="mini-stat" style="--color: #f97316">
              <div class="mini-stat-icon"><Star :size="18" /></div>
              <div class="mini-stat-value">{{ stats.importantEvents }}</div>
              <div class="mini-stat-label">事件</div>
            </div>
            <div class="mini-stat" style="--color: #ec4899">
              <div class="mini-stat-icon"><Repeat :size="18" /></div>
              <div class="mini-stat-value">{{ stats.periodEvents }}</div>
              <div class="mini-stat-label">周期</div>
            </div>
            <div class="mini-stat" style="--color: #14b8a6">
              <div class="mini-stat-icon"><BookOpen :size="18" /></div>
              <div class="mini-stat-value">{{ stats.scheduleCourses }}</div>
              <div class="mini-stat-label">课程</div>
            </div>
            <div class="mini-stat" style="--color: #ef4444">
              <div class="mini-stat-icon"><Timer :size="18" /></div>
              <div class="mini-stat-value">{{ stats.pomodoroSessions }}</div>
              <div class="mini-stat-label">番茄记录</div>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <div class="glass-card p-4 animate-slide-up" style="animation-delay: 300ms">
      <button @click="toggleSection('operations')" class="w-full flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
            <Zap :size="16" class="text-white" />
          </div>
          <div class="text-left">
            <h2 class="font-bold text-gray-800">数据操作</h2>
            <p class="text-xs text-gray-500">导出、导入、重置</p>
          </div>
        </div>
        <component :is="expandedSections.operations ? ChevronUp : ChevronDown" :size="20" class="text-gray-400" />
      </button>
      
      <Transition name="collapse">
        <div v-if="expandedSections.operations" class="mt-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button @click="showExportModal = true" class="op-card export-card group">
              <div class="op-card-icon">
                <Download :size="28" class="text-white" />
              </div>
              <h3 class="op-card-title">导出数据</h3>
              <p class="op-card-desc">备份为JSON文件</p>
              <ArrowRight :size="16" class="op-card-arrow" />
            </button>
            
            <button @click="showImportModal = true" class="op-card import-card group">
              <div class="op-card-icon">
                <Upload :size="28" class="text-white" />
              </div>
              <h3 class="op-card-title">导入数据</h3>
              <p class="op-card-desc">从文件恢复数据</p>
              <ArrowRight :size="16" class="op-card-arrow" />
            </button>
            
            <button @click="startResetCountdown" class="op-card reset-card group">
              <div class="op-card-icon">
                <RotateCcw :size="28" class="text-white" />
              </div>
              <h3 class="op-card-title">重置数据</h3>
              <p class="op-card-desc">清空所有数据</p>
              <ArrowRight :size="16" class="op-card-arrow" />
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <div class="glass-card p-4 animate-slide-up" style="animation-delay: 400ms">
      <button @click="toggleSection('guide')" class="w-full flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
            <Shield :size="16" class="text-white" />
          </div>
          <div class="text-left">
            <h2 class="font-bold text-gray-800">安全说明</h2>
            <p class="text-xs text-gray-500">数据保护与使用提示</p>
          </div>
        </div>
        <component :is="expandedSections.guide ? ChevronUp : ChevronDown" :size="20" class="text-gray-400" />
      </button>
      
      <Transition name="collapse">
        <div v-if="expandedSections.guide" class="mt-6 space-y-4">
          <div class="guide-card">
            <div class="guide-card-icon bg-blue-100 text-blue-600">
              <Lock :size="18" />
            </div>
            <div>
              <h4 class="font-medium text-gray-800">加密导出</h4>
              <p class="text-xs text-gray-500">使用AES-GCM-256算法加密，配合PBKDF2密钥派生，确保数据安全</p>
            </div>
          </div>
          <div class="guide-card">
            <div class="guide-card-icon bg-green-100 text-green-600">
              <Shield :size="18" />
            </div>
            <div>
              <h4 class="font-medium text-gray-800">密码保护</h4>
              <p class="text-xs text-gray-500">加密文件需要正确密码才能解密，密码丢失将无法恢复数据</p>
            </div>
          </div>
          <div class="guide-card">
            <div class="guide-card-icon bg-red-100 text-red-600">
              <AlertCircle :size="18" />
            </div>
            <div>
              <h4 class="font-medium text-gray-800">重置保护</h4>
              <p class="text-xs text-gray-500">重置操作需要3秒倒计时确认，防止误操作导致数据丢失</p>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <Transition name="fade">
      <div v-if="showExportMessage" class="fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-green-500 text-white shadow-lg animate-slide-in">
        <CheckCircle :size="18" />
        <span class="text-sm font-medium">{{ exportMessage }}</span>
      </div>
    </Transition>
    
    <Teleport to="body">
      <div v-if="showResetConfirm" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click.self="cancelReset">
        <div class="glass-card w-full max-w-sm p-6 animate-scale-in">
          <div class="flex flex-col items-center text-center">
            <div class="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertCircle :size="28" class="text-red-500" />
            </div>
            <h2 class="text-xl font-bold text-gray-800 mb-2">确认重置数据？</h2>
            <p class="text-gray-500 text-sm mb-6">此操作将清空所有数据，已导出的文件不会受影响</p>
            <div class="flex items-center gap-4 w-full">
              <button @click="cancelReset" class="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all font-medium">取消</button>
              <button @click="confirmReset" :disabled="!resetConfirmEnabled" class="flex-1 px-4 py-2.5 rounded-xl font-medium transition-all" :class="resetConfirmEnabled ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'">
                {{ resetConfirmEnabled ? '确认重置' : `请等待 ${resetCountdown} 秒` }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    
    <Teleport to="body">
      <div v-if="showExportModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click.self="closeExportModal">
        <div class="glass-card w-full max-w-md p-6 animate-scale-in">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-gray-800">导出数据</h2>
            <button @click="closeExportModal" class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
              <X :size="18" class="text-gray-500" />
            </button>
          </div>
          
          <div class="space-y-4">
            <div class="flex items-center justify-between p-4 rounded-xl bg-gray-50">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full flex items-center justify-center" :class="exportEncrypt ? 'bg-purple-100' : 'bg-gray-200'">
                  <Lock v-if="exportEncrypt" :size="20" class="text-purple-600"></Lock>
                  <Unlock v-else :size="20" class="text-gray-500"></Unlock>
                </div>
                <div>
                  <p class="font-medium text-gray-800">{{ exportEncrypt ? '加密导出' : '明文导出' }}</p>
                  <p class="text-sm text-gray-500">{{ exportEncrypt ? '使用AES-GCM-256加密保护数据' : '数据以明文形式保存' }}</p>
                </div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="exportEncrypt" class="sr-only peer">
                <div class="w-12 h-6 rounded-full bg-gray-200 peer-checked:bg-purple-500 transition-colors"></div>
                <div class="absolute left-1 top-1 w-4 h-4 rounded-full bg-white shadow peer-checked:left-7 transition-transform"></div>
              </label>
            </div>
            
            <div v-if="exportEncrypt" class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">加密密码</label>
                <input type="password" v-model="exportPassword" placeholder="设置加密密码" class="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">确认密码</label>
                <input type="password" v-model="exportConfirmPassword" placeholder="再次输入密码" class="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all">
              </div>
            </div>
            
            <div class="flex items-center gap-3 pt-4">
              <button @click="closeExportModal" class="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all font-medium">取消</button>
              <button @click="exportData" class="flex-1 px-4 py-2.5 rounded-xl bg-purple-500 text-white hover:bg-purple-600 transition-all font-medium">导出</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    
    <Teleport to="body">
      <div v-if="showImportModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click.self="closeImportModal">
        <div class="glass-card w-full max-w-md p-6 animate-scale-in">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-gray-800">导入数据</h2>
            <button @click="closeImportModal" class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
              <X :size="18" class="text-gray-500" />
            </button>
          </div>
          
          <div class="space-y-4">
            <div class="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-purple-500 transition-colors cursor-pointer" @click="fileInput?.click()">
              <Upload :size="32" class="mx-auto text-gray-400 mb-2" />
              <p class="text-sm text-gray-500">点击选择备份文件</p>
              <p class="text-xs text-gray-400 mt-1">支持 .json 格式</p>
              <input type="file" ref="fileInput" accept=".json" class="hidden" @change="handleFileSelect">
            </div>
            
            <div v-if="importFile" class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div class="flex items-center gap-2">
                <Database :size="16" class="text-gray-500" />
                <span class="text-sm text-gray-700">{{ importFile.name }}</span>
              </div>
              <button @click="importFile = null" class="text-gray-400 hover:text-gray-600">
                <X :size="16" />
              </button>
            </div>
            
            <div v-if="showImportPassword" class="space-y-2">
              <label class="block text-sm font-medium text-gray-700">文件密码</label>
              <input type="password" v-model="importPassword" placeholder="输入加密密码" class="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all">
            </div>
            
            <div v-if="importMessage" class="p-3 rounded-xl text-sm" :class="importSuccess ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'">
              {{ importMessage }}
            </div>
            
            <div class="flex items-center gap-3 pt-4">
              <button @click="closeImportModal" class="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all font-medium">取消</button>
              <button @click="importData" :disabled="!importFile" class="flex-1 px-4 py-2.5 rounded-xl font-medium transition-all" :class="importFile ? 'bg-purple-500 text-white hover:bg-purple-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'">导入</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    
    <Teleport to="body">
      <div v-if="tooltipVisible" class="fixed z-50 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg animate-fade-in" :style="{ left: tooltipPosition.x + 'px', top: tooltipPosition.y + 'px' }">
        {{ tooltipContent }}
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.glass-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 16px;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.04);
}

.animate-fade-in {
  animation: fadeIn 0.5s ease-out;
}

.animate-slide-up {
  animation: slideUp 0.5s ease-out;
}

.animate-scale-in {
  animation: scaleIn 0.3s ease-out;
}

.animate-slide-in {
  animation: slideIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.3s ease;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
}

.collapse-enter-to,
.collapse-leave-from {
  max-height: 1000px;
}

.stat-card {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  padding: 12px;
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.stat-info {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.stat-num {
  font-size: 28px;
  font-weight: bold;
  color: #1e293b;
}

.stat-unit {
  font-size: 14px;
  color: #64748b;
}

.stat-label {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}

.stat-progress {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-bar {
  flex: 1;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}

.stat-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.stat-percent {
  font-size: 12px;
  color: #64748b;
  min-width: 36px;
  text-align: right;
}

.chart-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 16px;
}

.pie-chart-wrapper {
  display: flex;
  align-items: center;
  gap: 20px;
}

.pie-chart {
  width: 160px;
  height: 160px;
}

.pie-slice {
  transition: transform 0.3s ease, opacity 0.3s ease;
  cursor: pointer;
}

.pie-slice:hover {
  transform: scale(1.05);
  transform-origin: 100px 100px;
  opacity: 0.9;
}

.pie-slice-selected {
  filter: brightness(1.1);
}

.pie-center-num {
  font-size: 24px;
  font-weight: bold;
  fill: #1e293b;
}

.pie-center-label {
  font-size: 12px;
  fill: #64748b;
}

.pie-legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 0.2s ease;
  cursor: pointer;
}

.legend-item:hover {
  background: #f8fafc;
}

.legend-item-selected {
  background: #ede9fe;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-label {
  flex: 1;
  font-size: 12px;
  color: #475569;
}

.legend-value {
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
}

.legend-highlight {
  font-size: 10px;
  color: #f97316;
  background: #fff7ed;
  padding: 1px 4px;
  border-radius: 4px;
}

.radar-wrapper {
  display: flex;
  justify-content: center;
}

.radar-chart {
  width: 280px;
  height: 280px;
}

.radar-area {
  transition: opacity 0.3s ease;
}

.radar-point {
  transition: r 0.3s ease;
}

.radar-label {
  font-size: 12px;
  fill: #475569;
}

.activity-chart {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 160px;
  padding-top: 20px;
}

.activity-bar-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.activity-bar-container {
  width: 24px;
  height: 120px;
  background: #f1f5f9;
  border-radius: 12px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}

.activity-bar {
  width: 100%;
  border-radius: 12px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 4px;
  transition: height 0.5s ease;
}

.activity-value {
  font-size: 10px;
  color: white;
  font-weight: 600;
}

.activity-label {
  font-size: 11px;
  color: #64748b;
}

.gauge-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.gauge-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
}

.gauge-label {
  font-size: 12px;
  color: #64748b;
}

.gauge-ring {
  width: 100px;
  height: 100px;
}

.gauge-svg {
  width: 100%;
  height: 100%;
}

.gauge-progress {
  transition: stroke-dasharray 0.8s ease;
}

.gauge-value {
  font-size: 18px;
  font-weight: bold;
  fill: #1e293b;
}

.gauge-card.compact {
  padding: 16px;
  gap: 6px;
}

.gauge-card.compact .gauge-icon {
  width: 28px;
  height: 28px;
}

.gauge-card.compact .gauge-ring {
  width: 80px;
  height: 80px;
}

.gauge-card.compact .gauge-label {
  font-size: 11px;
}

.gauge-card.compact .gauge-value {
  font-size: 16px;
}

.mini-stat {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: transform 0.2s ease;
}

.mini-stat:hover {
  transform: translateY(-2px);
}

.mini-stat-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--color);
  opacity: 0.1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color);
}

.mini-stat-value {
  font-size: 20px;
  font-weight: bold;
  color: #1e293b;
}

.mini-stat-label {
  font-size: 10px;
  color: #64748b;
}

.op-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  position: relative;
  overflow: hidden;
}

.op-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
}

.op-card-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.export-card .op-card-icon {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
}

.import-card .op-card-icon {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.reset-card .op-card-icon {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.op-card-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.op-card-desc {
  font-size: 12px;
  color: #64748b;
}

.op-card-arrow {
  position: absolute;
  right: 16px;
  top: 16px;
  color: #94a3b8;
  transition: transform 0.3s ease;
}

.op-card:hover .op-card-arrow {
  transform: translateX(4px);
}

.guide-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 12px;
}

.guide-card-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.guide-card h4 {
  font-size: 13px;
}

.guide-card p {
  font-size: 11px;
}
</style>