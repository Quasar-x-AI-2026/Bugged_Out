
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from contextlib import asynccontextmanager
import pandas as pd
import sqlite3
import os
import shutil
from datetime import datetime
from pathlib import Path
from werkzeug.utils import secure_filename   

UPLOAD_FOLDER = Path("uploads")
ALLOWED_EXTENSIONS = {"csv"}
MAX_FILE_SIZE = 100 * 1024 * 1024          # 100 MiB  (not enforced automatically)

# Ensure needed folders exist
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
Path("Backend").mkdir(parents=True, exist_ok=True)

# Required columns for a crime record
REQUIRED_COLUMNS = [
    "District_Name", "UnitName", "date_time", "Beat_Name", "CrimeHead_Name",
    "Latitude", "Longitude", "CrimeGroup_Name"
]

# ------------------- Lifespan context manager -------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_datasets_db()
    print("Datasets DB initialised")
    yield
    # Shutdown (if needed)
    pass

# ------------------- FastAPI app -------------------------------
app = FastAPI(
    title="Crime‑Dataset Manager",
    description="Upload, clean, store and switch between crime‑CSV datasets",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # <-- change in production!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------- Helper functions -------------------------

def allowed_file(filename: str) -> bool:
    """Check if the extension is allowed."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def init_datasets_db() -> None:
    """Create (if needed) the tracking DB that holds meta‑data about each dataset."""
    conn = sqlite3.connect("datasets.db")
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS datasets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            filename TEXT NOT NULL,
            upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            record_count INTEGER,
            status TEXT DEFAULT 'active',
            db_name TEXT NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()


def clean_dataframe(df: pd.DataFrame):
    """Perform the same cleaning steps that the Flask app used."""
    initial_count = len(df)

    # 1️⃣ Drop rows missing any required column
    df = df.dropna(subset=REQUIRED_COLUMNS)

    # 2️⃣ Drop exact duplicates
    df = df.drop_duplicates()

    # 3️⃣ Strip whitespace from every string column
    str_cols = df.select_dtypes(include=["object"]).columns
    for col in str_cols:
        df[col] = df[col].str.strip()

    # 4️⃣ Normalise the date column
    try:
        df["date_time"] = pd.to_datetime(df["date_time"], errors="coerce")
        df = df.dropna(subset=["date_time"])
        df["date_time"] = df["date_time"].dt.strftime("%d-%m-%Y %H:%M")
    except Exception:
        pass

    # 5️⃣ Force numeric types for lat/lon
    for col in ("Latitude", "Longitude"):
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # 6️⃣ Drop rows where lat/lon could not be parsed
    df = df.dropna(subset=["Latitude", "Longitude"])

    final_count = len(df)
    removed_count = initial_count - final_count
    return df, initial_count, final_count, removed_count


def get_db_connection(db_path: str):
    """Tiny wrapper – makes it easier to swap to async later if you want."""
    return sqlite3.connect(db_path)


# ------------------- Routes -----------------------------------

# -----------------------------------------------------------------
# 1️⃣  /upload-csv   –  POST   (multipart/form‑data)
# -----------------------------------------------------------------
@app.post("/upload-csv", status_code=status.HTTP_201_CREATED)
async def upload_csv(
    file: UploadFile = File(...),
    dataset_name: str = Form(...),
):
    """Upload a CSV, validate, clean and persist it as its own SQLite DB."""
    # ---- basic validation -------------------------------------------------
    if not dataset_name:
        raise HTTPException(status_code=400, detail="Dataset name is required")

    if not allowed_file(file.filename):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    # ---- read CSV into pandas --------------------------------------------
    try:
        # UploadFile is a SpooledTemporaryFile – we can read it directly with pandas
        df = pd.read_csv(file.file)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Unable to read CSV: {exc}")

    # ---- required column check --------------------------------------------
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise HTTPException(
            status_code=400,
            detail={
                "error": f"Missing required columns: {', '.join(missing)}",
                "required_columns": REQUIRED_COLUMNS,
                "found_columns": list(df.columns),
            },
        )

    # ---- clean -------------------------------------------------------------
    cleaned_df, initial_cnt, final_cnt, removed_cnt = clean_dataframe(df)

    if final_cnt == 0:
        raise HTTPException(status_code=400, detail="No valid records after cleaning")

    # ---- create per‑dataset SQLite DB --------------------------------------
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    db_name = f"crime_data_{timestamp}.db"
    db_path = Path("Backend") / db_name

    conn = get_db_connection(str(db_path))
    cleaned_df.to_sql("Hack_DS", conn, if_exists="replace", index=False)
    conn.close()

    # ---- record meta‑data in the tracking DB -------------------------------
    conn = get_db_connection("datasets.db")
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO datasets (name, filename, record_count, db_name)
        VALUES (?, ?, ?, ?)
        """,
        (dataset_name, secure_filename(file.filename), final_cnt, db_name),
    )
    dataset_id = cur.lastrowid
    conn.commit()
    conn.close()

    # ---- response ---------------------------------------------------------
    payload = {
        "message": "Dataset uploaded and processed successfully",
        "dataset_id": dataset_id,
        "dataset_name": dataset_name,
        "initial_records": initial_cnt,
        "final_records": final_cnt,
        "removed_records": removed_cnt,
        "removal_percentage": round((removed_cnt / initial_cnt) * 100, 2)
        if initial_cnt
        else 0,
        "db_name": db_name,
    }
    return JSONResponse(content=jsonable_encoder(payload))


