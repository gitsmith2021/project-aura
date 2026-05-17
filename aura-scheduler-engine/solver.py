from __future__ import annotations

from ortools.sat.python import cp_model

from models import (
    Cohort,
    ScheduleEntry,
    ScheduleRequest,
    ScheduleResponse,
    Staff,
    StaffWorkload,
)

_DAY_NAMES = [
    "Monday", "Tuesday", "Wednesday", "Thursday",
    "Friday", "Saturday", "Sunday",
]

# Maximum wall-clock seconds the solver is allowed to run.
_SOLVER_TIME_LIMIT_S = 30.0


def solve(request: ScheduleRequest) -> ScheduleResponse:
    """
    Build and solve the CP-SAT scheduling model.

    Hard constraints
    ----------------
    1. A staff member teaches at most one cohort per period.
    2. A cohort has at most one instructor per period.
    3. A cohort receives exactly `required_hours_per_day` periods of instruction per day.
    4. A staff member's total weekly periods never exceed `max_hours_per_week`.

    Soft constraint (objective)
    ---------------------------
    Minimise the range (max − min) of total weekly teaching hours across all staff,
    producing the most evenly distributed workload the solver can find.
    """
    model = cp_model.CpModel()

    staff_list: list[Staff] = request.staff
    cohort_list: list[Cohort] = request.cohorts
    settings = request.settings

    days = range(settings.days_per_week)
    periods = range(settings.periods_per_day)
    max_slots = settings.days_per_week * settings.periods_per_day

    # -----------------------------------------------------------------------
    # Decision variables
    # sched[staff_id, cohort_id, day, period] = 1 iff that staff teaches
    # that cohort in that slot.
    # -----------------------------------------------------------------------
    sched: dict[tuple[str, str, int, int], cp_model.IntVar] = {}
    for s in staff_list:
        for c in cohort_list:
            for d in days:
                for p in periods:
                    sched[s.id, c.id, d, p] = model.new_bool_var(
                        f"s{s.id}_c{c.id}_d{d}_p{p}"
                    )

    # -----------------------------------------------------------------------
    # Hard constraint 1 – staff teaches at most 1 cohort per slot
    # -----------------------------------------------------------------------
    for s in staff_list:
        for d in days:
            for p in periods:
                model.add(
                    sum(sched[s.id, c.id, d, p] for c in cohort_list) <= 1
                )

    # -----------------------------------------------------------------------
    # Hard constraint 2 – cohort has at most 1 instructor per slot
    # -----------------------------------------------------------------------
    for c in cohort_list:
        for d in days:
            for p in periods:
                model.add(
                    sum(sched[s.id, c.id, d, p] for s in staff_list) <= 1
                )

    # -----------------------------------------------------------------------
    # Hard constraint 3 – cohort receives exactly required_hours_per_day per day
    # -----------------------------------------------------------------------
    for c in cohort_list:
        for d in days:
            model.add(
                sum(
                    sched[s.id, c.id, d, p]
                    for s in staff_list
                    for p in periods
                )
                == c.required_hours_per_day
            )

    # -----------------------------------------------------------------------
    # Hard constraint 4 – staff weekly load cap
    # -----------------------------------------------------------------------
    for s in staff_list:
        model.add(
            sum(
                sched[s.id, c.id, d, p]
                for c in cohort_list
                for d in days
                for p in periods
            )
            <= s.max_hours_per_week
        )

    # -----------------------------------------------------------------------
    # Auxiliary variables: total weekly hours per staff member
    # -----------------------------------------------------------------------
    staff_total: dict[str, cp_model.IntVar] = {}
    for s in staff_list:
        var = model.new_int_var(0, max_slots, f"total_{s.id}")
        model.add(
            var
            == sum(
                sched[s.id, c.id, d, p]
                for c in cohort_list
                for d in days
                for p in periods
            )
        )
        staff_total[s.id] = var

    # -----------------------------------------------------------------------
    # Soft constraint – minimise workload range (peak − trough)
    # -----------------------------------------------------------------------
    if len(staff_list) > 1:
        all_hour_vars = list(staff_total.values())

        peak = model.new_int_var(0, max_slots, "peak_hours")
        trough = model.new_int_var(0, max_slots, "trough_hours")
        model.add_max_equality(peak, all_hour_vars)
        model.add_min_equality(trough, all_hour_vars)
        model.minimize(peak - trough)

    # -----------------------------------------------------------------------
    # Solve
    # -----------------------------------------------------------------------
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = _SOLVER_TIME_LIMIT_S

    status_code = solver.solve(model)
    status_name: str = solver.status_name(status_code)

    timetable: list[ScheduleEntry] = []
    workload: list[StaffWorkload] = []

    if status_code in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        for s in staff_list:
            for c in cohort_list:
                for d in days:
                    for p in periods:
                        if solver.boolean_value(sched[s.id, c.id, d, p]):
                            timetable.append(
                                ScheduleEntry(
                                    staff_id=s.id,
                                    staff_name=s.name,
                                    cohort_id=c.id,
                                    cohort_name=c.name,
                                    day=d,
                                    day_name=_DAY_NAMES[d],
                                    period=p,
                                )
                            )

        for s in staff_list:
            workload.append(
                StaffWorkload(
                    staff_id=s.id,
                    staff_name=s.name,
                    total_hours_week=solver.value(staff_total[s.id]),
                )
            )

    return ScheduleResponse(
        status=status_name,
        solve_time_seconds=round(solver.wall_time, 4),
        timetable=timetable,
        staff_workload=workload,
    )
