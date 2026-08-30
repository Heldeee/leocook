export function totalMinutes(steps = []) {
  const totalSeconds = steps.reduce((sum, s) => sum + (s.duration_seconds || 0), 0)
  return Math.round(totalSeconds / 60)
}

export function formatMinutes(minutes) {
  if (!minutes) return null
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} h ${m}` : `${h} h`
}
