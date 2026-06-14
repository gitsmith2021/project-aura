import { BedDouble, MapPin, Users } from "lucide-react";
import { getMyHostel } from "@/actions/hostels";

export const metadata = { title: "Hostel — Student Portal" };

const ROOM_TYPE_LABEL: Record<string, string> = { single: "Single", double: "Double", triple: "Triple", dormitory: "Dormitory" };
const HOSTEL_TYPE_LABEL: Record<string, string> = { boys: "Boys", girls: "Girls", "co-ed": "Co-ed" };

export default async function StudentHostelPage() {
  const res = await getMyHostel();
  const data = res.success ? res.data : null;

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      <div className="flex items-center gap-2">
        <BedDouble size={18} className="text-violet-500" />
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">My Hostel</h1>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 mb-4">Your room, hostel and roommates.</p>

      {!data ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400 dark:text-slate-500">
          <BedDouble size={28} className="opacity-30" />
          <p className="text-xs">You don't have a hostel room allocated.</p>
        </div>
      ) : (
        <div className="max-w-xl space-y-4">
          <div className="rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{data.hostel.name}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{HOSTEL_TYPE_LABEL[data.hostel.hostel_type] ?? data.hostel.hostel_type} hostel</p>
              </div>
              <span className="text-2xl font-black text-violet-600 dark:text-violet-400">{data.room.room_number}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[11px] text-slate-500 dark:text-slate-400">
              <span>Floor {data.room.floor}</span>
              <span>{ROOM_TYPE_LABEL[data.room.room_type] ?? data.room.room_type} room</span>
              {data.hostel.address && <span className="inline-flex items-center gap-1"><MapPin size={11} /> {data.hostel.address}</span>}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm shadow-sm p-5">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 mb-2"><Users size={13} /> Roommates</p>
            {data.roommates.length === 0 ? (
              <p className="text-[11px] text-slate-400">No roommates — you have the room to yourself.</p>
            ) : (
              <ul className="space-y-1">
                {data.roommates.map((m, i) => (
                  <li key={i} className="text-xs text-slate-700 dark:text-slate-300">{m.name}{m.roll_no ? <span className="text-slate-400"> · {m.roll_no}</span> : null}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
