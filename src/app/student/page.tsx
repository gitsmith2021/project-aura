import { Suspense } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function StudentPortalPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800/80 bg-gray-950/90 backdrop-blur-xl sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col gap-5">
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              My Attendance
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Student Portal Overview
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full space-y-8">
        {/* Top Stats Section */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Overall Attendance Card */}
            <div className="bg-gray-800/40 border border-gray-800/60 rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[140px]">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Overall Attendance %</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-4">
                <div className="text-4xl font-bold text-white">--%</div>
                <span className="text-sm text-gray-500 font-medium">Pending Data</span>
              </div>
            </div>

            {/* Placeholder for other stats (e.g. Classes Attended) */}
            <div className="bg-gray-800/40 border border-gray-800/60 rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[140px]">
               <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Classes Attended</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-4">
                <div className="text-4xl font-bold text-white">--</div>
              </div>
            </div>

            {/* Placeholder for other stats (e.g. Missed Classes) */}
            <div className="bg-gray-800/40 border border-gray-800/60 rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[140px]">
               <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Missed Classes</span>
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                  <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-4">
                <div className="text-4xl font-bold text-white">--</div>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Classes List Section */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-white flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              Recent Classes
            </h2>
            <button className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
              View All
            </button>
          </div>

          <div className="rounded-xl border border-gray-800/60 bg-gray-900/40 p-6 shadow-md backdrop-blur-sm min-h-[300px]">
             {/* List View Skeleton */}
             <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-gray-800/40 border border-gray-800/60">
                    <div className="flex items-center gap-4">
                      {/* Date / Icon placeholder */}
                      <div className="w-12 h-12 rounded-lg bg-gray-700/50 shrink-0"></div>
                      
                      {/* Text lines placeholder */}
                      <div className="flex flex-col space-y-2 w-48">
                        <div className="h-4 bg-gray-700/50 rounded w-full"></div>
                        <div className="h-3 bg-gray-700/30 rounded w-2/3"></div>
                      </div>
                    </div>

                    {/* Status Badge Placeholder */}
                    <div className="h-6 w-20 bg-gray-700/40 rounded-full"></div>
                  </div>
                ))}
             </div>
          </div>
        </section>

      </main>
    </div>
  );
}
