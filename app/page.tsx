import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function Index() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Redirect to /dashboard if logged in, otherwise to /expenses/new
    return redirect('/expenses/new'); // Assuming dashboard isn't ready
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">Vasool</h1>
        <p className="text-xl mb-8">Hostel Expense Tracker & Settlement</p>
        <a
          href="/login"
          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-300"
        >
          Log In / Sign Up
        </a>
      </div>
    </div>
  );
}