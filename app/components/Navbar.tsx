'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useAdminContext } from '@/app/components/AdminContext'


export default function Navbar() {
  const router = useRouter()
  const supabase = createClient()
  const { vasoolMode, toggleVasoolMode, isAdmin } = useAdminContext()

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      router.push('/login')
    } else {
      console.error('Error signing out:', error.message)
    }
  }

  return (
    <nav className="bg-gray-800 p-4 text-white flex justify-between items-center">
      <div className="text-xl font-bold">Vasool</div>
      <div className="flex items-center space-x-4">
        {isAdmin && (
          <div className="flex items-center">
            <span className="mr-2">Vasool Mode</span>
            <label htmlFor="vasool-mode-toggle" className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="vasool-mode-toggle"
                className="sr-only peer"
                checked={vasoolMode}
                onChange={toggleVasoolMode}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Sign Out
        </button>
      </div>
    </nav>
  )
}