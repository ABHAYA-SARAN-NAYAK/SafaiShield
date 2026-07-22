import { useState, useCallback } from 'react'

// Rule-based risk engine that mimics TensorFlow.js model output format.
// Same input/output shape — swap in a real model.json when available.

const SITE_TYPE_MAP = { sewer: 0, septic: 1, ewaste: 2, drain: 3 }
const LAST_CLEANED_MAP = { '<1week': 0.5, '1-4weeks': 2, '1-6months': 4, '>6months': 12 }
const DEPTH_MAP = { '<3ft': 2, '3-6ft': 5, '6-10ft': 8, '>10ft': 15 }

function calculateRiskScore({
  siteType = 'sewer',
  lastCleaned = '>6months',
  temperature = 30,
  humidity = 50,
  depth = '3-6ft',
  recentRain = false,
  hasGasDetector = false,
  hasVentilation = false,
}) {
  let score = 30 // base

  // Site type risk
  const siteRisks = { sewer: 20, septic: 25, ewaste: 15, drain: 10 }
  score += siteRisks[siteType] || 15

  // Time since cleaning — longer = more gas buildup
  const months = LAST_CLEANED_MAP[lastCleaned] || 12
  score += Math.min(months * 3, 25)

  // Temperature — higher = faster gas generation
  if (temperature > 40) score += 15
  else if (temperature > 35) score += 10
  else if (temperature > 30) score += 5

  // Humidity compounds gas risk
  if (humidity > 80) score += 8
  else if (humidity > 60) score += 4

  // Depth — deeper = more dangerous
  const depthFeet = DEPTH_MAP[depth] || 5
  score += Math.min(depthFeet * 1.5, 15)

  // Recent rain = flooding = stirred toxins
  if (recentRain) score += 12

  // Safety equipment reduces risk
  if (hasGasDetector) score -= 15
  if (hasVentilation) score -= 20

  // Clamp 0–100
  score = Math.max(0, Math.min(100, Math.round(score)))

  // Classify
  let risk, confidence
  if (score >= 65) {
    risk = 'high'
    confidence = Math.min(95, 70 + score - 65)
  } else if (score >= 35) {
    risk = 'medium'
    confidence = Math.min(90, 60 + Math.abs(50 - score))
  } else {
    risk = 'low'
    confidence = Math.min(95, 70 + (35 - score))
  }

  return { risk, score, confidence, offline: true }
}

function generateChecklist(riskData, sessionData) {
  const items = []

  if (!sessionData.equipment?.includes('blower')) {
    items.push({ id: 'blower', text: 'Run ventilation blower for 15 minutes', required: true })
  }
  if (!sessionData.equipment?.includes('gas_detector')) {
    items.push({ id: 'gas', text: 'Test with gas meter if available', required: true })
  }
  items.push({ id: 'rope', text: 'Keep rope tied at surface', required: true })
  items.push({ id: 'companion', text: 'Companion must stay at surface', required: true })
  items.push({ id: 'timer', text: 'Set 90-second check-in timer', required: true })

  if (sessionData.temperature > 35) {
    items.push({ id: 'heat', text: 'Carry water — heatstroke risk is HIGH', required: false })
  }

  return items
}

function generateRiskDetails(riskData, sessionData) {
  const { risk, score } = riskData
  const siteLabels = { sewer: 'sewer manhole', septic: 'septic tank', ewaste: 'e-waste pit', drain: 'drain canal' }
  const site = siteLabels[sessionData.siteType] || 'site'

  const warnings = []

  if (risk === 'high') {
    warnings.push(`CAUTION. Toxic gas likely in this ${site}.`)
  } else if (risk === 'medium') {
    warnings.push(`MODERATE RISK detected for this ${site}.`)
  } else {
    warnings.push(`Lower risk detected for this ${site}, but stay cautious.`)
  }

  const months = LAST_CLEANED_MAP[sessionData.lastCleaned] || 12
  if (months >= 4) {
    warnings.push(`Last cleaned ${months}+ months ago — gas buildup is likely.`)
  }

  if (sessionData.temperature > 35) {
    warnings.push(`Temperature ${sessionData.temperature}°C speeds gas buildup and increases heatstroke risk.`)
  }

  if (sessionData.recentRain === 'yes') {
    warnings.push('Recent rain may have stirred toxic sediments.')
  }

  if (!sessionData.equipment?.includes('blower')) {
    warnings.push('Do NOT enter without a ventilation blower running for 15 minutes first.')
  }

  if (sessionData.equipment?.includes('none') || sessionData.equipment?.length === 0) {
    warnings.push('NO safety equipment detected. Entry is extremely dangerous.')
  }

  return warnings.join(' ')
}

function calculateSafeWindow(sessionData) {
  let maxMinutes = 15 // base safe window

  // Site type
  const siteReductions = { septic: -3, sewer: -2, ewaste: -2, drain: 0 }
  maxMinutes += siteReductions[sessionData.siteType] || 0

  // Temperature
  if (sessionData.temperature > 40) maxMinutes -= 5
  else if (sessionData.temperature > 35) maxMinutes -= 3

  // Depth
  const depthFeet = DEPTH_MAP[sessionData.depth] || 5
  if (depthFeet > 8) maxMinutes -= 3
  else if (depthFeet > 5) maxMinutes -= 1

  // Cleaning history
  const months = LAST_CLEANED_MAP[sessionData.lastCleaned] || 12
  if (months >= 6) maxMinutes -= 4
  else if (months >= 3) maxMinutes -= 2

  return Math.max(3, maxMinutes) // minimum 3 minutes
}

export function useOfflineAI() {
  const [loading, setLoading] = useState(false)
  const [modelLoaded, setModelLoaded] = useState(true) // Rule-based = always ready

  const loadModel = useCallback(async () => {
    // No actual model to load — rule-based engine is always ready
    setModelLoaded(true)
  }, [])

  const predict = useCallback((sessionData) => {
    setLoading(true)

    const riskData = calculateRiskScore({
      siteType: sessionData.siteType,
      lastCleaned: sessionData.lastCleaned,
      temperature: sessionData.temperature || 30,
      humidity: sessionData.humidity || 50,
      depth: sessionData.depth,
      recentRain: sessionData.recentRain === 'yes',
      hasGasDetector: sessionData.equipment?.includes('gas_detector'),
      hasVentilation: sessionData.equipment?.includes('blower'),
    })

    const details = generateRiskDetails(riskData, sessionData)
    const checklist = generateChecklist(riskData, sessionData)
    const safeWindow = calculateSafeWindow(sessionData)

    setLoading(false)

    const heatstrokeMsg = (sessionData.temperature || 30) > 35
      ? 'Heatstroke risk is HIGH today. Underground spaces trap heat. Safe window reduced to 6 minutes.'
      : null

    return {
      ...riskData,
      score: riskData.score,
      riskScore: riskData.score,
      risk_score: riskData.score,
      details,
      riskDetails: details,
      checklist,
      safeWindowMinutes: safeWindow,
      safe_entry_time_minutes: safeWindow,
      heatstroke_warning: heatstrokeMsg,
    }
  }, [])

  return { predict, loadModel, loading, modelLoaded }
}
