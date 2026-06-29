<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Plus, ChevronLeft, ChevronRight, BookOpen, Clock, MapPin, User, Edit2, Trash2, X, XCircle, RotateCcw, Settings, ZoomOut, AlertCircle, Undo2, FileText } from 'lucide-vue-next'
import { useScheduleStore } from '@/stores/schedule'
import type { ScheduleCourse } from '@/types'
import { scheduleColors } from '@/utils/colors'
import { getScheduleZoom, saveScheduleZoom } from '@/utils/storage'

const store = useScheduleStore()

const zoom = ref(getScheduleZoom())

watch(zoom, (newZoom) => {
  saveScheduleZoom(newZoom)
})
const showForm = ref(false)
const editingCourse = ref<ScheduleCourse | null>(null)
const selectedCourse = ref<(ScheduleCourse & { isTemporary?: boolean; overrideId?: number }) | null>(null)
const showSettings = ref(false)
const showAddTemporaryForm = ref(false)
const selectedCell = ref<{ dayOfWeek: number; startTime: string; endTime: string } | null>(null)

const periodPresets = [
  { label: '1-2节 (早八)', start: '08:00', end: '09:40', periods: '1-2' },
  { label: '3-4节 (早十)', start: '10:00', end: '11:40', periods: '3-4' },
  { label: '3-5节 (长节)', start: '10:00', end: '12:30', periods: '3-5' },
  { label: '6-8节 (长课)', start: '14:05', end: '16:40', periods: '6-8' },
  { label: '7-8节 (下午)', start: '15:00', end: '16:40', periods: '7-8' },
  { label: '9-10节 (下午)', start: '17:00', end: '18:40', periods: '9-10' },
  { label: '11-12节 (晚课)', start: '19:10', end: '20:40', periods: '11-12' },
  { label: '11-13节 (长晚课)', start: '19:10', end: '21:30', periods: '11-13' },
]

interface DaySchedule {
  dayOfWeek: number
  startTime: string
  endTime: string
}

const formData = ref({
  title: '',
  teacher: '',
  classroom: '',
  weekType: 'all' as 'all' | 'odd' | 'even',
  color: '',
  remark: '',
  schedules: [] as DaySchedule[]
})

const weekTypeOptions = [
  { value: 'all', label: '全周' },
  { value: 'odd', label: '单周' },
  { value: 'even', label: '双周' }
]

function addSchedule() {
  const newDay = formData.value.schedules.length > 0 
    ? ((formData.value.schedules[formData.value.schedules.length - 1].dayOfWeek % 7) + 1)
    : 1
  formData.value.schedules.push({
    dayOfWeek: newDay,
    startTime: '08:00',
    endTime: '09:40'
  })
}

function removeSchedule(index: number) {
  formData.value.schedules.splice(index, 1)
}

function applyPeriodPreset(index: number, preset: typeof periodPresets[0]) {
  formData.value.schedules[index].startTime = preset.start
  formData.value.schedules[index].endTime = preset.end
}

watch(editingCourse, (course) => {
  if (course) {
    const relatedCourses = store.courses.filter(
      c => c.title === course.title && 
           c.teacher === course.teacher && 
           c.weekType === course.weekType &&
           c.color === course.color
    )
    formData.value = {
      title: course.title,
      teacher: course.teacher || '',
      classroom: course.classroom || '',
      weekType: course.weekType,
      color: course.color,
      remark: course.remark || '',
      schedules: relatedCourses.map(c => ({
        dayOfWeek: c.dayOfWeek,
        startTime: c.startTime,
        endTime: c.endTime
      }))
    }
  } else {
    formData.value = {
      title: '',
      teacher: '',
      classroom: '',
      weekType: 'all',
      color: '',
      remark: '',
      schedules: [{
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '09:40'
      }]
    }
  }
})

watch(() => formData.value.title, (newTitle) => {
  if (newTitle.trim() && !editingCourse.value) {
    formData.value.color = store.getColorByTitle(newTitle)
  } else if (!newTitle.trim() && !editingCourse.value) {
    formData.value.color = ''
  }
})

const tempFormData = ref({
  title: '',
  teacher: '',
  classroom: '',
  startTime: '08:00',
  endTime: '09:00',
  color: '',
  remark: ''
})

watch(selectedCell, (cell) => {
  if (cell) {
    tempFormData.value = {
      title: '',
      teacher: '',
      classroom: '',
      startTime: cell.startTime,
      endTime: cell.endTime,
      color: store.getNextColor(),
      remark: ''
    }
  }
})

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

