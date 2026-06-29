<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, X, Tag, Trash2, AlertTriangle, Lock, Unlock, Maximize2, Minimize2, Search } from 'lucide-vue-next'
import { useNotesStore, NOTE_COLORS } from '@/stores/notes'
import { useSecureNotesStore } from '@/stores/secureNotes'

const store = useNotesStore()
const secureStore = useSecureNotesStore()

const newNoteContent = ref('')
const showTagInput = ref(false)
const newTag = ref('')

const showDeleteConfirm = ref(false)
const deleteTargetId = ref<number | null>(null)

const showSecureDeleteConfirm = ref(false)
const secureDeleteTargetId = ref<number | null>(null)

const showCreateSecureModal = ref(false)
const showUnlockModal = ref(false)
const unlockTargetId = ref<number | null>(null)
const unlockError = ref('')

const newSecureTitle = ref('')
const newSecureContent = ref('')
const newSecurePassword = ref('')
const secureConfirmPassword = ref('')
const createSecureError = ref('')

const unlockPassword = ref('')

const activeTab = ref<'normal' | 'secure'>('normal')
const isNoteMaximized = ref(false)
const searchQuery = ref('')

const commonlyUsedTags = ['工作', '生活', '学习', '想法', '待办']

const filteredNotes = computed(() => {
  if (!searchQuery.value.trim()) return store.sortedNotes
  const q = searchQuery.value.trim().toLowerCase()
  return store.sortedNotes.filter(note =>
    note.content.toLowerCase().includes(q) ||
    note.tags.some(tag => tag.toLowerCase().includes(q))
  )
})

const secureEditingContent = computed({
  get: () => secureStore.unlockedContent,
  set: (value) => {
    if (secureStore.selectedNoteId) {
      secureStore.updateNote(secureStore.selectedNoteId, { content: value })
    }
  }
})

const secureSelectedNote = computed(() => {
  if (!secureStore.selectedNoteId) return null
  return secureStore.notes.find(n => n.id === secureStore.selectedNoteId) || null
})

async function createSecureNote() {
  if (!newSecureTitle.value.trim()) {
    createSecureError.value = '请输入标题'
    return
  }
  if (!newSecurePassword.value) {
    createSecureError.value = '请输入密码'
    return
  }
  if (newSecurePassword.value !== secureConfirmPassword.value) {
    createSecureError.value = '两次输入的密码不一致'
    return
  }
  
  await secureStore.createNote(newSecureTitle.value, newSecureContent.value, newSecurePassword.value)
  resetSecureCreateForm()
  showCreateSecureModal.value = false
}

function resetSecureCreateForm() {
  newSecureTitle.value = ''
  newSecureContent.value = ''
  newSecurePassword.value = ''
  secureConfirmPassword.value = ''
  createSecureError.value = ''
}

function openUnlockModal(id: number) {
  unlockTargetId.value = id
  unlockPassword.value = ''
  unlockError.value = ''
  showUnlockModal.value = true
}

async function handleUnlock() {
  if (!unlockTargetId.value) return
  
  const success = await secureStore.unlockNote(unlockTargetId.value, unlockPassword.value)
  if (success) {
    showUnlockModal.value = false
    unlockPassword.value = ''
    unlockError.value = ''
  } else {
    unlockError.value = '密码错误，请重试'
  }
}

function deleteSecureNote(id: number) {
  secureDeleteTargetId.value = id
  showSecureDeleteConfirm.value = true
}

function confirmSecureDelete() {
  if (secureDeleteTargetId.value) {
    secureStore.deleteNote(secureDeleteTargetId.value)
  }
  showSecureDeleteConfirm.value = false
  secureDeleteTargetId.value = null
}

function cancelSecureDelete() {
  showSecureDeleteConfirm.value = false
  secureDeleteTargetId.value = null
}

function formatSecureDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

const selectedNoteContent = computed({
  get: () => store.selectedNote?.content || '',
  set: (value) => {
    if (store.selectedNoteId) {
      store.updateNote(store.selectedNoteId, { content: value })
    }
  }
})

