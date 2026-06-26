import { describe, it, expect } from "vitest";
import {
  validateQueryModel, compileCondition, compileGroup, compileFilters,
  groupAndAggregate, resultColumns, toCSV,
  type EntityDef, type QueryModel, type FilterGroup, type ResultRow,
} from "@/lib/dataExplorer";

const entity: EntityDef = {
  key: "students", label: "Students", category: "People", source: "students",
  defaultDateField: "created_at", sortOrder: 1,
  columns: [
    { key: "full_name", label: "Name", type: "text", filterable: true, groupable: false, aggregatable: false },
    { key: "student_program", label: "Program", type: "text", filterable: true, groupable: true, aggregatable: false },
    { key: "student_year", label: "Year", type: "number", filterable: true, groupable: true, aggregatable: true },
    { key: "created_at", label: "Enrolled", type: "date", filterable: true, groupable: false, aggregatable: false },
  ],
};

describe("validateQueryModel", () => {
  it("accepts a valid model", () => {
    const m: QueryModel = { entity: "students", fields: ["full_name", "student_program"] };
    expect(validateQueryModel(m, entity).ok).toBe(true);
  });
  it("rejects unknown display column", () => {
    const r = validateQueryModel({ entity: "students", fields: ["nope"] }, entity);
    expect(r.ok).toBe(false);
  });
  it("rejects entity mismatch", () => {
    expect(validateQueryModel({ entity: "staff", fields: ["full_name"] }, entity).ok).toBe(false);
  });
  it("requires at least one column or aggregation", () => {
    expect(validateQueryModel({ entity: "students", fields: [] }, entity).ok).toBe(false);
    expect(validateQueryModel({ entity: "students", fields: [], aggregations: [{ fn: "count", field: "*", as: "n" }] }, entity).ok).toBe(true);
  });
  it("rejects grouping a non-groupable column", () => {
    const r = validateQueryModel({ entity: "students", fields: ["full_name"], groupBy: ["full_name"] }, entity);
    expect(r.ok).toBe(false);
  });
  it("rejects aggregating a non-aggregatable column but allows count(*)", () => {
    expect(validateQueryModel({ entity: "students", fields: ["full_name"], aggregations: [{ fn: "sum", field: "full_name", as: "x" }] }, entity).ok).toBe(false);
    expect(validateQueryModel({ entity: "students", fields: ["full_name"], aggregations: [{ fn: "count", field: "*", as: "n" }] }, entity).ok).toBe(true);
  });
  it("rejects a filter on an unknown column", () => {
    const m: QueryModel = { entity: "students", fields: ["full_name"], filters: { op: "and", conditions: [{ field: "ghost", operator: "eq", value: 1 }] } };
    expect(validateQueryModel(m, entity).ok).toBe(false);
  });
});

describe("filter compilation (PostgREST grammar)", () => {
  it("compiles leaf operators", () => {
    expect(compileCondition({ field: "student_year", operator: "eq", value: 1 })).toBe("student_year.eq.1");
    expect(compileCondition({ field: "student_program", operator: "in", value: ["UG", "PG"] })).toBe("student_program.in.(UG,PG)");
    expect(compileCondition({ field: "full_name", operator: "is_null" })).toBe("full_name.is.null");
    expect(compileCondition({ field: "student_year", operator: "between", value: [1, 3] })).toBe("and(student_year.gte.1,student_year.lte.3)");
  });
  it("quotes values with reserved characters", () => {
    expect(compileCondition({ field: "full_name", operator: "eq", value: "Anita, K" })).toBe('full_name.eq."Anita, K"');
  });
  it("compiles nested AND/OR groups", () => {
    const g: FilterGroup = {
      op: "and",
      conditions: [
        { field: "student_program", operator: "eq", value: "UG" },
        { op: "or", conditions: [
          { field: "student_year", operator: "eq", value: 1 },
          { field: "student_year", operator: "eq", value: 2 },
        ] },
      ],
    };
    expect(compileGroup(g)).toBe("and(student_program.eq.UG,or(student_year.eq.1,student_year.eq.2))");
  });
  it("splits a root-AND into leaves + nested or-strings", () => {
    const g: FilterGroup = {
      op: "and",
      conditions: [
        { field: "student_program", operator: "eq", value: "UG" },
        { op: "or", conditions: [{ field: "student_year", operator: "eq", value: 1 }, { field: "student_year", operator: "eq", value: 2 }] },
      ],
    };
    const plan = compileFilters(g);
    expect(plan.andLeaves).toHaveLength(1);
    expect(plan.andLeaves[0].field).toBe("student_program");
    expect(plan.orStrings).toEqual(["or(student_year.eq.1,student_year.eq.2)"]);
  });
  it("a root-OR becomes one or-string", () => {
    const plan = compileFilters({ op: "or", conditions: [{ field: "student_year", operator: "eq", value: 1 }, { field: "student_year", operator: "eq", value: 2 }] });
    expect(plan.andLeaves).toHaveLength(0);
    expect(plan.orStrings).toEqual(["or(student_year.eq.1,student_year.eq.2)"]);
  });
});

describe("groupAndAggregate", () => {
  const rows: ResultRow[] = [
    { student_program: "UG", student_year: 1 },
    { student_program: "UG", student_year: 2 },
    { student_program: "PG", student_year: 1 },
  ];
  it("returns rows unchanged with no group/agg", () => {
    expect(groupAndAggregate(rows, { entity: "students", fields: ["student_program"] })).toEqual(rows);
  });
  it("produces a single summary row for aggregations only", () => {
    const out = groupAndAggregate(rows, { entity: "students", fields: [], aggregations: [{ fn: "count", field: "*", as: "total" }, { fn: "avg", field: "student_year", as: "avg_year" }] });
    expect(out).toHaveLength(1);
    expect(out[0].total).toBe(3);
    expect(out[0].avg_year).toBeCloseTo(1.33, 1);
  });
  it("groups + aggregates per group", () => {
    const out = groupAndAggregate(rows, { entity: "students", fields: [], groupBy: ["student_program"], aggregations: [{ fn: "count", field: "*", as: "n" }] });
    const ug = out.find((r) => r.student_program === "UG");
    const pg = out.find((r) => r.student_program === "PG");
    expect(ug?.n).toBe(2);
    expect(pg?.n).toBe(1);
  });
  it("defaults to a count per group when grouping without aggregations", () => {
    const out = groupAndAggregate(rows, { entity: "students", fields: [], groupBy: ["student_program"] });
    expect(out.find((r) => r.student_program === "UG")?.count).toBe(2);
  });
});

describe("resultColumns & toCSV", () => {
  it("uses display fields when not aggregating", () => {
    expect(resultColumns({ entity: "students", fields: ["full_name", "student_year"] })).toEqual(["full_name", "student_year"]);
  });
  it("uses groupBy + agg aliases when aggregating", () => {
    expect(resultColumns({ entity: "students", fields: [], groupBy: ["student_program"], aggregations: [{ fn: "count", field: "*", as: "n" }] })).toEqual(["student_program", "n"]);
  });
  it("serializes CSV with header + quoting", () => {
    const csv = toCSV([{ a: "x", b: "has,comma" }], ["a", "b"]);
    expect(csv).toBe('a,b\nx,"has,comma"');
  });
});