function getCoursePosition(course: ScheduleCourse): { top: string; height: string; left: string } {
  const startMinutes = parseTime(course.startTime)
  const endMinutes = parseTime(course.endTime)
  const baseMinutes = parseTime(store.settings.startTime)
  
  const top = ((startMinutes - baseMinutes) / 60) * (60 * zoom.value)
  const height = ((endMinutes - startMinutes) / 60) * (60 * zoom.value)
  
  const left = (course.dayOfWeek - 1) * (100 / 7)
  
  return {
    top: `${top}px`,
    height: `${height}px`,
    left: `${left}%`
  }
}

function getHourSlots() {
  const slots = []
  const startHour = parseInt(store.settings.startTime.split(':')[0])
  const endHour = parseInt(store.settings.endTime.split(':')[0])
  for (let i = startHour; i <= endHour; i++) {
    slots.push(`${String(i).padStart(2, '0')}:00`)
  }
  return slots
}

function prevWeek() {
  store.setWeekOffset(store.currentWeekOffset - 1)
}

function nextWeek() {
  store.setWeekOffset(store.currentWeekOffset + 1)
}

function goToToday() {
  store.resetWeekToToday()
}

function zoomOut() {
  if (zoom.value > 0.3) zoom.value -= 0.1
}

function resetZoom() {
  zoom.value = 0.8
}

function openForm(course?: ScheduleCourse) {
  editingCourse.value = course || null
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingCourse.value = null
}

function handleSave() {
  if (!formData.value.title.trim()) return
  
  const baseCourseData = {
    title: formData.value.title.trim(),
    teacher: formData.value.teacher.trim() || undefined,
    classroom: formData.value.classroom.trim() || undefined,
    weekType: formData.value.weekType,
    color: formData.value.color,
    remark: formData.value.remark.trim() || undefined
  }
  
  if (editingCourse.value && formData.value.schedules.length > 0) {
    const relatedCourseIds = store.courses.filter(
      c => c.title === editingCourse.value!.title && 
           c.teacher === editingCourse.value!.teacher && 
           c.weekType === editingCourse.value!.weekType &&
           c.color === editingCourse.value!.color
    ).map(c => c.id)
    for (const id of relatedCourseIds) {
      store.deleteCourse(id)
    }
    for (const schedule of formData.value.schedules) {
      const courseData: Omit<ScheduleCourse, 'id' | 'createdAt'> = {
        ...baseCourseData,
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime
      }
      store.addCourse(courseData)
    }
  } else {
    for (const schedule of formData.value.schedules) {
      const courseData: Omit<ScheduleCourse, 'id' | 'createdAt'> = {
        ...baseCourseData,
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime
      }
      store.addCourse(courseData)
    }
  }
  
  closeForm()
}

function handleDelete(id: number) {
  if (confirm('确定要删除这门课程吗？')) {
    store.deleteCourse(id)
    selectedCourse.value = null
  }
}

function handleTemporaryRemove(courseId: number, dayOfWeek: number) {
  if (confirm('确定要临时删除这一天的课程吗？此操作不会影响其他周次。')) {
    const date = store.getDateForWeek(dayOfWeek)
    store.addOverride({
      courseId,
      date,
      action: 'remove'
    })
    selectedCourse.value = null
  }
}

function handleRemoveTemporaryCourse(overrideId: number) {
  if (confirm('确定要删除这个临时课程吗？')) {
    store.removeOverride(overrideId)
    selectedCourse.value = null
  }
}

function handleAddTemporaryCourse() {
  if (!tempFormData.value.title.trim()) return
  if (!selectedCell.value) return
  
  store.addOverride({
    courseId: null,
    date: store.getDateForWeek(selectedCell.value.dayOfWeek),
    action: 'add',
    title: tempFormData.value.title.trim(),
    teacher: tempFormData.value.teacher.trim() || undefined,
    classroom: tempFormData.value.classroom.trim() || undefined,
    startTime: tempFormData.value.startTime,
    endTime: tempFormData.value.endTime,
    color: tempFormData.value.color,
    remark: tempFormData.value.remark.trim() || undefined
  })
  
  showAddTemporaryForm.value = false
  selectedCell.value = null
}

function undoOverride(overrideId: number) {
  if (confirm('确定要撤销这个临时调整吗？')) {
    store.removeOverride(overrideId)
  }
}

function openAddTemporaryForm(dayOfWeek: number, startTime: string) {
  const startHour = parseInt(startTime.split(':')[0])
  const endHour = Math.min(startHour + 1, 22)
  selectedCell.value = {
    dayOfWeek,
    startTime,
    endTime: `${String(endHour).padStart(2, '0')}:00`
  }
  showAddTemporaryForm.value = true
}