function createNote() {
  if (!newNoteContent.value.trim()) return
  
  const newNote = store.addNote(newNoteContent.value)
  store.selectNote(newNote.id)
  newNoteContent.value = ''
}

function deleteNote(id: number) {
  deleteTargetId.value = id
  showDeleteConfirm.value = true
}

function confirmDelete() {
  if (deleteTargetId.value) {
    store.deleteNote(deleteTargetId.value)
  }
  showDeleteConfirm.value = false
  deleteTargetId.value = null
}

function cancelDelete() {
  showDeleteConfirm.value = false
  deleteTargetId.value = null
}

function addTag() {
  if (!newTag.value.trim() || !store.selectedNoteId) return
  
  store.toggleTag(store.selectedNoteId, newTag.value.trim())
  newTag.value = ''
  showTagInput.value = false
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function getPreview(content: string): string {
  const trimmed = content.trim()
  const firstLine = trimmed.split('\n')[0] || ''
  return firstLine.length > 40 ? firstLine.substring(0, 40) + '...' : firstLine
}
</script>

<template>
  <div class="flex-1 flex flex-col gap-6 p-6">
    <header>
      <h1 class="text-2xl font-bold text-gray-800">笔记</h1>
      <p class="text-gray-500 mt-1">{{ activeTab === 'normal' ? '记录你的想法和灵感' : '需要密码才能访问的安全记事本' }}</p>
    </header>
    
    <div class="flex items-center gap-2">
      <button
        @click="activeTab = 'normal'"
        class="px-4 py-2 rounded-xl text-sm font-medium transition-all"
        :class="activeTab === 'normal' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
      >
        普通笔记
      </button>
      <button
        @click="activeTab = 'secure'"
        class="px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
        :class="activeTab === 'secure' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
      >
        <Lock :size="14" />
        加密记事本
      </button>
    </div>
    
    <div v-if="activeTab === 'normal'" class="glass-card p-6 flex-1 flex gap-6 overflow-hidden relative">
      <div class="w-80 flex flex-col gap-4 overflow-hidden">
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              v-model="searchQuery"
              type="text"
              class="input-field w-full pl-9"
              placeholder="搜索笔记内容或标签..."
            />
          </div>
          <input
            v-model="newNoteContent"
            @keyup.enter="createNote"
            type="text"
            class="input-field flex-1"
            placeholder="快速创建笔记..."
          />
          <button
            @click="createNote"
            :disabled="!newNoteContent.trim()"
            class="w-12 h-12 rounded-xl bg-primary text-white hover:bg-secondary transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus :size="20" />
          </button>
        </div>
        
        <div class="flex-1 overflow-y-auto space-y-3 scrollbar-hide">
          <div
            v-for="note in filteredNotes"
            :key="note.id"
            @click="store.selectNote(note.id)"
            class="p-4 rounded-xl cursor-pointer transition-all border"
          :class="[
            store.selectedNoteId === note.id 
              ? 'shadow-lg bg-white/90' 
              : 'hover:shadow-md'
          ]"
            :style="{ backgroundColor: note.color + '80', borderColor: note.color + '40' }"
          >
            <p class="text-gray-800 font-medium truncate">{{ getPreview(note.content) }}</p>
            
            <div class="flex items-center justify-between mt-3">
              <div v-if="note.tags.length > 0" class="flex gap-1 flex-wrap">
                <span
                  v-for="tag in note.tags.slice(0, 3)"
                  :key="tag"
                  class="px-2 py-0.5 rounded-full text-xs bg-white/50 text-gray-600"
                >
                  {{ tag }}
                </span>
                <span v-if="note.tags.length > 3" class="text-xs text-gray-400">
                  +{{ note.tags.length - 3 }}
                </span>
              </div>
              <span class="text-xs text-gray-400">{{ formatDate(note.updatedAt) }}</span>
            </div>
          </div>
          
          <div v-if="store.notes.length === 0" class="flex flex-col items-center justify-center text-gray-400 py-12">
            <Tag :size="32" class="mb-2 opacity-50" />
            <p>还没有笔记</p>
            <p class="text-sm">在上方输入框创建第一个笔记吧</p>
          </div>
        </div>
      </div>
      
      <div class="flex-1 flex flex-col">
        <div v-if="store.selectedNote" class="flex-1 glass-card rounded-xl overflow-hidden flex flex-col" :class="{ 'note-maximized': isNoteMaximized }">
          <div class="flex items-center justify-between p-4 border-b border-gray-100">
            <div class="flex items-center gap-2">
              <button
                v-for="color in NOTE_COLORS"
                :key="color"
                @click="store.updateNote(store.selectedNoteId!, { color })"
                class="w-6 h-6 rounded-full transition-transform hover:scale-110"
                :class="[store.selectedNote.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : '']"
                :style="{ backgroundColor: color }"
              />
            </div>
            <div class="flex items-center gap-1">
              <button
                @click="deleteNote(store.selectedNoteId!)"
                class="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center"
              >
                <Trash2 :size="16" class="text-red-500" />
              </button>
              <button
                @click="isNoteMaximized = !isNoteMaximized"
                class="w-8 h-8 rounded-lg hover:bg-blue-50 flex items-center justify-center transition-all"
                title="放大编辑"
              >
                <Maximize2 v-if="!isNoteMaximized" :size="16" class="text-blue-500" />
                <Minimize2 v-else :size="16" class="text-blue-500" />
              </button>
            </div>
          </div>
          
          <textarea
            v-model="selectedNoteContent"
            class="flex-1 p-6 bg-transparent resize-none outline-none text-gray-800 text-lg leading-relaxed"
            placeholder="开始记录..."
          />
          
          <div class="p-4 border-t border-gray-100">
            <div class="flex items-center gap-2">
              <div v-if="showTagInput" class="flex items-center gap-2 flex-1">
                <input
                  v-model="newTag"
                  @keyup.enter="addTag"
                  @keyup.escape="showTagInput = false"
                  type="text"
                  class="input-field flex-1"
                  placeholder="输入标签..."
                  autofocus
                />
                <button
                  @click="addTag"
                  :disabled="!newTag.trim()"
                  class="px-3 py-2 rounded-lg bg-primary text-white hover:bg-secondary transition-all text-sm font-medium disabled:opacity-50"
                >
                  添加
                </button>
              </div>
              
              <div v-else class="flex items-center gap-2 flex-wrap">
                <button
                  v-for="tag in commonlyUsedTags"
                  :key="tag"
                  @click="store.toggleTag(store.selectedNoteId!, tag)"
                  class="px-3 py-1 rounded-full text-sm transition-all"
                  :class="[
                    store.selectedNote.tags.includes(tag)
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  ]"
                >
                  {{ tag }}
                </button>
                <button
                  @click="showTagInput = true"
                  class="px-3 py-1 rounded-full text-sm bg-gray-50 text-gray-500 hover:bg-gray-100 transition-all"
                >
                  + 添加标签
                </button>
              </div>
            </div>
            
            <div v-if="store.selectedNote.tags.length > 0" class="flex gap-2 mt-3 flex-wrap">
              <span
                v-for="tag in store.selectedNote.tags"
                :key="tag"
                class="px-3 py-1 rounded-full text-sm bg-white/50 text-gray-600 flex items-center gap-1 cursor-pointer hover:bg-red-50 hover:text-red-500 transition-all"
                @click="store.toggleTag(store.selectedNoteId!, tag)"
              >
                {{ tag }}
                <X :size="12" />
              </span>
            </div>
          </div>
        </div>
        
        <div v-else class="flex-1 glass-card rounded-xl flex flex-col items-center justify-center text-gray-400">
          <Tag :size="64" class="mb-4 opacity-50" />
          <p class="text-lg font-medium">选择一个笔记开始编辑</p>
          <p class="text-sm mt-2">或在左侧创建新笔记</p>
        </div>
      </div>
    </div>
    
    <div v-else class="glass-card p-6 flex-1 flex gap-6 overflow-hidden">
      <div v-if="!isNoteMaximized" class="w-80 flex flex-col gap-4 overflow-hidden">
        <div class="flex items-center gap-2">
          <button
            @click="showCreateSecureModal = true"
            class="flex-1 px-4 py-3 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-all flex items-center justify-center gap-2 font-medium"
          >
            <Plus :size="18" />
            创建加密记事本
          </button>
        </div>
        
        <div class="flex-1 overflow-y-auto space-y-3 scrollbar-hide">
          <div
            v-for="note in secureStore.sortedNotes"
            :key="note.id"
            @click="secureStore.isUnlocked(note.id) ? (() => {})() : openUnlockModal(note.id)"
            class="p-4 rounded-xl cursor-pointer transition-all border"
            :class="[
              secureStore.selectedNoteId === note.id 
                ? 'shadow-lg bg-white/90 border-purple-300' 
                : 'hover:shadow-md border-gray-200'
            ]"
          >
            <div class="flex items-start justify-between gap-2">
              <p class="text-gray-800 font-medium flex-1 truncate">{{ note.title }}</p>
              <button
                @click.stop="deleteSecureNote(note.id)"
                class="w-6 h-6 rounded-lg hover:bg-red-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              >
                <Trash2 :size="14" class="text-red-500" />
              </button>
            </div>
            
            <div class="flex items-center gap-2 mt-2">
              <Lock v-if="!secureStore.isUnlocked(note.id)" :size="12" class="text-purple-500" />
              <Unlock v-else :size="12" class="text-green-500" />
              <span class="text-xs text-gray-400">{{ formatSecureDate(note.updatedAt) }}</span>
            </div>
          </div>
          
          <div v-if="secureStore.notes.length === 0" class="flex flex-col items-center justify-center text-gray-400 py-12">
            <Lock :size="32" class="mb-2 opacity-50" />
            <p>还没有加密记事本</p>
            <p class="text-sm">点击上方按钮创建第一个</p>
          </div>
        </div>
      </div>
      
      <div class="flex-1 flex flex-col">
        <div v-if="secureSelectedNote && secureStore.isUnlocked(secureSelectedNote.id)" class="flex-1 glass-card rounded-xl overflow-hidden flex flex-col" :class="{ 'note-maximized': isNoteMaximized }">
          <div class="flex items-center justify-between p-4 border-b border-gray-100">
            <input
              :value="secureSelectedNote.title"
              @input="secureStore.updateNote(secureSelectedNote.id, { title: ($event.target as HTMLInputElement).value })"
              class="text-lg font-bold text-gray-800 bg-transparent outline-none"
              placeholder="标题"
            />
            <div class="flex items-center gap-2">
              <button
                @click="secureStore.lockNote()"
                class="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center hover:bg-purple-100 transition-all"
                title="锁定"
              >
                <Lock :size="16" />
              </button>
              <button
                @click="deleteSecureNote(secureSelectedNote.id)"
                class="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center"
              >
                <Trash2 :size="16" class="text-red-500" />
              </button>
              <button
                @click="isNoteMaximized = !isNoteMaximized"
                class="w-8 h-8 rounded-lg hover:bg-blue-50 flex items-center justify-center transition-all"
                title="放大编辑"
              >
                <Maximize2 v-if="!isNoteMaximized" :size="16" class="text-blue-500" />
                <Minimize2 v-else :size="16" class="text-blue-500" />
              </button>
            </div>
          </div>
          
          <textarea
            v-model="secureEditingContent"
            class="flex-1 p-6 bg-transparent resize-none outline-none text-gray-800 text-lg leading-relaxed"
            placeholder="开始记录...（内容已加密）"
          />
          
          <div class="p-4 border-t border-gray-100 flex items-center justify-between">
            <div class="flex items-center gap-2 text-sm text-gray-500">
              <Unlock :size="14" class="text-green-500" />
              <span>已解锁</span>
            </div>
            <span class="text-xs text-gray-400">上次更新: {{ formatSecureDate(secureSelectedNote.updatedAt) }}</span>
          </div>
        </div>
        
        <div v-else class="flex-1 glass-card rounded-xl flex flex-col items-center justify-center text-gray-400">
          <Lock :size="48" class="mb-4 opacity-30" />
          <p class="text-lg">选择一个加密记事本</p>
          <p class="text-sm mt-2">输入密码后才能查看内容</p>
        </div>
      </div>
    </div>
    
    <Teleport to="body">
      <div
        v-if="showDeleteConfirm"
        class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        @click.self="cancelDelete"
      >
        <div class="bg-white w-full max-w-sm rounded-2xl shadow-xl p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle :size="24" class="text-red-500" />
            </div>
            <div>
              <h3 class="text-lg font-bold text-gray-800">确认删除笔记</h3>
              <p class="text-sm text-gray-500">此操作无法撤销</p>
            </div>
          </div>
          
          <p class="text-gray-600 mb-6">
            确定要删除这个笔记吗？删除后将无法恢复。
          </p>
          
          <div class="flex gap-3">
            <button
              @click="cancelDelete"
              class="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all font-medium"
            >
              取消
            </button>
            <button
              @click="confirmDelete"
              class="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all font-medium"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </Teleport>
    
    <Teleport to="body">
      <div
        v-if="showSecureDeleteConfirm"
        class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        @click.self="cancelSecureDelete"
      >
        <div class="bg-white w-full max-w-sm rounded-2xl shadow-xl p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle :size="24" class="text-red-500" />
            </div>
            <div>
              <h3 class="text-lg font-bold text-gray-800">确认删除加密记事本</h3>
              <p class="text-sm text-gray-500">此操作无法撤销</p>
            </div>
          </div>
          
          <p class="text-gray-600 mb-6">
            确定要删除这个加密记事本吗？删除后所有加密内容将永久丢失且无法恢复。
          </p>
          
          <div class="flex gap-3">
            <button
              @click="cancelSecureDelete"
              class="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all font-medium"
            >
              取消
            </button>
            <button
              @click="confirmSecureDelete"
              class="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all font-medium"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </Teleport>
    
    <Teleport to="body">
      <div
        v-if="showCreateSecureModal"
        class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        @click.self="showCreateSecureModal = false"
      >
        <div class="bg-white w-full max-w-lg rounded-2xl shadow-xl p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-gray-800">创建加密记事本</h2>
            <button @click="showCreateSecureModal = false" class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
              <X :size="18" class="text-gray-500" />
            </button>
          </div>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">标题</label>
              <input
                v-model="newSecureTitle"
                type="text"
                class="input-field w-full"
                placeholder="输入记事本标题"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">内容</label>
              <textarea
                v-model="newSecureContent"
                class="input-field w-full h-32 resize-none"
                placeholder="输入要加密的内容..."
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">设置密码</label>
              <input
                v-model="newSecurePassword"
                type="password"
                class="input-field w-full"
                placeholder="输入密码"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">确认密码</label>
              <input
                v-model="secureConfirmPassword"
                type="password"
                class="input-field w-full"
                placeholder="再次输入密码"
              />
            </div>
            
            <div v-if="createSecureError" class="flex items-center gap-2 p-3 rounded-xl bg-red-50">
              <X :size="18" class="text-red-500" />
              <span class="text-red-600 text-sm">{{ createSecureError }}</span>
            </div>
          </div>
          
          <div class="flex gap-3 mt-6">
            <button
              @click="showCreateSecureModal = false"
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
        <div class="bg-white w-full max-w-sm rounded-2xl shadow-xl p-6">
          <div class="flex flex-col items-center text-center">
            <div class="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-4">
              <Lock :size="32" class="text-purple-600" />
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

<style scoped>
.note-maximized {
  position: absolute !important;
  inset: 0 !important;
  z-index: 10 !important;
  background: white;
}
</style>