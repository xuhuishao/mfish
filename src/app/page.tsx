import Footer from '@/app/components/Footer'
import Greeting from '@/app/components/Greeting'
import TodoListLoader from '@/app/components/TodoListLoader'

export default function Home() {
  return (
    <div className="flex flex-col flex-1 bg-zinc-50 dark:bg-zinc-950">
      <main className="flex flex-1 flex-col gap-10 w-full max-w-xl mx-auto px-6 py-20">
        <Greeting />
        <TodoListLoader />
      </main>
      <Footer />
    </div>
  )
}
