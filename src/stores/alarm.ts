import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Alarm } from '@/types'
import { getAlarms, saveAlarms } from '@/utils/storage'

let backgroundIntervalId: number | null = null

export const useAlarmStore = defineStore('alarm', () => {
  const alarms = ref<Alarm[]>([])
  const isAlarmRinging = ref(false)
  const ringingAlarm = ref<Alarm | null>(null)
  const lastTriggeredTime = ref('')
  
  const sortedAlarms = computed(() => {
    return [...alarms.value].sort((a, b) => a.time.localeCompare(b.time))
  })
  
  const activeAlarms = computed(() => {
    return sortedAlarms.value.filter(a => a.enabled)
  })
  
  function startBackgroundTimer() {
    if (backgroundIntervalId) return
    
    if ('Notification' in window) {
      Notification.requestPermission()
    }
    
    checkAlarms()
    
    backgroundIntervalId = window.setInterval(() => {
      checkAlarms()
    }, 1000)
  }
  
  function stopBackgroundTimer() {
    if (backgroundIntervalId) {
      clearInterval(backgroundIntervalId)
      backgroundIntervalId = null
    }
  }
  
  function addAlarm(time: string, label?: string, repeat: Alarm['repeat'] = 'none', ringtone: string = 'default') {
    const newAlarm: Alarm = {
      id: Date.now(),
      time,
      label,
      enabled: true,
      repeat,
      ringtone,
      createdAt: new Date().toISOString()
    }
    alarms.value.push(newAlarm)
    saveAlarms(alarms.value)
    return newAlarm
  }
  
  function updateAlarm(id: number, updates: Partial<Pick<Alarm, 'time' | 'label' | 'repeat' | 'ringtone'>>) {
    const alarm = alarms.value.find(a => a.id === id)
    if (alarm) {
      Object.assign(alarm, updates)
      saveAlarms(alarms.value)
    }
  }
  
  function toggleAlarm(id: number) {
    const alarm = alarms.value.find(a => a.id === id)
    if (alarm) {
      alarm.enabled = !alarm.enabled
      saveAlarms(alarms.value)
    }
  }
  
  function deleteAlarm(id: number) {
    alarms.value = alarms.value.filter(a => a.id !== id)
    saveAlarms(alarms.value)
  }
  
  function playAlarmSound(ringtone: string): void {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    switch (ringtone) {
      case 'digital':
        oscillator.type = 'square'
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime)
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime + 0.1)
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.2)
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime + 0.3)
        break
      case 'chime':
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(523, audioContext.currentTime)
        oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.2)
        oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.4)
        break
      case 'nature':
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime)
        oscillator.frequency.setValueAtTime(554, audioContext.currentTime + 0.3)
        oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.6)
        break
      default:
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime)
        oscillator.frequency.setValueAtTime(1100, audioContext.currentTime + 0.15)
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.3)
        oscillator.frequency.setValueAtTime(1100, audioContext.currentTime + 0.45)
    }
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 1)
    
    setTimeout(() => {
      if (isAlarmRinging.value) {
        playAlarmSound(ringtone)
      }
    }, 1500)
  }
  
  function triggerAlarm(alarm: Alarm) {
    isAlarmRinging.value = true
    ringingAlarm.value = alarm
    
    playAlarmSound(alarm.ringtone)
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('闹钟提醒', {
        body: alarm.label || '闹钟响了！',
        icon: '⏰'
      })
    }
  }
  
  function dismissAlarm() {
    isAlarmRinging.value = false
    ringingAlarm.value = null
  }
  
  function checkAlarms() {
    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    
    if (lastTriggeredTime.value === currentTime) return
    lastTriggeredTime.value = currentTime
    
    alarms.value.forEach(alarm => {
      if (!alarm.enabled || alarm.time !== currentTime) return
      
      if (alarm.repeat === 'none') {
        triggerAlarm(alarm)
        alarm.enabled = false
        saveAlarms(alarms.value)
      } else if (alarm.repeat === 'daily') {
        triggerAlarm(alarm)
      } else if (alarm.repeat === 'weekday') {
        const day = now.getDay()
        if (day >= 1 && day <= 5) {
          triggerAlarm(alarm)
        }
      } else if (alarm.repeat === 'weekend') {
        const day = now.getDay()
        if (day === 0 || day === 6) {
          triggerAlarm(alarm)
        }
      } else if (Array.isArray(alarm.repeat)) {
        const day = now.getDay()
        const dayMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
        if (alarm.repeat.includes(dayMap[day])) {
          triggerAlarm(alarm)
        }
      }
    })
  }
  
  return {
    alarms,
    isAlarmRinging,
    ringingAlarm,
    sortedAlarms,
    activeAlarms,
    addAlarm,
    updateAlarm,
    toggleAlarm,
    deleteAlarm,
    triggerAlarm,
    dismissAlarm,
    checkAlarms,
    startBackgroundTimer,
    stopBackgroundTimer
  }
}, { persist: true })