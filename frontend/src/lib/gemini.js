import { apiCall } from './api'

export async function geminiRiskAssess(sessionData) {
  const siteMap = {
    septic: 'septic_tank',
    ewaste: 'ewaste_pit',
    sewer: 'sewer',
    drain: 'sewer',
  }
  const siteType = siteMap[sessionData.siteType] || 'sewer'

  let lastCleanedDate = null
  const now = new Date()
  if (sessionData.lastCleaned === '<1week') {
    lastCleanedDate = new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString().split('T')[0]
  } else if (sessionData.lastCleaned === '1-4weeks') {
    lastCleanedDate = new Date(now.getTime() - 15 * 24 * 3600 * 1000).toISOString().split('T')[0]
  } else if (sessionData.lastCleaned === '1-6months') {
    lastCleanedDate = new Date(now.getTime() - 60 * 24 * 3600 * 1000).toISOString().split('T')[0]
  } else if (sessionData.lastCleaned === '>6months') {
    lastCleanedDate = new Date(now.getTime() - 180 * 24 * 3600 * 1000).toISOString().split('T')[0]
  }

  let depthFeet = 4.5
  if (sessionData.depth === '<3ft') depthFeet = 2.0
  else if (sessionData.depth === '3-6ft') depthFeet = 4.5
  else if (sessionData.depth === '6-10ft') depthFeet = 8.0
  else if (sessionData.depth === '>10ft') depthFeet = 12.0

  const payload = {
    site_type: siteType,
    last_cleaned_date: lastCleanedDate,
    temperature_c: sessionData.temperature || 30,
    humidity_pct: sessionData.humidity || 55,
    depth_feet: depthFeet,
    recent_rain: sessionData.recentRain === 'yes',
    has_gas_detector: sessionData.equipment?.includes('gas_detector'),
    has_ventilation: sessionData.equipment?.includes('blower'),
    language: sessionData.language || 'en',
    lat: sessionData.latitude,
    lng: sessionData.longitude,
  }

  const res = await apiCall('/api/check', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  console.log("Full AI API Response:", res);

  if (res.offline) {
    throw new Error('Offline mode')
  }

  const rawScore = res.risk_score ?? res.score ?? res.data?.risk_score ?? res.data?.result?.score ?? 50;
  const rawTier = res.risk_tier || res.risk_level || res.risk || res.data?.risk_tier || 'medium';
  const rawChecklist = res.checklist || res.precautions || res.data?.checklist || res.data?.precautions || [];
  const safeMinutes = res.safe_entry_time_minutes ?? res.safe_window_minutes ?? res.safeWindowMinutes ?? res.safe_minutes ?? 6;

  const checklistFormatted = Array.isArray(rawChecklist) 
    ? rawChecklist.map((item, idx) => typeof item === 'string' ? { id: `item_${idx}`, text: item, required: true } : item)
    : [];

  return {
    riskLevel: rawTier.toLowerCase(),
    risk: rawTier.toLowerCase(),
    riskScore: rawScore,
    score: rawScore,
    risk_score: rawScore,
    heatstroke_warning: res.heatstroke_warning || null,
    confidence: res.confidence || 90,
    riskDetails: res.reason_voice_line ? (res.reason_voice_line + (res.heatstroke_warning ? ' ' + res.heatstroke_warning : '')) : (res.details || 'Pre-entry safety assessment complete.'),
    details: res.reason_voice_line ? (res.reason_voice_line + (res.heatstroke_warning ? ' ' + res.heatstroke_warning : '')) : (res.details || 'Pre-entry safety assessment complete.'),
    checklist: checklistFormatted,
    safeWindowMinutes: safeMinutes,
    safe_entry_time_minutes: safeMinutes,
    offline: false,
    source: res.source,
  }
}

export async function geminiGenerateReport(jobData) {
  const siteMap = {
    septic: 'septic_tank',
    ewaste: 'ewaste_pit',
    sewer: 'sewer',
    drain: 'sewer',
  }
  const siteType = siteMap[jobData.siteType] || 'sewer'

  const locationText = (jobData.latitude && jobData.longitude)
    ? `${jobData.latitude.toFixed(4)}°N, ${jobData.longitude.toFixed(4)}°E`
    : 'Unknown Location'

  const payload = {
    job_id: jobData.jobId || null,
    site_type: siteType,
    gear_confirmed: jobData.gearProvided === 'yes' || jobData.gearProvided === 'full',
    employer_name: jobData.employer || null,
    location_text: locationText,
    date: new Date().toISOString(),
    language: jobData.language || 'en',
    evidence_hash: jobData.evidenceHash || null,
  }

  const res = await apiCall('/api/report', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  if (res.offline) {
    throw new Error('Offline mode')
  }

  return {
    report: res.report_text + '\n\n' + res.disclaimer,
    hasViolations: res.legal_citations.length > 0,
    violationCount: res.legal_citations.length,
    violations: res.legal_citations,
    rights: res.namaste_entitlements,
  }
}
