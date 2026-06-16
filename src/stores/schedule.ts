import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ScheduleCourse, ScheduleOverride, ScheduleSettings } from '@/types'
import { getScheduleCourses, saveScheduleCourses, getScheduleSettings, saveScheduleSettings, getScheduleOverrides, saveScheduleOverrides } from '@/utils/storage'
import { scheduleColors, scheduleBorderColors } from '@/utils/colors'

export const useScheduleStore = defineStore('schedule', () => {
  const courses = ref<ScheduleCourse[]>(getScheduleCourses())
  const settings = ref<ScheduleSettings>(getScheduleSettings())
  const overrides = ref<ScheduleOverride[]>(getScheduleOverrides())
  const currentWeekOffset = ref(0)

  const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const timeSlots = generateTimeSlots()

  function generateTimeSlots(): { time: string; label: string }[] {
    const slots: { time: string; label: string }[] = []
    let currentHour = 7
    while (currentHour < 22) {
      slots.push({ time: `${String(currentHour).padStart(2, '0')}:00`, label: `${currentHour}:00` })
      slots.push({ time: `${String(currentHour).padStart(2, '0')}:30`, label: `${currentHour}:30` })
      currentHour++
    }
    slots.push({ time: '22:00', label: '22:00' })
    return slots
  }

  function getWeekNumber(date: Date, startDate: Date): number {
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    const target = new Date(date)
    target.setHours(0, 0, 0, 0)
    const daysDiff = Math.floor((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(1, Math.ceil((daysDiff + 1) / 7))
  }

  function calculateWeekType(date: Date): 'odd' | 'even' {
    const currentWeekNum = getWeekNumber(date, new Date(settings.value.startDate))
    const diff = currentWeekNum - settings.value.baseWeekNumber
    if (diff % 2 === 0) {
      return settings.value.baseWeekType
    } else {
      return settings.value.baseWeekType === 'odd' ? 'even' : 'odd'
    }
  }

  const currentWeekType = computed<'odd' | 'even'>(() => {
    const now = new Date()
    const adjustedNow = new Date(now)
    adjustedNow.setDate(adjustedNow.getDate() + currentWeekOffset.value * 7)
    return calculateWeekType(adjustedNow)
  })

  const currentWeekNumber = computed(() => {
    const start = new Date(settings.value.startDate)
    const now = new Date()
    const adjustedNow = new Date(now)
    adjustedNow.setDate(adjustedNow.getDate() + currentWeekOffset.value * 7)
    return getWeekNumber(adjustedNow, start)
  })

  const visibleCourses = computed(() => {
    const currentType = currentWeekType.value
    return courses.value.filter(course => {
      if (course.weekType === 'all') return true
      return course.weekType === currentType
    })
  })

  function getDateForWeek(dayOfWeek: number): string {
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - now.getDay() + 1 + currentWeekOffset.value * 7)
    const targetDate = new Date(monday)
    targetDate.setDate(monday.getDate() + dayOfWeek - 1)
    return targetDate.toISOString().split('T')[0]
  }

  function getCoursesForDay(dayOfWeek: number): (ScheduleCourse & { isTemporary?: boolean; overrideId?: number })[] {
    const date = getDateForWeek(dayOfWeek)
    const weekType = calculateWeekType(new Date(date))
    
    let result: (ScheduleCourse & { isTemporary?: boolean; overrideId?: number })[] = courses.value
      .filter(course => course.dayOfWeek === dayOfWeek && 
        (course.weekType === 'all' || course.weekType === weekType))
      .map(c => ({ ...c }))

    const dayOverrides = overrides.value.filter(o => o.date === date)

    dayOverrides.forEach(override => {
      if (override.action === 'remove' && override.courseId) {
        result = result.filter(c => c.id !== override.courseId)
      } else if (override.action === 'add') {
        const tempCourse: ScheduleCourse & { isTemporary: boolean; overrideId: number } = {
          id: Date.now(),
          title: override.title || '临时课程',
          teacher: override.teacher,
          classroom: override.classroom,
          dayOfWeek,
          startTime: override.startTime || '08:00',
          endTime: override.endTime || '09:00',
          weekType: 'all',
          color: override.color || '#f3f4f6',
          createdAt: new Date().toISOString(),
          remark: override.remark,
          isTemporary: true,
          overrideId: override.id
        }
        result.push(tempCourse)
      } else if (override.action === 'modify' && override.courseId) {
        const index = result.findIndex(c => c.id === override.courseId)
        if (index >= 0) {
          if (override.title !== undefined) result[index].title = override.title
          if (override.teacher !== undefined) result[index].teacher = override.teacher
          if (override.classroom !== undefined) result[index].classroom = override.classroom
          if (override.startTime !== undefined) result[index].startTime = override.startTime
          if (override.endTime !== undefined) result[index].endTime = override.endTime
          if (override.color !== undefined) result[index].color = override.color
          if (override.remark !== undefined) result[index].remark = override.remark
        }
      }
    })

    return result.sort((a, b) => {
      const timeA = a.startTime
      const timeB = b.startTime
      return timeA.localeCompare(timeB)
    })
  }

  function getRemovedCoursesForDay(dayOfWeek: number): ScheduleOverride[] {
    const date = getDateForWeek(dayOfWeek)
    return overrides.value.filter(o => o.date === date && o.action === 'remove' && o.courseId)
  }

  function getNextColor(): string {
    const usedColors = new Set(courses.value.map(c => c.color))
    for (let i = 0; i < scheduleColors.length; i++) {
      if (!usedColors.has(scheduleColors[i])) {
        return scheduleColors[i]
      }
    }
    return scheduleColors[courses.value.length % scheduleColors.length]
  }

  function getBorderColor(bgColor: string): string {
    const index = scheduleColors.indexOf(bgColor)
    return index >= 0 ? scheduleBorderColors[index] : '#6b7280'
  }

  function addCourse(course: Omit<ScheduleCourse, 'id' | 'createdAt'>) {
    const newCourse: ScheduleCourse = {
      ...course,
      id: Date.now(),
      createdAt: new Date().toISOString()
    }
    courses.value.push(newCourse)
    saveScheduleCourses(courses.value)
    return newCourse
  }

  function updateCourse(id: number, updates: Partial<ScheduleCourse>) {
    const course = courses.value.find(c => c.id === id)
    if (course) {
      Object.assign(course, updates)
      saveScheduleCourses(courses.value)
    }
  }

  function deleteCourse(id: number) {
    courses.value = courses.value.filter(c => c.id !== id)
    saveScheduleCourses(courses.value)
  }

  function addOverride(override: Omit<ScheduleOverride, 'id' | 'createdAt'>) {
    const newOverride: ScheduleOverride = {
      ...override,
      id: Date.now(),
      createdAt: new Date().toISOString()
    }
    overrides.value.push(newOverride)
    saveScheduleOverrides(overrides.value)
    return newOverride
  }

  function removeOverride(id: number) {
    overrides.value = overrides.value.filter(o => o.id !== id)
    saveScheduleOverrides(overrides.value)
  }

  function updateSettings(newSettings: Partial<ScheduleSettings>) {
    Object.assign(settings.value, newSettings)
    saveScheduleSettings(settings.value)
  }

  function setWeekOffset(offset: number) {
    currentWeekOffset.value = offset
  }

  function resetWeekToToday() {
    currentWeekOffset.value = 0
  }

  return {
    courses,
    settings,
    overrides,
    currentWeekOffset,
    weekDays,
    timeSlots,
    currentWeekType,
    currentWeekNumber,
    visibleCourses,
    addCourse,
    updateCourse,
    deleteCourse,
    addOverride,
    removeOverride,
    updateSettings,
    setWeekOffset,
    resetWeekToToday,
    getNextColor,
    getBorderColor,
    getCoursesForDay,
    getRemovedCoursesForDay,
    getDateForWeek,
    calculateWeekType
  }
})