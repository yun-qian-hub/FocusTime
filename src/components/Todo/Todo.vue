<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, Search, X, Trash2, Calendar, AlertCircle, ChevronDown, ChevronRight } from 'lucide-vue-next'
import { useTodoStore } from '@/stores/todo'
import type { Todo } from '@/types'
import { scheduleColors, scheduleBorderColors } from '@/utils/colors'

const store = useTodoStore()

const showAddModal = ref(false)
const editingTodo = ref<Todo | null>(null)
const newTodo = ref({
  title: '',
  description: '',
  priority: 'medium' as 'high' | 'medium' | 'low',
  dueDate: '',
  displayMode: 'none' as 'none' | 'progress' | 'checkbox',
  subtaskCount: 0
})
const newSubtask = ref('')
const expandedTodos = ref<Set<number>>(new Set())
const editingSubtask = ref<{ todoId: number; subtaskId: number; value: string } | null>(null)

const priorityTheme = {
  high: {
    bg: '#fecaca',
    border: '#ef4444',
    gradient: 'from-red-300 to-red-500'
  },
  medium: {
    bg: '#fde68a',
    border: '#f59e0b',
    gradient: 'from-amber-300 to-amber-500'
  },
  low: {
    bg: '#bbf7d0',
    border: '#22c55e',
    gradient: 'from-emerald-300 to-emerald-500'
  }
}

function getTodoColor(todo: Todo): string {
  return priorityTheme[todo.priority].bg
}

function getTodoBorderColor(todo: Todo): string {
  return priorityTheme[todo.priority].border
}

function getTodoGradient(todo: Todo): string {
  return priorityTheme[todo.priority].gradient
}
const isDragging = ref(false)

const filters = [
  { id: 'all', label: '全部', icon: '📋' },
  { id: 'today', label: '今天', icon: '📅' },
  { id: 'pending', label: '待完成', icon: '⏳' },
  { id: 'completed', label: '已完成', icon: '✅' }
]

const priorityLabels = {
  high: '高',
  medium: '中',
  low: '低'
}

const priorityColors = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-emerald-500'
}

const priorityBgColors = {
  high: 'bg-red-50 border-red-200',
  medium: 'bg-amber-50 border-amber-200',
  low: 'bg-emerald-50 border-emerald-200'
}

const priorityTextColors = {
  high: 'text-red-600',
  medium: 'text-amber-600',
  low: 'text-emerald-600'
}

const priorityProgressColors = {
  high: 'bg-red-400',
  medium: 'bg-amber-400',
  low: 'bg-emerald-400'
}

function getProgress(todo: Todo): { completed: number; total: number; percent: number } {
  if (!todo.subtasks || todo.subtasks.length === 0) {
    return { completed: todo.completed ? 1 : 0, total: 1, percent: todo.completed ? 100 : 0 }
  }
  const completed = todo.subtasks.filter(s => s.completed).length
  const total = todo.subtasks.length
  return { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 }
}

function toggleExpand(todoId: number) {
  if (expandedTodos.value.has(todoId)) {
    expandedTodos.value.delete(todoId)
  } else {
    expandedTodos.value.add(todoId)
  }
}

function openAddModal(todo?: Todo) {
  if (todo) {
    editingTodo.value = todo
    newTodo.value = {
      title: todo.title,
      description: todo.description || '',
      priority: todo.priority,
      dueDate: todo.dueDate || '',
      displayMode: todo.displayMode || 'none',
      subtaskCount: todo.subtasks ? todo.subtasks.length : 0
    }
  } else {
    editingTodo.value = null
    newTodo.value = {
      title: '',
      description: '',
      priority: 'medium',
      dueDate: '',
      displayMode: 'none',
      subtaskCount: 0
    }
  }
  showAddModal.value = true
}

function saveTodo() {
  if (!newTodo.value.title.trim()) return
  
  if (editingTodo.value) {
    const updates: any = {
      title: newTodo.value.title,
      description: newTodo.value.description,
      priority: newTodo.value.priority,
      dueDate: newTodo.value.dueDate,
      displayMode: newTodo.value.displayMode
    }
    if (newTodo.value.displayMode !== 'none') {
      if (!editingTodo.value.subtasks || editingTodo.value.subtasks.length !== newTodo.value.subtaskCount) {
        updates.subtasks = Array.from({ length: newTodo.value.subtaskCount }, (_, i) => ({
          id: Date.now() + i,
          title: `子任务 ${i + 1}`,
          completed: false
        }))
      }
    } else if (editingTodo.value.subtasks) {
      updates.subtasks = undefined
    }
    store.updateTodo(editingTodo.value.id, updates)
  } else {
    const subtasks = newTodo.value.displayMode !== 'none' && newTodo.value.subtaskCount > 0
      ? Array.from({ length: newTodo.value.subtaskCount }, (_, i) => ({
          id: Date.now() + i,
          title: `子任务 ${i + 1}`,
          completed: false
        }))
      : undefined
    
    store.addTodo({
      title: newTodo.value.title,
      description: newTodo.value.description,
      priority: newTodo.value.priority,
      completed: false,
      dueDate: newTodo.value.dueDate,
      displayMode: newTodo.value.displayMode,
      subtasks
    })
  }
  
  closeModal()
}

