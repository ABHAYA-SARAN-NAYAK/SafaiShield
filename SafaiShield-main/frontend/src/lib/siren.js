let sirenCtx = null
let sirenOscillator = null
let sirenInterval = null

export function triggerSiren(durationMs = 10000) {
  // Stop any existing siren first
  stopSiren()

  try {
    sirenCtx = new (window.AudioContext || window.webkitAudioContext)()
    sirenOscillator = sirenCtx.createOscillator()
    const gainNode = sirenCtx.createGain()

    sirenOscillator.connect(gainNode)
    gainNode.connect(sirenCtx.destination)

    sirenOscillator.type = 'sawtooth'
    sirenOscillator.frequency.setValueAtTime(800, sirenCtx.currentTime)

    // Wail effect — frequency sweeps up and down
    sirenInterval = setInterval(() => {
      if (sirenCtx && sirenOscillator) {
        try {
          sirenOscillator.frequency.setValueAtTime(800, sirenCtx.currentTime)
          sirenOscillator.frequency.linearRampToValueAtTime(1200, sirenCtx.currentTime + 0.5)
          sirenOscillator.frequency.linearRampToValueAtTime(800, sirenCtx.currentTime + 1.0)
        } catch {}
      }
    }, 1000)

    gainNode.gain.setValueAtTime(1, sirenCtx.currentTime)
    sirenOscillator.start()

    // Auto-stop after duration
    setTimeout(() => stopSiren(), durationMs)

    return stopSiren
  } catch (err) {
    console.error('Siren failed:', err)
    return () => {}
  }
}

export function stopSiren() {
  if (sirenInterval) {
    clearInterval(sirenInterval)
    sirenInterval = null
  }
  if (sirenOscillator) {
    try { sirenOscillator.stop() } catch {}
    sirenOscillator = null
  }
  if (sirenCtx) {
    try { sirenCtx.close() } catch {}
    sirenCtx = null
  }
}
