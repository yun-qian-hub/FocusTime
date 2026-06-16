<script setup lang="ts">
import { ref } from 'vue'
import { Download, Upload, RotateCcw, AlertCircle, CheckCircle, X, Lock, Unlock } from 'lucide-vue-next'
import { useTodoStore } from '@/stores/todo'
import { useCalendarStore } from '@/stores/calendar'
import { useNotesStore } from '@/stores/notes'
import { useAlarmStore } from '@/stores/alarm'
import { useImportantStore } from '@/stores/important'
import { usePeriodStore } from '@/stores/period'
import { useScheduleStore } from '@/stores/schedule'
import { encryptData, decryptData } from '@/utils/crypto'

const todoStore = useTodoStore()
const calendarStore = useCalendarStore()
const notesStore = useNotesStore()
const alarmStore = useAlarmStore()
const importantStore = useImportantStore()
const periodStore = usePeriodStore()
const scheduleStore = useScheduleStore()

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

interface ExportData {
  version: string
  exportDate: string
  encrypted: boolean
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
  data?: string
}

async function exportData() {
  const rawData = {
    todos: todoStore.todos,
    calendarEvents: calendarStore.events,
    notes: notesStore.notes,
    alarms: alarmStore.alarms,
    importantEvents: importantStore.events,
    periodEvents: periodStore.periodEvents,
    scheduleCourses: scheduleStore.courses,
    scheduleOverrides: scheduleStore.overrides
  }

  let exportData: ExportData = {
    version: '1.0',
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
      const encrypted = await encryptData(JSON.stringify(rawData, null, 2), exportPassword.value)
      exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        encrypted: true,
        ...encrypted
      }
    } catch {
      exportMessage.value = '加密失败，请重试'
      showExportMessage.value = true
      setTimeout(() => { showExportMessage.value = false }, 3000)
      return
    }
  } else {
    exportData = { ...exportData, ...rawData }
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
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

  exportMessage.value = exportEncrypt.value ? '数据加密导出成功！' : '数据导出成功！'
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

  localStorage.removeItem('task_manager_todos')
  localStorage.removeItem('task_manager_events')
  localStorage.removeItem('task_manager_notes')
  localStorage.removeItem('task_manager_alarms')
  localStorage.removeItem('task_manager_important_events')
  localStorage.removeItem('task_manager_period_events')
  localStorage.removeItem('task_manager_schedule_courses')
  localStorage.removeItem('task_manager_schedule_settings')
  localStorage.removeItem('task_manager_schedule_overrides')
  localStorage.removeItem('task_manager_calendar_colors')

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
          importData = JSON.parse(decrypted)
        } catch {
          importMessage.value = '密码错误或文件已损坏'
          importSuccess.value = false
          importPassword.value = ''
          return
        }
      }

      localStorage.removeItem('task_manager_todos')
      localStorage.removeItem('task_manager_events')
      localStorage.removeItem('task_manager_notes')
      localStorage.removeItem('task_manager_alarms')
      localStorage.removeItem('task_manager_important_events')
      localStorage.removeItem('task_manager_period_events')
      localStorage.removeItem('task_manager_schedule_courses')
      localStorage.removeItem('task_manager_schedule_settings')
      localStorage.removeItem('task_manager_calendar_colors')

      if (importData.todos) {
        localStorage.setItem('task_manager_todos', JSON.stringify(importData.todos))
      }
      if (importData.calendarEvents) {
        localStorage.setItem('task_manager_events', JSON.stringify(importData.calendarEvents))
      }
      if (importData.notes) {
        localStorage.setItem('task_manager_notes', JSON.stringify(importData.notes))
      }
      if (importData.alarms) {
        localStorage.setItem('task_manager_alarms', JSON.stringify(importData.alarms))
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

const stats = {
  todos: todoStore.todos.length,
  calendarEvents: calendarStore.events.length,
  notes: notesStore.notes.length,
  alarms: alarmStore.alarms.length,
  importantEvents: importantStore.events.length,
  periodEvents: periodStore.periodEvents.length,
  scheduleCourses: scheduleStore.courses.length
}
</script>

<template>
  <div class="flex-1 flex flex-col gap-6 p-6">
    <header>
      <h1 class="text-2xl font-bold text-gray-800">数据管理</h1>
      <p class="text-gray-500 mt-1">管理您的所有数据，支持导出、导入和重置</p>
    </header>
    
    <div class="grid grid-cols-7 gap-4">
      <div class="glass-card p-4 flex flex-col items-center justify-center">
        <span class="text-2xl font-bold text-primary">{{ stats.todos }}</span>
        <span class="text-sm text-gray-500">待办事项</span>
      </div>
      <div class="glass-card p-4 flex flex-col items-center justify-center">
        <span class="text-2xl font-bold text-blue-500">{{ stats.calendarEvents }}</span>
        <span class="text-sm text-gray-500">日程安排</span>
      </div>
      <div class="glass-card p-4 flex flex-col items-center justify-center">
        <span class="text-2xl font-bold text-amber-500">{{ stats.notes }}</span>
        <span class="text-sm text-gray-500">便签</span>
      </div>
      <div class="glass-card p-4 flex flex-col items-center justify-center">
        <span class="text-2xl font-bold text-emerald-500">{{ stats.alarms }}</span>
        <span class="text-sm text-gray-500">闹钟</span>
      </div>
      <div class="glass-card p-4 flex flex-col items-center justify-center">
        <span class="text-2xl font-bold text-orange-500">{{ stats.importantEvents }}</span>
        <span class="text-sm text-gray-500">重要事件</span>
      </div>
      <div class="glass-card p-4 flex flex-col items-center justify-center">
        <span class="text-2xl font-bold text-purple-500">{{ stats.periodEvents }}</span>
        <span class="text-sm text-gray-500">周期事件</span>
      </div>
      <div class="glass-card p-4 flex flex-col items-center justify-center">
        <span class="text-2xl font-bold text-teal-500">{{ stats.scheduleCourses }}</span>
        <span class="text-sm text-gray-500">课程</span>
      </div>
    </div>
    
    <div class="glass-card p-6">
      <h2 class="text-xl font-bold text-gray-800 mb-6">数据操作</h2>
      
      <div class="grid grid-cols-3 gap-6">
        <button
          @click="showExportModal = true"
          class="flex flex-col items-center justify-center p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 transition-all shadow-md hover:shadow-lg group"
        >
          <div class="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Download :size="32" class="text-white" />
          </div>
          <h3 class="text-lg font-bold text-gray-800 mb-2">导出数据</h3>
          <p class="text-sm text-gray-500 text-center">将所有数据导出为JSON文件，支持加密保护</p>
        </button>
        
        <button
          @click="showImportModal = true"
          class="flex flex-col items-center justify-center p-8 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 transition-all shadow-md hover:shadow-lg group"
        >
          <div class="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Upload :size="32" class="text-white" />
          </div>
          <h3 class="text-lg font-bold text-gray-800 mb-2">导入数据</h3>
          <p class="text-sm text-gray-500 text-center">从JSON文件导入备份数据，支持加密文件</p>
        </button>
        
        <button
          @click="startResetCountdown"
          class="flex flex-col items-center justify-center p-8 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 transition-all shadow-md hover:shadow-lg group"
        >
          <div class="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <RotateCcw :size="32" class="text-white" />
          </div>
          <h3 class="text-lg font-bold text-gray-800 mb-2">重置数据</h3>
          <p class="text-sm text-gray-500 text-center">清空所有数据，不会删除已导出的文件</p>
        </button>
      </div>
    </div>
    
    <div class="glass-card p-6">
      <h2 class="text-xl font-bold text-gray-800 mb-4">使用说明</h2>
      <ul class="space-y-3 text-gray-600">
        <li class="flex items-start gap-3">
          <span class="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">1</span>
          <span><strong>导出数据：</strong>点击导出按钮，可以选择是否加密。加密使用AES-GCM-256算法，配合PBKDF2密钥派生，确保数据安全。</span>
        </li>
        <li class="flex items-start gap-3">
          <span class="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">2</span>
          <span><strong>导入数据：</strong>点击导入按钮，选择之前导出的JSON文件。如果文件已加密，需要输入正确的密码才能解密导入。</span>
        </li>
        <li class="flex items-start gap-3">
          <span class="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">3</span>
          <span><strong>重置数据：</strong>点击重置按钮后，需要等待3秒倒计时才能确认，防止误操作。重置只会清空应用内的数据，不会影响您已导出的文件。</span>
        </li>
      </ul>
    </div>

    <Transition name="fade">
      <div v-if="showExportMessage" class="fixed top-4 right-4 z-50 flex items-center gap-3 px-6 py-4 rounded-xl bg-green-500 text-white shadow-lg">
        <CheckCircle :size="20" />
        <span>{{ exportMessage }}</span>
      </div>
    </Transition>
    
    <Teleport to="body">
      <div
        v-if="showResetConfirm"
        class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        @click.self="cancelReset"
      >
        <div class="glass-card w-full max-w-sm p-6 animate-scale-in">
          <div class="flex flex-col items-center text-center">
            <div class="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertCircle :size="32" class="text-red-500" />
            </div>
            <h2 class="text-xl font-bold text-gray-800 mb-2">确认重置数据？</h2>
            <p class="text-gray-500 mb-6">此操作将清空所有待办、日程、便签、闹钟和重要事件数据。已导出的文件不会受影响。</p>
            <div class="flex items-center gap-4 w-full">
              <button
                @click="cancelReset"
                class="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all font-medium"
              >
                取消
              </button>
              <button
                @click="confirmReset"
                :disabled="!resetConfirmEnabled"
                class="flex-1 px-4 py-3 rounded-xl font-medium transition-all"
                :class="[resetConfirmEnabled ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed']"
              >
                {{ resetConfirmEnabled ? '确认重置' : `请等待 ${resetCountdown} 秒` }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    
    <Teleport to="body">
      <div
        v-if="showExportModal"
        class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        @click.self="closeExportModal"
      >
        <div class="glass-card w-full max-w-md p-6 animate-scale-in">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-gray-800">导出数据</h2>
            <button @click="closeExportModal" class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
              <X :size="18" class="text-gray-500" />
            </button>
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
                <input
                  type="checkbox"
                  v-model="exportEncrypt"
                  class="sr-only peer"
                />
                <div
                  class="w-12 h-6 rounded-full peer-checked:bg-purple-500 bg-gray-300 transition-colors"
                />
                <span
                  class="absolute left-1 top-1 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-6"
                />
              </label>
            </div>

            <div v-if="exportEncrypt" class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">加密密码</label>
                <input
                  v-model="exportPassword"
                  type="password"
                  class="input-field w-full"
                  placeholder="设置导出密码（至少6位）"
                  minlength="6"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">确认密码</label>
                <input
                  v-model="exportConfirmPassword"
                  type="password"
                  class="input-field w-full"
                  placeholder="再次输入密码"
                  minlength="6"
                />
                <p v-if="exportPassword && exportConfirmPassword && exportPassword !== exportConfirmPassword" class="text-sm text-red-500 mt-1">
                  两次输入的密码不一致
                </p>
              </div>
              <div class="p-3 rounded-xl bg-blue-50 text-sm text-blue-700">
                <strong>安全提示：</strong>请妥善保管您的密码，一旦丢失将无法恢复加密数据。导出文件使用AES-GCM-256算法加密，配合100,000次PBKDF2迭代，安全性高。
              </div>
            </div>
          </div>
          
          <div class="flex gap-3 mt-6">
            <button
              @click="closeExportModal"
              class="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all font-medium"
            >
              取消
            </button>
            <button
              @click="exportData"
              :disabled="exportEncrypt && (exportPassword.length < 6 || exportPassword !== exportConfirmPassword)"
              class="flex-1 px-4 py-3 rounded-xl bg-primary text-white hover:bg-secondary transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              导出
            </button>
          </div>
        </div>
      </div>
    </Teleport>
    
    <Teleport to="body">
      <div
        v-if="showImportModal"
        class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        @click.self="closeImportModal"
      >
        <div class="glass-card w-full max-w-md p-6 animate-scale-in">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-gray-800">导入数据</h2>
            <button @click="closeImportModal" class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
              <X :size="18" class="text-gray-500" />
            </button>
          </div>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">选择备份文件</label>
              <div class="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary transition-all cursor-pointer" @click="$refs.fileInput.click()">
                <Upload :size="32" class="mx-auto text-gray-400 mb-2" />
                <p class="text-gray-500">点击或拖拽选择JSON文件</p>
                <p v-if="importFile" class="text-sm text-primary mt-2">{{ importFile.name }}</p>
                <input
                  ref="fileInput"
                  type="file"
                  accept=".json"
                  class="hidden"
                  @change="handleFileSelect"
                />
              </div>
            </div>

            <div v-if="showImportPassword" class="space-y-2">
              <label class="block text-sm font-medium text-gray-700 mb-2">解密密码</label>
              <input
                v-model="importPassword"
                type="password"
                class="input-field w-full"
                placeholder="输入加密时设置的密码"
              />
              <div class="p-3 rounded-xl bg-orange-50 text-sm text-orange-700">
                <strong>注意：</strong>如果密码错误，将无法导入数据。请确保输入正确的密码。
              </div>
            </div>
            
            <div v-if="importMessage" class="flex items-center gap-2 p-3 rounded-xl" :class="importSuccess ? 'bg-green-50' : 'bg-red-50'">
              <CheckCircle v-if="importSuccess" :size="18" class="text-green-500" />
              <AlertCircle v-else :size="18" class="text-red-500" />
              <span :class="importSuccess ? 'text-green-600' : 'text-red-600'">{{ importMessage }}</span>
            </div>
          </div>
          
          <div class="flex gap-3 mt-6">
            <button
              @click="closeImportModal"
              class="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all font-medium"
            >
              取消
            </button>
            <button
              @click="importData"
              :disabled="!importFile"
              class="flex-1 px-4 py-3 rounded-xl bg-primary text-white hover:bg-secondary transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              导入
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>