function deleteTodo(id: number) {
  store.deleteTodo(id)
}

function closeModal() {
  showAddModal.value = false
  editingTodo.value = null
  newTodo.value = {
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    displayMode: 'none',
    subtaskCount: 0
  }
}

function startEditSubtask(todoId: number, subtaskId: number, title: string) {
  editingSubtask.value = { todoId, subtaskId, value: title }
}

function saveEditSubtask() {
  if (editingSubtask.value && editingSubtask.value.value.trim()) {
    store.updateSubtask(editingSubtask.value.todoId, editingSubtask.value.subtaskId, {
      title: editingSubtask.value.value.trim()
    })
  }
  editingSubtask.value = null
}

function cancelEditSubtask() {
  editingSubtask.value = null
}

function handleProgressDragStart(todo: Todo) {
  isDragging.value = true
}

function handleProgressDragEnd(todo: Todo) {
  isDragging.value = false
}

function handleProgressClick(event: MouseEvent, todo: Todo) {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const x = event.clientX - rect.left
  const percent = Math.round((x / rect.width) * 100)
  
  if (todo.subtasks && todo.subtasks.length > 0) {
    const targetCompleted = Math.round((percent / 100) * todo.subtasks.length)
    todo.subtasks.forEach((subtask, index) => {
      subtask.completed = index < targetCompleted
    })
    const allDone = todo.subtasks.every(s => s.completed)
    store.updateTodo(todo.id, { 
      subtasks: [...todo.subtasks],
      completed: allDone 
    })
  } else {
    store.updateTodo(todo.id, { 
      completed: percent >= 50 
    })
  }
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false
  const today = new Date().toISOString().split('T')[0]
  return dueDate < today
}

function addSubtask(todoId: number) {
  if (newSubtask.value.trim()) {
    store.addSubtask(todoId, newSubtask.value.trim())
    newSubtask.value = ''
  }
}
</script>

