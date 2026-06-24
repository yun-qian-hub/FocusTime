<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, ChevronLeft, ChevronRight, CheckCircle2, Circle, Trash2, Edit2, X, Briefcase, BookOpen, Home, FolderKanban, Users, ListTodo, Kanban, List, GanttChartSquare } from 'lucide-vue-next'
import { usePlanStore } from '@/stores/plan'
import type { PlanItem, PeriodSubtask } from '@/types'
import { calendarEventTypeColors } from '@/utils/colors'

const store = usePlanStore()

const currentView = ref<'kanban' | 'gantt' | 'list'>('kanban')
const showForm = ref(false)
const editingItem = ref<PlanItem | null>(null)
const selectedItem = ref<PlanItem | null>(null)
const newSubtaskTitle = ref('')
const editingSubtask = ref<{ itemId: number; subtaskId: number; value: string } | null>(null)
const listFilter = ref<'all' | 'active' | 'done'>('all')
const listSort = ref<'date' | 'priority'>('date')

// ---- Form ----
const form = ref({
  title: '',
  description: '',
  planType: 'period' as PlanItem['planType'],
  startDate: formatDate(new Date()),
  endDate: formatDate(addDays(new Date(), 7)),
  eventType: 'task' as PlanItem['eventType'],
  priority: 'medium' as PlanItem['priority'],
  progress: 0,
  syncToCalendar: true
})

// ---- Gantt view state ----
const ganttViewRange = ref<'week' | 'month' | 'quarter'>('month')
const ganttStart = ref(formatDate(new Date()))
const ganttEnd = ref(formatDate(addDays(new Date(), 30)))

/// ---- Helpers ----
function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(date: Date, days: number): Date {
  const r = new Date(date)
  r.setDate(r.getDate() + days)
  return r
}

function formatDuration(startDate: string, endDate?: string): string {
  const s = new Date(startDate)
  const e = endDate ? new Date(endDate) : s
  const diff = Math.ceil((e.getTime() - s.getTime()) / 86400000) + 1
  if (diff === 1) return '1天'
  if (diff < 7) return `${diff}天`
  if (diff < 30) return `${Math.floor(diff / 7)}周`
  if (diff < 365) return `${Math.floor(diff / 30)}个月`
  return `${Math.floor(diff / 365)}年`
}

const eventTypeOptions = [
  { value: 'work', label: '工作', icon: Briefcase },
  { value: 'study', label: '学习', icon: BookOpen },
  { value: 'life', label: '生活', icon: Home },
  { value: 'project', label: '项目', icon: FolderKanban },
  { value: 'meeting', label: '会议', icon: Users },
  { value: 'task', label: '任务', icon: ListTodo }
]

const eventTypeIcons: Record<string, typeof Briefcase> = {
  work: Briefcase, study: BookOpen, life: Home, project: FolderKanban, meeting: Users, task: ListTodo
}

function typeColor(t?: string) { return calendarEventTypeColors[t || 'task'] || '#f1f5f9' }
function typeBorder(t?: string) {
  const c: Record<string, string> = { work: '#3b82f6', study: '#22c55e', life: '#f59e0b', project: '#ec4899', meeting: '#8b5cf6', task: '#6b7280' }
  return c[t || 'task'] || '#6b7280'
}

const priorityLabels: Record<string, string> = { high: '高', medium: '中', low: '低' }
const priorityColors: Record<string, string> = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' }
const planTypeLabels: Record<string, string> = { period: '阶段', goal: '目标', habit: '习惯' }

function subtaskProgress(item: PlanItem) {
  if (!item.subtasks?.length) return { done: 0, total: 0, pct: item.progress }
  const done = item.subtasks.filter(s => s.completed).length
  return { done, total: item.subtasks.length, pct: Math.round((done / item.subtasks.length) * 100) }
}

// ---- Gantt helpers ----
function ganttDaysInRange() {
  const s = new Date(ganttStart.value)
  const e = new Date(ganttEnd.value)
  return Math.floor((e.getTime() - s.getTime()) / 86400000) + 1
}

function ganttViewDays() {
  const days: { date: string; label: string; dayOfWeek: string; isWeekend: boolean }[] = []
  const s = new Date(ganttStart.value)
  const e = new Date(ganttEnd.value)
  const c = new Date(s)
  const wd = ['日', '一', '二', '三', '四', '五', '六']
  while (c <= e) {
    const dw = c.getDay()
    days.push({ date: formatDate(c), label: `${c.getDate()}`, dayOfWeek: wd[dw], isWeekend: dw === 0 || dw === 6 })
    c.setDate(c.getDate() + 1)
  }
  return days
}

