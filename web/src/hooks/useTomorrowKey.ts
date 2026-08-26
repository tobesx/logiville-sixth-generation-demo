import { useEffect, useState } from 'react'
import { addDays, toDateInputValue } from '../pages/shift'

function getTomorrowKey(): string {
  return toDateInputValue(addDays(new Date(), 1))
}

export function useTomorrowKey(): string {
  const [tomorrowKey, setTomorrowKey] = useState(() => getTomorrowKey())

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTomorrowKey(getTomorrowKey())
    }, 60_000)

    return () => window.clearInterval(intervalId)
  }, [])

  return tomorrowKey
}
