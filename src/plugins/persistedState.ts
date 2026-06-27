import type { PiniaPluginContext } from 'pinia'

const OLD_KEY_MAPPING: Record<string, string> = {
  todo: 'task_manager_todos',
  calendar: 'task_manager_events',
  notes: 'task_manager_notes',
  secureNotes: 'task_manager_secure_notes',
  alarm: 'task_manager_alarms',
  important: 'task_manager_important_events',
  plan: 'task_manager_plan_items',
  schedule: 'task_manager_schedule_courses',
  pomodoro: 'task_manager_pomodoro_settings'
}

function serialize(value: any): string {
  try {
    return JSON.stringify(value)
  } catch {
    return ''
  }
}

function deserialize(value: string): any {
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

export function createPersistedStatePlugin() {
  return (context: PiniaPluginContext) => {
    const { store, options } = context
    
    if (!options.persist) return
    
    const { key, paths } = options.persist as {
      key?: string
      paths?: string[]
    }
    
    const storageKey = key || `pinia_${store.$id}`
    
    let saved = localStorage.getItem(storageKey)
    
    if (!saved && OLD_KEY_MAPPING[store.$id]) {
      const oldKey = OLD_KEY_MAPPING[store.$id]
      const oldData = localStorage.getItem(oldKey)
      if (oldData) {
        try {
          const parsed = JSON.parse(oldData)
          if (store.$id === 'schedule') {
            const settings = localStorage.getItem('task_manager_schedule_settings')
            const overrides = localStorage.getItem('task_manager_schedule_overrides')
            saved = serialize({
              courses: parsed,
              settings: settings ? JSON.parse(settings) : {},
              overrides: overrides ? JSON.parse(overrides) : [],
              currentWeekOffset: 0
            })
          } else if (store.$id === 'pomodoro') {
            const sessions = localStorage.getItem('task_manager_pomodoro_sessions')
            saved = serialize({
              settings: parsed,
              sessions: sessions ? JSON.parse(sessions) : [],
              completedCycles: 0,
              totalFocusTime: 0
            })
          } else if (store.$id === 'plan') {
            const statuses = localStorage.getItem('task_manager_plan_statuses')
            const legacyPeriod = localStorage.getItem('task_manager_period_events')
            let items = parsed
            if (legacyPeriod && !parsed.length) {
              items = JSON.parse(legacyPeriod).map((e: any) => ({
                ...e, planType: 'period', priority: 'medium',
                status: e.completed ? '已完成' : '待开始', syncToCalendar: true,
                progressMode: 'task', progress: e.progress || 0
              }))
            }
            saved = serialize({
              items: items,
              statuses: statuses ? JSON.parse(statuses) : ['待开始', '进行中', '已完成']
            })
          } else if (store.$id === 'calendar') {
            saved = serialize({
              events: parsed,
              showCompleted: true
            })
          } else if (store.$id === 'todo') {
            saved = serialize({
              todos: parsed,
              filteredTodos: 'all',
              searchQuery: ''
            })
          } else if (store.$id === 'notes') {
            saved = serialize({
              notes: parsed,
              selectedNoteId: null
            })
          } else if (store.$id === 'secureNotes') {
            saved = serialize({
              notes: parsed,
              selectedNoteId: null,
              unlockedContent: '',
              unlockedPassword: ''
            })
          } else if (store.$id === 'important') {
            saved = serialize({
              events: parsed
            })
          } else if (store.$id === 'alarm') {
            saved = serialize({
              alarms: parsed,
              isAlarmRinging: false,
              ringingAlarm: null,
              lastTriggeredTime: ''
            })
          } else {
            saved = serialize({ [getMainStateKey(store.$id)]: parsed })
          }
          
          localStorage.setItem(storageKey, saved)
        } catch {}
      }
    }
    
    if (saved) {
      const parsed = deserialize(saved)
      
      const stateKeys = Object.keys(store.$state)
      const sanitized: Record<string, any> = {}
      for (const key of stateKeys) {
        if (parsed[key] !== undefined) {
          sanitized[key] = parsed[key]
        }
      }
      
      if (paths) {
        paths.forEach(path => {
          const parts = path.split('.')
          let target = store.$state
          let source = sanitized
          let found = true
          for (let i = 0; i < parts.length - 1; i++) {
            if (target[parts[i]] === undefined || source[parts[i]] === undefined) {
              found = false
              break
            }
            target = target[parts[i]]
            source = source[parts[i]]
          }
          if (found && source[parts[parts.length - 1]] !== undefined) {
            target[parts[parts.length - 1]] = source[parts[parts.length - 1]]
          }
        })
      } else {
        store.$patch(sanitized)
      }
    }
    
    store.$subscribe((_mutation, state) => {
      if (paths) {
        const partialState: Record<string, any> = {}
        paths.forEach(path => {
          const parts = path.split('.')
          let value = state
          for (const part of parts) {
            if (value === undefined) break
            value = value[part]
          }
          let target = partialState
          for (let i = 0; i < parts.length - 1; i++) {
            if (!target[parts[i]]) target[parts[i]] = {}
            target = target[parts[i]]
          }
          target[parts[parts.length - 1]] = value
        })
        localStorage.setItem(storageKey, serialize(partialState))
      } else {
        localStorage.setItem(storageKey, serialize(state))
      }
    })
  }
}

function getMainStateKey(storeId: string): string {
  const keyMap: Record<string, string> = {
    alarm: 'alarms',
    important: 'events'
  }
  return keyMap[storeId] || storeId + 's'
}