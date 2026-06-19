import { describe, it, expect } from "vitest";
import {
  QUESTION_TYPE_LABELS, RATING_SCALE, isRating,
  overallRatingOf, aggregateResponses, responseRate, wordFrequencies, ratingLabel,
  type FeedbackQuestion, type AnswerMap,
} from "@/lib/feedback";

const QS: FeedbackQuestion[] = [
  { id: "q1", text: "Clarity of teaching", type: "rating" },
  { id: "q2", text: "Punctuality", type: "rating" },
  { id: "q3", text: "Any comments?", type: "text" },
];

describe("metadata", () => {
  it("labels both question types and exposes a 5-point scale", () => {
    expect(QUESTION_TYPE_LABELS.rating).toBeTruthy();
    expect(QUESTION_TYPE_LABELS.text).toBeTruthy();
    expect(RATING_SCALE).toBe(5);
    expect(isRating(QS[0])).toBe(true);
    expect(isRating(QS[2])).toBe(false);
  });
});

describe("overallRatingOf", () => {
  it("averages only the rating answers", () => {
    expect(overallRatingOf(QS, { q1: 4, q2: 5, q3: "great" })).toBe(4.5);
  });
  it("returns null when no ratings are answered", () => {
    expect(overallRatingOf(QS, { q3: "only text" })).toBeNull();
  });
});

describe("aggregateResponses", () => {
  const responses: AnswerMap[] = [
    { q1: 5, q2: 4, q3: "Very clear and helpful" },
    { q1: 4, q2: 4, q3: "helpful teaching" },
    { q1: 3, q2: 2, q3: "" },
  ];
  const agg = aggregateResponses(QS, responses);

  it("counts responses and builds rating distributions", () => {
    expect(agg.responseCount).toBe(3);
    const q1 = agg.ratings.find((r) => r.questionId === "q1")!;
    expect(q1.count).toBe(3);
    expect(q1.average).toBe(4); // (5+4+3)/3
    expect(q1.distribution).toEqual([0, 0, 1, 1, 1]); // one 3★, one 4★, one 5★
  });

  it("collects non-empty comments only", () => {
    const c = agg.comments.find((c) => c.questionId === "q3")!;
    expect(c.answers).toEqual(["Very clear and helpful", "helpful teaching"]);
  });

  it("computes overall as the mean of per-question averages", () => {
    // q1 avg 4, q2 avg (4+4+2)/3 = 3.33 → overall (4 + 3.33)/2 = 3.67
    expect(agg.overallAverage).toBe(3.67);
  });

  it("handles an empty response set", () => {
    const empty = aggregateResponses(QS, []);
    expect(empty.responseCount).toBe(0);
    expect(empty.overallAverage).toBeNull();
    expect(empty.ratings[0].distribution).toEqual([0, 0, 0, 0, 0]);
  });

  it("ignores out-of-range ratings", () => {
    const a = aggregateResponses([QS[0]], [{ q1: 9 }, { q1: 0 }, { q1: 5 }]);
    expect(a.ratings[0].count).toBe(1);
    expect(a.ratings[0].average).toBe(5);
  });
});

describe("responseRate", () => {
  it("is a percentage to one decimal", () => {
    expect(responseRate(15, 40)).toBe(37.5);
    expect(responseRate(1, 3)).toBe(33.3);
    expect(responseRate(5, 0)).toBe(0);
  });
});

describe("wordFrequencies", () => {
  it("ranks meaningful words and drops stopwords/short tokens", () => {
    const wf = wordFrequencies(["Very clear and helpful teaching", "helpful teaching, the best"]);
    const map = Object.fromEntries(wf.map((w) => [w.word, w.count]));
    expect(map["helpful"]).toBe(2);
    expect(map["teaching"]).toBe(2);
    expect(map["the"]).toBeUndefined(); // stopword
    expect(map["and"]).toBeUndefined(); // stopword
  });
  it("respects the topN limit and sorts by count then alphabetically", () => {
    const wf = wordFrequencies(["alpha alpha beta gamma gamma gamma"], 2);
    expect(wf).toEqual([{ word: "gamma", count: 3 }, { word: "alpha", count: 2 }]);
  });
});

describe("ratingLabel", () => {
  it("maps averages to coarse labels", () => {
    expect(ratingLabel(null)).toBe("No data");
    expect(ratingLabel(4.8)).toBe("Excellent");
    expect(ratingLabel(3.6)).toBe("Good");
    expect(ratingLabel(2.6)).toBe("Average");
    expect(ratingLabel(1.6)).toBe("Below average");
    expect(ratingLabel(1.0)).toBe("Poor");
  });
});
