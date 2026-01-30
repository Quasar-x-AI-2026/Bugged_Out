import os
import sqlite3
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Hack_DS Crime API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------
# Database helpers
# ------------------------------------------------------------------
DB_PATH = os.path.join(os.path.dirname(__file__), "Backend", "Hack_DS.db")


def get_db_connection():
    """Create a new SQLite connection (row‑factory = dict‑like)."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_db():
    """FastAPI dependency that yields a connection and closes it afterwards."""
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()


# ------------------------------------------------------------------
# Pydantic response models (optional but nice for IDE auto‑complete)
# ------------------------------------------------------------------
class CrimeRow(BaseModel):
    District_Name: str
    UnitName: str
    Beat_Name: str
    date_time: str
    CrimeHead_Name: str


class PaginatedCrimeResponse(BaseModel):
    data: List[CrimeRow]
    page: int
    total_pages: int


# ------------------------------------------------------------------
# Endpoints – they mirror the Flask routes exactly
# ------------------------------------------------------------------

@app.get("/get_districts", response_model=List[str])
def get_districts(db: sqlite3.Connection = Depends(get_db)):
    """Fetch distinct districts."""
    cursor = db.cursor()
    cursor.execute("SELECT DISTINCT District_Name FROM Hack_DS")
    districts = [row["District_Name"] for row in cursor.fetchall()]
    return districts


@app.get("/get_units", response_model=List[str])
def get_units(
    district: str = Query(..., description="Name of the district"),
    db: sqlite3.Connection = Depends(get_db),
):
    """Fetch distinct units for a given district."""
    cursor = db.cursor()
    cursor.execute(
        "SELECT DISTINCT UnitName FROM Hack_DS WHERE District_Name = ?", (district,)
    )
    units = [row["UnitName"] for row in cursor.fetchall()]
    return units


@app.get("/get_crimeheads", response_model=List[str])
def get_crimeheads(
    district: str = Query(..., description="Name of the district"),
    unit: str = Query(..., description="Name of the unit"),
    db: sqlite3.Connection = Depends(get_db),
):
    """Fetch distinct crime‑head names for a district‑unit pair."""
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT DISTINCT CrimeHead_Name
        FROM Hack_DS
        WHERE District_Name = ? AND UnitName = ?
        """,
        (district, unit),
    )
    heads = [row["CrimeHead_Name"] for row in cursor.fetchall()]
    return heads


@app.get(
    "/get_crime_data",
    response_model=PaginatedCrimeResponse,
    responses={404: {"description": "No data for the given filters or page"}},
)
def get_crime_data(
    district: str = Query(..., description="District name"),
    unit_name: str = Query(..., alias="unit_name", description="Unit name"),
    crime_type: str = Query(..., alias="crime_type", description="Crime head name"),
    page: int = Query(1, ge=1, description="Page number (1‑based)"),
    db: sqlite3.Connection = Depends(get_db),
):
    """Fetch paginated crime rows for the supplied filters."""
    PER_PAGE = 10
    offset = (page - 1) * PER_PAGE

    # -------------------- 1️⃣ Get the page of rows --------------------
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT District_Name, UnitName, Beat_Name, date_time, CrimeHead_Name
        FROM Hack_DS
        WHERE District_Name = ? AND UnitName = ? AND CrimeHead_Name = ?
        LIMIT ? OFFSET ?
        """,
        (district, unit_name, crime_type, PER_PAGE, offset),
    )
    rows = cursor.fetchall()

    if not rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No data available for the given filters or page",
        )

    # -------------------- 2️⃣ Total count for pagination --------------------
    cursor.execute(
        """
        SELECT COUNT(*) AS total
        FROM Hack_DS
        WHERE District_Name = ? AND UnitName = ? AND CrimeHead_Name = ?
        """,
        (district, unit_name, crime_type),
    )
    total_records = cursor.fetchone()["total"]
    total_pages = (total_records + PER_PAGE - 1) // PER_PAGE

    # -------------------- 3️⃣ Build the response --------------------
    data = [dict(row) for row in rows]  # each row is a sqlite3.Row → dict
    return {"data": data, "page": page, "total_pages": total_pages}


# ------------------------------------------------------------------
# Entrypoint for `python main.py`
# ------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("Beat_comparison:app", host="0.0.0.0", port=5010, reload=True)
