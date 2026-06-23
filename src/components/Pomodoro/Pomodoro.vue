<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Play, Pause, Square, RotateCcw, Settings, Timer, Coffee, Sun, Zap, BarChart3, Clock, CheckCircle } from 'lucide-vue-next'
import { usePomodoroStore } from '@/stores/pomodoro'

const store = usePomodoroStore()

const showSettings = ref(false)
const localSettings = ref({ ...store.settings })

const timerColors = {
  focus: {
    primary: '#ef4444',
    secondary: '#f97316',
    bg: 'bg-gradient-to-br from-red-50 to-orange-50',
    ring: 'text-red-500',
    glow: 'shadow-red-500/30',
    gradient: 'linear-gradient(135deg, #ef4444, #f97316)'
  },
  shortBreak: {
    primary: '#22c55e',
    secondary: '#10b981',
    bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
    ring: 'text-green-500',
    glow: 'shadow-green-500/30',
    gradient: 'linear-gradient(135deg, #22c55e, #10b981)'
  },
  idle: {
    primary: '#6b7280',
    secondary: '#9ca3af',
    bg: 'bg-gradient-to-br from-gray-50 to-slate-50',
    ring: 'text-gray-400',
    glow: 'shadow-gray-400/30',
    gradient: 'linear-gradient(135deg, #6b7280, #9ca3af)'
  }
}

const currentColor = computed(() => timerColors[store.currentStatus as keyof typeof timerColors])
const progressDegrees = computed(() => (store.getProgress() / 100) * 360)

onMounted(() => {
  store.initializeTimer()
})

onUnmounted(() => {
  store.cleanTimer()
})

function toggleTimer() {
  if (store.isRunning) {
    store.pauseSession()
  } else {
    store.startSession()
  }
}

function stopTimer() {
  store.stopSession()
}

function resetTimer() {
  store.resetTimer()
}

function saveSettings() {
  store.updateSettings(localSettings.value)
  showSettings.value = false
}

function formatMinutes(minutes: number): string {
  return Math.round(minutes).toString()
}

function formatSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  return secs.toString()
}

const statusLabels: Record<string, string> = {
  focus: '专注时间',
  shortBreak: '短休息',
  idle: '准备开始'
}

