const PBKDF2_ITERATIONS = 100000
const PBKDF2_HASH_ALG = 'SHA-256'
const AES_KEY_SIZE = 256
const AES_IV_SIZE = 12
const AES_TAG_SIZE = 128

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

function generateRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH_ALG
    },
    keyMaterial,
    { name: 'AES-GCM', length: AES_KEY_SIZE },
    false,
    ['encrypt', 'decrypt']
  )
}

export interface EncryptedData {
  algorithm: string
  salt: string
  iterations: number
  iv: string
  tag: string
  data: string
}

export async function encryptData(data: string, password: string): Promise<EncryptedData> {
  const salt = generateRandomBytes(16)
  const iv = generateRandomBytes(AES_IV_SIZE)
  const key = await deriveKey(password, salt)
  
  const encoder = new TextEncoder()
  const encodedData = encoder.encode(data)
  
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: AES_TAG_SIZE
    },
    key,
    encodedData
  )
  
  const ciphertextArray = new Uint8Array(ciphertext)
  const tag = ciphertextArray.slice(-16)
  const encryptedContent = ciphertextArray.slice(0, -16)
  
  return {
    algorithm: 'AES-GCM-256',
    salt: arrayBufferToBase64(salt),
    iterations: PBKDF2_ITERATIONS,
    iv: arrayBufferToBase64(iv),
    tag: arrayBufferToBase64(tag),
    data: arrayBufferToBase64(encryptedContent)
  }
}

export async function decryptData(encrypted: EncryptedData, password: string): Promise<string> {
  const salt = base64ToArrayBuffer(encrypted.salt)
  const iv = base64ToArrayBuffer(encrypted.iv)
  const tag = base64ToArrayBuffer(encrypted.tag)
  const data = base64ToArrayBuffer(encrypted.data)
  
  const key = await deriveKey(password, salt)
  
  const ciphertext = new Uint8Array(data.byteLength + tag.byteLength)
  ciphertext.set(new Uint8Array(data), 0)
  ciphertext.set(new Uint8Array(tag), data.byteLength)
  
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: AES_TAG_SIZE
    },
    key,
    ciphertext
  )
  
  const decoder = new TextDecoder()
  return decoder.decode(decrypted)
}