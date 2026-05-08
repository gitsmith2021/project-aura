import { login } from './actions'
import { Building2 } from 'lucide-react'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const resolvedParams = await searchParams;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-sm">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-lg bg-purple-600 flex items-center justify-center border border-purple-500 shadow-sm">
            <Building2 className="text-white w-6 h-6" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-slate-900">
          Sign in to AURA
        </h2>
        <p className="mt-2 text-center text-xs text-slate-500">
          Institution Manager Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[400px]">
        <div className="bg-white py-8 px-4 border border-slate-200 sm:rounded-md sm:px-10">
          <form className="space-y-5" action={login}>
            {resolvedParams?.error && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-600 text-center font-medium">
                {resolvedParams.error}
              </div>
            )}
            
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Email address
              </label>
              <div className="mt-1.5">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full appearance-none rounded-md border border-slate-200 px-3 py-2 placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm transition-colors"
                  placeholder="admin@aura.edu"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Password
              </label>
              <div className="mt-1.5">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="block w-full appearance-none rounded-md border border-slate-200 px-3 py-2 placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="flex w-full justify-center rounded-md border border-transparent bg-purple-600 py-2 px-4 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
              >
                Sign in
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
