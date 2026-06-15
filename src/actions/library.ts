"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { calculateFine, FINE_PER_DAY, type LibraryBook, type LibraryLending } from "@/lib/library";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const BOOK_COLS =
  "id, institution_id, department_id, title, author, isbn, category, total_copies, available_copies, published_year, publisher, created_at, departments!department_id(name)";
const LENDING_COLS =
  "id, institution_id, book_id, borrower_id, borrower_type, issued_date, due_date, returned_date, fine_amount, status, library_books(title, author)";

export type BookInput = {
  institution_id: string;
  title: string;
  author: string;
  category: string;
  isbn?: string | null;
  department_id?: string | null;
  total_copies: number;
  published_year?: number | null;
  publisher?: string | null;
};

export type Borrower = { id: string; name: string; type: "student" | "staff"; sub: string | null };
export type LendingWithBorrower = LibraryLending & { borrower_name: string };

export async function getBooks(
  institutionId: string,
  filters?: { search?: string; category?: string; departmentId?: string; availableOnly?: boolean }
): Promise<Result<LibraryBook[]>> {
  try {
    const supabase = createClient(await cookies());
    let q = supabase.from("library_books").select(BOOK_COLS).eq("institution_id", institutionId);
    if (filters?.category) q = q.eq("category", filters.category);
    if (filters?.departmentId) q = q.eq("department_id", filters.departmentId);
    if (filters?.availableOnly) q = q.gt("available_copies", 0);
    if (filters?.search) q = q.or(`title.ilike.%${filters.search}%,author.ilike.%${filters.search}%,isbn.ilike.%${filters.search}%`);
    const { data, error } = await q.order("title");
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as LibraryBook[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function addBook(input: BookInput): Promise<Result<LibraryBook>> {
  try {
    if (!input.title.trim() || !input.author.trim()) return { success: false, error: "Title and author are required." };
    if (!input.category.trim()) return { success: false, error: "Category is required." };
    const copies = Math.max(1, Math.floor(input.total_copies || 1));

    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("library_books")
      .insert({
        institution_id: input.institution_id,
        title: input.title.trim(),
        author: input.author.trim(),
        category: input.category.trim(),
        isbn: input.isbn?.trim() || null,
        department_id: input.department_id || null,
        total_copies: copies,
        available_copies: copies,
        published_year: input.published_year ?? null,
        publisher: input.publisher?.trim() || null,
      })
      .select(BOOK_COLS)
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institution_id}/library`);
    return { success: true, data: data as unknown as LibraryBook };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Search staff + students (who have a login) to pick a borrower. */
export async function searchBorrowers(institutionId: string, query: string): Promise<Result<Borrower[]>> {
  try {
    const supabase = createClient(await cookies());
    const q = query.trim();
    const [staffRes, studentRes] = await Promise.all([
      supabase.from("staff").select("profile_id, full_name, designation")
        .eq("institution_id", institutionId).eq("is_active", true).not("profile_id", "is", null)
        .ilike("full_name", `%${q}%`).limit(8),
      supabase.from("students").select("profile_id, full_name, roll_no")
        .eq("institution_id", institutionId).not("profile_id", "is", null)
        .ilike("full_name", `%${q}%`).limit(8),
    ]);
    const staff: Borrower[] = (staffRes.data ?? []).map((s) => ({
      id: s.profile_id as string, name: s.full_name as string, type: "staff", sub: (s.designation as string) ?? null,
    }));
    const students: Borrower[] = (studentRes.data ?? []).map((s) => ({
      id: s.profile_id as string, name: s.full_name as string, type: "student", sub: (s.roll_no as string) ?? null,
    }));
    return { success: true, data: [...staff, ...students] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function issueBook(input: {
  institutionId: string; bookId: string; borrowerId: string;
  borrowerType: "student" | "staff"; dueDate: string;
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());

    const { data: book, error: bookErr } = await supabase
      .from("library_books").select("available_copies").eq("id", input.bookId).maybeSingle();
    if (bookErr) return { success: false, error: bookErr.message };
    if (!book) return { success: false, error: "Book not found." };
    if ((book.available_copies as number) <= 0) return { success: false, error: "No copies available." };

    const { error: insErr } = await supabase.from("library_lendings").insert({
      institution_id: input.institutionId,
      book_id: input.bookId,
      borrower_id: input.borrowerId,
      borrower_type: input.borrowerType,
      due_date: input.dueDate,
      status: "issued",
    });
    if (insErr) return { success: false, error: insErr.message };

    const { error: updErr } = await supabase
      .from("library_books")
      .update({ available_copies: (book.available_copies as number) - 1 })
      .eq("id", input.bookId);
    if (updErr) return { success: false, error: updErr.message };

    revalidatePath(`/institutions/${input.institutionId}/library`);
    revalidatePath(`/institutions/${input.institutionId}/library/lend`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function returnBook(
  lendingId: string,
  institutionId: string,
  ratePerDay: number = FINE_PER_DAY
): Promise<Result<{ fine: number }>> {
  try {
    const supabase = createClient(await cookies());
    const { data: lending, error } = await supabase
      .from("library_lendings").select("book_id, due_date, returned_date").eq("id", lendingId).maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!lending) return { success: false, error: "Lending not found." };
    if (lending.returned_date) return { success: false, error: "Already returned." };

    const today = new Date().toISOString().slice(0, 10);
    const fine = calculateFine(lending.due_date as string, today, ratePerDay);

    const { error: updErr } = await supabase
      .from("library_lendings")
      .update({ returned_date: today, status: "returned", fine_amount: fine })
      .eq("id", lendingId);
    if (updErr) return { success: false, error: updErr.message };

    // Return the copy to the shelf
    const { data: book } = await supabase
      .from("library_books").select("available_copies, total_copies").eq("id", lending.book_id as string).maybeSingle();
    if (book) {
      const next = Math.min((book.available_copies as number) + 1, book.total_copies as number);
      await supabase.from("library_books").update({ available_copies: next }).eq("id", lending.book_id as string);
    }

    revalidatePath(`/institutions/${institutionId}/library`);
    revalidatePath(`/institutions/${institutionId}/library/lend`);
    revalidatePath(`/institutions/${institutionId}/library/overdue`);
    return { success: true, data: { fine } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function getLendings(
  institutionId: string,
  opts?: { openOnly?: boolean }
): Promise<Result<LendingWithBorrower[]>> {
  try {
    const supabase = createClient(await cookies());
    let q = supabase.from("library_lendings").select(LENDING_COLS).eq("institution_id", institutionId);
    if (opts?.openOnly) q = q.is("returned_date", null);
    const { data, error } = await q.order("due_date", { ascending: true });
    if (error) return { success: false, error: error.message };
    const rows = (data ?? []) as unknown as LibraryLending[];

    // Resolve borrower names (borrower_id → staff/students by profile_id)
    const ids = Array.from(new Set(rows.map((r) => r.borrower_id)));
    const nameById = new Map<string, string>();
    if (ids.length > 0) {
      const [staff, students] = await Promise.all([
        supabase.from("staff").select("profile_id, full_name").in("profile_id", ids),
        supabase.from("students").select("profile_id, full_name").in("profile_id", ids),
      ]);
      for (const s of staff.data ?? []) nameById.set(s.profile_id as string, s.full_name as string);
      for (const s of students.data ?? []) nameById.set(s.profile_id as string, s.full_name as string);
    }

    return {
      success: true,
      data: rows.map((r) => ({ ...r, borrower_name: nameById.get(r.borrower_id) ?? "Unknown" })),
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** The current user's own borrowed books (for staff/student portals). */
export async function getMyLendings(): Promise<Result<LibraryLending[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };
    const { data, error } = await supabase
      .from("library_lendings").select(LENDING_COLS)
      .eq("borrower_id", user.id)
      .order("issued_date", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as LibraryLending[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
