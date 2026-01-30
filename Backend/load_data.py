import pandas as pd
import sqlite3
import os

DB_PATH = os.path.join("Backend", "Hack_DS.db")
CSV_PATH = "complete_crime_dataset .csv"

def load_csv_to_db():

    df = pd.read_csv(CSV_PATH)
    conn = sqlite3.connect(DB_PATH)
    
    df.to_sql("Hack_DS", conn, if_exists="replace", index=False)

    # Close connection
    conn.close()

    print(f"Data loaded successfully. Shape: {df.shape}")

if __name__ == "__main__":
    load_csv_to_db()
