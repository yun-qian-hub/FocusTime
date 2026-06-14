<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Plus, X, Trash2, Bell, BellOff, Repeat } from 'lucide-vue-next'
import { useAlarmStore } from '@/stores/alarm'
import type { Alarm } from '@/types'

const store = useAlarmStore()

const showAddModal = ref(false)
const editingAlarm = ref<Alarm | null>(null)
const newAlarm = ref({
  time: '08:00',
  label: '',
  repeat: 'none' as Alarm['repeat'],
  ringtone: 'default'
})

const repeatOptions = [
  { value: 'none', label: '仅一次' },
  { value: 'daily', label: '每天' },
  { value: 'weekday', label: '工作日' },
  { value: 'weekend', label: '周末' }
]

const ringtones = [
  { value: 'default', label: '默认铃声' },
  { value: 'digital', label: '电子铃声' },
  { value: 'chime', label: '钟声' },
  { value: 'nature', label: '自然音效' }
]

let intervalId: number | null = null

onMounted(() => {
  if ('Notification' in window) {
    Notification.requestPermission()
  }
  
  intervalId = window.setInterval(() => {
    store.checkAlarms()
  }, 60000)
  
  store.checkAlarms()
})

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId)
  }
})

function openAddModal(alarm?: Alarm) {
  if (alarm) {
    editingAlarm.value = alarm
    newAlarm.value = {
      time: alarm.time,
      label: alarm.label || '',
      repeat: alarm.repeat,
      ringtone: alarm.ringtone
    }
  } else {
    editingAlarm.value = null
    newAlarm.value = {
      time: '08:00',
      label: '',
      repeat: 'none',
      ringtone: 'default'
    }
  }
  showAddModal.value = true
}

function saveAlarm() {
  if (!newAlarm.value.time) return
  
  if (editingAlarm.value) {
    store.updateAlarm(editingAlarm.value.id, newAlarm.value)
  } else {
    store.addAlarm(newAlarm.value.time, newAlarm.value.label, newAlarm.value.repeat, newAlarm.value.ringtone)
  }
  
  closeModal()
}

function deleteAlarm(id: number) {
  store.deleteAlarm(id)
}

function closeModal() {
  showAddModal.value = false
  editingAlarm.value = null
  newAlarm.value = {
    time: '08:00',
    label: '',
    repeat: 'none',
    ringtone: 'default'
  }
}

function getRepeatLabel(repeat: Alarm['repeat']): string {
  if (Array.isArray(repeat)) {
    return repeat.join(' ')
  }
  const option = repeatOptions.find(o => o.value === repeat)
  return option?.label || '仅一次'
}

function getRingtoneLabel(ringtone: string): string {
  const option = ringtones.find(o => o.value === ringtone)
  return option?.label || '默认铃声'
}
</script>

