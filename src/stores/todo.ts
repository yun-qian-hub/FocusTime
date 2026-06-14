import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Todo } from '@/types'
import { getTodos, saveTodos } from '@/utils/storage'

export const useTodoStore = defineStore('todo', () => {
  const todos = ref<Todo[]>(getTodos())
  
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
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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
  
  function updateTodo(id: number, updates: Partial<Pick<Todo, 'title' | 'description' | 'priority' | 'dueDate' | 'parentId' | 'eventType' | 'completed'>>) {
    const todo = todos.value.find(t => t.id === id)
    if (todo) {
      Object.assign(todo, updates)
      todo.updatedAt = new Date().toISOString()
      saveTodos(todos.value)
    }
  }
  
  function deleteTodo(id: number) {
    todos.value = todos.value.filter(t => t.id !== id)
    saveTodos(todos.value)
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
    setSearch
  }
})