import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Note } from '@/types'
import { getNotes, saveNotes } from '@/utils/storage'

export const NOTE_COLORS = [
  '#fef3c7',
  '#dbeafe',
  '#dcfce7',
  '#fce7f3',
  '#f3e8ff',
  '#fed7aa'
]

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<Note[]>([])
  const selectedNoteId = ref<number | null>(null)
  
  const selectedNote = computed(() => {
    if (!selectedNoteId.value) return null
    return notes.value.find(n => n.id === selectedNoteId.value) || null
  })
  
  const sortedNotes = computed(() => {
    return [...notes.value].sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  })
  
  function addNote(content: string, color: string = NOTE_COLORS[0], tags: string[] = []) {
    const now = new Date().toISOString()
    const newNote: Note = {
      id: Date.now(),
      content,
      color,
      tags,
      createdAt: now,
      updatedAt: now
    }
    notes.value.push(newNote)
    saveNotes(notes.value)
    return newNote
  }
  
  function updateNote(id: number, updates: Partial<Pick<Note, 'content' | 'color' | 'tags'>>) {
    const note = notes.value.find(n => n.id === id)
    if (note) {
      Object.assign(note, updates)
      note.updatedAt = new Date().toISOString()
      saveNotes(notes.value)
    }
  }
  
  function deleteNote(id: number) {
    notes.value = notes.value.filter(n => n.id !== id)
    if (selectedNoteId.value === id) {
      selectedNoteId.value = null
    }
    saveNotes(notes.value)
  }
  
  function selectNote(id: number | null) {
    selectedNoteId.value = id
  }
  
  function toggleTag(id: number, tag: string) {
    const note = notes.value.find(n => n.id === id)
    if (note) {
      const index = note.tags.indexOf(tag)
      if (index === -1) {
        note.tags.push(tag)
      } else {
        note.tags.splice(index, 1)
      }
      note.updatedAt = new Date().toISOString()
      saveNotes(notes.value)
    }
  }
  
  return {
    notes,
    selectedNoteId,
    selectedNote,
    sortedNotes,
    addNote,
    updateNote,
    deleteNote,
    selectNote,
    toggleTag
  }
}, { persist: true })