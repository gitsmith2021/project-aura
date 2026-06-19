// ─────────────────────────────────────────────────────────────
// Student Feedback & Faculty Ratings — pure domain helpers (Phase 6E)
// Response aggregation, rating maths and word-frequency (word cloud).
// Anonymity is enforced at the data layer; these helpers only ever see
// answer content, never a student identity.
// ─────────────────────────────────────────────────────────────

export type FeedbackQuestionType = "rating" | "text";

export const QUESTION_TYPE_LABELS: Record<FeedbackQuestionType, string> = {
  rating: "Star rating",
  text: "Open comment",
};

export type FeedbackQuestion = {
  id: string;
  text: string;
  type: FeedbackQuestionType;
};

/** Rating questions are answered on a 1–5 scale. */
export const RATING_SCALE = 5;

export function isRating(q: FeedbackQuestion): boolean {
  return q.type === "rating";
}

export type AnswerMap = Record<string, number | string>;

/** Mean of the rating answers in a single response (null if none answered). */
export function overallRatingOf(questions: FeedbackQuestion[], answers: AnswerMap): number | null {
  const vals: number[] = [];
  for (const q of questions) {
    if (q.type !== "rating") continue;
    const v = answers[q.id];
    if (typeof v === "number" && v > 0) vals.push(v);
  }
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
}

export type RatingAggregate = {
  questionId: string;
  text: string;
  average: number;       // rounded to 2dp
  count: number;
  distribution: number[]; // length 5: [#1★, #2★, #3★, #4★, #5★]
};

export type CommentAggregate = {
  questionId: string;
  text: string;
  answers: string[];
};

export type FeedbackAggregate = {
  responseCount: number;
  overallAverage: number | null;
  ratings: RatingAggregate[];
  comments: CommentAggregate[];
};

/** Aggregate many responses into per-question stats. */
export function aggregateResponses(questions: FeedbackQuestion[], responses: AnswerMap[]): FeedbackAggregate {
  const ratings: RatingAggregate[] = [];
  const comments: CommentAggregate[] = [];

  for (const q of questions) {
    if (q.type === "rating") {
      const distribution = [0, 0, 0, 0, 0];
      let sum = 0;
      let count = 0;
      for (const r of responses) {
        const v = r[q.id];
        if (typeof v === "number" && v >= 1 && v <= RATING_SCALE) {
          distribution[Math.round(v) - 1] += 1;
          sum += v;
          count += 1;
        }
      }
      ratings.push({
        questionId: q.id,
        text: q.text,
        average: count ? Math.round((sum / count) * 100) / 100 : 0,
        count,
        distribution,
      });
    } else {
      const answers: string[] = [];
      for (const r of responses) {
        const v = r[q.id];
        if (typeof v === "string" && v.trim()) answers.push(v.trim());
      }
      comments.push({ questionId: q.id, text: q.text, answers });
    }
  }

  // overall = mean of the per-question rating averages that received responses
  const scored = ratings.filter((r) => r.count > 0);
  const overallAverage = scored.length
    ? Math.round((scored.reduce((a, r) => a + r.average, 0) / scored.length) * 100) / 100
    : null;

  return { responseCount: responses.length, overallAverage, ratings, comments };
}

export function responseRate(responseCount: number, eligibleCount: number): number {
  if (eligibleCount <= 0) return 0;
  return Math.round((responseCount / eligibleCount) * 1000) / 10;
}

const STOPWORDS = new Set([
  "the", "and", "for", "are", "was", "but", "not", "you", "all", "can", "her", "his", "had", "has",
  "with", "this", "that", "they", "have", "from", "very", "more", "most", "some", "such", "your",
  "their", "them", "than", "then", "into", "also", "been", "were", "will", "would", "could", "should",
  "about", "which", "when", "what", "who", "how", "our", "out", "use", "good", "sir", "madam", "mam",
]);

/** Word-frequency list for a word cloud: top `topN` non-trivial words. */
export function wordFrequencies(texts: string[], topN = 30): { word: string; count: number }[] {
  const freq = new Map<string, number>();
  for (const t of texts) {
    const words = t.toLowerCase().match(/[a-z]+/g) ?? [];
    for (const w of words) {
      if (w.length < 3 || STOPWORDS.has(w)) continue;
      freq.set(w, (freq.get(w) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
    .slice(0, topN);
}

/** Coarse label for an average rating (for badges). */
export function ratingLabel(avg: number | null): string {
  if (avg === null) return "No data";
  if (avg >= 4.5) return "Excellent";
  if (avg >= 3.5) return "Good";
  if (avg >= 2.5) return "Average";
  if (avg >= 1.5) return "Below average";
  return "Poor";
}
