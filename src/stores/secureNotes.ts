import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SecureNote } from '@/types'

const STORAGE_KEY = 'task_manager_secure_notes'

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function deriveKey(password: string): Promise<CryptoKey> {
  const salt = new TextEncoder().encode('task_manager_salt')
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

async function encryptContent(content: string, password: string): Promise<{ encrypted: string; iv: string }> {
  const key = await deriveKey(password)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(content)
  )
  const encryptedArray = Array.from(new Uint8Array(encryptedBuffer))
  const ivArray = Array.from(iv)
  return {
    encrypted: encryptedArray.map(b => b.toString(16).padStart(2, '0')).join(''),
    iv: ivArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }
}

async function decryptContent(encrypted: string, iv: string, password: string): Promise<string> {
  try {
    const key = await deriveKey(password)
    const encryptedBytes = new Uint8Array(encrypted.match(/.{1,2}/g)?.map(h => parseInt(h, 16)) || [])
    const ivBytes = new Uint8Array(iv.match(/.{1,2}/g)?.map(h => parseInt(h, 16)) || [])
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      key,
      encryptedBytes
    )
    return new TextDecoder().decode(decryptedBuffer)
  } catch {
    throw new Error('密码错误')
  }
}

function getSecureNotes(): SecureNote[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveSecureNotes(notes: SecureNote[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
}

export const useSecureNotesStore = defineStore('secureNotes', () => {
  const notes = ref<SecureNote[]>(getSecureNotes())
  const selectedNoteId = ref<number | null>(null)
  const unlockedContent = ref<string>('')
  const unlockedPassword = ref<string>('')

  const sortedNotes = computed(() => {
    return [...notes.value].sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  })

  async function createNote(title: string, content: string, password: string) {
    const now = new Date().toISOString()
    const passwordHash = await sha256(password)
    const { encrypted, iv } = await encryptContent(content, password)
    
    const newNote: SecureNote = {
      id: Date.now(),
      title,
      encryptedContent: JSON.stringify({ encrypted, iv }),
      passwordHash,
      createdAt: now,
      updatedAt: now
    }
    
    notes.value.push(newNote)
    saveSecureNotes(notes.value)
    return newNote
  }

  async function unlockNote(id: number, password: string): Promise<boolean> {
    const note = notes.value.find(n => n.id === id)
    if (!note) return false
    
    const passwordHash = await sha256(password)
    if (passwordHash !== note.passwordHash) {
      return false
    }
    
    try {
      const { encrypted, iv } = JSON.parse(note.encryptedContent)
      unlockedContent.value = await decryptContent(encrypted, iv, password)
      selectedNoteId.value = id
      unlockedPassword.value = password
      return true
    } catch {
      return false
    }
  }

  async function updateNote(id: number, updates: { title?: string; content?: string }) {
    const note = notes.value.find(n => n.id === id)
    if (!note || !unlockedPassword.value) return
    
    if (updates.title) {
      note.title = updates.title
    }
    
    if (updates.content) {
      const { encrypted, iv } = await encryptContent(updates.content, unlockedPassword.value)
      note.encryptedContent = JSON.stringify({ encrypted, iv })
    }
    
    note.updatedAt = new Date().toISOString()
    saveSecureNotes(notes.value)
  }

  function deleteNote(id: number) {
    notes.value = notes.value.filter(n => n.id !== id)
    if (selectedNoteId.value === id) {
      selectedNoteId.value = null
      unlockedContent.value = ''
      unlockedPassword.value = ''
    }
    saveSecureNotes(notes.value)
  }

  function lockNote() {
    selectedNoteId.value = null
    unlockedContent.value = ''
    unlockedPassword.value = ''
  }

  function isUnlocked(id: number): boolean {
    return selectedNoteId.value === id && unlockedContent.value !== ''
  }

  return {
    notes,
    selectedNoteId,
    unlockedContent,
    sortedNotes,
    createNote,
    unlockNote,
    updateNote,
    deleteNote,
    lockNote,
    isUnlocked
  }
})