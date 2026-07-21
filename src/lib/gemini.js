// Gemini API mock — generates risk assessment and rights reports
// In production, this goes through backend proxy to Gemini 2.5 Flash

export async function geminiRiskAssess(sessionData) {
  // Simulate API latency
  await new Promise(r => setTimeout(r, 800 + Math.random() * 700))

  const { siteType, lastCleaned, temperature, depth, equipment, recentRain } = sessionData
  const siteLabels = { sewer: 'sewer manhole', septic: 'septic tank', ewaste: 'e-waste pit', drain: 'drain canal' }
  const site = siteLabels[siteType] || 'site'

  // Generate contextual risk assessment text
  const hasGear = equipment && equipment.length > 0 && !equipment.includes('none')
  const isHot = temperature > 35
  const isOld = lastCleaned === '>6months' || lastCleaned === '1-6months'

  let riskLevel = 'medium'
  let score = 50

  if (isOld && !hasGear) { riskLevel = 'high'; score = 82 }
  else if (isOld || !hasGear || isHot) { riskLevel = 'high'; score = 72 }
  else if (hasGear && !isOld) { riskLevel = 'low'; score = 28 }

  const details = generateAssessmentText(site, sessionData, riskLevel)

  return {
    risk: riskLevel,
    score,
    confidence: 87,
    details,
    offline: false,
    source: 'gemini',
  }
}

function generateAssessmentText(site, data, riskLevel) {
  const parts = []

  if (riskLevel === 'high') {
    parts.push(`CAUTION. High concentration of toxic gases likely in this ${site}.`)
  } else if (riskLevel === 'medium') {
    parts.push(`MODERATE RISK. This ${site} shows elevated risk factors.`)
  } else {
    parts.push(`Lower risk detected for this ${site}, but remain vigilant.`)
  }

  if (data.lastCleaned === '>6months') {
    parts.push('Not cleaned in over 6 months — significant gas buildup expected (methane, hydrogen sulfide).')
  } else if (data.lastCleaned === '1-6months') {
    parts.push('Cleaned 1–6 months ago — moderate gas accumulation possible.')
  }

  if (data.temperature > 38) {
    parts.push(`Temperature ${data.temperature}°C accelerates gas generation and increases heatstroke risk.`)
  } else if (data.temperature > 35) {
    parts.push(`Temperature ${data.temperature}°C — elevated heat conditions.`)
  }

  if (data.recentRain === 'yes') {
    parts.push('Recent rainfall may have stirred toxic sediments and raised water levels.')
  }

  if (data.equipment?.includes('none') || !data.equipment?.length) {
    parts.push('NO safety equipment available. Entry without PPE is illegal under the 2013 Act.')
  } else if (!data.equipment?.includes('blower')) {
    parts.push('No ventilation blower — do NOT enter without running a blower for at least 15 minutes.')
  }

  return parts.join(' ')
}

export async function geminiGenerateReport(jobData) {
  await new Promise(r => setTimeout(r, 1000 + Math.random() * 500))

  const { siteType, riskLevel, gearProvided, forcedEntry, issues, employer, latitude, longitude } = jobData
  const siteLabels = { sewer: 'Sewer Manhole', septic: 'Septic Tank', ewaste: 'E-Waste Pit', drain: 'Drain Canal' }
  const site = siteLabels[siteType] || 'Unknown Site'
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  const violations = []
  const rights = []

  if (gearProvided === 'no') {
    violations.push('Worker was directed to enter without protective gear or safety equipment.')
    rights.push('Section 7, Manual Scavengers Act 2013: Employing any person for manual sewage work without protective gear is ILLEGAL and punishable.')
  }
  if (gearProvided === 'partial') {
    violations.push('Only partial safety equipment was provided. Full PPE is legally mandated.')
    rights.push('NAMASTE Programme: Workers are entitled to complete safety gear including gas detector, harness, blower, gloves, and helmet.')
  }
  if (forcedEntry === 'yes') {
    violations.push('Worker was asked to enter the site despite identified safety risks.')
    rights.push('Section 5, Manual Scavengers Act 2013: No person shall engage or employ another for hazardous cleaning without safety precautions.')
  }
  if (issues?.includes('dizzy')) {
    violations.push('Worker experienced dizziness/breathlessness — indicating exposure to toxic gases.')
    rights.push('Workers Compensation Act: You are entitled to full medical treatment and compensation for occupational exposure.')
  }
  if (issues?.includes('no_ventilation')) {
    violations.push('No ventilation was provided during the descent.')
    rights.push('NAMASTE Guidelines: Mechanical ventilation must be provided and running before and during entry.')
  }
  if (issues?.includes('no_companion')) {
    violations.push('No companion was present at the surface during descent.')
    rights.push('Safety protocol requires a trained companion at the surface at all times during confined space entry.')
  }
  if (issues?.includes('not_paid')) {
    violations.push('Worker was not paid for the completed job.')
    rights.push('Payment of Wages Act: Wages must be paid within 7 days of completion. Non-payment is a criminal offence.')
  }

  const hasViolations = violations.length > 0

  let report = `SAFAISHIELD RIGHTS REPORT\n`
  report += `━━━━━━━━━━━━━━━━━━━━━━━\n\n`
  report += `Date: ${date}\n`
  report += `Site: ${site}\n`
  if (latitude && longitude) report += `Location: ${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E\n`
  report += `Risk Level: ${(riskLevel || 'unknown').toUpperCase()}\n`
  if (employer) report += `Employer/Contractor: ${employer}\n`
  report += `\n`

  if (hasViolations) {
    report += `⚠️ VIOLATIONS FOUND:\n`
    violations.forEach((v, i) => { report += `${i + 1}. ${v}\n` })
    report += `\n`
    report += `📋 YOUR LEGAL RIGHTS:\n`
    rights.forEach((r, i) => { report += `${i + 1}. ${r}\n` })
  } else {
    report += `✅ No violations detected for this job.\n`
    report += `Your rights were respected in this instance.\n`
  }

  report += `\n━━━━━━━━━━━━━━━━━━━━━━━\n`
  report += `WHO TO CONTACT:\n`
  report += `→ NAMASTE Helpline: 14461\n`
  report += `→ National Commission for Safai Karamcharis\n`
  report += `→ District Collector Office\n`
  report += `→ SafaiSena NGO\n`
  report += `━━━━━━━━━━━━━━━━━━━━━━━\n`
  report += `Generated by SafaiShield AI\n`

  return {
    report,
    hasViolations,
    violationCount: violations.length,
    violations,
    rights,
  }
}
