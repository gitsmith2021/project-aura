from __future__ import annotations

import hmac
import os

from fastapi import Depends, FastAPI, Header, HTTPException, status
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

# CORS: the only caller is the Next.js *server* (server-to-server requests are
# not subject to browser CORS), so the production allow-list is normally empty.
# ALLOWED_ORIGINS is an optional comma-separated list for any genuine browser
# client; default is no cross-origin browser access at all.
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-API-Key"],
)

# Shared-secret auth. The secret is provisioned via the SCHEDULER_API_KEY env
# var on both this service (Railway) and the Next.js app (Vercel). The mutating
# endpoint requires it; /health stays public so liveness probes and uptime
# monitors work without the key.
SCHEDULER_API_KEY = os.environ.get("SCHEDULER_API_KEY")


async def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    # Fail closed: if the secret was never provisioned, reject rather than run
    # open — a "working" but unauthenticated solver is a footgun.
    if not SCHEDULER_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Scheduler misconfigured: SCHEDULER_API_KEY is not set.",
        )
    # Constant-time comparison to avoid leaking the key via timing.
    if not hmac.compare_digest(x_api_key or "", SCHEDULER_API_KEY):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key.",
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
    dependencies=[Depends(require_api_key)],
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
