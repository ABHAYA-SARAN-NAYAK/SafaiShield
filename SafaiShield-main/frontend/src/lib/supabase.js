// Mock Supabase client backed by localStorage
// Same API shape as real @supabase/supabase-js for easy swap

const STORE_PREFIX = 'safaishield_db_'

function getTable(table) {
  try {
    return JSON.parse(localStorage.getItem(STORE_PREFIX + table) || '[]')
  } catch {
    return []
  }
}

function setTable(table, data) {
  localStorage.setItem(STORE_PREFIX + table, JSON.stringify(data))
}

export const supabase = {
  from(table) {
    return {
      async select(columns = '*') {
        const data = getTable(table)
        return { data, error: null }
      },

      async insert(rows) {
        const data = getTable(table)
        const newRows = Array.isArray(rows) ? rows : [rows]
        const withIds = newRows.map(r => ({
          id: crypto.randomUUID?.() || Date.now().toString(36),
          created_at: new Date().toISOString(),
          ...r,
        }))
        data.push(...withIds)
        setTable(table, data)
        return { data: withIds, error: null }
      },

      async update(updates) {
        return {
          eq(field, value) {
            const data = getTable(table)
            const updated = data.map(row =>
              row[field] === value ? { ...row, ...updates } : row
            )
            setTable(table, updated)
            return { data: updated.filter(r => r[field] === value), error: null }
          }
        }
      },

      async delete() {
        return {
          eq(field, value) {
            const data = getTable(table)
            const filtered = data.filter(r => r[field] !== value)
            setTable(table, filtered)
            return { data: [], error: null }
          }
        }
      },

      eq(field, value) {
        const data = getTable(table)
        const filtered = data.filter(r => r[field] === value)
        return {
          async select() { return { data: filtered, error: null } },
          async single() { return { data: filtered[0] || null, error: filtered.length ? null : 'Not found' } },
        }
      },

      order(field, { ascending = true } = {}) {
        const data = getTable(table)
        data.sort((a, b) => {
          if (ascending) return a[field] > b[field] ? 1 : -1
          return a[field] < b[field] ? 1 : -1
        })
        return {
          async select() { return { data, error: null } },
          limit(n) {
            return {
              async select() { return { data: data.slice(0, n), error: null } },
            }
          },
        }
      },
    }
  },
}