function ganttPos(item: PlanItem) {
  const vs = new Date(ganttStart.value).getTime()
  const ve = new Date(ganttEnd.value).getTime()
  const is = new Date(item.startDate).getTime()
  const ie = (item.endDate ? new Date(item.endDate) : new Date()).getTime()
  const total = ve - vs
  const left = Math.max(0, (is - vs) / total * 100)
  const right = Math.min(100, (ie - vs) / total * 100)
  const width = right - left
  return { left: `${left}%`, width: `${Math.max(2, width)}%`, visible: width > 0 }
}
const ganttDays = computed(() => ganttViewDays())

function setGanttRange(r: 'week' | 'month' | 'quarter') {
  ganttViewRange.value = r
  const t = new Date()
  ganttStart.value = formatDate(t)
  if (r === 'week') ganttEnd.value = formatDate(addDays(t, 6))
  else if (r === 'month') ganttEnd.value = formatDate(addDays(t, 30))
  else ganttEnd.value = formatDate(addDays(t, 90))
}

function ganttPrev() {
  const s = new Date(ganttStart.value)
  const e = new Date(ganttEnd.value)
  const d = ganttDaysInRange()
  ganttStart.value = formatDate(addDays(s, -d))
  ganttEnd.value = formatDate(addDays(e, -d))
}
function ganttNext() {
  const s = new Date(ganttStart.value)
  const e = new Date(ganttEnd.value)
  const d = ganttDaysInRange()
  ganttStart.value = formatDate(addDays(s, d))
  ganttEnd.value = formatDate(addDays(e, d))
}

// ---- List filtered/sorted ----
const listItems = computed(() => {
  let items = [...store.sortedItems]
  if (listFilter.value === 'active') items = items.filter(i => i.status !== 'done')
  else if (listFilter.value === 'done') items = items.filter(i => i.status === 'done')
  if (listSort.value === 'priority') {
    const rank: Record<string, number> = { high: 0, medium: 1, low: 2 }
    items.sort((a, b) => (rank[a.priority] ?? 2) - (rank[b.priority] ?? 2))
  }
  return items
})

// ---- Modal ----
function openForm(item?: PlanItem) {
  editingItem.value = item || null
  if (item) {
    form.value = {
      title: item.title, description: item.description || '',
      planType: item.planType, startDate: item.startDate,
      endDate: item.endDate || '', eventType: item.eventType || 'task',
      priority: item.priority, progress: item.progress, syncToCalendar: item.syncToCalendar ?? true
    }
  } else {
    form.value = {
      title: '', description: '', planType: 'period',
      startDate: formatDate(new Date()), endDate: formatDate(addDays(new Date(), 7)),
      eventType: 'task', priority: 'medium', progress: 0, syncToCalendar: true
    }
  }
  showForm.value = true
}

function closeForm() { showForm.value = false; editingItem.value = null }

function saveItem() {
  if (!form.value.title.trim()) return
  const data = {
    title: form.value.title,
    description: form.value.description || undefined,
    planType: form.value.planType,
    startDate: form.value.startDate,
    endDate: form.value.endDate || undefined,
    color: typeColor(form.value.eventType),
    priority: form.value.priority,
    status: (editingItem.value?.status || 'pending') as PlanItem['status'],
    progress: form.value.progress,
    eventType: form.value.eventType,
    syncToCalendar: form.value.syncToCalendar
  }
  if (editingItem.value) {
    store.updateItem(editingItem.value.id, data)
  } else {
    store.addItem(data)
  }
  closeForm()
}

function deleteItem(id: number) { store.deleteItem(id); if (selectedItem.value?.id === id) selectedItem.value = null }

