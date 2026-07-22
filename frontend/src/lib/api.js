const API_URL = import.meta.env.VITE_API_URL || 'https://safaishield-backend.onrender.com'

export async function apiCall(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`

  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return await res.json()
  } catch (err) {
    if (!navigator.onLine) {
      return { offline: true, message: 'Offline — using local AI', error: err.message }
    }
    throw err
  }
}

export async function getRiskAssessment(sessionData) {
  try {
    return await apiCall('/api/check', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    })
  } catch {
    // Return null — caller should use offline AI
    return null
  }
}

export async function generateReport(jobData) {
  try {
    return await apiCall('/api/report', {
      method: 'POST',
      body: JSON.stringify(jobData),
    })
  } catch {
    return null
  }
}
