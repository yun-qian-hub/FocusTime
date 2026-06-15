const SECRET_KEY = 'task_manager_secret_key_2026'

function xorEncryptDecrypt(str: string, key: string): string {
  let result = ''
  for (let i = 0; i < str.length; i++) {
    result += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length))
  }
  return result
}

export function encrypt(data: string): string {
  const encrypted = xorEncryptDecrypt(data, SECRET_KEY)
  return btoa(encrypted)
}

export function decrypt(data: string): string {
  try {
    const decrypted = atob(data)
    return xorEncryptDecrypt(decrypted, SECRET_KEY)
  } catch {
    return ''
  }
}