const statusIcons: Record<string, typeof Timer> = {
  focus: Zap,
  shortBreak: Coffee,
  idle: Timer
}
</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <header class="p-6 border-b border-gray-200 bg-white">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">番茄钟</h1>
          <p class="text-gray-500 mt-1">保持专注，高效工作</p>
        </div>
        <button @click="showSettings = true" class="p-3 rounded-xl hover:bg-gray-100 transition-all hover:scale-105">
          <Settings :size="20" class="text-gray-600" />
        </button>
      </div>
    </header>
    
    <div class="flex-1 overflow-auto p-6">
      <div class="max-w-5xl mx-auto">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div class="lg:col-span-2">
            <div class="bg-white rounded-3xl shadow-xl p-10">
              <div class="flex justify-center mb-8">
                <div class="flex gap-3">
                  <button 
                    @click="store.switchToFocus(); store.pauseSession()" 
                    class="flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105" 
                    :class="store.currentStatus === 'focus' ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/40' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
                  >
                    <Zap :size="18" />
                    <span class="text-sm font-semibold">专注</span>
                  </button>
                  <button 
                    @click="store.switchToShortBreak(); store.pauseSession()" 
                    class="flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105" 
                    :class="store.currentStatus === 'shortBreak' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/40' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
                  >
                    <Coffee :size="18" />
                    <span class="text-sm font-semibold">短休息</span>
                  </button>
                </div>
              </div>
              
              <div class="relative w-80 h-80 mx-auto">
                <svg class="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <defs>
                    <linearGradient :id="'progress-gradient'" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" :style="{ stopColor: currentColor.primary }" />
                      <stop offset="100%" :style="{ stopColor: currentColor.secondary }" />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#f3f4f6" stroke-width="8" />
                  <circle 
                    cx="60" cy="60" r="52" fill="none" 
                    stroke="url(#progress-gradient)" stroke-width="8" 
                    stroke-linecap="round" 
                    :stroke-dasharray="`${progressDegrees * 0.87} 326`" 
                    class="transition-all duration-1000 ease-linear"
                    filter="url(#glow)"
                  />
                  
                  <circle 
                    cx="60" cy="60" r="44" fill="none" 
                    stroke="rgba(255,255,255,0.3)" stroke-width="1" 
                    class="animate-pulse"
                  />
                </svg>
                
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                  <div 
                    class="w-24 h-24 rounded-full flex items-center justify-center mb-4 transition-all duration-500 transform" 
                    :class="[currentColor.bg, currentColor.glow, 'shadow-xl']"
                    :style="{ boxShadow: `0 0 40px ${currentColor.primary}30, inset 0 0 20px ${currentColor.primary}10` }"
                  >
                    <component :is="statusIcons[store.currentStatus]" :size="40" :class="currentColor.ring" />
                  </div>
                  <div class="text-center">
                    <span 
                      class="text-7xl font-bold tracking-tight transition-all duration-300" 
                      :style="{ background: currentColor.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }"
                    >
                      {{ store.getFormattedTime() }}
                    </span>
                    <p class="text-gray-500 mt-3 text-sm font-medium">{{ statusLabels[store.currentStatus] }}</p>
                  </div>
                </div>
              </div>
              
              <div class="flex justify-center items-center gap-6 mt-10">
                <button 
                  @click="stopTimer" 
                  class="flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-300 hover:scale-110 hover:shadow-lg" 
                  title="停止"
                >
                  <Square :size="28" />
                </button>
                <button 
                  @click="toggleTimer" 
                  class="flex items-center justify-center w-24 h-24 rounded-full transition-all duration-300 hover:scale-110 shadow-2xl transform" 
                  :style="{ background: currentColor.gradient, boxShadow: `0 10px 40px ${currentColor.primary}40` }" 
                  title="开始/暂停"
                >
                  <Play v-if="!store.isRunning" :size="40" class="text-white ml-2" />
                  <Pause v-else :size="40" class="text-white" />
                </button>
                <button 
                  @click="resetTimer" 
                  class="flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-300 hover:scale-110 hover:shadow-lg" 
                  title="重置"
                >
                  <RotateCcw :size="28" />
                </button>
              </div>
              
              <div v-if="store.completedCycles > 0" class="flex justify-center gap-3 mt-8">
                <div 
                  v-for="i in store.settings.targetCycles" 
                  :key="i" 
                  class="w-4 h-4 rounded-full transition-all duration-300 transform" 
                  :class="i <= store.completedCycles ? 'bg-gradient-to-br from-red-500 to-orange-500 scale-110 shadow-lg shadow-red-500/50' : 'bg-gray-200'" 
                />
                <span class="ml-2 text-sm text-gray-500 font-medium">{{ store.completedCycles }}/{{ store.settings.targetCycles }} 轮</span>
              </div>
            </div>
          </div>
          
          <div class="space-y-6">
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <div class="flex items-center gap-2 mb-5">
                <BarChart3 :size="20" class="text-gray-600" />
                <h3 class="font-bold text-gray-800 text-lg">今日统计</h3>
              </div>
              
              <div class="space-y-4">
                <div class="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl">
                  <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center">
                      <Clock :size="20" class="text-red-500" />
                    </div>
                    <div>
                      <p class="text-xs text-gray-500 font-medium">专注时长</p>
                      <p class="text-2xl font-bold" :style="{ background: 'linear-gradient(135deg, #ef4444, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }">
                        {{ formatMinutes(store.todayFocusMinutes) }}<span class="text-sm font-normal text-gray-400 ml-1">分钟</span>
                      </p>
                    </div>
                  </div>
                </div>
                
                <div class="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                  <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                      <CheckCircle :size="20" class="text-green-500" />
                    </div>
                    <div>
                      <p class="text-xs text-gray-500 font-medium">完成番茄</p>
                      <p class="text-2xl font-bold" :style="{ background: 'linear-gradient(135deg, #22c55e, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }">
                        {{ store.todayCompletedCycles }}<span class="text-sm font-normal text-gray-400 ml-1">个</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <div class="flex items-center gap-2 mb-5">
                <Timer :size="20" class="text-gray-600" />
                <h3 class="font-bold text-gray-800 text-lg">最近记录</h3>
              </div>
              
              <div v-if="store.todaySessions.length > 0" class="space-y-3">
                <div 
                  v-for="session in store.todaySessions.slice(0, 5)" 
                  :key="session.id" 
                  class="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all"
                >
                  <div class="flex items-center gap-2">
                    <div 
                      class="w-3 h-3 rounded-full" 
                      :class="session.status === 'focus' ? 'bg-gradient-to-br from-red-500 to-orange-500' : session.status === 'shortBreak' ? 'bg-gradient-to-br from-green-500 to-emerald-500' : 'bg-gradient-to-br from-blue-500 to-indigo-500'" 
                    />
                    <span class="text-sm font-medium text-gray-700">
                      {{ session.status === 'focus' ? '专注' : session.status === 'shortBreak' ? '短休息' : '长休息' }}
                    </span>
                  </div>
                  <span class="text-sm text-gray-500 font-medium">{{ formatMinutes(session.focusTime) }}分钟</span>
                </div>
              </div>
              <div v-else class="text-center py-8 text-gray-400">
                <Timer :size="28" class="mx-auto mb-3 opacity-50" />
                <p class="text-sm">暂无记录</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <Teleport to="body">
      <div v-if="showSettings" class="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4" @click.self="showSettings = false">
        <div class="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 transform transition-all duration-300">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-gray-800">番茄钟设置</h2>
            <button @click="showSettings = false" class="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-all">
              <svg :width="20" :height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div class="space-y-5">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">专注时间（分钟）</label>
              <div class="flex items-center gap-4">
                <input v-model.number="localSettings.focusTime" type="range" min="5" max="60" step="5" class="flex-1 h-3 bg-gray-200 rounded-full appearance-none cursor-pointer slider" />
                <span class="text-sm font-bold w-12 text-right text-gray-800">{{ localSettings.focusTime }}</span>
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">短休息时间（分钟）</label>
              <div class="flex items-center gap-4">
                <input v-model.number="localSettings.shortBreak" type="range" min="1" max="15" step="1" class="flex-1 h-3 bg-gray-200 rounded-full appearance-none cursor-pointer slider" />
                <span class="text-sm font-bold w-12 text-right text-gray-800">{{ localSettings.shortBreak }}</span>
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">目标轮数</label>
              <div class="flex items-center gap-4">
                <input v-model.number="localSettings.targetCycles" type="range" min="1" max="12" step="1" class="flex-1 h-3 bg-gray-200 rounded-full appearance-none cursor-pointer slider" />
                <span class="text-sm font-bold w-12 text-right text-gray-800">{{ localSettings.targetCycles }}</span>
              </div>
            </div>
            
            <div class="space-y-4 pt-3">
              <label class="flex items-center gap-3 cursor-pointer group">
                <input v-model="localSettings.autoStartBreak" type="checkbox" class="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary transition-all" />
                <span class="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">专注结束后自动开始休息</span>
              </label>
              
              <label class="flex items-center gap-3 cursor-pointer group">
                <input v-model="localSettings.autoStartFocus" type="checkbox" class="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary transition-all" />
                <span class="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">休息结束后自动开始专注</span>
              </label>
              
              <label class="flex items-center gap-3 cursor-pointer group">
                <input v-model="localSettings.soundEnabled" type="checkbox" class="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary transition-all" />
                <span class="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">播放提示音</span>
              </label>
            </div>
          </div>
          
          <div class="flex gap-4 mt-8">
            <button @click="showSettings = false" class="flex-1 px-5 py-3.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all font-semibold">取消</button>
            <button @click="saveSettings" class="flex-1 px-5 py-3.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 transition-all font-semibold shadow-lg shadow-primary/30">保存</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 22px;
  height: 22px;
  background: white;
  border: 3px solid #6366f1;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 3px 8px rgba(99, 102, 241, 0.3);
  transition: all 0.2s ease;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.slider::-moz-range-thumb {
  width: 22px;
  height: 22px;
  background: white;
  border: 3px solid #6366f1;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 3px 8px rgba(99, 102, 241, 0.3);
}

.slider::-moz-range-thumb:hover {
  transform: scale(1.1);
}
</style>
