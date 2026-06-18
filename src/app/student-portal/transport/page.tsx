import { Bus, MapPin, Clock, Phone, Navigation } from "lucide-react";
import { getStudentRoute } from "@/actions/transport";
import { VEHICLE_TYPE_LABELS, formatTime } from "@/lib/transport";

export const metadata = { title: "AURA — My Transport" };

export default async function StudentTransportPage() {
  const res = await getStudentRoute();
  const route = res.success ? res.data : null;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-sky-100 border border-sky-200 flex items-center justify-center shrink-0">
          <Bus size={18} className="text-sky-600" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">My Transport</h1>
          <p className="text-xs text-slate-500">Your bus route, boarding stop and pickup time</p>
        </div>
      </div>

      {!route ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/40">
          <Bus size={32} className="text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-500">No transport allocated</p>
          <p className="text-xs text-slate-400 mt-1">If you use the college bus, contact the transport office to be allocated a route.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Hero */}
          <div className="rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 text-white p-5 shadow-sm">
            <p className="text-[11px] uppercase tracking-widest text-sky-100 font-semibold">Route</p>
            <p className="text-lg font-bold mt-0.5">{route.routeName}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/15 p-3">
                <p className="text-[10px] uppercase tracking-wide text-sky-100">Your stop</p>
                <p className="text-sm font-semibold mt-0.5 flex items-center gap-1"><MapPin size={13} /> {route.boardingStop || "—"}</p>
              </div>
              <div className="rounded-xl bg-white/15 p-3">
                <p className="text-[10px] uppercase tracking-wide text-sky-100">Pickup time</p>
                <p className="text-sm font-semibold mt-0.5 flex items-center gap-1"><Clock size={13} /> {formatTime(route.pickupTime)}</p>
              </div>
            </div>
          </div>

          {/* Vehicle + driver */}
          {route.vehicleNumber && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Vehicle &amp; driver</p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
                <span className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white"><Bus size={14} className="text-sky-500" /> {route.vehicleNumber}{route.vehicleType ? ` · ${VEHICLE_TYPE_LABELS[route.vehicleType]}` : ""}</span>
                {route.driverName && <span className="text-slate-600 dark:text-slate-300">{route.driverName}</span>}
                {route.driverPhone && <a href={`tel:${route.driverPhone}`} className="flex items-center gap-1 text-sky-600 hover:text-sky-700"><Phone size={13} /> {route.driverPhone}</a>}
              </div>
            </div>
          )}

          {/* Timings */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4 flex flex-wrap gap-x-8 gap-y-2 text-[13px]">
            <div><p className="text-[11px] text-slate-400 uppercase tracking-wide">Morning start</p><p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1"><Clock size={13} className="text-slate-400" /> {formatTime(route.morningStart)}</p></div>
            <div><p className="text-[11px] text-slate-400 uppercase tracking-wide">Evening start</p><p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1"><Clock size={13} className="text-slate-400" /> {formatTime(route.eveningStart)}</p></div>
          </div>

          {/* Stops timeline */}
          {route.stops.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1"><Navigation size={12} /> All stops</p>
              <ol className="space-y-0">
                {route.stops.map((s, i) => {
                  const mine = s.name.toLowerCase() === route.boardingStop.toLowerCase();
                  return (
                    <li key={i} className="flex items-start gap-3 pb-3 last:pb-0">
                      <div className="flex flex-col items-center">
                        <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${mine ? "bg-sky-600 text-white" : "bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300"}`}>{i + 1}</span>
                        {i < route.stops.length - 1 && <span className="w-px flex-1 bg-slate-200 dark:bg-slate-700 mt-1" style={{ minHeight: 16 }} />}
                      </div>
                      <div className="min-w-0 -mt-0.5">
                        <p className={`text-[13px] truncate ${mine ? "font-bold text-sky-700 dark:text-sky-300" : "font-medium text-slate-800 dark:text-slate-200"}`}>{s.name}{mine ? " · your stop" : ""}</p>
                        {s.pickup_time && <p className="text-[11px] text-slate-400">{formatTime(s.pickup_time)}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