<template>
  <div class="flex-1 flex flex-col gap-6 p-6">
    <header>
      <h1 class="text-2xl font-bold text-gray-800">闹钟</h1>
      <p class="text-gray-500 mt-1">设置提醒，不错过重要时刻</p>
    </header>
    
    <div class="glass-card p-6 flex-1 overflow-hidden flex flex-col">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <button
            class="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            :class="[
              store.sortedAlarms.length === store.activeAlarms.length
                ? 'bg-primary text-white'
                : 'bg-white/50 text-gray-600 hover:bg-white/70'
            ]"
          >
            全部 ({{ store.sortedAlarms.length }})
          </button>
          <button
            class="px-4 py-2 rounded-xl text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-all"
          >
            已启用 ({{ store.activeAlarms.length }})
          </button>
        </div>
        
        <button
          @click="openAddModal()"
          class="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white hover:bg-secondary transition-all font-medium text-sm"
        >
          <Plus :size="16" />
          添加闹钟
        </button>
      </div>
      
      <div v-if="store.sortedAlarms.length === 0" class="flex-1 flex flex-col items-center justify-center text-gray-400">
        <Bell :size="48" class="mb-4 opacity-50" />
        <p>还没有设置闹钟</p>
        <button @click="openAddModal()" class="mt-4 text-primary hover:underline">
          设置第一个闹钟
        </button>
      </div>
      
      <div v-else class="flex-1 overflow-y-auto space-y-3 scrollbar-hide">
        <div
          v-for="alarm in store.sortedAlarms"
          :key="alarm.id"
          class="p-4 rounded-xl bg-white/50 hover:bg-white/70 transition-all flex items-center justify-between"
        >
          <div class="flex items-center gap-4">
            <button
              @click="store.toggleAlarm(alarm.id)"
              class="w-14 h-14 rounded-full flex items-center justify-center transition-all"
              :class="[
                alarm.enabled 
                  ? 'bg-emerald-500 text-white shadow-lg shadow-gray-400/50 ring-2 ring-emerald-500 ring-offset-2' 
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              ]"
            >
              <Bell v-if="alarm.enabled" :size="26" />
              <BellOff v-else :size="26" />
            </button>
            
            <div>
              <div class="flex items-center gap-2">
                <span class="text-2xl font-bold text-gray-800">{{ alarm.time }}</span>
                <span v-if="alarm.label" class="text-gray-500">{{ alarm.label }}</span>
              </div>
              <div class="flex items-center gap-4 mt-1 text-sm text-gray-500">
                <span class="flex items-center gap-1">
                  <Repeat :size="14" />
                  {{ getRepeatLabel(alarm.repeat) }}
                </span>
                <span>{{ getRingtoneLabel(alarm.ringtone) }}</span>
              </div>
            </div>
          </div>
          
          <div class="flex items-center gap-2">
            <button
              @click="openAddModal(alarm)"
              class="w-8 h-8 rounded-lg bg-white/50 hover:bg-white/70 flex items-center justify-center"
            >
              <svg :width="16" :height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              @click="deleteAlarm(alarm.id)"
              class="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center"
            >
              <Trash2 :size="16" class="text-red-500" />
            </button>
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
            <h2 class="text-xl font-bold text-gray-800">{{ editingAlarm ? '编辑闹钟' : '添加闹钟' }}</h2>
            <button @click="closeModal" class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
              <X :size="18" class="text-gray-500" />
            </button>
          </div>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">时间</label>
              <input
                v-model="newAlarm.time"
                type="time"
                class="input-field text-xl font-bold"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">标签</label>
              <input
                v-model="newAlarm.label"
                type="text"
                class="input-field"
                placeholder="给闹钟起个名字..."
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">重复</label>
              <select v-model="newAlarm.repeat" class="input-field">
                <option v-for="option in repeatOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">铃声</label>
              <select v-model="newAlarm.ringtone" class="input-field">
                <option v-for="ringtone in ringtones" :key="ringtone.value" :value="ringtone.value">
                  {{ ringtone.label }}
                </option>
              </select>
            </div>
          </div>
          
          <div class="flex gap-3 mt-6">
            <button
              v-if="editingAlarm"
              @click="deleteAlarm(editingAlarm.id)"
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
              @click="saveAlarm"
              :disabled="!newAlarm.time"
              class="flex-1 px-4 py-3 rounded-xl bg-primary text-white hover:bg-secondary transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ editingAlarm ? '保存' : '添加' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
    
    <Teleport to="body">
      <div
        v-if="store.isAlarmRinging"
        class="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[100] p-4"
      >
        <div class="glass-card w-full max-w-sm p-8 text-center animate-bounce-in">
          <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-primary flex items-center justify-center text-white">
            <Bell :size="40" class="animate-bounce" />
          </div>
          <h2 class="text-2xl font-bold text-gray-800 mb-2">闹钟响了！</h2>
          <p class="text-xl text-gray-600">{{ store.ringingAlarm?.time }}</p>
          <p v-if="store.ringingAlarm?.label" class="text-gray-500 mt-1">{{ store.ringingAlarm.label }}</p>
          <button
            @click="store.dismissAlarm()"
            class="mt-6 px-8 py-3 rounded-xl bg-primary text-white hover:bg-secondary transition-all font-medium text-lg"
          >
            关闭闹钟
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>