# -----------------------------------------------------------------
# 2️⃣  /datasets   –  GET   (list all datasets)
# -----------------------------------------------------------------
@app.get("/datasets")
def get_datasets():
    """Return a JSON list of every uploaded dataset."""
    conn = get_db_connection("datasets.db")
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, name, filename, upload_date, record_count, status, db_name
        FROM datasets
        ORDER BY upload_date DESC
        """
    )
    rows = cur.fetchall()
    conn.close()
    datasets = [dict(row) for row in rows]
    return {"datasets": datasets}


# -----------------------------------------------------------------
# 3️⃣  /set-active-dataset   –  POST   (activate a dataset)
# -----------------------------------------------------------------
@app.post("/set-active-dataset")
def set_active_dataset(payload: dict):
    """
    Mark the supplied `dataset_id` as the active one.
    The corresponding SQLite file is copied to ``Backend/Hack_DS.db``.
    """
    dataset_id = payload.get("dataset_id")
    if not dataset_id:
        raise HTTPException(status_code=400, detail="Dataset ID required")

    conn = get_db_connection("datasets.db")
    cur = conn.cursor()

    # 1️⃣ set everything inactive
    cur.execute('UPDATE datasets SET status = "inactive"')
    # 2️⃣ set the requested one active
    cur.execute('UPDATE datasets SET status = "active" WHERE id = ?', (dataset_id,))

    # 3️⃣ fetch the DB filename to copy
    cur.execute("SELECT db_name FROM datasets WHERE id = ?", (dataset_id,))
    row = cur.fetchone()
    if not row:
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=404, detail="Dataset not found")
    db_name = row[0]

    src = Path("Backend") / db_name
    dst = Path("Backend") / "Hack_DS.db"
    if src.is_file():
        shutil.copy2(src, dst)

    conn.commit()
    conn.close()
    return {"message": "Dataset activated successfully", "db_name": db_name}


# -----------------------------------------------------------------
# 4️⃣  /delete-dataset   –  POST   (remove a dataset)
# -----------------------------------------------------------------
@app.post("/delete-dataset")
def delete_dataset(payload: dict):
    """
    Delete a *non‑active* dataset: remove its DB file and its row in the tracking table.
    """
    dataset_id = payload.get("dataset_id")
    if not dataset_id:
        raise HTTPException(status_code=400, detail="Dataset ID required")

    conn = get_db_connection("datasets.db")
    cur = conn.cursor()

    cur.execute("SELECT db_name, status FROM datasets WHERE id = ?", (dataset_id,))
    row = cur.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Dataset not found")

    db_name, status = row
    if status == "active":
        conn.close()
        raise HTTPException(
            status_code=400, detail="Cannot delete the currently active dataset"
        )

    # Delete the physical DB file
    db_path = Path("Backend") / db_name
    if db_path.is_file():
        db_path.unlink()

    # Remove tracking entry
    cur.execute("DELETE FROM datasets WHERE id = ?", (dataset_id,))
    conn.commit()
    conn.close()
    return {"message": "Dataset deleted successfully"}


# -----------------------------------------------------------------
# 5️⃣  /dataset-stats/{dataset_id}   –  GET   (basic stats)
# -----------------------------------------------------------------
@app.get("/dataset-stats/{dataset_id}")
def get_dataset_stats(dataset_id: int):
    """
    Return a small set of statistics for a given dataset:
    * total rows
    * number of distinct districts
    * number of distinct crime types
    * top‑5 districts by record count
    """
    # Resolve the DB filename
    conn = get_db_connection("datasets.db")
    cur = conn.cursor()
    cur.execute("SELECT db_name FROM datasets WHERE id = ?", (dataset_id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Dataset not found")
    db_name = row[0]

    db_path = Path("Backend") / db_name
    if not db_path.is_file():
        raise HTTPException(status_code=404, detail="Database file not found")

    # Query the per‑dataset DB
    conn = get_db_connection(str(db_path))

    # Helper – run a scalar query and return the first column
    def scalar(sql):
        return pd.read_sql(sql, conn).iloc[0, 0]

    stats = {
        "total_records": scalar("SELECT COUNT(*) FROM Hack_DS"),
        "districts": scalar("SELECT COUNT(DISTINCT District_Name) FROM Hack_DS"),
        "crime_types": scalar("SELECT COUNT(DISTINCT CrimeHead_Name) FROM Hack_DS"),
    }

    # Top‑5 districts
    top_df = pd.read_sql(
        """
        SELECT District_Name, COUNT(*) AS cnt
        FROM Hack_DS
        GROUP BY District_Name
        ORDER BY cnt DESC
        LIMIT 5
        """,
        conn,
    )
    stats["top_districts"] = top_df.to_dict(orient="records")
    conn.close()

    return {"stats": stats}


# -----------------------------------------------------------------
# 6️⃣  Optional health‑check endpoint
# -----------------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat() + "Z"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("location:app", host="0.0.0.0", port=6003)