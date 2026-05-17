from __future__ import annotations

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from models import ScheduleRequest, ScheduleResponse
from solver import solve

app = FastAPI(
    title="AURA Scheduler Engine",
    description=(
        "Generates conflict-free, workload-balanced weekly timetables "
        "for academic departments using Google OR-Tools CP-SAT."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["ops"])
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post(
    "/generate-schedule",
    response_model=ScheduleResponse,
    status_code=status.HTTP_200_OK,
    tags=["scheduler"],
    summary="Generate a 1-week conflict-free timetable",
    responses={
        400: {
            "description": "Constraints are mathematically infeasible or timed-out without a solution.",
        }
    },
)
async def generate_schedule(request: ScheduleRequest) -> ScheduleResponse:
    """
    Run the CP-SAT solver and return a structured timetable.

    - **OPTIMAL**: The best possible workload-balanced schedule was found.
    - **FEASIBLE**: A valid schedule was found within the time limit (may not be perfectly balanced).
    - **400**: No valid schedule exists for the given constraints.
    """
    result = solve(request)

    if result.status not in ("OPTIMAL", "FEASIBLE"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "INFEASIBLE_SCHEDULE",
                "solver_status": result.status,
                "solve_time_seconds": result.solve_time_seconds,
                "message": (
                    "The solver could not produce a valid timetable. "
                    "The supplied constraints are mathematically impossible to satisfy simultaneously. "
                    "Suggested remedies: (1) reduce 'required_hours_per_day' for one or more cohorts, "
                    "(2) add more staff members, or (3) increase 'max_hours_per_week' for existing staff."
                ),
            },
        )

    return result