function getWeekTypeLabel(type: string): string {
  const option = weekTypeOptions.find(o => o.value === type)
  return option?.label || '全周'
}

const currentDateRange = computed(() => {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - now.getDay() + 1 + store.currentWeekOffset * 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  
  const formatDate = (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`
  return `${formatDate(monday)} - ${formatDate(sunday)}`
})

const settingsForm = ref({
  startDate: store.settings.startDate,
  baseWeekNumber: store.settings.baseWeekNumber,
  baseWeekType: store.settings.baseWeekType,
  startTime: store.settings.startTime,
  endTime: store.settings.endTime
})

function saveSettings() {
  store.updateSettings(settingsForm.value)
  showSettings.value = false
}

const totalHeight = computed(() => {
  const startHour = parseInt(store.settings.startTime.split(':')[0])
  const endHour = parseInt(store.settings.endTime.split(':')[0])
  return (endHour - startHour) * 60 * zoom.value + 40
})

const allOverrides = computed(() => {
  return store.overrides.filter(o => {
    const date = new Date(o.date)
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - now.getDay() + 1 + store.currentWeekOffset * 7)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return date >= monday && date <= sunday
  })
})

const todayCourses = computed(() => {
  const today = new Date()
  const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay()
  return store.getCoursesForDay(dayOfWeek).filter(c => !c.isTemporary).sort((a, b) => a.startTime.localeCompare(b.startTime))
})

const weeklyCourseCount = computed(() => {
  let count = 0
  for (let day = 1; day <= 7; day++) {
    count += store.getCoursesForDay(day).filter(c => !c.isTemporary).length
  }
  return count
})

const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  course: null as (ScheduleCourse & { isTemporary?: boolean; overrideId?: number }) | null
})

function showContextMenu(event: MouseEvent, course: ScheduleCourse & { isTemporary?: boolean; overrideId?: number }) {
  event.preventDefault()
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    course
  }
}

function hideContextMenu() {
  contextMenu.value.show = false
}

function handleContextMenuDetail() {
  if (contextMenu.value.course) {
    selectedCourse.value = contextMenu.value.course
    hideContextMenu()
  }
}

function handleContextMenuTemporaryRemove() {
  if (contextMenu.value.course && !contextMenu.value.course.isTemporary) {
    handleTemporaryRemove(contextMenu.value.course.id, contextMenu.value.course.dayOfWeek)
    hideContextMenu()
  }
}

function handleContextMenuRemoveTemporary() {
  if (contextMenu.value.course && contextMenu.value.course.isTemporary && contextMenu.value.course.overrideId) {
    handleRemoveTemporaryCourse(contextMenu.value.course.overrideId)
    hideContextMenu()
  }
}

function handleContextMenuDelete() {
  if (contextMenu.value.course && !contextMenu.value.course.isTemporary) {
    handleDelete(contextMenu.value.course.id)
    hideContextMenu()
  }
}
</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <header class="p-6 border-b border-gray-200 bg-white flex-shrink-0">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">课表</h1>
          <p class="text-gray-500 mt-1">一周课程安排，支持单双周切换和临时调整</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            @click="showSettings = true"
            class="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <Settings :size="18" />
            设置
          </button>
          <button
            @click="openForm()"
            class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-secondary transition-colors"
          >
            <Plus :size="20" />
            添加课程
          </button>
        </div>
      </div>
      
      <div class="flex items-center justify-between mt-4">
        <div class="flex items-center gap-2">
          <button
            @click="prevWeek"
            class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft :size="20" class="text-gray-600" />
          </button>
          <button
            @click="goToToday"
            class="px-4 py-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <RotateCcw :size="16" class="inline mr-2" />
            今天
          </button>
          <div class="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl">
            <BookOpen :size="18" class="text-gray-500" />
            <span class="text-sm font-medium text-gray-700">
              第 {{ store.currentWeekNumber }} 周
              <span :class="store.currentWeekType === 'odd' ? 'text-blue-600' : 'text-purple-600'">
                ({{ store.currentWeekType === 'odd' ? '单周' : '双周' }})
              </span>
            </span>
          </div>
          <button
            @click="nextWeek"
            class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight :size="20" class="text-gray-600" />
          </button>
          <span class="text-sm text-gray-500 ml-2">{{ currentDateRange }}</span>
        </div>
        
        <div class="flex items-center gap-3">
          <button
            @click="zoomOut"
            class="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <ZoomOut :size="18" class="text-gray-600" />
          </button>
          <div class="w-32 h-2 bg-gray-200 rounded-full relative">
            <input
              type="range"
              v-model="zoom"
              min="0.3"
              max="1"
              step="0.05"
              class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div
              class="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow transition-all"
              :style="{ left: `${((zoom - 0.3) / 0.7) * 100}%` }"
            />
          </div>
          <span class="text-sm text-gray-600 w-16">{{ Math.round(zoom * 100) }}%</span>
          <button
            @click="resetZoom"
            class="text-sm text-gray-500 hover:text-gray-700"
          >
            重置
          </button>
        </div>
      </div>
    </header>
    
    <div class="flex-1 flex overflow-hidden">
      <div class="flex-[3] overflow-auto">
        <div class="relative bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden m-6">
          <div class="absolute left-0 top-0 bottom-0 w-[60px] bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0 z-10">
            <div class="h-[40px] flex items-center justify-center border-b border-gray-200">
              <span class="text-xs font-medium text-gray-500">时间</span>
            </div>
            <div
              v-for="hour in getHourSlots()"
              :key="hour"
              class="flex items-start justify-center pt-1 border-b border-gray-100 relative"
              :style="{ height: `${60 * zoom}px` }"
            >
              <span class="text-sm font-medium text-gray-700">{{ hour }}</span>
            </div>
          </div>
          
          <div class="ml-[60px]">
            <div class="flex border-b border-gray-200 sticky top-0 bg-white z-10">
              <div
                v-for="(day, index) in store.weekDays"
                :key="index"
                class="flex-1 h-[40px] flex items-center justify-center border-r border-gray-200 last:border-r-0"
                :class="index >= 5 ? 'bg-gray-50/50' : ''"
              >
                <span class="text-sm font-medium text-gray-700">{{ day }}</span>
              </div>
            </div>
            
            <div class="relative" :style="{ height: `${totalHeight - 40}px` }" @click="hideContextMenu">
              <div
                v-for="(_day, dayIndex) in store.weekDays"
                :key="dayIndex"
                class="absolute top-0 bottom-0 border-r border-gray-100 last:border-r-0"
                :style="{ left: `${(dayIndex) * (100 / 7)}%`, width: `${100 / 7}%` }"
              />
              
              <div
                v-for="hour in getHourSlots().slice(0, -1)"
                :key="hour"
                class="border-b border-gray-50"
                :style="{ height: `${60 * zoom}px` }"
              />
              
              <div
                v-for="(_day, dayIndex) in store.weekDays"
                :key="'cell-' + dayIndex"
                class="absolute top-0 bottom-0"
                :style="{ left: `${dayIndex * (100 / 7)}%`, width: `${100 / 7}%` }"
              >
                <div
                  v-for="(hour, hourIndex) in getHourSlots().slice(0, -1)"
                  :key="'click-cell-' + dayIndex + '-' + hourIndex"
                  class="h-full cursor-pointer hover:bg-gray-50/50 transition-colors"
                  :style="{ height: `${60 * zoom}px` }"
                  @click="openAddTemporaryForm(dayIndex + 1, hour)"
                />
              </div>
              
              <div
                v-for="(_day, dayIndex) in store.weekDays"
                :key="'courses-' + dayIndex"
              >
                <div
                  v-for="course in store.getCoursesForDay(dayIndex + 1)"
                  :key="course.id"
                  class="absolute cursor-pointer rounded-lg border-2 overflow-hidden transition-all hover:shadow-md"
                  :class="course.isTemporary ? 'border-dashed' : ''"
                  :style="{
                    ...getCoursePosition(course),
                    width: `${100 / 7}%`,
                    backgroundColor: course.color,
                    borderColor: store.getBorderColor(course.color)
                  }"
                  @click="() => { selectedCourse = course; hideContextMenu() }"
                  @contextmenu="(e) => showContextMenu(e, course)"
                >
                  <div class="p-2 h-full flex flex-col justify-center">
                    <span class="text-xs font-bold text-gray-800 truncate">{{ course.title }}</span>
                    <span v-if="course.classroom" class="text-xs text-gray-600 truncate flex items-center gap-1">
                      <MapPin :size="10" class="inline" />
                      {{ course.classroom }}
                    </span>
                    <span v-if="course.isTemporary" class="text-xs text-blue-600 mt-0.5">临时课程</span>
                  </div>
                </div>
              </div>
              
              <div
                v-for="(_day, dayIndex) in store.weekDays"
                :key="'removed-' + dayIndex"
              >
                <div
                  v-for="removed in store.getRemovedCoursesForDay(dayIndex + 1)"
                  :key="removed.id"
                  class="absolute rounded-lg border-2 border-dashed border-gray-300 bg-gray-50/50 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-all"
                  :style="{
                    top: `${((parseTime(removed.startTime || '08:00') - parseTime(store.settings.startTime)) / 60) * (60 * zoom)}px`,
                    height: `${((parseTime(removed.endTime || '09:00') - parseTime(removed.startTime || '08:00')) / 60) * (60 * zoom)}px`,
                    left: `${dayIndex * (100 / 7)}px`,
                    width: `${100 / 7}%`
                  }"
                  @click="undoOverride(removed.id)"
                >
                  <div class="flex items-center gap-1 text-xs text-gray-500">
                    <AlertCircle :size="12" />
                    <span>已取消，点击恢复</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        
        
        <div
          v-if="allOverrides.length > 0"
          class="mx-6 mb-6 p-5 bg-blue-50 rounded-xl border border-blue-200"
        >
          <div class="flex items-center gap-2 mb-3">
            <AlertCircle :size="18" class="text-blue-600" />
            <h3 class="text-sm font-medium text-blue-700">本周临时调整记录 ({{ allOverrides.length }})</h3>
          </div>
          <div class="space-y-2">
            <div
              v-for="override in allOverrides"
              :key="override.id"
              class="flex items-center justify-between p-3 bg-white rounded-lg"
            >
              <div class="flex items-center gap-2">
                <span class="text-xs px-2 py-1 rounded-full" :class="{
                  'bg-red-100 text-red-600': override.action === 'remove',
                  'bg-green-100 text-green-600': override.action === 'add',
                  'bg-yellow-100 text-yellow-600': override.action === 'modify'
                }">
                  {{ override.action === 'remove' ? '已取消' : override.action === 'add' ? '临时添加' : '已修改' }}
                </span>
                <span class="text-sm text-gray-700">
                  {{ override.date }}
                  <span v-if="override.title"> - {{ override.title }}</span>
                  <span v-else-if="override.courseId"> - 课程{{ override.courseId }}</span>
                </span>
              </div>
              <button
                @click="undoOverride(override.id)"
                class="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Undo2 :size="14" />
                撤销
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="flex-[1] border-l border-gray-200 bg-gray-50 overflow-auto p-4">
        <div class="space-y-4">
          <div class="bg-white rounded-xl p-4 shadow-sm">
            <h3 class="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <BookOpen :size="16" />
              今日课程
            </h3>
            <div v-if="todayCourses.length > 0" class="space-y-2">
              <div
                v-for="course in todayCourses"
                :key="course.id"
                class="p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                :style="{ backgroundColor: course.color + '40' }"
                @click="selectedCourse = course"
              >
                <div class="flex items-center justify-between mb-1">
                  <span class="text-sm font-bold text-gray-800">{{ course.title }}</span>
                  <span class="text-xs px-2 py-0.5 rounded-full" :class="{
                    'bg-blue-100 text-blue-600': course.weekType === 'all',
                    'bg-purple-100 text-purple-600': course.weekType === 'odd',
                    'bg-pink-100 text-pink-600': course.weekType === 'even'
                  }">
                    {{ getWeekTypeLabel(course.weekType) }}
                  </span>
                </div>
                <div class="flex items-center gap-2 text-xs text-gray-600">
                  <Clock :size="12" />
                  {{ course.startTime }} - {{ course.endTime }}
                  <MapPin v-if="course.classroom" :size="12" />
                  <span v-if="course.classroom">{{ course.classroom }}</span>
                </div>
              </div>
            </div>
            <div v-else class="text-sm text-gray-500 text-center py-4">
              今天没有课程
            </div>
          </div>
          
          <div class="bg-white rounded-xl p-4 shadow-sm">
            <h3 class="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <FileText :size="16" />
              课程统计
            </h3>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">本周课程</span>
                <span class="text-sm font-bold text-gray-800">{{ weeklyCourseCount }} 节</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">总课程数</span>
                <span class="text-sm font-bold text-gray-800">{{ store.courses.length }} 门</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">临时调整</span>
                <span class="text-sm font-bold text-gray-800">{{ allOverrides.length }} 项</span>
              </div>
            </div>
          </div>
          
          <div class="bg-white rounded-xl p-4 shadow-sm">
            <h3 class="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <AlertCircle :size="16" />
              本周调整
            </h3>
            <div v-if="allOverrides.length > 0" class="space-y-2">
              <div
                v-for="override in allOverrides"
                :key="override.id"
                class="p-2 rounded-lg text-xs"
                :class="{
                  'bg-red-50': override.action === 'remove',
                  'bg-green-50': override.action === 'add',
                  'bg-yellow-50': override.action === 'modify'
                }"
              >
                <div class="flex items-center gap-1 mb-1">
                  <span :class="{
                    'text-red-600': override.action === 'remove',
                    'text-green-600': override.action === 'add',
                    'text-yellow-600': override.action === 'modify'
                  }">
                    {{ override.action === 'remove' ? '已取消' : override.action === 'add' ? '临时添加' : '已修改' }}
                  </span>
                  <span class="text-gray-500">{{ override.date }}</span>
                </div>
                <span class="text-gray-700">{{ override.title || '课程调整' }}</span>
              </div>
            </div>
            <div v-else class="text-sm text-gray-500 text-center py-2">
              暂无调整
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <Teleport to="body">
      <div
        v-if="showForm"
        class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        @click.self="closeForm"
      >
        <div class="bg-white w-full max-w-3xl rounded-2xl shadow-xl p-6">
          <div class="flex items-center justify-between mb-6 sticky top-0 bg-white z-10">
            <h2 class="text-xl font-bold text-gray-800">{{ editingCourse ? '编辑课程' : '添加课程' }}</h2>
            <button
              @click="closeForm"
              class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"
            >
              <X :size="18" class="text-gray-500" />
            </button>
          </div>
          
          <div class="grid grid-cols-2 gap-6">
            <div class="bg-gray-50 rounded-xl p-4">
              <h3 class="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                <BookOpen :size="16" />
                课程信息
              </h3>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">课程名称</label>
                  <input
                    v-model="formData.title"
                    type="text"
                    class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                    placeholder="输入课程名称"
                  />
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">教师</label>
                    <input
                      v-model="formData.teacher"
                      type="text"
                      class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                      placeholder="教师姓名"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">教室</label>
                    <input
                      v-model="formData.classroom"
                      type="text"
                      class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                      placeholder="教室位置"
                    />
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">周次类型</label>
                  <div class="grid grid-cols-3 gap-2">
                    <button
                      v-for="option in weekTypeOptions"
                      :key="option.value"
                      @click="formData.weekType = option.value as 'all' | 'odd' | 'even'"
                      class="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                      :class="formData.weekType === option.value ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
                    >
                      {{ option.label }}
                    </button>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">颜色</label>
                  <div class="flex flex-wrap gap-2">
                    <button
                      v-for="color in scheduleColors"
                      :key="color"
                      @click="formData.color = color"
                      class="w-8 h-8 rounded-full transition-all border-2"
                      :class="formData.color === color ? 'border-gray-800 scale-110' : 'border-transparent hover:scale-105'"
                      :style="{ backgroundColor: color }"
                    />
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">备注</label>
                  <textarea
                    v-model="formData.remark"
                    rows="4"
                    class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all resize-none"
                    placeholder="添加课程备注..."
                  />
                </div>
              </div>
            </div>
            
            <div class="bg-gray-50 rounded-xl p-4">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Clock :size="16" />
                  上课时间 ({{ formData.schedules.length }} 个时段)
                </h3>
                <button
                  v-if="formData.schedules.length < 7"
                  @click="addSchedule"
                  class="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs rounded-lg hover:bg-secondary transition-colors"
                >
                  <Plus :size="14" />
                  添加时段
                </button>
              </div>
              
              <div class="space-y-3">
                <div
                  v-for="(schedule, index) in formData.schedules"
                  :key="index"
                  class="bg-white rounded-xl p-4 border border-gray-200"
                >
                  <div class="flex items-center justify-between mb-3">
                    <span class="text-xs font-medium text-gray-500">时段 {{ index + 1 }}</span>
                    <button
                      v-if="formData.schedules.length > 1"
                      @click="removeSchedule(index)"
                      class="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <X :size="16" />
                    </button>
                  </div>
                  
                  <div class="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label class="block text-xs font-medium text-gray-600 mb-1.5">星期</label>
                      <select
                        v-model="schedule.dayOfWeek"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                      >
                        <option v-for="(day, i) in store.weekDays" :key="i" :value="i + 1">{{ day }}</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-600 mb-1.5">节次预设</label>
                      <select
                        @change="(e) => { const preset = periodPresets.find(p => p.label === (e.target as HTMLSelectElement).value); if (preset) applyPeriodPreset(index, preset) }"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                      >
                        <option value="">选择节次</option>
                        <option v-for="preset in periodPresets" :key="preset.label" :value="preset.label">{{ preset.label }}</option>
                      </select>
                    </div>
                  </div>
                  
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-xs font-medium text-gray-600 mb-1.5">开始时间</label>
                      <input
                        v-model="schedule.startTime"
                        type="time"
                        :min="store.settings.startTime"
                        :max="store.settings.endTime"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-600 mb-1.5">结束时间</label>
                      <input
                        v-model="schedule.endTime"
                        type="time"
                        :min="store.settings.startTime"
                        :max="store.settings.endTime"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="flex gap-3 mt-6 sticky bottom-0 bg-white pt-4 border-t border-gray-100">
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
              {{ editingCourse ? '保存' : '添加' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
    
    <Teleport to="body">
      <div
        v-if="showAddTemporaryForm"
        class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        @click.self="showAddTemporaryForm = false"
      >
        <div class="bg-white w-full max-w-md rounded-2xl shadow-xl p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-gray-800">添加临时课程</h2>
            <button
              @click="showAddTemporaryForm = false"
              class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"
            >
              <X :size="18" class="text-gray-500" />
            </button>
          </div>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">课程名称</label>
              <input
                v-model="tempFormData.title"
                type="text"
                class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                placeholder="输入课程名称"
              />
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">教师</label>
                <input
                  v-model="tempFormData.teacher"
                  type="text"
                  class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                  placeholder="教师姓名"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">教室</label>
                <input
                  v-model="tempFormData.classroom"
                  type="text"
                  class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                  placeholder="教室位置"
                />
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">开始时间</label>
                <input
                  v-model="tempFormData.startTime"
                  type="time"
                  :min="store.settings.startTime"
                  :max="store.settings.endTime"
                  class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">结束时间</label>
                <input
                  v-model="tempFormData.endTime"
                  type="time"
                  :min="store.settings.startTime"
                  :max="store.settings.endTime"
                  class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                />
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">颜色</label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="color in scheduleColors"
                  :key="color"
                  @click="tempFormData.color = color"
                  class="w-8 h-8 rounded-full transition-all border-2"
                  :class="tempFormData.color === color ? 'border-gray-800 scale-110' : 'border-transparent hover:scale-105'"
                  :style="{ backgroundColor: color }"
                />
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">备注</label>
              <textarea
                v-model="tempFormData.remark"
                rows="3"
                class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all resize-none"
                placeholder="添加备注..."
              />
            </div>
          </div>
          
          <div class="flex gap-3 mt-6">
            <button
              @click="showAddTemporaryForm = false"
              class="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all font-medium"
            >
              取消
            </button>
            <button
              @click="handleAddTemporaryCourse"
              class="flex-1 px-4 py-3 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-all font-medium"
            >
              添加
            </button>
          </div>
        </div>
      </div>
    </Teleport>
    
    <Teleport to="body">
      <div
        v-if="showSettings"
        class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        @click.self="showSettings = false"
      >
        <div class="bg-white w-full max-w-md rounded-2xl shadow-xl p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-gray-800">课表设置</h2>
            <button
              @click="showSettings = false"
              class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"
            >
              <X :size="18" class="text-gray-500" />
            </button>
          </div>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">开学日期</label>
              <input
                v-model="settingsForm.startDate"
                type="date"
                class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">基准周序号</label>
              <input
                v-model.number="settingsForm.baseWeekNumber"
                type="number"
                min="1"
                max="52"
                class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                placeholder="输入基准周序号"
              />
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">基准周类型</label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    @click="settingsForm.baseWeekType = 'odd'"
                    class="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                    :class="settingsForm.baseWeekType === 'odd' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
                  >
                    单周
                  </button>
                  <button
                    @click="settingsForm.baseWeekType = 'even'"
                    class="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                    :class="settingsForm.baseWeekType === 'even' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
                  >
                    双周
                  </button>
                </div>
              </div>
              
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">每日开始时间</label>
                  <input
                    v-model="settingsForm.startTime"
                    type="time"
                    min="00:00"
                    max="23:00"
                    class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">每日结束时间</label>
                  <input
                    v-model="settingsForm.endTime"
                    type="time"
                    min="00:00"
                    max="23:00"
                    class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>
              
              <div class="p-4 bg-blue-50 rounded-xl">
              <p class="text-sm text-blue-700">
                当前为第 {{ store.currentWeekNumber }} 周（{{ store.currentWeekType === 'odd' ? '单周' : '双周' }}），根据基准周计算结果
              </p>
            </div>
          </div>
          
          <div class="flex gap-3 mt-6">
            <button
              @click="showSettings = false"
              class="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all font-medium"
            >
              取消
            </button>
            <button
              @click="saveSettings"
              class="flex-1 px-4 py-3 rounded-xl bg-primary text-white hover:bg-secondary transition-all font-medium"
            >
              保存设置
            </button>
          </div>
        </div>
      </div>
      
      <Teleport to="body">
        <div 
          v-if="contextMenu.show" 
          class="fixed z-50 bg-white rounded-xl shadow-xl border border-gray-200 py-1 min-w-[160px]"
          :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
          @click="hideContextMenu"
          @contextmenu.prevent
        >
          <button
            @click.stop="handleContextMenuDetail"
            class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <FileText :size="16" />
            查看详情
          </button>
          <button
            v-if="!contextMenu.course?.isTemporary"
            @click.stop="handleContextMenuTemporaryRemove"
            class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <XCircle :size="16" />
            临时删除
          </button>
          <button
            v-if="contextMenu.course?.isTemporary && contextMenu.course?.overrideId"
            @click.stop="handleContextMenuRemoveTemporary"
            class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <Trash2 :size="16" />
            删除临时课程
          </button>
          <div v-if="!contextMenu.course?.isTemporary" class="border-t border-gray-200 my-1"></div>
          <button
            v-if="!contextMenu.course?.isTemporary"
            @click.stop="handleContextMenuDelete"
            class="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
          >
            <Trash2 :size="16" />
            删除课程
          </button>
        </div>
      </Teleport>
      
      <Teleport to="body">
        <div
          v-if="selectedCourse"
          class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          @click.self="selectedCourse = null"
        >
          <div class="bg-white w-full max-w-md rounded-2xl shadow-xl p-6">
            <div class="flex items-start justify-between mb-4">
              <div class="flex items-center gap-3">
                <div
                  class="w-6 h-6 rounded-full flex-shrink-0"
                  :style="{ backgroundColor: selectedCourse.color, border: `2px solid ${store.getBorderColor(selectedCourse.color)}` }"
                />
                <h2 class="text-xl font-bold text-gray-800">{{ selectedCourse.title }}</h2>
              </div>
              <button
                @click="selectedCourse = null"
                class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"
              >
                <X :size="18" class="text-gray-500" />
              </button>
            </div>
            
            <div class="space-y-4">
              <div class="flex items-center gap-2 text-sm text-gray-600">
                <span
                  class="text-xs font-medium px-2 py-0.5 rounded-full"
                  :style="{ backgroundColor: selectedCourse.color }"
                >
                  {{ selectedCourse.isTemporary ? '临时课程' : getWeekTypeLabel(selectedCourse.weekType) }}
                </span>
              </div>
              
              <div class="flex items-center gap-4 text-sm text-gray-600">
                <span class="flex items-center gap-1">
                  <Clock :size="16" />
                  {{ selectedCourse.startTime }} - {{ selectedCourse.endTime }}
                </span>
                <span class="flex items-center gap-1">
                  <MapPin :size="16" />
                  {{ selectedCourse.classroom || '无教室信息' }}
                </span>
              </div>
              
              <div v-if="selectedCourse.teacher" class="flex items-center gap-2 text-sm text-gray-600">
                <User :size="16" />
                <span>{{ selectedCourse.teacher }}</span>
              </div>
              
              <div v-if="selectedCourse.remark" class="p-3 bg-gray-50 rounded-lg">
                <div class="flex items-start gap-2 text-sm text-gray-600">
                  <FileText :size="16" class="flex-shrink-0 mt-0.5" />
                  <span>{{ selectedCourse.remark }}</span>
                </div>
              </div>
              
              <div class="flex gap-2 pt-4 border-t border-gray-100">
                <button
                  v-if="!selectedCourse.isTemporary"
                  @click="openForm(selectedCourse); selectedCourse = null"
                  class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-primary text-white hover:bg-secondary transition-colors"
                >
                  <Edit2 :size="16" />
                  编辑
                </button>
                <button
                  v-if="!selectedCourse.isTemporary"
                  @click="handleTemporaryRemove(selectedCourse.id, selectedCourse.dayOfWeek); selectedCourse = null"
                  class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
                >
                  <Undo2 :size="16" />
                  临时删除
                </button>
                <button
                  v-if="selectedCourse.isTemporary && selectedCourse.overrideId"
                  @click="handleRemoveTemporaryCourse(selectedCourse.overrideId); selectedCourse = null"
                  class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                >
                  <Trash2 :size="16" />
                  删除临时课程
                </button>
                <button
                  v-if="!selectedCourse.isTemporary"
                  @click="handleDelete(selectedCourse.id); selectedCourse = null"
                  class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                >
                  <Trash2 :size="16" />
                  删除课程
                </button>
              </div>
            </div>
          </div>
        </div>
      </Teleport>
    </Teleport>
  </div>
</template>