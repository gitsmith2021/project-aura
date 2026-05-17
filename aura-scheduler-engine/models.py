from __future__ import annotations

from pydantic import BaseModel, Field, model_validator


class Staff(BaseModel):
    id: str
    name: str
    max_hours_per_week: int = Field(gt=0, description="Hard cap on weekly teaching periods.")


class Cohort(BaseModel):
    id: str
    name: str
    required_hours_per_day: int = Field(
        default=6,
        gt=0,
        description="Instructional periods this cohort must receive each day.",
    )


class InstitutionSettings(BaseModel):
    days_per_week: int = Field(default=5, ge=1, le=7)
    periods_per_day: int = Field(default=6, ge=1, le=12)


class ScheduleRequest(BaseModel):
    staff: list[Staff] = Field(min_length=1)
    cohorts: list[Cohort] = Field(min_length=1)
    settings: InstitutionSettings = Field(default_factory=InstitutionSettings)

    @model_validator(mode="after")
    def _validate_ids_unique(self) -> ScheduleRequest:
        staff_ids = [s.id for s in self.staff]
        if len(staff_ids) != len(set(staff_ids)):
            raise ValueError("Duplicate staff IDs are not allowed.")
        cohort_ids = [c.id for c in self.cohorts]
        if len(cohort_ids) != len(set(cohort_ids)):
            raise ValueError("Duplicate cohort IDs are not allowed.")
        return self

    @model_validator(mode="after")
    def _validate_hours_fit_in_day(self) -> ScheduleRequest:
        for cohort in self.cohorts:
            if cohort.required_hours_per_day > self.settings.periods_per_day:
                raise ValueError(
                    f"Cohort '{cohort.name}' requires {cohort.required_hours_per_day} hours/day "
                    f"but only {self.settings.periods_per_day} periods exist per day."
                )
        return self


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------


class ScheduleEntry(BaseModel):
    staff_id: str
    staff_name: str
    cohort_id: str
    cohort_name: str
    day: int = Field(description="0-indexed day (0 = Monday).")
    day_name: str
    period: int = Field(description="0-indexed period within the day.")


class StaffWorkload(BaseModel):
    staff_id: str
    staff_name: str
    total_hours_week: int


class ScheduleResponse(BaseModel):
    status: str = Field(description="Solver status: OPTIMAL or FEASIBLE.")
    solve_time_seconds: float
    timetable: list[ScheduleEntry]
    staff_workload: list[StaffWorkload]