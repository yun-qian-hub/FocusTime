<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Download, Upload, RotateCcw, AlertCircle, CheckCircle, X, Lock, Unlock, Database, ChevronDown, ChevronUp, Zap, Shield, ArrowRight, PieChart, Target, Calendar, StickyNote, Bell, Star, BookOpen } from 'lucide-vue-next'
import { useTodoStore } from '@/stores/todo'
import { useCalendarStore } from '@/stores/calendar'
import { useNotesStore } from '@/stores/notes'
import { useAlarmStore } from '@/stores/alarm'
import { useImportantStore } from '@/stores/important'
import { usePlanStore } from '@/stores/plan'
import { useScheduleStore } from '@/stores/schedule'
import { useSecureNotesStore } from '@/stores/secureNotes'
import { encryptData, decryptData } from '@/utils/crypto'
import { compressData, decompressData } from '@/utils/storage'

const todoStore = useTodoStore()
const calendarStore = useCalendarStore()
const notesStore = useNotesStore()
const alarmStore = useAlarmStore()
const importantStore = useImportantStore()
const planStore = usePlanStore()
const scheduleStore = useScheduleStore()
const secureNotesStore = useSecureNotesStore()

// Reset
const showResetConfirm = ref(false)
const resetCountdown = ref(3)
const resetConfirmEnabled = ref(false)

// Import
const showImportModal = ref(false)
const importFile = ref<File | null>(null)
const importMessage = ref('')
const importSuccess = ref(false)
const importPassword = ref('')
const showImportPassword = ref(false)

// Export
const showExportModal = ref(false)
const exportPassword = ref('')
const exportConfirmPassword = ref('')
const exportEncrypt = ref(false)
const exportMessage = ref('')
const showExportMessage = ref(false)

const expandedSections = ref({
  overview: true,
  operations: true,
  guide: false
})

const isLoaded = ref(false)
const animatedTotal = ref(0)
const hoveredPieSlice = ref<string | null>(null)

let animationFrameId: number | null = null
let resetTimer: ReturnType<typeof setInterval> | null = null
const tooltipVisible = ref(false)
const tooltipContent = ref('')
const tooltipPosition = ref({ x: 0, y: 0 })
const fileInput = ref<HTMLInputElement | null>(null)

onMounted(() => {
  setTimeout(() => { isLoaded.value = true }, 100)
  animateTotal()
})

function animateTotal() {
  const target = totalItems.value
  const duration = 1000
  const startTime = Date.now()
  function animate() {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easeOut = 1 - Math.pow(1 - progress, 3)
    animatedTotal.value = Math.round(target * easeOut)
    if (progress < 1) {
      animationFrameId = requestAnimationFrame(animate)
    } else {
      animationFrameId = null
    }
  }
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  animationFrameId = requestAnimationFrame(animate)
}

// ===== Stats =====
const stats = computed(() => ({
  todos: todoStore.todos.length,
  calendarEvents: calendarStore.events.length,
  notes: notesStore.notes.length,
  secureNotes: secureNotesStore.notes.length,
  alarms: alarmStore.alarms.length,
  importantEvents: importantStore.events.length,
  planItems: planStore.items.length,
  scheduleCourses: scheduleStore.courses.length
}))

const totalItems = computed(() => Object.values(stats.value).reduce((sum, val) => sum + val, 0))

const statModules = computed(() => [
  { label: '待办', value: stats.value.todos, icon: Target, color: '#3b82f6' },
  { label: '日程', value: stats.value.calendarEvents, icon: Calendar, color: '#6366f1' },
  { label: '笔记', value: stats.value.notes, icon: StickyNote, color: '#f59e0b' },
  { label: '加密', value: stats.value.secureNotes, icon: Shield, color: '#8b5cf6' },
  { label: '闹钟', value: stats.value.alarms, icon: Bell, color: '#10b981' },
  { label: '事件', value: stats.value.importantEvents, icon: Star, color: '#f97316' },
  { label: '计划', value: stats.value.planItems, icon: BookOpen, color: '#ec4899' },
  { label: '课表', value: stats.value.scheduleCourses, icon: BookOpen, color: '#14b8a6' },
])

