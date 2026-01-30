import os
import sqlite3
from typing import List, Optional, Dict, Any

import pandas as pd
from fastapi import FastAPI, HTTPException, Body, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="Crime‑Dashboard API",
    description="Endpoints used by the front‑end to fetch districts, units and plot data.",
    version="1.0.0",
)

# Allow every origin – adjust for production!
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # <-- change to your front‑end URL(s)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "Backend", "Hack_DS.db")


def get_db():
    """FastAPI dependency that yields a connection and closes it afterwards."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


crime_group_mapping = {
    'KARNATAKA POLICE ACT 1963': 'Other Crimes',
    'MOTOR VEHICLE ACCIDENTS FATAL': 'Traffic Crimes',
    'MOTOR VEHICLE ACCIDENTS NON-FATAL': 'Traffic Crimes',
    'RIOTS': 'Social Offenses',
    'MISCHIEF': 'Property Crimes',
    'MISSING PERSON': 'Other Crimes',
    'SCHEDULED CASTE AND THE SCHEDULED TRIBES': 'Other Crimes',
    'CASES OF HURT': 'Violent Crimes',
    'BURGLARY - NIGHT': 'Property Crimes',
    'INSULTING MODESTY OF WOMEN (EVE TEASING)': 'Social Offenses',
    'MOLESTATION': 'Social Offenses',
    'MURDER': 'Violent Crimes',
    'CRUELTY BY HUSBAND': 'Social Offenses',
    'CRIMINAL TRESPASS': 'Property Crimes',
    'CRIMINAL INTIMIDATION': 'Violent Crimes',
    'DEATHS DUE TO RASHNESS/NEGLIGENCE': 'Traffic Crimes',
    'THEFT': 'Property Crimes',
    'BURGLARY - DAY': 'Property Crimes',
    'CHEATING': 'Financial Crimes',
    'ATTEMPT TO MURDER': 'Violent Crimes',
    'CRIMINAL CONSPIRACY': 'Other Crimes',
    'POCSO': 'Social Offenses',
    'OFFENCES AGAINST PUBLIC SERVANTS': 'Other Crimes',
    'SUICIDE': 'Social Offenses',
    'PUBLIC SAFETY': 'Other Crimes',
    'ARSON': 'Property Crimes',
    'KIDNAPPING AND ABDUCTION': 'Violent Crimes',
    'COMMUNAL / RELIGION': 'Other Crimes',
    'NARCOTIC DRUGS & PSYCHOTROPIC SUBSTANCES': 'Other Crimes',
    'ROBBERY': 'Property Crimes',
    'FORGERY': 'Financial Crimes',
    'RAPE': 'Violent Crimes',
    'ANTIQUES (CULTURAL PROPERTY)': 'Property Crimes',
    'CYBER CRIME': 'Cyber Crimes',
    'DACOITY': 'Violent Crimes',
    'ANIMAL': 'Other Crimes',
    'WRONGFUL RESTRAINT/CONFINEMENT': 'Violent Crimes',
    'CRIMINAL MISAPPROPRIATION': 'Property Crimes',
    'DOWRY DEATHS': 'Social Offenses',
    'ASSAULT': 'Violent Crimes',
    'CRIMINAL BREACH OF TRUST': 'Financial Crimes',
    'SEDITION': 'Other Crimes',
    'COPY RIGHT ACT 1957': 'Financial Crimes',
    'POISONING-PROFESSIONAL': 'Violent Crimes',
    'OF ABETMENT': 'Other Crimes',
    'OFFENCES RELATED TO MARRIAGE': 'Social Offenses',
    'PUBLIC NUISANCE': 'Other Crimes',
    'EXPLOSIVES': 'Other Crimes',
    'FALSE EVIDENCE': 'Other Crimes',
    'CULPABLE HOMICIDE NOT AMOUNTING TO MURDER': 'Violent Crimes',
    'IMMORAL TRAFFIC': 'Social Offenses',
    'DEFAMATION': 'Other Crimes',
    'BONDED LABOUR SYSTEM': 'Other Crimes',
    'ESCAPE FROM LAWFUL CUSTODY AND RESISTANCE': 'Other Crimes',
}

def _query_district_data(db, district_name: str) -> pd.DataFrame:
    """
    Pull raw rows for a district, add the derived ``Crime_Category`` column
    and return a pandas DataFrame.
    """
    cursor = db.cursor()
    cursor.execute("""
        SELECT District_Name, UnitName, date_time, CrimeGroup_Name
        FROM Hack_DS
        WHERE District_Name = ?
    """, (district_name,))

    rows = cursor.fetchall()
    if not rows:
        return pd.DataFrame()  # empty

    df = pd.DataFrame(
        rows,
        columns=["District_Name", "UnitName", "date_time", "CrimeGroup_Name"],
    )
    df["Crime_Category"] = df["CrimeGroup_Name"].map(crime_group_mapping).fillna("Other")
    return df


def _get_dist_and_units(db, district_name: Optional[str] = None):
    """Return (district_list, unit_list) – optionally filtered by a district."""
    cursor = db.cursor()

    cursor.execute("SELECT DISTINCT District_Name FROM Hack_DS")
    districts = [row["District_Name"] for row in cursor.fetchall()]

    if district_name:
        cursor.execute(
            "SELECT DISTINCT UnitName FROM Hack_DS WHERE District_Name = ?",
            (district_name,)
        )
    else:
        cursor.execute("SELECT DISTINCT UnitName FROM Hack_DS")
    units = [row["UnitName"] for row in cursor.fetchall()]

    return districts, units


def _generate_plot_data(
    df: pd.DataFrame,
    district_name: str,
    unit1: Optional[str] = None,
    unit2: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Build the payload the front‑end expects.
    """
    # -------- Bar chart (crimes per unit) ----------
    unit_counts = (
        df["UnitName"]
        .value_counts()
        .rename_axis("UnitName")
        .reset_index(name="CrimeCount")
    )
    bar_chart = {
        "x": unit_counts["UnitName"].tolist(),
        "y": unit_counts["CrimeCount"].tolist(),
        "title": f"Number of Crimes in Each Unit of {district_name}",
    }

    # -------- Pie chart (top‑5 categories) ----------
    top5 = df["Crime_Category"].value_counts().head(5)
    pie_chart = {
        "labels": top5.index.tolist(),
        "values": top5.values.tolist(),
        "title": f"Top 5 Most Occurring Crime Types in {district_name}",
    }

    # -------- Total crimes ----------
    total = {"total": int(len(df))}

    # -------- Optional unit‑to‑unit comparison ----------
    comparison = {}
    if unit1 and unit2:
        df_u1 = df[df["UnitName"] == unit1]
        df_u2 = df[df["UnitName"] == unit2]

        u1_counts = df_u1["Crime_Category"].value_counts().to_dict()
        u2_counts = df_u2["Crime_Category"].value_counts().to_dict()

        comparison = {
            "unit1": {"name": unit1, "data": u1_counts},
            "unit2": {"name": unit2, "data": u2_counts},
        }

    return {
        "bar_chart": bar_chart,
        "pie_chart": pie_chart,
        "total_crimes": total,
        "comparison": comparison,
}

class DistrictPayload(BaseModel):
    district: str


class PlotPayload(BaseModel):
    district: str
    unit1: Optional[str] = ""
    unit2: Optional[str] = ""


@app.get("/get_districts", response_model=Dict[str, List[str]])
def get_districts(db: sqlite3.Connection = Depends(get_db)):
    districts, _ = _get_dist_and_units(db)
    return {"districts": districts}


@app.post("/get_units", response_model=Dict[str, List[str]])
def get_units(payload: DistrictPayload, db: sqlite3.Connection = Depends(get_db)):
    _, units = _get_dist_and_units(db, payload.district)
    return {"units": units}


@app.post("/get_data", response_model=Dict[str, Any])
def get_data(payload: PlotPayload, db: sqlite3.Connection = Depends(get_db)):
    # Pull the raw data for the chosen district
    df = _query_district_data(db, payload.district)
    if df.empty:
        raise HTTPException(status_code=404, detail="No data found for the selected district.")

    result = _generate_plot_data(df, payload.district, payload.unit1, payload.unit2)
    return result


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("location:app", host="0.0.0.0", port=5002, reload=True)
