<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, X, Lock, Unlock, Trash2, Key } from 'lucide-vue-next'
import { useSecureNotesStore } from '@/stores/secureNotes'

const store = useSecureNotesStore()

const showCreateModal = ref(false)
const showUnlockModal = ref(false)
const unlockTargetId = ref<number | null>(null)
const unlockError = ref('')

const newTitle = ref('')
const newContent = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const createError = ref('')

const unlockPassword = ref('')

const editingContent = computed({
  get: () => store.unlockedContent,
  set: (value) => {
    if (store.selectedNoteId) {
      store.updateNote(store.selectedNoteId, { content: value })
    }
  }
})

const selectedNote = computed(() => {
  if (!store.selectedNoteId) return null
  return store.notes.find(n => n.id === store.selectedNoteId) || null
})

async function createSecureNote() {
  if (!newTitle.value.trim()) {
    createError.value = '请输入标题'
    return
  }
  if (!newPassword.value) {
    createError.value = '请输入密码'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    createError.value = '两次输入的密码不一致'
    return
  }
  
  await store.createNote(newTitle.value, newContent.value, newPassword.value)
  resetCreateForm()
  showCreateModal.value = false
}

function resetCreateForm() {
  newTitle.value = ''
  newContent.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  createError.value = ''
}

function openUnlockModal(id: number) {
  unlockTargetId.value = id
  unlockPassword.value = ''
  unlockError.value = ''
  showUnlockModal.value = true
}

