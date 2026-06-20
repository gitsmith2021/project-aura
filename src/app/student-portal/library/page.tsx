import { BookOpen } from "lucide-react";
import { getMyLendings } from "@/actions/library";
import { MyLibraryList } from "@/components/library/MyLibraryList";

export const metadata = { title: "Library — Student Portal" };

export default async function StudentLibraryPage() {
  const res = await getMyLendings();
  const lendings = res.success ? res.data : [];

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      <div className="flex items-center gap-2">
        <BookOpen size={18} className="text-violet-500" />
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">My Library</h1>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 mb-4">Books you&#39;ve borrowed, due dates and any fines.</p>
      <div className="max-w-3xl"><MyLibraryList lendings={lendings} /></div>
    </div>
  );
}