<template>
  <div class="flex-1 flex flex-col gap-6 p-6">
    <header>
      <h1 class="text-2xl font-bold text-gray-800">待办事项</h1>
      <p class="text-gray-500 mt-1">管理你的日常任务，追踪完成进度</p>
    </header>
    
    <div class="grid grid-cols-4 gap-4">
      <div class="glass-card p-4 flex flex-col items-center justify-center">
        <span class="text-2xl font-bold text-primary">{{ store.stats.total }}</span>
        <span class="text-sm text-gray-500">总任务</span>
      </div>
      <div class="glass-card p-4 flex flex-col items-center justify-center">
        <span class="text-2xl font-bold text-amber-500">{{ store.stats.pending }}</span>
        <span class="text-sm text-gray-500">待完成</span>
      </div>
      <div class="glass-card p-4 flex flex-col items-center justify-center">
        <span class="text-2xl font-bold text-emerald-500">{{ store.stats.completed }}</span>
        <span class="text-sm text-gray-500">已完成</span>
      </div>
      <div class="glass-card p-4 flex flex-col items-center justify-center">
        <span class="text-2xl font-bold text-red-500">{{ store.stats.today }}</span>
        <span class="text-sm text-gray-500">今日待办</span>
      </div>
    </div>
    
    <div class="glass-card p-6 flex-1 overflow-hidden flex flex-col">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <button
            v-for="filter in filters"
            :key="filter.id"
            @click="store.setFilter(filter.id as any)"
            class="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            :class="[
              store.filteredTodos === filter.id 
                ? 'bg-primary text-white' 
                : 'bg-white/50 text-gray-600 hover:bg-white/70'
            ]"
          >
            {{ filter.icon }} {{ filter.label }}
          </button>
        </div>
        
        <button
          @click="openAddModal()"
          class="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white hover:bg-secondary transition-all font-medium text-sm shadow-md shadow-gray-400/50"
        >
          <Plus :size="16" />
          添加任务
        </button>
      </div>
      
      <div class="relative mb-4">
        <Search :size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          v-model="store.searchQuery"
          type="text"
          class="input-field pl-11"
          placeholder="搜索任务..."
        />
      </div>
      
      <div v-if="store.displayedTodos.length === 0" class="flex-1 flex flex-col items-center justify-center text-gray-400">
        <AlertCircle :size="48" class="mb-4 opacity-50" />
        <p>没有找到任务</p>
        <button @click="openAddModal()" class="mt-4 text-primary hover:underline">
          添加第一个任务
        </button>
      </div>
      
      <div v-else class="overflow-y-auto space-y-2" style="max-height: calc(100vh - 380px);">
        <div
          v-for="todo in store.displayedTodos"
          :key="todo.id"
          class="rounded-xl border transition-all group"
          :class="[
            todo.completed 
              ? 'bg-gray-50 border-gray-200 opacity-70' 
              : priorityBgColors[todo.priority]
          ]"
        >
          <div class="p-3 flex items-center gap-3">
            <div
              class="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer"
              :class="[
                todo.completed 
                  ? 'bg-emerald-500 border-emerald-500' 
                  : priorityColors[todo.priority] + ' border-transparent'
              ]"
              @click.stop="store.toggleTodo(todo.id)"
            >
              <svg v-if="todo.completed" :width="12" :height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <div 
              class="flex-1 relative h-10 rounded-lg border-2 bg-gray-100 overflow-hidden cursor-pointer"
              :style="{ borderColor: getTodoBorderColor(todo) }"
              @click="todo.displayMode === 'progress' ? handleProgressClick($event, todo) : () => {}"
            >
              <div 
                v-if="todo.displayMode === 'progress'"
                class="absolute inset-0 transition-all duration-200"
                :style="{ 
                  width: getProgress(todo).percent + '%',
                  backgroundColor: getTodoColor(todo)
                }"
              ></div>
              <div class="relative h-full flex items-center px-3 justify-between">
                <div class="flex items-center gap-2">
                  <h3 
                    class="font-medium text-gray-800 text-sm truncate"
                    :class="[todo.completed ? 'line-through' : '']"
                  >
                    {{ todo.title }}
                  </h3>
                  <span 
                    v-if="todo.displayMode === 'progress'"
                    class="text-xs font-bold px-2 py-0.5 rounded text-white flex-shrink-0 shadow-sm"
                    :style="{ backgroundColor: getTodoBorderColor(todo) }"
                  >
                    {{ getProgress(todo).completed }}/{{ getProgress(todo).total }}
                  </span>
                  <span 
                    v-if="todo.displayMode === 'checkbox'"
                    class="text-xs font-bold px-2 py-0.5 rounded text-white flex-shrink-0 shadow-sm"
                    :style="{ backgroundColor: getTodoBorderColor(todo) }"
                  >
                    {{ todo.subtasks?.filter(s => s.completed).length || 0 }}/{{ todo.subtasks?.length || 0 }}
                  </span>
                </div>
                <div class="flex items-center gap-1 flex-shrink-0">
                  <span 
                    class="px-2 py-0.5 rounded-full text-xs font-medium"
                    :class="[todo.completed ? 'bg-gray-200 text-gray-600' : priorityBgColors[todo.priority] + ' ' + priorityTextColors[todo.priority]]"
                  >
                    {{ priorityLabels[todo.priority] }}
                  </span>
                  <span v-if="todo.dueDate" class="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar :size="12" />
                    <span :class="[isOverdue(todo.dueDate) && !todo.completed ? 'text-red-500' : '']">
                      {{ formatDate(todo.dueDate) }}
                    </span>
                  </span>
                </div>
              </div>
            </div>
            
            <div class="flex items-center gap-1 flex-shrink-0">
              <button
                v-if="todo.displayMode === 'checkbox'"
                @click.stop="toggleExpand(todo.id)"
                class="w-7 h-7 rounded-lg bg-white/50 hover:bg-white/70 flex items-center justify-center"
              >
                <ChevronDown 
                  v-if="expandedTodos.has(todo.id)" 
                  :size="14" 
                  class="text-gray-500" 
                />
                <ChevronRight 
                  v-else 
                  :size="14" 
                  class="text-gray-500" 
                />
              </button>
              <button
                @click.stop="openAddModal(todo)"
                class="w-7 h-7 rounded-lg bg-white/50 hover:bg-white/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg :width="14" :height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                @click.stop="deleteTodo(todo.id)"
                class="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 :size="14" class="text-red-500" />
              </button>
            </div>
          </div>
          
          <div 
            v-if="todo.displayMode === 'checkbox' && expandedTodos.has(todo.id)"
            class="px-3 pb-3"
          >
            <div class="ml-8 space-y-2">
              <div 
                v-if="!todo.subtasks || todo.subtasks.length === 0" 
                class="text-xs text-gray-400 p-3 bg-white/30 rounded-lg border border-dashed border-gray-200 text-center"
              >
                暂无子任务，请点击下方按钮添加
              </div>
              <div
                v-for="subtask in todo.subtasks"
                :key="subtask.id"
                class="flex items-center gap-3 p-2.5 rounded-lg bg-white/60 hover:bg-white/80 transition-all duration-200 group"
              >
                <div
                  class="w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer"
                  :class="[
                    subtask.completed 
                      ? 'bg-emerald-500 border-emerald-500' 
                      : 'border-gray-300 hover:border-emerald-400 hover:bg-emerald-50'
                  ]"
                  @click="store.toggleSubtask(todo.id, subtask.id)"
                >
                  <svg 
                    v-if="subtask.completed" 
                    :width="10" 
                    :height="10" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="white" 
                    stroke-width="3"
                    class="transition-transform duration-200"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <template v-if="editingSubtask?.todoId === todo.id && editingSubtask?.subtaskId === subtask.id">
                  <input
                    v-model="editingSubtask.value"
                    type="text"
                    class="flex-1 px-3 py-1.5 text-xs border-2 border-primary/40 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white shadow-sm"
                    @keyup.enter="saveEditSubtask"
                    @keyup.esc="cancelEditSubtask"
                    @blur="saveEditSubtask"
                    ref="(el: any) => el && el.focus()"
                  />
                </template>
                <span 
                  v-else
                  class="text-xs flex-1 cursor-pointer rounded px-2 py-1 transition-all"
                  :class="[
                    subtask.completed 
                      ? 'text-gray-400 line-through' 
                      : 'text-gray-700 hover:bg-white/60'
                  ]"
                  @click="startEditSubtask(todo.id, subtask.id, subtask.title)"
                >
                  {{ subtask.title }}
                </span>
                <button
                  @click.stop="store.removeSubtask(todo.id, subtask.id)"
                  class="w-6 h-6 rounded-lg hover:bg-red-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X :size="12" class="text-red-500" />
                </button>
              </div>
              <div class="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                <input
                  v-model="newSubtask"
                  type="text"
                  class="flex-1 px-3 py-2 text-xs border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 bg-white/80 placeholder-gray-400 transition-all"
                  placeholder="添加子任务..."
                  @keyup.enter="addSubtask(todo.id)"
                />
                <button
                  @click="addSubtask(todo.id)"
                  class="w-8 h-8 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-all hover:scale-105"
                >
                  <Plus :size="14" class="text-primary" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <Teleport to="body">
      <div
        v-if="showAddModal"
        class="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        @click.self="closeModal"
      >
        <div class="glass-card w-full max-w-md p-6 animate-scale-in">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-gray-800">{{ editingTodo ? '编辑任务' : '添加任务' }}</h2>
            <button @click="closeModal" class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
              <X :size="18" class="text-gray-500" />
            </button>
          </div>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">标题</label>
              <input
                v-model="newTodo.title"
                type="text"
                class="input-field"
                placeholder="输入任务标题"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">描述</label>
              <textarea
                v-model="newTodo.description"
                class="input-field resize-none"
                rows="3"
                placeholder="输入任务描述"
              />
            </div>
            
            <div class="flex gap-4">
              <div class="flex-1">
                <label class="block text-sm font-medium text-gray-700 mb-2">优先级</label>
                <select v-model="newTodo.priority" class="input-field">
                  <option value="high">高优先级</option>
                  <option value="medium">中优先级</option>
                  <option value="low">低优先级</option>
                </select>
              </div>
              <div class="flex-1">
                <label class="block text-sm font-medium text-gray-700 mb-2">截止日期</label>
                <input
                  v-model="newTodo.dueDate"
                  type="date"
                  class="input-field"
                />
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">进度显示</label>
              <select v-model="newTodo.displayMode" class="input-field">
                <option value="none">无</option>
                <option value="progress">进度条</option>
                <option value="checkbox">多个事项复选框</option>
              </select>
            </div>
            
            <div v-if="newTodo.displayMode !== 'none'">
              <label class="block text-sm font-medium text-gray-700 mb-2">子任务数量</label>
              <input
                v-model.number="newTodo.subtaskCount"
                type="number"
                min="0"
                max="50"
                class="input-field"
                placeholder="输入子任务数量"
              />
            </div>
          </div>
          
          <div class="flex gap-3 mt-6">
            <button
              v-if="editingTodo"
              @click="deleteTodo(editingTodo.id)"
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
              @click="saveTodo"
              :disabled="!newTodo.title.trim()"
              class="flex-1 px-4 py-3 rounded-xl bg-primary text-white hover:bg-secondary transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-gray-400/50"
            >
              {{ editingTodo ? '保存' : '添加' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