// ---- Subtask ----
function toggleSubtask(item: PlanItem, sid: number) { store.toggleSubtask(item.id, sid) }
function addSubtask(item: PlanItem) {
  if (!newSubtaskTitle.value.trim()) return
  store.addSubtask(item.id, newSubtaskTitle.value.trim())
  newSubtaskTitle.value = ''
}
function editSubtaskStart(itemId: number, sid: number, v: string) { editingSubtask.value = { itemId, subtaskId: sid, value: v } }
function editSubtaskEnd(item: PlanItem) {
  if (!editingSubtask.value) return
  const updated = item.subtasks?.map(s => s.id === editingSubtask.value!.subtaskId ? { ...s, title: editingSubtask.value!.value } : s)
  if (updated) store.updateItem(item.id, { subtasks: updated })
  editingSubtask.value = null
}
function deleteSubtask(item: PlanItem, sid: number) { store.deleteSubtask(item.id, sid) }
</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <!-- Header -->
    <header class="p-6 border-b border-gray-200 bg-white flex-shrink-0">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">计划</h1>
          <p class="text-gray-500 mt-1">看板 / 甘特图 / 列表三视图管理</p>
        </div>
        <button @click="openForm()" class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-secondary transition-colors">
          <Plus :size="20" />新建计划
        </button>
      </div>

      <!-- View tabs -->
      <div class="flex items-center gap-1 mt-4">
        <button v-for="v in [{id:'kanban',icon:Kanban,label:'看板'},{id:'gantt',icon:GanttChartSquare,label:'甘特图'},{id:'list',icon:List,label:'列表'}]"
          :key="v.id" @click="currentView = v.id as any"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
          :class="currentView === v.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
        >
          <component :is="v.icon" :size="16" />{{ v.label }}
        </button>
      </div>
    </header>

    <div class="flex-1 overflow-auto">

      <!-- ===== KANBAN VIEW ===== -->
      <div v-if="currentView === 'kanban'" class="p-6 flex gap-4 min-h-full">
        <div v-for="col in [{key:'pending',label:'待开始',color:'#94a3b8'},{key:'active',label:'进行中',color:'#3b82f6'},{key:'done',label:'已完成',color:'#22c55e'}]"
          :key="col.key" class="flex-1 min-w-[220px] flex flex-col">
          <div class="flex items-center gap-2 mb-3 px-2">
            <span class="w-3 h-3 rounded-full" :style="{ backgroundColor: col.color }"></span>
            <span class="text-sm font-bold text-gray-700">{{ col.label }}</span>
            <span class="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{{ store.kanbanGroups[col.key as keyof typeof store.kanbanGroups].length }}</span>
          </div>
          <div class="flex-1 space-y-3 overflow-y-auto scrollbar-hide pr-1">
            <div v-for="item in store.kanbanGroups[col.key as keyof typeof store.kanbanGroups]" :key="item.id"
              class="p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              :class="item.status === 'done' ? 'opacity-70' : ''" @click="selectedItem = item"
            >
              <div class="flex items-center gap-2 mb-2">
                <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: priorityColors[item.priority] }"></span>
                <span class="text-xs font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{{ planTypeLabels[item.planType] }}</span>
                <span class="flex-1 text-sm font-bold text-gray-800 truncate" :class="item.status === 'done' ? 'line-through' : ''">{{ item.title }}</span>
              </div>
              <div class="w-full h-1.5 rounded-full bg-gray-100 mt-2 mb-2">
                <div class="h-full rounded-full transition-all" :style="{ width: item.progress + '%', backgroundColor: typeBorder(item.eventType) }"></div>
              </div>
              <div class="flex items-center justify-between text-[10px] text-gray-400">
                <span>{{ item.startDate }}{{ item.endDate ? ' ~ ' + item.endDate : '' }}</span>
                <span>{{ item.progress }}%</span>
              </div>

              <!-- inline status toggle -->
              <div class="flex gap-1.5 mt-3 pt-3 border-t border-gray-100">
                <button v-if="col.key === 'pending'" @click.stop="store.moveToStatus(item.id, 'active')"
                  class="flex-1 text-[11px] px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100">开始</button>
                <button v-if="col.key === 'active'" @click.stop="store.moveToStatus(item.id, 'done')"
                  class="flex-1 text-[11px] px-2 py-1 rounded-lg bg-green-50 text-green-600 hover:bg-green-100">完成</button>
                <button v-if="col.key === 'done'" @click.stop="store.moveToStatus(item.id, 'active')"
                  class="flex-1 text-[11px] px-2 py-1 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100">重新打开</button>
                <button @click.stop="openForm(item)" class="text-[11px] px-2 py-1 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100"><Edit2 :size="12" /></button>
                <button @click.stop="deleteItem(item.id)" class="text-[11px] px-2 py-1 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"><Trash2 :size="12" /></button>
              </div>
            </div>
            <div v-if="store.kanbanGroups[col.key as keyof typeof store.kanbanGroups].length === 0" class="text-center text-gray-400 py-8 text-sm">暂无</div>
          </div>
        </div>
      </div>

      <!-- ===== GANTT VIEW ===== -->
      <div v-if="currentView === 'gantt'" class="flex flex-col flex-1">
        <div class="p-6 pb-0">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <button @click="ganttPrev" class="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft :size="20" class="text-gray-600" /></button>
              <span class="text-sm text-gray-600">{{ ganttStart }} ~ {{ ganttEnd }}</span>
              <button @click="ganttNext" class="p-2 rounded-lg hover:bg-gray-100"><ChevronRight :size="20" class="text-gray-600" /></button>
            </div>
            <div class="flex items-center gap-1">
              <button v-for="r in [{k:'week',l:'周'},{k:'month',l:'月'},{k:'quarter',l:'季'}]" :key="r.k"
                @click="setGanttRange(r.k as any)" class="px-3 py-1 rounded-lg text-xs"
                :class="ganttViewRange === r.k ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'">{{ r.l }}</button>
            </div>
          </div>
        </div>
        <div class="flex-1 overflow-auto p-6 pt-4">
          <div class="min-w-[600px]">
            <div class="h-10 bg-gray-50 rounded-t-lg border border-b-0 border-gray-200 flex">
              <div class="w-[200px] flex-shrink-0 flex items-center px-4 border-r border-gray-200"><span class="text-xs font-medium text-gray-600">计划</span></div>
              <div v-for="d in ganttDays" :key="d.date" class="flex-shrink-0 flex flex-col items-center justify-center" :style="{ width: (100 / ganttDays.length) + '%' }">
                <span class="text-[10px] text-gray-400">{{ d.dayOfWeek }}</span>
                <span class="text-[10px] font-medium" :class="d.isWeekend ? 'text-red-400' : 'text-gray-700'">{{ d.label }}</span>
              </div>
            </div>
            <div class="border border-gray-200 rounded-b-lg relative">
              <div v-for="item in store.sortedItems" :key="item.id" class="h-[60px] relative flex items-center border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50"
                @click="selectedItem = item">
                <div class="w-[200px] flex-shrink-0 flex items-center gap-2 px-4 border-r border-gray-200 bg-gray-50/30">
                  <div class="w-4 h-4 rounded-full flex items-center justify-center" :style="{ backgroundColor: typeColor(item.eventType) }">
                    <component :is="eventTypeIcons[item.eventType || 'task']" :size="10" :style="{ color: typeBorder(item.eventType) }" />
                  </div>
                  <span class="text-sm font-medium text-gray-800 truncate" :class="item.status === 'done' ? 'line-through' : ''">{{ item.title }}</span>
                </div>
                <div class="flex-1 relative h-full flex items-center">
                  <div v-if="ganttPos(item).visible" class="absolute h-[42px] rounded-xl border-2 cursor-pointer hover:shadow-md"
                    :style="{ left: ganttPos(item).left, width: ganttPos(item).width, backgroundColor: typeColor(item.eventType), borderColor: typeBorder(item.eventType) }">
                    <div class="h-full rounded-xl transition-all" :style="{ width: item.progress + '%', backgroundColor: typeBorder(item.eventType) + '40' }"></div>
                    <div class="absolute inset-0 flex items-center px-2 gap-1 overflow-hidden">
                      <span class="text-[10px] font-medium text-gray-700 truncate">{{ item.title }}</span>
                      <span class="text-[10px] font-bold px-1 py-0.5 rounded text-white flex-shrink-0" :style="{ backgroundColor: typeBorder(item.eventType) }">{{ item.progress }}%</span>
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="store.sortedItems.length === 0" class="h-[300px] flex items-center justify-center text-gray-400 text-sm">暂无计划</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== LIST VIEW ===== -->
      <div v-if="currentView === 'list'" class="p-6">
        <div class="flex items-center gap-3 mb-4">
          <select v-model="listFilter" class="px-3 py-1.5 rounded-lg border border-gray-200 text-sm">
            <option value="all">全部</option><option value="active">未完成</option><option value="done">已完成</option>
          </select>
          <select v-model="listSort" class="px-3 py-1.5 rounded-lg border border-gray-200 text-sm">
            <option value="date">按时间</option><option value="priority">按优先级</option>
          </select>
          <span class="text-sm text-gray-400">{{ listItems.length }} 项</span>
        </div>
        <div class="space-y-2">
          <div v-for="item in listItems" :key="item.id" class="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:shadow-sm cursor-pointer"
            :class="item.status === 'done' ? 'opacity-70' : ''" @click="selectedItem = item">
            <button @click.stop="item.status === 'done' ? store.moveToStatus(item.id, 'active') : store.moveToStatus(item.id, 'done')" class="flex-shrink-0">
              <CheckCircle2 v-if="item.status === 'done'" :size="22" class="text-green-500" />
              <Circle v-else :size="22" class="text-gray-300" />
            </button>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold truncate" :class="item.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'">{{ item.title }}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 flex-shrink-0">{{ planTypeLabels[item.planType] }}</span>
                <span class="w-2 h-2 rounded-full flex-shrink-0" :style="{ backgroundColor: priorityColors[item.priority] }"></span>
              </div>
              <div class="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                <span>{{ item.startDate }}{{ item.endDate ? ' ~ ' + item.endDate : '' }}</span>
                <span>· {{ formatDuration(item.startDate, item.endDate) }}</span>
              </div>
            </div>
            <div class="w-20 h-1.5 rounded-full bg-gray-100 flex-shrink-0">
              <div class="h-full rounded-full" :style="{ width: item.progress + '%', backgroundColor: typeBorder(item.eventType) }"></div>
            </div>
            <span class="text-xs font-bold flex-shrink-0" :style="{ color: typeBorder(item.eventType) }">{{ item.progress }}%</span>
          </div>
          <div v-if="listItems.length === 0" class="text-center text-gray-400 py-12 text-sm">暂无计划</div>
        </div>
      </div>
    </div>

    <!-- ===== DETAIL PANEL ===== -->
    <div v-if="selectedItem" class="border-t border-gray-200 p-5 bg-white flex-shrink-0 overflow-y-auto max-h-[40vh]">
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full" :style="{ backgroundColor: priorityColors[selectedItem.priority] }"></span>
          <h3 class="text-lg font-bold text-gray-800" :class="selectedItem.status === 'done' ? 'line-through' : ''">{{ selectedItem.title }}</h3>
          <span class="text-xs px-1.5 py-0.5 rounded-full" :style="{ backgroundColor: typeColor(selectedItem.eventType), color: typeBorder(selectedItem.eventType) }">{{ planTypeLabels[selectedItem.planType] }}</span>
        </div>
        <button @click="selectedItem = null" class="text-gray-400 hover:text-gray-600"><X :size="18" /></button>
      </div>

      <div class="grid grid-cols-4 gap-3 mb-3 text-xs">
        <div><span class="text-gray-400">日期</span><p class="font-medium text-gray-700">{{ selectedItem.startDate }}{{ selectedItem.endDate ? ' ~ ' + selectedItem.endDate : '' }}</p></div>
        <div><span class="text-gray-400">类型</span><p class="font-medium text-gray-700">{{ eventTypeOptions.find(o => o.value === selectedItem.eventType)?.label || '任务' }}</p></div>
        <div><span class="text-gray-400">优先级</span><p class="font-medium" :style="{ color: priorityColors[selectedItem.priority] }">{{ priorityLabels[selectedItem.priority] }}</p></div>
        <div><span class="text-gray-400">进度</span><p class="font-medium" :style="{ color: typeBorder(selectedItem.eventType) }">{{ selectedItem.progress }}%</p></div>
      </div>

      <div v-if="selectedItem.description" class="p-3 bg-gray-50 rounded-lg mb-3 text-sm text-gray-600">{{ selectedItem.description }}</div>

      <!-- Subtasks -->
      <div v-if="selectedItem.subtasks?.length" class="mb-3">
        <h4 class="text-sm font-medium text-gray-700 mb-2">子任务 ({{ subtaskProgress(selectedItem).done }}/{{ selectedItem.subtasks.length }})</h4>
        <div class="space-y-1.5">
          <div v-for="st in selectedItem.subtasks" :key="st.id" class="flex items-center gap-2 p-2 rounded-lg" :class="st.completed ? 'bg-gray-50' : 'hover:bg-gray-50'">
            <button @click="toggleSubtask(selectedItem, st.id)" class="flex-shrink-0">
              <CheckCircle2 v-if="st.completed" :size="16" :style="{ color: typeBorder(selectedItem.eventType) }" />
              <Circle v-else :size="16" class="text-gray-300" />
            </button>
            <div class="flex-1 min-w-0">
              <input v-if="editingSubtask?.subtaskId === st.id" v-model="editingSubtask.value" @blur="editSubtaskEnd(selectedItem)" @keyup.enter="editSubtaskEnd(selectedItem)"
                class="w-full px-2 py-0.5 text-sm border border-gray-300 rounded focus:outline-none" autofocus />
              <span v-else class="text-sm cursor-text" :class="st.completed ? 'text-gray-400 line-through' : 'text-gray-700'"
                @click="editSubtaskStart(selectedItem.id, st.id, st.title)">{{ st.title }}</span>
            </div>
            <button @click="deleteSubtask(selectedItem, st.id)" class="p-1 rounded hover:bg-red-50 opacity-60 hover:opacity-100"><Trash2 :size="12" class="text-red-500" /></button>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2 mb-3">
        <input v-model="newSubtaskTitle" type="text" class="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none" placeholder="添加子任务..."
          @keyup.enter="addSubtask(selectedItem)" />
        <button @click="addSubtask(selectedItem)" class="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">添加</button>
      </div>

      <div class="flex gap-2 pt-3 border-t border-gray-100">
        <button @click="store.moveToStatus(selectedItem.id, selectedItem.status === 'done' ? 'active' : 'done')"
          class="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm"
          :class="selectedItem.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'">
          <CheckCircle2 v-if="selectedItem.status === 'done'" :size="16" /><Circle v-else :size="16" />
          {{ selectedItem.status === 'done' ? '已完成' : '标记完成' }}
        </button>
        <button @click="openForm(selectedItem)" class="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm bg-primary text-white hover:bg-secondary"><Edit2 :size="16" />编辑</button>
        <button @click="deleteItem(selectedItem.id); selectedItem = null" class="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm bg-red-50 text-red-600 hover:bg-red-100"><Trash2 :size="16" />删除</button>
      </div>
    </div>

    <!-- ===== FORM MODAL ===== -->
    <Teleport to="body">
      <div v-if="showForm" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click.self="closeForm">
        <div class="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold text-gray-800">{{ editingItem ? '编辑计划' : '新建计划' }}</h2>
            <button @click="closeForm" class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"><X :size="18" class="text-gray-500" /></button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">名称</label>
              <input v-model="form.title" type="text" class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none" placeholder="计划名称" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">计划类型</label>
              <div class="flex gap-2">
                <button v-for="pt in [{k:'period',l:'阶段计划'},{k:'goal',l:'目标'},{k:'habit',l:'习惯'}]" :key="pt.k"
                  @click="form.planType = pt.k as any"
                  class="flex-1 py-2 rounded-xl text-sm border-2 transition-all"
                  :class="form.planType === pt.k ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-600'">{{ pt.l }}</button>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">开始</label>
                <input v-model="form.startDate" type="date" class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">结束（可选）</label>
                <input v-model="form.endDate" type="date" class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none" />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">分类</label>
              <div class="grid grid-cols-3 gap-2">
                <button v-for="opt in eventTypeOptions" :key="opt.value"
                  @click="form.eventType = opt.value as any"
                  class="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border-2 text-sm transition-all"
                  :class="form.eventType === opt.value ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300'">
                  <component :is="opt.icon" :size="14" :style="{ color: typeBorder(opt.value) }" />{{ opt.label }}
                </button>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">优先级</label>
              <div class="flex gap-2">
                <button v-for="p in [{k:'high',l:'高',c:'#ef4444'},{k:'medium',l:'中',c:'#f59e0b'},{k:'low',l:'低',c:'#22c55e'}]" :key="p.k"
                  @click="form.priority = p.k as any"
                  class="flex-1 py-2 rounded-xl text-sm border-2 transition-all"
                  :class="form.priority === p.k ? 'border-gray-400 bg-gray-50' : 'border-gray-200'">
                  <span class="w-2 h-2 rounded-full inline-block mr-1.5" :style="{ backgroundColor: p.c }"></span>{{ p.l }}
                </button>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">进度 {{ form.progress }}%</label>
              <input type="range" v-model="form.progress" min="0" max="100" class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
            </div>

            <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" v-model="form.syncToCalendar" class="rounded" />
              同步到日历
            </label>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">描述</label>
              <textarea v-model="form.description" rows="2" class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none resize-none" placeholder="可选"></textarea>
            </div>
          </div>

          <div class="flex gap-3 mt-6">
            <button @click="closeForm" class="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium">取消</button>
            <button @click="saveItem" class="flex-1 py-3 rounded-xl bg-primary text-white hover:bg-secondary font-medium">{{ editingItem ? '保存' : '创建' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
