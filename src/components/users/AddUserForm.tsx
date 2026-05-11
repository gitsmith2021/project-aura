"use client";

import { useActionState } from "react";
import { registerUser } from "@/actions/user";
import { Loader2, Mail, User, ShieldCheck, CheckCircle2 } from "lucide-react";

export function AddUserForm() {
  const [state, formAction, isPending] = useActionState(registerUser, {
    error: null,
    success: false,
  });

  return (
    <div className="w-full max-w-md mx-auto bg-white/70 backdrop-blur-xl border border-slate-200/60 shadow-2xl rounded-2xl p-8 relative overflow-hidden">
      {/* Premium background accent */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500"></div>
      
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Register New User</h2>
        <p className="text-sm text-slate-500 mt-2">
          Add a new student or faculty member to your institution.
        </p>
      </div>

      {state?.success ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center bg-green-50/50 rounded-xl border border-green-100">
          <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
          <h3 className="text-lg font-semibold text-green-900">User Registered Successfully</h3>
          <p className="text-sm text-green-700 mt-1">
            The user has been securely added to your institution.
          </p>
          <button 
            type="button"
            onClick={() => window.location.reload()} 
            className="mt-6 px-4 py-2 bg-white border border-green-200 text-green-700 text-sm font-medium rounded-lg hover:bg-green-50 transition-colors shadow-sm"
          >
            Register Another
          </button>
        </div>
      ) : (
        <form action={formAction} className="space-y-5">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label htmlFor="fullName" className="block text-sm font-medium text-slate-700">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                id="fullName"
                name="fullName"
                required
                placeholder="e.g. Jane Doe"
                className="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all duration-200"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="email"
                id="email"
                name="email"
                required
                placeholder="jane@institution.edu"
                className="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all duration-200"
              />
            </div>
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <label htmlFor="role" className="block text-sm font-medium text-slate-700">
              Role
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
              </div>
              <select
                id="role"
                name="role"
                required
                defaultValue="Student"
                className="block w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all duration-200 text-slate-700 cursor-pointer"
              >
                <option value="Student">Student</option>
                <option value="Faculty">Faculty</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {state?.error && (
            <div className="p-3 rounded-xl bg-red-50/80 border border-red-100 text-sm text-red-600 flex items-start gap-2">
              <div className="mt-0.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
              </div>
              <span>{state.error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full mt-4 flex items-center justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isPending ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                Registering...
              </>
            ) : (
              "Register User"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
