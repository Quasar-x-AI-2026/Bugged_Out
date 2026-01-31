from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import pandas as pd
import os
import uvicorn
from typing import List, Dict


app = FastAPI(
    title="Hack‑DS Crime API",
    description="Endpoints that expose district‑wise crime information stored in Hack_DS.db",
    version="1.0.0",
)

# Allow requests from any origin (same as Flask‑CORS default)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # you can restrict this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Helper to get a DB connection (one per request)

DB_PATH = os.path.join(os.path.dirname(__file__), "Backend", "Hack_DS.db")


def get_connection() -> sqlite3.Connection:
    """Create a new SQLite connection. Caller is responsible for closing it."""
    return sqlite3.connect(DB_PATH)



# Endpoints

@app.get("/districts", response_model=List[str])
def get_districts() -> List[str]:
    """Return the distinct list of district names."""
    conn = get_connection()
    try:
        df = pd.read_sql("SELECT DISTINCT District_Name FROM Hack_DS", conn)
        districts = df["District_Name"].dropna().tolist()
        return districts
    finally:
        conn.close()


@app.get("/crime-groups", response_model=List[str])
def get_crime_groups(district: str = Query(..., description="Name of the district")) -> List[str]:
    """Return the distinct crime‑group names for a given district."""
    conn = get_connection()
    try:
        query = """
            SELECT DISTINCT CrimeGroup_Name
            FROM Hack_DS
            WHERE District_Name = ?
        """
        df = pd.read_sql(query, conn, params=[district])
        groups = df["CrimeGroup_Name"].dropna().tolist()
        return groups
    finally:
        conn.close()


@app.get("/heatmap", response_model=List[Dict[str, float]])
def get_heatmap(district: str = Query(..., description="Name of the district")) -> List[Dict[str, float]]:
    """
    Return all (latitude, longitude) pairs for the requested district.
    Records missing a coordinate are dropped.
    """
    conn = get_connection()
    try:
        query = """
            SELECT Latitude, Longitude
            FROM Hack_DS
            WHERE District_Name = ?
        """
        df = pd.read_sql(query, conn, params=[district])
        df = df.dropna(subset=["Latitude", "Longitude"])
        # Convert each row to a dict: {"Latitude": ..., "Longitude": ...}
        return df.to_dict(orient="records")
    finally:
        conn.close()


@app.get("/district-crimes", response_model=List[Dict])
def get_district_crimes(district: str = Query(..., description="Name of the district")) -> List[Dict]:
    """
    Return latitude, longitude, crime‑group and crime‑head for every record
    in the chosen district (coordinates must be present).
    """
    conn = get_connection()
    try:
        query = """
            SELECT Latitude,
                   Longitude,
                   CrimeGroup_Name,
                   CrimeHead_Name
            FROM Hack_DS
            WHERE District_Name = ?
        """
        df = pd.read_sql(query, conn, params=[district])
        df = df.dropna(subset=["Latitude", "Longitude"])
        return df.to_dict(orient="records")
    finally:
        conn.close()


@app.get("/crimes-by-group", response_model=List[Dict])
def get_crimes_by_group(
    district: str = Query(..., description="Name of the district"),
    crime_group: str = Query(..., alias="crime_group", description="Name of the crime group"),
) -> List[Dict]:
    """
    Same as `/district-crimes` but filtered by a specific crime group.
    """
    conn = get_connection()
    try:
        query = """
            SELECT Latitude,
                   Longitude,
                   CrimeGroup_Name,
                   CrimeHead_Name
            FROM Hack_DS
            WHERE District_Name = ? AND CrimeGroup_Name = ?
        """
        df = pd.read_sql(query, conn, params=[district, crime_group])
        df = df.dropna(subset=["Latitude", "Longitude"])
        return df.to_dict(orient="records")
    finally:
        conn.close()


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    """Return JSON instead of HTML for HTTP errors."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail},
    )

if __name__ == '__main__':
    uvicorn.run(app, host="0.0.0.0", port=6000)
