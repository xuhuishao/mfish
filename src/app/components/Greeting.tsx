'use client'

import { useSyncExternalStore } from 'react'

function getGreeting(hours: number): string {
  if (hours >= 5 && hours < 12) return 'Good morning'
  if (hours < 18) return 'Good afternoon'
  return 'Good evening'
}

// useSyncExternalStore lets us provide a different server snapshot (empty string)
// so React doesn't try to reconcile a server-time greeting with the client's time.
export default function Greeting() {
  const greeting = useSyncExternalStore(
    () => () => {},
    () => getGreeting(new Date().getHours()),
    () => ''
  )

  if (!greeting) return null

  return (
    <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
      {greeting}.
    </h1>
  )
}
