import * as SQLite from 'sqlite3'

const dbPath = 'task_manager.db'

export const db = new SQLite.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err)
  } else {
    console.log('Database connected successfully')
  }
})

export function initDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS todos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title VARCHAR(200) NOT NULL,
          description TEXT,
          priority VARCHAR(10) DEFAULT 'medium',
          completed INTEGER DEFAULT 0,
          due_date DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)

      db.run(`
        CREATE TABLE IF NOT EXISTS calendar_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title VARCHAR(200) NOT NULL,
          description TEXT,
          start_time DATETIME NOT NULL,
          end_time DATETIME,
          all_day INTEGER DEFAULT 0,
          color VARCHAR(20) DEFAULT '#6366f1',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)

      db.run(`
        CREATE TABLE IF NOT EXISTS notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT NOT NULL,
          color VARCHAR(10) DEFAULT '#fef3c7',
          tags TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)

      db.run(`
        CREATE TABLE IF NOT EXISTS alarms (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          time VARCHAR(5) NOT NULL,
          label VARCHAR(100),
          enabled INTEGER DEFAULT 1,
          repeat VARCHAR(50) DEFAULT 'none',
          ringtone VARCHAR(100) DEFAULT 'default',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)
    })

    db.close(() => {
      resolve()
    })
  })
}

export function query<T>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const db = new SQLite.Database(dbPath)
    db.all(sql, params, (err, rows) => {
      db.close()
      if (err) reject(err)
      else resolve(rows as T[])
    })
  })
}

export function execute(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    const db = new SQLite.Database(dbPath)
    db.run(sql, params, function(this: SQLite.RunResult, err) {
      db.close()
      if (err) reject(err)
      else resolve({ lastID: this.lastID, changes: this.changes })
    })
  })
}