import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Todo, TodoSubtask } from '@/types'
import { getTodos, saveTodos } from '@/utils/storage'

export const useTodoStore = defineStore('todo', () => {
  const todos = ref<Todo[]>([])
  
  const filteredTodos = ref<'all' | 'today' | 'completed' | 'pending'>('all')
  const searchQuery = ref('')
  
  const displayedTodos = computed(() => {
    let result = todos.value
    
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      result = result.filter(t => 
        t.title.toLowerCase().includes(query) || 
        (t.description && t.description.toLowerCase().includes(query))
      )
    }
    
    switch (filteredTodos.value) {
      case 'today':
        const today = new Date().toISOString().split('T')[0]
        result = result.filter(t => t.dueDate === today)
        break
      case 'completed':
        result = result.filter(t => t.completed)
        break
      case 'pending':
        result = result.filter(t => !t.completed)
        break
    }
    
    return result.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      }
      if (a.dueDate) return -1
      if (b.dueDate) return 1
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
  })
  
  const stats = computed(() => ({
    total: todos.value.length,
    completed: todos.value.filter(t => t.completed).length,
    pending: todos.value.filter(t => !t.completed).length,
    today: todos.value.filter(t => {
      const today = new Date().toISOString().split('T')[0]
      return t.dueDate === today && !t.completed
    }).length
  }))
  
  function addTodo(todoData: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString()
    const newTodo: Todo = {
      ...todoData,
      id: Date.now(),
      createdAt: now,
      updatedAt: now
    }
    todos.value.unshift(newTodo)
    saveTodos(todos.value)
  }
  
  function toggleTodo(id: number) {
    const todo = todos.value.find(t => t.id === id)
    if (todo) {
      todo.completed = !todo.completed
      todo.updatedAt = new Date().toISOString()
      saveTodos(todos.value)
    }
  }
  
  function updateTodo(id: number, updates: Partial<Pick<Todo, 'title' | 'description' | 'priority' | 'dueDate' | 'parentId' | 'eventType' | 'completed' | 'subtasks' | 'displayMode'>> & { subtasks?: TodoSubtask[] | undefined }) {
    const todo = todos.value.find(t => t.id === id)
    if (todo) {
      if ('subtasks' in updates && updates.subtasks === undefined) {
        delete (todo as any).subtasks
      } else {
        Object.assign(todo, updates)
      }
      todo.updatedAt = new Date().toISOString()
      saveTodos(todos.value)
    }
  }
  
  function deleteTodo(id: number) {
    todos.value = todos.value.filter(t => t.id !== id)
    saveTodos(todos.value)
  }
  
  function toggleSubtask(todoId: number, subtaskId: number) {
    const todo = todos.value.find(t => t.id === todoId)
    if (todo && todo.subtasks) {
      const subtask = todo.subtasks.find(s => s.id === subtaskId)
      if (subtask) {
        subtask.completed = !subtask.completed
        todo.updatedAt = new Date().toISOString()
        
        const allDone = todo.subtasks.every(s => s.completed)
        const anyDone = todo.subtasks.some(s => s.completed)
        if (allDone) {
          todo.completed = true
        } else if (!anyDone) {
          todo.completed = false
        }
        saveTodos(todos.value)
      }
    }
  }
  
  function addSubtask(todoId: number, title: string) {
    const todo = todos.value.find(t => t.id === todoId)
    if (todo) {
      if (!todo.subtasks) {
        todo.subtasks = []
      }
      const newSubtask: TodoSubtask = {
        id: Date.now(),
        title,
        completed: false
      }
      todo.subtasks.push(newSubtask)
      todo.updatedAt = new Date().toISOString()
      saveTodos(todos.value)
    }
  }
  
  function removeSubtask(todoId: number, subtaskId: number) {
    const todo = todos.value.find(t => t.id === todoId)
    if (todo && todo.subtasks) {
      todo.subtasks = todo.subtasks.filter(s => s.id !== subtaskId)
      todo.updatedAt = new Date().toISOString()
      
      const allDone = todo.subtasks.length > 0 && todo.subtasks.every(s => s.completed)
      todo.completed = allDone
      saveTodos(todos.value)
    }
  }
  
  function updateSubtask(todoId: number, subtaskId: number, updates: Partial<Pick<TodoSubtask, 'title' | 'completed'>>) {
    const todo = todos.value.find(t => t.id === todoId)
    if (todo && todo.subtasks) {
      const subtask = todo.subtasks.find(s => s.id === subtaskId)
      if (subtask) {
        Object.assign(subtask, updates)
        todo.updatedAt = new Date().toISOString()
        
        const allDone = todo.subtasks.every(s => s.completed)
        const anyDone = todo.subtasks.some(s => s.completed)
        if (allDone) {
          todo.completed = true
        } else if (!anyDone) {
          todo.completed = false
        }
        saveTodos(todos.value)
      }
    }
  }
  
  function setFilter(filter: 'all' | 'today' | 'completed' | 'pending') {
    filteredTodos.value = filter
  }
  
  function setSearch(query: string) {
    searchQuery.value = query
  }
  
  return {
    todos,
    filteredTodos,
    searchQuery,
    displayedTodos,
    stats,
    addTodo,
    toggleTodo,
    updateTodo,
    deleteTodo,
    setFilter,
    setSearch,
    toggleSubtask,
    addSubtask,
    removeSubtask,
    updateSubtask
  }
}, { persist: true })