async function handleUnlock() {
  if (!unlockTargetId.value) return
  
  const success = await store.unlockNote(unlockTargetId.value, unlockPassword.value)
  if (success) {
    showUnlockModal.value = false
    unlockPassword.value = ''
    unlockError.value = ''
  } else {
    unlockError.value = '密码错误，请重试'
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

function deleteNote(id: number) {
  store.deleteNote(id)
}
</script>

<template>
  <div class="flex-1 flex flex-col gap-6 p-6">
    <header>
      <h1 class="text-2xl font-bold text-gray-800">加密记事本</h1>
      <p class="text-gray-500 mt-1">需要密码才能访问的安全记事本，适合存放密码本或保密事件</p>
    </header>
    
    <div class="glass-card p-6 flex-1 flex gap-6 overflow-hidden">
      <div class="w-80 flex flex-col gap-4 overflow-hidden">
        <div class="flex items-center gap-2">
          <button
            @click="showCreateModal = true"
            class="flex-1 px-4 py-3 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-all flex items-center justify-center gap-2 font-medium"
          >
            <Plus :size="18" />
            创建加密记事本
          </button>
        </div>
        
        <div class="flex-1 overflow-y-auto space-y-3 scrollbar-hide">
          <div
            v-for="note in store.sortedNotes"
            :key="note.id"
            @click="store.isUnlocked(note.id) ? (() => {})() : openUnlockModal(note.id)"
            class="p-4 rounded-xl cursor-pointer transition-all border"
            :class="[
              store.selectedNoteId === note.id 
                ? 'shadow-lg bg-white/90 border-purple-300' 
                : 'hover:shadow-md border-gray-200'
            ]"
          >
            <div class="flex items-start justify-between gap-2">
              <p class="text-gray-800 font-medium flex-1 truncate">{{ note.title }}</p>
              <button
                @click.stop="deleteNote(note.id)"
                class="w-6 h-6 rounded-lg hover:bg-red-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              >
                <Trash2 :size="14" class="text-red-500" />
              </button>
            </div>
            
            <div class="flex items-center gap-2 mt-2">
              <Lock v-if="!store.isUnlocked(note.id)" :size="12" class="text-purple-500" />
              <Unlock v-else :size="12" class="text-green-500" />
              <span class="text-xs text-gray-400">{{ formatDate(note.updatedAt) }}</span>
            </div>
          </div>
          
          <div v-if="store.notes.length === 0" class="flex flex-col items-center justify-center text-gray-400 py-12">
            <Lock :size="32" class="mb-2 opacity-50" />
            <p>还没有加密记事本</p>
            <p class="text-sm">点击上方按钮创建第一个</p>
          </div>
        </div>
      </div>
      
      <div class="flex-1 flex flex-col">
        <div v-if="selectedNote && store.isUnlocked(selectedNote.id)" class="flex-1 glass-card rounded-xl overflow-hidden flex flex-col">
          <div class="flex items-center justify-between p-4 border-b border-gray-100">
            <input
              :value="selectedNote.title"
              @input="store.updateNote(selectedNote.id, { title: ($event.target as HTMLInputElement).value })"
              class="text-lg font-bold text-gray-800 bg-transparent outline-none"
              placeholder="标题"
            />
            <div class="flex items-center gap-2">
              <button
                @click="store.lockNote()"
                class="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center hover:bg-purple-100 transition-all"
                title="锁定"
              >
                <Lock :size="16" />
              </button>
              <button
                @click="deleteNote(selectedNote.id)"
                class="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center"
              >
                <Trash2 :size="16" class="text-red-500" />
              </button>
            </div>
          </div>
          
          <textarea
            v-model="editingContent"
            class="flex-1 p-6 bg-transparent resize-none outline-none text-gray-800 text-lg leading-relaxed"
            placeholder="开始记录...（内容已加密）"
          />
          
          <div class="p-4 border-t border-gray-100 flex items-center justify-between">
            <div class="flex items-center gap-2 text-sm text-gray-500">
              <Unlock :size="14" class="text-green-500" />
              <span>已解锁</span>
            </div>
            <span class="text-xs text-gray-400">上次更新: {{ formatDate(selectedNote.updatedAt) }}</span>
          </div>
        </div>
        
        <div v-else class="flex-1 glass-card rounded-xl flex flex-col items-center justify-center text-gray-400">
          <Key :size="48" class="mb-4 opacity-30" />
          <p class="text-lg">选择一个加密记事本</p>
          <p class="text-sm mt-2">输入密码后才能查看内容</p>
        </div>
      </div>
    </div>
    
    <Teleport to="body">
      <div
        v-if="showCreateModal"
        class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        @click.self="showCreateModal = false"
      >
        <div class="glass-card w-full max-w-lg p-6 animate-scale-in">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-gray-800">创建加密记事本</h2>
            <button @click="showCreateModal = false" class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
              <X :size="18" class="text-gray-500" />
            </button>
          </div>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">标题</label>
              <input
                v-model="newTitle"
                type="text"
                class="input-field w-full"
                placeholder="输入记事本标题"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">内容</label>
              <textarea
                v-model="newContent"
                class="input-field w-full h-32 resize-none"
                placeholder="输入要加密的内容..."
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">设置密码</label>
              <input
                v-model="newPassword"
                type="password"
                class="input-field w-full"
                placeholder="输入密码"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">确认密码</label>
              <input
                v-model="confirmPassword"
                type="password"
                class="input-field w-full"
                placeholder="再次输入密码"
              />
            </div>
            
            <div v-if="createError" class="flex items-center gap-2 p-3 rounded-xl bg-red-50">
              <X :size="18" class="text-red-500" />
              <span class="text-red-600 text-sm">{{ createError }}</span>
            </div>
          </div>
          
          <div class="flex gap-3 mt-6">
            <button
              @click="showCreateModal = false"
              class="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all font-medium"
            >
              取消
            </button>
            <button
              @click="createSecureNote"
              class="flex-1 px-4 py-3 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-all font-medium"
            >
              创建
            </button>
          </div>
        </div>
      </div>
    </Teleport>
    
    <Teleport to="body">
      <div
        v-if="showUnlockModal"
        class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        @click.self="showUnlockModal = false"
      >
        <div class="glass-card w-full max-w-sm p-6 animate-scale-in">
          <div class="flex flex-col items-center text-center">
            <div class="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-4">
              <Key :size="32" class="text-purple-600" />
            </div>
            <h2 class="text-xl font-bold text-gray-800 mb-2">输入密码解锁</h2>
            <p class="text-gray-500 mb-6">请输入密码以查看加密内容</p>
            
            <div class="w-full">
              <input
                v-model="unlockPassword"
                type="password"
                class="input-field w-full"
                placeholder="输入密码"
                @keyup.enter="handleUnlock"
                autofocus
              />
              
              <div v-if="unlockError" class="flex items-center gap-2 p-3 rounded-xl bg-red-50 mt-3">
                <X :size="18" class="text-red-500" />
                <span class="text-red-600 text-sm">{{ unlockError }}</span>
              </div>
            </div>
            
            <div class="flex gap-3 mt-6 w-full">
              <button
                @click="showUnlockModal = false"
                class="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all font-medium"
              >
                取消
              </button>
              <button
                @click="handleUnlock"
                class="flex-1 px-4 py-3 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-all font-medium"
              >
                解锁
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>