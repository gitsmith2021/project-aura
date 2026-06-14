import { BedDouble, MapPin, Users, UtensilsCrossed, Receipt, Megaphone } from "lucide-react";
import { getMyHostel } from "@/actions/hostels";
import { getMessMenu, getMyMessBills } from "@/actions/mess";
import { getMyMaintenanceRequests } from "@/actions/hostelMaintenance";
import { getHostelAnnouncements } from "@/actions/hostelAnnouncements";
import { RaiseMaintenance } from "@/components/hostels/RaiseMaintenance";
import { DAYS_OF_WEEK, MEAL_TYPES, MEAL_LABEL, MESS_PLAN_LABEL, monthLabel } from "@/lib/messMaintenance";

export const metadata = { title: "Hostel — Student Portal" };

const ROOM_TYPE_LABEL: Record<string, string> = { single: "Single", double: "Double", triple: "Triple", dormitory: "Dormitory" };
const HOSTEL_TYPE_LABEL: Record<string, string> = { boys: "Boys", girls: "Girls", "co-ed": "Co-ed" };
const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default async function StudentHostelPage() {
  const res = await getMyHostel();
  const data = res.success ? res.data : null;

  if (!data) {
    return (
      <div className="px-6 pt-6 pb-6 w-full">
        <div className="flex items-center gap-2"><BedDouble size={18} className="text-violet-500" /><h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">My Hostel</h1></div>
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400 dark:text-slate-500">
          <BedDouble size={28} className="opacity-30" /><p className="text-xs">You don't have a hostel room allocated.</p>
        </div>
      </div>
    );
  }

  const [menuRes, billsRes, reqRes, annRes] = await Promise.all([
    getMessMenu(data.hostelId), getMyMessBills(), getMyMaintenanceRequests(), getHostelAnnouncements(data.hostelId),
  ]);
  const menu = menuRes.success ? menuRes.data : [];
  const menuByDay = new Map<string, Map<string, string[]>>();
  for (const c of menu) {
    if (!menuByDay.has(c.day_of_week)) menuByDay.set(c.day_of_week, new Map());
    menuByDay.get(c.day_of_week)!.set(c.meal_type, c.menu_items ?? []);
  }
  const bills = billsRes.success ? billsRes.data : [];
  const announcements = annRes.success ? annRes.data : [];

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      <div className="flex items-center gap-2"><BedDouble size={18} className="text-violet-500" /><h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">My Hostel</h1></div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 mb-4">Your room, mess menu, bills, announcements and maintenance.</p>

      <div className="grid gap-4 lg:grid-cols-2 max-w-5xl">
        {/* Room card */}
        <div className="rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{data.hostel.name}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{HOSTEL_TYPE_LABEL[data.hostel.hostel_type] ?? data.hostel.hostel_type} hostel</p>
            </div>
            <span className="text-2xl font-black text-violet-600 dark:text-violet-400">{data.room.room_number}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Floor {data.room.floor}</span><span>{ROOM_TYPE_LABEL[data.room.room_type] ?? data.room.room_type}</span>
            {data.hostel.address && <span className="inline-flex items-center gap-1"><MapPin size={11} /> {data.hostel.address}</span>}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 mb-1"><Users size={12} /> Roommates</p>
            {data.roommates.length === 0 ? <p className="text-[11px] text-slate-400">Just you.</p> : (
              <ul className="space-y-0.5">{data.roommates.map((m, i) => <li key={i} className="text-[11px] text-slate-600 dark:text-slate-300">{m.name}{m.roll_no ? ` · ${m.roll_no}` : ""}</li>)}</ul>
            )}
          </div>
        </div>

        {/* Maintenance */}
        <RaiseMaintenance hostelId={data.hostelId} roomId={data.roomId} initial={reqRes.success ? reqRes.data : []} />

        {/* Mess bills */}
        <div className="rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm shadow-sm p-5">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 mb-2"><Receipt size={13} /> Mess Bills</p>
          {bills.length === 0 ? <p className="text-[11px] text-slate-400">No mess bills yet.</p> : (
            <div className="space-y-1.5">
              {bills.map((b) => (
                <div key={b.id} className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 dark:text-slate-300">{monthLabel(b.month)} <span className="text-slate-400">· {MESS_PLAN_LABEL[b.plan_type]}</span></span>
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{inr(Number(b.amount))}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${b.is_paid ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"}`}>{b.is_paid ? "Paid" : "Unpaid"}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Announcements */}
        <div className="rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm shadow-sm p-5">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 mb-2"><Megaphone size={13} /> Hostel Announcements</p>
          {announcements.length === 0 ? <p className="text-[11px] text-slate-400">No announcements.</p> : (
            <div className="space-y-2">
              {announcements.slice(0, 5).map((a) => (
                <div key={a.id}><p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{a.title}</p><p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{a.body}</p></div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mess menu */}
      <div className="max-w-5xl mt-4 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm shadow-sm p-5">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 mb-3"><UtensilsCrossed size={13} /> Weekly Mess Menu</p>
        {menu.length === 0 ? <p className="text-[11px] text-slate-400">Menu not published yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="border-b border-slate-200 dark:border-slate-700"><tr><th className="py-1.5 pr-3 font-semibold text-slate-500">Day</th>{MEAL_TYPES.map((m) => <th key={m} className="py-1.5 px-3 font-semibold text-slate-500">{MEAL_LABEL[m]}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {DAYS_OF_WEEK.map((day) => (
                  <tr key={day} className="align-top">
                    <td className="py-1.5 pr-3 font-semibold text-slate-700 dark:text-slate-200">{day.slice(0, 3)}</td>
                    {MEAL_TYPES.map((meal) => (
                      <td key={meal} className="py-1.5 px-3 text-slate-600 dark:text-slate-300">{(menuByDay.get(day)?.get(meal) ?? []).join(", ") || "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
