
from pathlib import Path
from typing import List, Dict

import pandas as pd
import sqlite3
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="Hack DS API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # you can tighten this later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


BASE_DIR = Path(__file__).parent
DB_PATH = BASE_DIR / "Backend" / "Hack_DS.db"


def _sqlite_query(sql: str, params: tuple = ()) -> pd.DataFrame:
    """Execute a SELECT query on the DB and return a pandas DataFrame."""
    with sqlite3.connect(DB_PATH) as conn:
        return pd.read_sql(sql, conn, params=params)



@app.get("/get_districts1", response_model=List[str])
def get_districts() -> List[str]:
    """
    Return the distinct district names stored in the DB.
    """
    df = _sqlite_query("SELECT DISTINCT District_Name FROM Hack_DS")
    # Drop NaNs, keep only unique values, and return as a plain Python list
    districts = df["District_Name"].dropna().unique().tolist()
    return districts


@app.get("/get1_units", response_model=List[str])
def get_units(
    district_name: str = Query(..., description="Name of the district (case‑insensitive)")
) -> List[str]:
    """
    Return the distinct unit names for a given district.
    """
    # Normalise the incoming value to lower‑case to mimic the original Flask logic
    district_name_lc = district_name.lower()
    sql = """
        SELECT DISTINCT UnitName
        FROM Hack_DS
        WHERE LOWER(District_Name) = ?
    """
    df = _sqlite_query(sql, params=(district_name_lc,))
    units = df["UnitName"].dropna().unique().tolist()
    return units


@app.get("/get1_data")
def get_data(
    district_name: str = Query(..., description="District name (case‑insensitive)"),
    unit_name: str = Query(..., description="Unit name (case‑insensitive)")
) -> JSONResponse:
    """
    Return aggregated crime statistics for the requested district + unit.
    The response mimics the JSON structure that the Flask version produced.
    """
    # -----------------------------------------------------------------------
    # Load the minimal columns we need – this is the same query the Flask app used
    # -----------------------------------------------------------------------
    df = _sqlite_query(
        "SELECT District_Name, UnitName, date_time FROM Hack_DS"
    )

    # -----------------------------------------------------------------------
    # Convert the date column to a proper datetime and extract useful parts
    # -----------------------------------------------------------------------
    df["date_time"] = pd.to_datetime(df["date_time"], format="%d-%m-%Y %H:%M", errors="coerce")
    # If any rows failed parsing we drop them – they would break the groupbys later
    df = df.dropna(subset=["date_time"])

    df["year"] = df["date_time"].dt.year
    df["month"] = df["date_time"].dt.month
    df["day_of_week"] = df["date_time"].dt.dayofweek
    df["hour"] = df["date_time"].dt.hour

    # -----------------------------------------------------------------------
    # Filter by the supplied district & unit (case‑insensitive)
    # -----------------------------------------------------------------------
    mask = (
        df["District_Name"].str.lower() == district_name.lower()
    ) & (
        df["UnitName"].str.lower() == unit_name.lower()
    )
    filtered_df = df.loc[mask]

    if filtered_df.empty:
        raise HTTPException(
            status_code=404,
            detail="No data found for the specified district and unit"
        )

    # -----------------------------------------------------------------------
    # Build the aggregated dictionaries exactly like the Flask version
    # -----------------------------------------------------------------------
    def _group_to_dict(col: str) -> Dict[str, List[int]]:
        grouped = filtered_df.groupby(col).size().reset_index(name="crime_count")
        # FastAPI/pydantic can return dicts directly; converting to a plain dict
        # with list values matches the original `.to_dict(orient='list')`
        return grouped.to_dict(orient="list")

    data = {
        "crime_by_weekday": _group_to_dict("day_of_week"),
        "crime_by_month":   _group_to_dict("month"),
        "crime_by_year":    _group_to_dict("year"),
        "crime_by_hour":    _group_to_dict("hour"),
    }

    return JSONResponse(content=data)



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("trend_analysis:app", host="0.0.0.0", port=5005, reload=True)
