import sqlite3
import os

db_path = os.path.join("Backend", "Hack_DS.db")
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    print("Tables:", tables)
    if tables:
        cursor.execute("SELECT COUNT(*) FROM Hack_DS")
        count = cursor.fetchone()[0]
        print("Rows in Hack_DS:", count)
    else:
        print("No tables found in database.")
    conn.close()
else:
    print("Database file does not exist.")
