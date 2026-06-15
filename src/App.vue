<script setup lang="ts">
import { ref } from 'vue'
import Sidebar from '@/components/Layout/Sidebar.vue'
import Calendar from '@/components/Calendar/Calendar.vue'
import Todo from '@/components/Todo/Todo.vue'
import Notes from '@/components/Notes/Notes.vue'
import Alarm from '@/components/Alarm/Alarm.vue'
import Important from '@/components/Important/Important.vue'
import Period from '@/components/Period/Period.vue'
import DataManager from '@/components/DataManager/DataManager.vue'
import type { TabType } from '@/types'

const activeTab = ref<TabType>('calendar')

function handleTabChange(tab: TabType) {
  activeTab.value = tab
}
</script>

<template>
  <div class="flex h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-white overflow-hidden">
    <Sidebar :activeTab="activeTab" @tabChange="handleTabChange" />
    
    <main class="flex-1 overflow-hidden">
      <Transition name="fade">
        <Calendar v-if="activeTab === 'calendar'" key="calendar" />
        <Todo v-else-if="activeTab === 'todo'" key="todo" />
        <Notes v-else-if="activeTab === 'notes'" key="notes" />
        <Alarm v-else-if="activeTab === 'alarm'" key="alarm" />
        <Important v-else-if="activeTab === 'important'" key="important" />
        <Period v-else-if="activeTab === 'period'" key="period" />
        <DataManager v-else-if="activeTab === 'datamanager'" key="datamanager" />
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
