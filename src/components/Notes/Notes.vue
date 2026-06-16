<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, X, Tag, Trash2, AlertTriangle } from 'lucide-vue-next'
import { useNotesStore, NOTE_COLORS } from '@/stores/notes'

const store = useNotesStore()

const newNoteContent = ref('')
const showTagInput = ref(false)
const newTag = ref('')

const showDeleteConfirm = ref(false)
const deleteTargetId = ref<number | null>(null)

const commonlyUsedTags = ['工作', '生活', '学习', '想法', '待办']

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
      <h1 class="text-2xl font-bold text-gray-800">便签</h1>
      <p class="text-gray-500 mt-1">记录你的想法和灵感</p>
    </header>
    
    <div class="glass-card p-6 flex-1 flex gap-6 overflow-hidden">
      <div class="w-80 flex flex-col gap-4 overflow-hidden">
        <div class="flex items-center gap-2">
          <input
            v-model="newNoteContent"
            @keyup.enter="createNote"
            type="text"
            class="input-field flex-1"
            placeholder="快速创建便签..."
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
            v-for="note in store.sortedNotes"
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
            <p>还没有便签</p>
            <p class="text-sm">在上方输入框创建第一个便签吧</p>
          </div>
        </div>
      </div>
      
      <div class="flex-1 flex flex-col">
        <div v-if="store.selectedNote" class="flex-1 glass-card rounded-xl overflow-hidden flex flex-col">
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
            <button
              @click="deleteNote(store.selectedNoteId!)"
              class="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center"
            >
              <Trash2 :size="16" class="text-red-500" />
            </button>
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
          <p class="text-lg font-medium">选择一个便签开始编辑</p>
          <p class="text-sm mt-2">或在左侧创建新便签</p>
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
              <h3 class="text-lg font-bold text-gray-800">确认删除便签</h3>
              <p class="text-sm text-gray-500">此操作无法撤销</p>
            </div>
          </div>
          
          <p class="text-gray-600 mb-6">
            确定要删除这个便签吗？删除后将无法恢复。
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
  </div>
</template>