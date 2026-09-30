'use client'

import dynamic from 'next/dynamic'

// ssr: false is only valid inside a Client Component in Next.js 16.
// This wrapper keeps TodoList off the server so localStorage is always
// available when the lazy useState initializer runs.
const TodoList = dynamic(() => import('./TodoList'), { ssr: false })

export default TodoList
