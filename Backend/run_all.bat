@echo off
title Running All Backend Services

echo Starting Beat Comparison...
start cmd /k "python beat_comparison.py"

echo Starting Crime Prediction API (Port 5001)...
start cmd /k "python -m uvicorn crime_pridection:app --host 0.0.0.0 --port 5001 --reload"

echo Starting Location Service...
start cmd /k "python location.py"

echo Starting Data Upload API (Port 5003)...
start cmd /k "python -m uvicorn Data_upload:app --host 0.0.0.0 --port 5003 --reload"

echo Starting Trend Analysis...
start cmd /k "python trend_analysis.py"

echo Starting Spatial Analysis API (Port 8000)...
start cmd /k "python -m uvicorn spatial_analysis:app --host 0.0.0.0 --port 8000 --reload"

echo All services are starting in separate windows.
pause