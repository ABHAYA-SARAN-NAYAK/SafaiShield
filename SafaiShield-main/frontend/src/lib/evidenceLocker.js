export async function hashLog(logData) {
  try {
    const encoded = new TextEncoder().encode(JSON.stringify(logData))
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  } catch {
    // Fallback — simple hash for older browsers
    const str = JSON.stringify(logData)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash |= 0
    }
    return 'fallback-' + Math.abs(hash).toString(16)
  }
}

export async function saveWithEvidence(jobLog) {
  const timestamp = Date.now()
  const logWithTimestamp = { ...jobLog, evidenceTimestamp: timestamp }
  const hash = await hashLog(logWithTimestamp)

  const evidenceEntry = {
    ...logWithTimestamp,
    evidenceHash: hash,
  }

  // Save to evidence locker
  try {
    const locker = JSON.parse(localStorage.getItem('safaishield_evidence') || '[]')
    locker.unshift(evidenceEntry)
    localStorage.setItem('safaishield_evidence', JSON.stringify(locker))
  } catch (e) {
    console.error('Evidence locker save failed:', e)
  }

  return evidenceEntry
}

export function getEvidenceLocker() {
  try {
    return JSON.parse(localStorage.getItem('safaishield_evidence') || '[]')
  } catch {
    return []
  }
}

export async function verifyEvidence(entry) {
  const { evidenceHash, ...logData } = entry
  const recomputed = await hashLog(logData)
  return recomputed === evidenceHash
}