// ===== 饼图数据 =====
const pieData = computed(() => {
  const items = [
    { label: '待办', value: stats.value.todos, color: '#3b82f6' },
    { label: '日程', value: stats.value.calendarEvents, color: '#6366f1' },
    { label: '笔记', value: stats.value.notes, color: '#f59e0b' },
    { label: '加密笔记', value: stats.value.secureNotes, color: '#8b5cf6' },
    { label: '闹钟', value: stats.value.alarms, color: '#10b981' },
    { label: '事件', value: stats.value.importantEvents, color: '#f97316' },
    { label: '课程', value: stats.value.scheduleCourses, color: '#14b8a6' },
    { label: '计划', value: stats.value.planItems, color: '#ec4899' },
  ].filter(i => i.value > 0)

  const total = items.reduce((sum, i) => sum + i.value, 0) || 1
  let currentAngle = 0
  return items.map(i => {
    const angle = (i.value / total) * 360
    const startAngle = currentAngle
    currentAngle += angle
    const midAngle = startAngle + angle / 2
    const percentage = Math.round((i.value / total) * 100)
    return { ...i, startAngle, angle, percentage, midAngle }
  })
})

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = (angle - 90) * Math.PI / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function describePieSlice(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, startAngle)
  const end = polarToCartesian(cx, cy, r, endAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`
}

// ===== 本周活跃度 =====
function getWeekDays(): { label: string; dateStr: string }[] {
  const days = ['一', '二', '三', '四', '五', '六', '日']
  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  monday.setHours(0, 0, 0, 0)

  return days.map((label, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return { label: `周${label}`, dateStr: d.toISOString().split('T')[0] }
  })
}

function countByCreatedAt(items: { createdAt?: string }[], dateStr: string): number {
  return items.filter(item => item.createdAt && item.createdAt.startsWith(dateStr)).length
}

function countImportantByDate(items: { date?: string }[], dateStr: string): number {
  return items.filter(item => item.date === dateStr).length
}

function countCalendarByDate(items: { startTime?: string }[], dateStr: string): number {
  return items.filter(item => item.startTime && item.startTime.startsWith(dateStr)).length
}

const weeklyActivity = computed(() => {
  const weekDays = getWeekDays()
  const modules = [
    { key: 'todos', label: '待办', color: '#3b82f6', items: todoStore.todos },
    { key: 'calendar', label: '日程', color: '#6366f1', items: calendarStore.events },
    { key: 'notes', label: '笔记', color: '#f59e0b', items: notesStore.notes },
    { key: 'important', label: '事件', color: '#f97316', items: importantStore.events },
    { key: 'plan', label: '计划', color: '#ec4899', items: planStore.items },
  ]

  const days = weekDays.map(day => {
    const counts: Record<string, number> = {}
    modules.forEach(m => {
      if (m.key === 'important') {
        counts[m.key] = countImportantByDate(m.items, day.dateStr)
      } else if (m.key === 'calendar') {
        counts[m.key] = countCalendarByDate(m.items, day.dateStr)
      } else {
        counts[m.key] = countByCreatedAt(m.items, day.dateStr)
      }
    })
    return { ...day, counts }
  })

  return { days, modules }
})

const maxActivityValue = computed(() => {
  let max = 0
  weeklyActivity.value.days.forEach(day => {
    const total = Object.values(day.counts).reduce((s: number, v: number) => s + v, 0)
    if (total > max) max = total
  })
  return Math.max(max, 1)
})

const weeklyTotal = computed(() => {
  let total = 0
  weeklyActivity.value.days.forEach(day => {
    total += Object.values(day.counts).reduce((s: number, v: number) => s + v, 0)
  })
  return total
})

function showTooltip(e: MouseEvent, content: string) {
  tooltipContent.value = content
  tooltipPosition.value = { x: e.clientX, y: e.clientY }
  tooltipVisible.value = true
}

function hideTooltip() { tooltipVisible.value = false }

function toggleSection(section: string) {
  expandedSections.value[section as keyof typeof expandedSections.value] =
    !expandedSections.value[section as keyof typeof expandedSections.value]
}

// ===== Export / Import / Reset (keep unchanged) =====
interface ExportData {
  version: string; exportDate: string; encrypted: boolean; compressed?: boolean
  data?: string; todos?: any[]; calendarEvents?: any[]; notes?: any[]; alarms?: any[]
  importantEvents?: any[]; planItems?: any[]; scheduleCourses?: any[]
  algorithm?: string; salt?: string; iterations?: number; iv?: string; tag?: string
}

async function exportData() {
  const rawData = {
    todos: todoStore.todos,
    calendarEvents: calendarStore.events,
    notes: notesStore.notes,
    secureNotes: secureNotesStore.notes,
    alarms: alarmStore.alarms,
    importantEvents: importantStore.events,
    planItems: planStore.items,
    scheduleCourses: scheduleStore.courses,
    scheduleOverrides: scheduleStore.overrides
  }
  let exportData: ExportData = { version: '2.0', exportDate: new Date().toISOString(), encrypted: false }
  if (exportEncrypt.value) {
    if (!exportPassword.value) { exportMessage.value = '请输入加密密码'; showExportMessage.value = true; setTimeout(() => { showExportMessage.value = false }, 3000); return }
    try {
      const compressed = await compressData(JSON.stringify(rawData))
      const encrypted = await encryptData(compressed, exportPassword.value)
      exportData = { version: '2.0', exportDate: new Date().toISOString(), encrypted: true, compressed: true, ...encrypted }
    } catch {
      exportMessage.value = '加密失败，请重试'; showExportMessage.value = true; setTimeout(() => { showExportMessage.value = false }, 3000); return
    }
  } else {
    try {
      const compressed = await compressData(JSON.stringify(rawData))
      exportData = { version: '2.0', exportDate: new Date().toISOString(), encrypted: false, compressed: true, data: compressed }
    } catch {
      exportData = { version: '1.0', exportDate: new Date().toISOString(), encrypted: false, ...rawData }
    }
  }
  const blob = new Blob([JSON.stringify(exportData)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url
  a.download = `task_manager_backup_${new Date().toISOString().split('T')[0]}${exportEncrypt.value ? '_encrypted' : ''}.json`
  a.click(); URL.revokeObjectURL(url)
  showExportModal.value = false; exportPassword.value = ''; exportConfirmPassword.value = ''; exportEncrypt.value = false
  exportMessage.value = '数据导出成功！'; showExportMessage.value = true; setTimeout(() => { showExportMessage.value = false }, 3000)
}

function startResetCountdown() {
  showResetConfirm.value = true; resetCountdown.value = 3; resetConfirmEnabled.value = false
  if (resetTimer) clearInterval(resetTimer)
  resetTimer = setInterval(() => {
    resetCountdown.value--
    if (resetCountdown.value <= 0) { resetConfirmEnabled.value = true; if (resetTimer) { clearInterval(resetTimer); resetTimer = null } }
  }, 1000)
}

function confirmReset() {
  if (!resetConfirmEnabled.value) return
  todoStore.todos = []; calendarStore.events = []; notesStore.notes = []
  alarmStore.alarms = []; importantStore.events = []; planStore.items = []
  scheduleStore.courses = []; secureNotesStore.notes = []
  const keys = ['task_manager_todos','task_manager_events','task_manager_notes','task_manager_secure_notes','task_manager_alarms','task_manager_important_events','task_manager_period_events','task_manager_schedule_courses','task_manager_schedule_settings','task_manager_schedule_overrides','task_manager_calendar_colors','task_manager_pomodoro_settings','task_manager_pomodoro_sessions','task_manager_pomodoro_timer_state','pinia_todo','pinia_calendar','pinia_notes','pinia_secureNotes','pinia_alarm','pinia_important','pinia_plan','pinia_schedule','pinia_pomodoro']
  keys.forEach(k => localStorage.removeItem(k))
  showResetConfirm.value = false; resetConfirmEnabled.value = false
}

function cancelReset() { showResetConfirm.value = false; resetConfirmEnabled.value = false; if (resetTimer) { clearInterval(resetTimer); resetTimer = null } }

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) { importFile.value = target.files[0]; importPassword.value = ''; showImportPassword.value = false }
}

async function importData() {
  if (!importFile.value) { importMessage.value = '请选择要导入的文件'; importSuccess.value = false; return }
  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target?.result as string)
      if (!data.version) { importMessage.value = '无效的备份文件格式'; importSuccess.value = false; return }
      let importData: any = data
      if (data.encrypted) {
        if (!importPassword.value) { showImportPassword.value = true; importMessage.value = '该文件已加密，请输入密码'; importSuccess.value = false; return }
        try {
          const decrypted = await decryptData({ algorithm: data.algorithm, salt: data.salt, iterations: data.iterations, iv: data.iv, tag: data.tag, data: data.data }, importPassword.value)
          if (data.compressed) { importData = JSON.parse(await decompressData(decrypted)) } else { importData = JSON.parse(decrypted) }
        } catch { importMessage.value = '密码错误或文件已损坏'; importSuccess.value = false; importPassword.value = ''; return }
      } else if (data.compressed && data.data) {
        try { importData = JSON.parse(await decompressData(data.data)) } catch { importMessage.value = '文件解析失败，压缩数据可能已损坏'; importSuccess.value = false; return }
      }

      const oldKeys = ['task_manager_todos','task_manager_events','task_manager_notes','task_manager_secure_notes','task_manager_alarms','task_manager_important_events','task_manager_plan_items','task_manager_period_events','task_manager_schedule_courses','task_manager_schedule_settings','task_manager_schedule_overrides','task_manager_calendar_colors','task_manager_pomodoro_settings','task_manager_pomodoro_sessions','pinia_todo','pinia_calendar','pinia_notes','pinia_secureNotes','pinia_alarm','pinia_important','pinia_plan','pinia_schedule','pinia_pomodoro']
      oldKeys.forEach(k => localStorage.removeItem(k))

      if (importData.todos) { localStorage.setItem('task_manager_todos', JSON.stringify(importData.todos)); localStorage.setItem('pinia_todo', JSON.stringify({ todos: importData.todos, filteredTodos: 'all', searchQuery: '' })) }
      if (importData.calendarEvents) { localStorage.setItem('task_manager_events', JSON.stringify(importData.calendarEvents)); localStorage.setItem('pinia_calendar', JSON.stringify({ events: importData.calendarEvents, currentDate: new Date().toISOString(), selectedDate: new Date().toISOString(), showCompleted: true })) }
      if (importData.notes) { localStorage.setItem('task_manager_notes', JSON.stringify(importData.notes)); localStorage.setItem('pinia_notes', JSON.stringify({ notes: importData.notes, selectedNoteId: null })) }
      if (importData.secureNotes) { localStorage.setItem('task_manager_secure_notes', JSON.stringify(importData.secureNotes)); localStorage.setItem('pinia_secureNotes', JSON.stringify({ notes: importData.secureNotes, selectedNoteId: null, unlockedContent: '', unlockedPassword: '' })) }
      if (importData.importantEvents) { const ew = importData.importantEvents.map((e: any) => ({ ...e, color: e.color || '#f3e8ff' })); localStorage.setItem('task_manager_important_events', JSON.stringify(ew)); localStorage.setItem('pinia_important', JSON.stringify({ events: ew })) }
      if (importData.planItems) { localStorage.setItem('task_manager_plan_items', JSON.stringify(importData.planItems)); localStorage.setItem('pinia_plan', JSON.stringify({ items: importData.planItems, statuses: ['待开始', '进行中', '已完成'] })) }
      if (importData.periodEvents) { const m = importData.periodEvents.map((e: any) => ({ ...e, planType: 'period', priority: 'medium', status: e.completed ? 'done' : 'active', syncToCalendar: true })); localStorage.setItem('task_manager_plan_items', JSON.stringify(m)); localStorage.setItem('pinia_plan', JSON.stringify({ items: m, statuses: ['待开始', '进行中', '已完成'] })) }
      if (importData.scheduleCourses) { localStorage.setItem('task_manager_schedule_courses', JSON.stringify(importData.scheduleCourses)); localStorage.setItem('pinia_schedule', JSON.stringify({ courses: importData.scheduleCourses, settings: importData.scheduleSettings || {}, overrides: importData.scheduleOverrides || [], currentWeekOffset: 0 })) }
      if (importData.scheduleOverrides) { localStorage.setItem('task_manager_schedule_overrides', JSON.stringify(importData.scheduleOverrides)) }
      if (importData.alarms) { localStorage.setItem('task_manager_alarms', JSON.stringify(importData.alarms)); localStorage.setItem('pinia_alarm', JSON.stringify({ alarms: importData.alarms, isAlarmRinging: false, ringingAlarm: null, lastTriggeredTime: '' })) }
      importMessage.value = '数据导入成功！页面将刷新'; importSuccess.value = true
      setTimeout(() => { window.location.reload() }, 1500)
    } catch { importMessage.value = '文件解析失败，请确保是有效的JSON文件'; importSuccess.value = false }
  }
  reader.readAsText(importFile.value)
}

function closeImportModal() { showImportModal.value = false; importFile.value = null; importMessage.value = ''; importSuccess.value = false; importPassword.value = ''; showImportPassword.value = false }
function closeExportModal() { showExportModal.value = false; exportPassword.value = ''; exportConfirmPassword.value = ''; exportEncrypt.value = false }

onUnmounted(() => {
  if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null }
  if (resetTimer) { clearInterval(resetTimer); resetTimer = null }
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
        <p class="text-sm text-gray-500">共 {{ animatedTotal }} 条记录 · 本周活跃 {{ weeklyTotal }}</p>
      </div>
    </header>

    <!-- 数据概览：饼图 + 本周活跃度 -->
    <div class="glass-card p-4 animate-slide-up">
      <button @click="toggleSection('overview')" class="w-full flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
            <PieChart :size="16" class="text-white" />
          </div>
          <div class="text-left">
            <h2 class="font-bold text-gray-800">数据概览</h2>
            <p class="text-xs text-gray-500">占比分布与本周活跃趋势</p>
          </div>
        </div>
        <component :is="expandedSections.overview ? ChevronUp : ChevronDown" :size="20" class="text-gray-400" />
      </button>

      <Transition name="collapse">
        <div v-if="expandedSections.overview" class="mt-4">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <!-- 饼图 -->
            <div class="chart-card">
              <h3 class="chart-title">数据占比</h3>
              <div class="pie-chart-wrapper">
                <svg class="pie-chart" viewBox="0 0 200 200">
                  <defs>
                    <filter id="pie-shadow">
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
                      :class="{ 'pie-slice-selected': hoveredPieSlice === item.label }"
                      :style="{ animationDelay: `${index * 100}ms` }"
                      @mouseenter="hoveredPieSlice = item.label; showTooltip($event, `${item.label}: ${item.value} (${item.percentage}%)`)"
                      @mouseleave="hoveredPieSlice = null; hideTooltip()"
                    ></path>
                  </g>
                  <circle cx="100" cy="100" r="50" fill="white"></circle>
                  <text x="100" y="95" text-anchor="middle" class="pie-center-num">{{ animatedTotal }}</text>
                  <text x="100" y="115" text-anchor="middle" class="pie-center-label">总记录</text>
                </svg>
                <div class="pie-legend">
                  <div v-for="item in pieData" :key="item.label" class="legend-item"
                    :class="{ 'legend-item-hover': hoveredPieSlice === item.label }"
                    @mouseenter="hoveredPieSlice = item.label"
                    @mouseleave="hoveredPieSlice = null">
                    <div class="legend-dot" :style="{ backgroundColor: item.color }"></div>
                    <span class="legend-label">{{ item.label }}</span>
                    <span class="legend-value">{{ item.percentage }}%</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 本周活跃度 -->
            <div class="chart-card">
              <h3 class="chart-title">本周活跃度</h3>
              <div class="activity-chart-new">
                <div class="activity-bars">
                  <div v-for="day in weeklyActivity.days" :key="day.dateStr" class="activity-bar-col">
                    <div class="activity-bar-stack">
                      <div
                        v-for="mod in weeklyActivity.modules"
                        :key="mod.key"
                        class="activity-bar-segment"
                        :style="{
                          height: maxActivityValue > 0 ? (day.counts[mod.key] / maxActivityValue) * 100 + '%' : '0%',
                          backgroundColor: mod.color,
                          minHeight: day.counts[mod.key] > 0 ? '4px' : '0'
                        }"
                        :title="`${mod.label}: ${day.counts[mod.key]}`"
                      ></div>
                    </div>
                    <span class="activity-bar-label">{{ day.label }}</span>
                  </div>
                </div>
                <div class="activity-legend">
                  <div v-for="mod in weeklyActivity.modules" :key="mod.key" class="activity-legend-item">
                    <span class="activity-legend-dot" :style="{ backgroundColor: mod.color }"></span>
                    <span>{{ mod.label }}</span>
                  </div>
                </div>
                <p class="activity-summary">本周共新增 {{ weeklyTotal }} 条记录</p>
              </div>
            </div>
          </div>

          <!-- 模块统计卡片 -->
          <div class="grid grid-cols-4 md:grid-cols-8 gap-2 mt-4">
            <div v-for="mod in statModules" :key="mod.label" class="mini-stat-card">
              <component :is="mod.icon" :size="16" :style="{ color: mod.color }" />
              <span class="mini-stat-num">{{ mod.value }}</span>
              <span class="mini-stat-label">{{ mod.label }}</span>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- 数据操作 -->
    <div class="glass-card p-4 animate-slide-up" style="animation-delay: 100ms">
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
              <div class="op-card-icon"><Download :size="28" class="text-white" /></div>
              <h3 class="op-card-title">导出数据</h3>
              <p class="op-card-desc">备份为JSON文件</p>
              <ArrowRight :size="16" class="op-card-arrow" />
            </button>
            <button @click="showImportModal = true" class="op-card import-card group">
              <div class="op-card-icon"><Upload :size="28" class="text-white" /></div>
              <h3 class="op-card-title">导入数据</h3>
              <p class="op-card-desc">从文件恢复数据</p>
              <ArrowRight :size="16" class="op-card-arrow" />
            </button>
            <button @click="startResetCountdown" class="op-card reset-card group">
              <div class="op-card-icon"><RotateCcw :size="28" class="text-white" /></div>
              <h3 class="op-card-title">重置数据</h3>
              <p class="op-card-desc">清空所有数据</p>
              <ArrowRight :size="16" class="op-card-arrow" />
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <!-- 安全说明 -->
    <div class="glass-card p-4 animate-slide-up" style="animation-delay: 200ms">
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
            <div class="guide-card-icon bg-blue-100 text-blue-600"><Lock :size="18" /></div>
            <div>
              <h4 class="font-medium text-gray-800">加密导出</h4>
              <p class="text-xs text-gray-500">使用AES-GCM-256算法加密，配合PBKDF2密钥派生，确保数据安全</p>
            </div>
          </div>
          <div class="guide-card">
            <div class="guide-card-icon bg-green-100 text-green-600"><Shield :size="18" /></div>
            <div>
              <h4 class="font-medium text-gray-800">密码保护</h4>
              <p class="text-xs text-gray-500">加密文件需要正确密码才能解密，密码丢失将无法恢复数据</p>
            </div>
          </div>
          <div class="guide-card">
            <div class="guide-card-icon bg-red-100 text-red-600"><AlertCircle :size="18" /></div>
            <div>
              <h4 class="font-medium text-gray-800">重置保护</h4>
              <p class="text-xs text-gray-500">重置操作需要3秒倒计时确认，防止误操作导致数据丢失</p>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Toast -->
    <Transition name="fade">
      <div v-if="showExportMessage" class="fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-green-500 text-white shadow-lg animate-slide-in">
        <CheckCircle :size="18" />
        <span class="text-sm font-medium">{{ exportMessage }}</span>
      </div>
    </Transition>

    <!-- Reset Modal -->
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

    <!-- Export Modal -->
    <Teleport to="body">
      <div v-if="showExportModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click.self="closeExportModal">
        <div class="glass-card w-full max-w-md p-6 animate-scale-in">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-gray-800">导出数据</h2>
            <button @click="closeExportModal" class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"><X :size="18" class="text-gray-500" /></button>
          </div>
          <div class="space-y-4">
            <div class="flex items-center justify-between p-4 rounded-xl bg-gray-50">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full flex items-center justify-center" :class="exportEncrypt ? 'bg-purple-100' : 'bg-gray-200'">
                  <Lock v-if="exportEncrypt" :size="20" class="text-purple-600" />
                  <Unlock v-else :size="20" class="text-gray-500" />
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

    <!-- Import Modal -->
    <Teleport to="body">
      <div v-if="showImportModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click.self="closeImportModal">
        <div class="glass-card w-full max-w-md p-6 animate-scale-in">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-gray-800">导入数据</h2>
            <button @click="closeImportModal" class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"><X :size="18" class="text-gray-500" /></button>
          </div>
          <div class="space-y-4">
            <div class="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-purple-500 transition-colors cursor-pointer" @click="fileInput?.click()">
              <Upload :size="32" class="mx-auto text-gray-400 mb-2" />
              <p class="text-sm text-gray-500">点击选择备份文件</p>
              <p class="text-xs text-gray-400 mt-1">支持 .json 格式</p>
              <input type="file" ref="fileInput" accept=".json" class="hidden" @change="handleFileSelect">
            </div>
            <div v-if="importFile" class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div class="flex items-center gap-2"><Database :size="16" class="text-gray-500" /><span class="text-sm text-gray-700">{{ importFile.name }}</span></div>
              <button @click="importFile = null" class="text-gray-400 hover:text-gray-600"><X :size="16" /></button>
            </div>
            <div v-if="showImportPassword" class="space-y-2">
              <label class="block text-sm font-medium text-gray-700">文件密码</label>
              <input type="password" v-model="importPassword" placeholder="输入加密密码" class="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all">
            </div>
            <div v-if="importMessage" class="p-3 rounded-xl text-sm" :class="importSuccess ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'">{{ importMessage }}</div>
            <div class="flex items-center gap-3 pt-4">
              <button @click="closeImportModal" class="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all font-medium">取消</button>
              <button @click="importData" :disabled="!importFile" class="flex-1 px-4 py-2.5 rounded-xl font-medium transition-all" :class="importFile ? 'bg-purple-500 text-white hover:bg-purple-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'">导入</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Tooltip -->
    <Teleport to="body">
      <div v-if="tooltipVisible" class="fixed z-50 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg animate-fade-in" :style="{ left: tooltipPosition.x + 'px', top: tooltipPosition.y + 'px' }">{{ tooltipContent }}</div>
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

.animate-fade-in { animation: fadeIn 0.5s ease-out; }
.animate-slide-up { animation: slideUp 0.5s ease-out; }
.animate-scale-in { animation: scaleIn 0.3s ease-out; }
.animate-slide-in { animation: slideIn 0.3s ease-out; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
@keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }

.collapse-enter-active, .collapse-leave-active { transition: all 0.3s ease; }
.collapse-enter-from, .collapse-leave-to { opacity: 0; max-height: 0; }
.collapse-enter-to, .collapse-leave-from { max-height: 2000px; }

/* Chart */
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
  margin-bottom: 12px;
}

/* Pie */
.pie-chart-wrapper { display: flex; align-items: center; gap: 16px; }
.pie-chart { width: 140px; height: 140px; flex-shrink: 0; }
.pie-slice { transition: transform 0.3s ease, opacity 0.3s ease; cursor: pointer; }
.pie-slice:hover { transform: scale(1.05); transform-origin: 100px 100px; opacity: 0.9; }
.pie-slice-selected { filter: brightness(1.1); }
.pie-center-num { font-size: 20px; font-weight: bold; fill: #1e293b; }
.pie-center-label { font-size: 11px; fill: #64748b; }
.pie-legend { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.legend-item { display: flex; align-items: center; gap: 6px; padding: 2px 6px; border-radius: 6px; transition: background 0.2s; cursor: pointer; font-size: 11px; }
.legend-item:hover, .legend-item-hover { background: #f8fafc; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; }
.legend-label { flex: 1; color: #475569; }
.legend-value { font-weight: 600; color: #1e293b; }

/* Activity - new */
.activity-chart-new { padding-top: 4px; }
.activity-bars { display: flex; justify-content: space-between; align-items: flex-end; height: 140px; gap: 4px; }
.activity-bar-col { display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1; }
.activity-bar-stack { width: 28px; height: 120px; background: #f1f5f9; border-radius: 6px; display: flex; flex-direction: column-reverse; overflow: hidden; }
.activity-bar-segment { width: 100%; transition: height 0.6s ease; border-radius: 1px; }
.activity-bar-label { font-size: 10px; color: #64748b; }
.activity-legend { display: flex; justify-content: center; gap: 12px; margin-top: 8px; flex-wrap: wrap; }
.activity-legend-item { display: flex; align-items: center; gap: 4px; font-size: 10px; color: #64748b; }
.activity-legend-dot { width: 8px; height: 8px; border-radius: 2px; }
.activity-summary { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 6px; }

/* Mini stat cards */
.mini-stat-card {
  background: #f8fafc;
  border-radius: 10px;
  padding: 8px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  transition: transform 0.2s;
}
.mini-stat-card:hover { transform: translateY(-2px); }
.mini-stat-num { font-size: 16px; font-weight: bold; color: #1e293b; }
.mini-stat-label { font-size: 10px; color: #94a3b8; }

/* Op cards */
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
.op-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1); }
.op-card-icon { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; }
.export-card .op-card-icon { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
.import-card .op-card-icon { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
.reset-card .op-card-icon { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
.op-card-title { font-size: 16px; font-weight: 600; color: #1e293b; }
.op-card-desc { font-size: 12px; color: #64748b; }
.op-card-arrow { position: absolute; right: 16px; top: 16px; color: #94a3b8; transition: transform 0.3s ease; }
.op-card:hover .op-card-arrow { transform: translateX(4px); }

/* Guide */
.guide-card { display: flex; align-items: center; gap: 12px; padding: 12px; background: #f8fafc; border-radius: 12px; }
.guide-card-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.guide-card h4 { font-size: 13px; }
.guide-card p { font-size: 11px; }
</style>
