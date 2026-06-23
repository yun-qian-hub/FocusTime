﻿<script setup lang="ts">
import { Calendar, CheckSquare, StickyNote, Bell, Star, Database, Layers, BookOpen, Timer } from 'lucide-vue-next'
import type { TabType } from '@/types'

defineProps<{
  activeTab: TabType
}>()

const emit = defineEmits<{
  (e: 'tabChange', tab: TabType): void
}>()

const tabs: { id: TabType; icon: typeof Calendar; label: string }[] = [
  { id: 'calendar', icon: Calendar, label: '日历' },
  { id: 'todo', icon: CheckSquare, label: '待办' },
  { id: 'notes', icon: StickyNote, label: '便签' },
  { id: 'alarm', icon: Bell, label: '闹钟' },
  { id: 'important', icon: Star, label: '重要' },
  { id: 'period', icon: Layers, label: '周期' },
  { id: 'schedule', icon: BookOpen, label: '课表' },
  { id: 'pomodoro', icon: Timer, label: '番茄' },
  { id: 'datamanager', icon: Database, label: '数据' }
]
</script>
<template>
  <aside class="w-20 glass-card flex flex-col items-center py-6 gap-4">
    <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xl font-bold shadow-lg">      
      T
    </div>

    <nav class="flex-1 flex flex-col gap-2 mt-4">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="emit('tabChange', tab.id)"
        class="w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-300 group relative"
        :class="[
          activeTab === tab.id
            ? 'bg-primary text-white shadow-lg shadow-primary/30'
            : 'text-gray-600 hover:bg-white/50 hover:text-primary'
        ]"
      >
        <component :is="tab.icon" :size="22" />
        <span class="text-xs font-medium">{{ tab.label }}</span>

        <div
          v-if="activeTab === tab.id"
          class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"
        />
      </button>
    </nav>

    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white cursor-pointer hover:scale-110 transition-transform">
      <span class="text-sm font-bold">Y</span>
    </div>
  </aside>
</template>
