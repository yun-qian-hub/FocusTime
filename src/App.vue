<script setup lang="ts">
import { ref } from 'vue'
import Sidebar from '@/components/Layout/Sidebar.vue'
import Calendar from '@/components/Calendar/Calendar.vue'
import Todo from '@/components/Todo/Todo.vue'
import Notes from '@/components/Notes/Notes.vue'
import Alarm from '@/components/Alarm/Alarm.vue'
import Important from '@/components/Important/Important.vue'
import Plan from '@/components/Plan/Plan.vue'
import Schedule from '@/components/Schedule/Schedule.vue'
import DataManager from '@/components/DataManager/DataManager.vue'
import Pomodoro from '@/components/Pomodoro/Pomodoro.vue'
import type { TabType } from '@/types'

const activeTab = ref<TabType>('calendar')

const components = {
  calendar: Calendar,
  todo: Todo,
  notes: Notes,
  alarm: Alarm,
  important: Important,
  plan: Plan,
  schedule: Schedule,
  pomodoro: Pomodoro,
  datamanager: DataManager
}

function getComponent(tab: TabType) {
  return components[tab]
}

function handleTabChange(tab: TabType) {
  activeTab.value = tab
}
</script>

<template>
  <div class="flex h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-white overflow-hidden">
    <Sidebar :activeTab="activeTab" @tabChange="handleTabChange" />
    
    <main class="flex-1 overflow-auto">
      <Transition name="fade" mode="out-in">
        <component :is="getComponent(activeTab)" :key="activeTab" />
      </Transition>
    </main>
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>