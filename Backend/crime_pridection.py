import sqlite3
import pandas as pd
import numpy as np
import plotly.express as px
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from groq import Groq
from sklearn.preprocessing import LabelEncoder
import datetime
from dotenv import load_dotenv
import os
from typing import Dict, Any, List
import io
load_dotenv()

# FastAPI app setup
app = FastAPI(title="Crime Prediction API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables to store loaded data and model
df = None
model = None
label_encoders = None
model_report = None

def load_data(csv_path: str = "complete_crime_dataset .csv"):
    """Load data from CSV file"""
    global df
    try:
        # Read CSV file
        df = pd.read_csv(csv_path)

        # Check for required columns
        required_columns = [
            'CrimeHead_Name', 'District_Name', 'Latitude', 'Longitude',
            'date_time'
        ]

        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(status_code=400, detail=f"Missing required columns: {', '.join(missing_columns)}")

        # Select only required columns
        df = df[required_columns].drop_duplicates()

        return df

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error loading CSV: {str(e)}")

@app.get("/")
def root():
    """Root endpoint"""
    return {"message": "Crime Prediction API", "status": "running"}

@app.post("/load-data")
def load_dataset():
    """Load and preprocess the dataset"""
    global df, model, label_encoders, model_report

    df = load_data()
    X, y, label_encoders = preprocess_data(df)
    model, model_report = train_model(X, y)

    return {"message": "Data loaded and model trained successfully", "records": len(df)}

@app.get("/districts")
def get_districts():
    """Get list of available districts"""
    if df is None:
        raise HTTPException(status_code=400, detail="Data not loaded. Call /load-data first")

    districts = df['District_Name'].unique().tolist()
    return {"districts": districts}

@app.get("/dataset-analysis")
def get_dataset_analysis():
    """Get basic dataset statistics"""
    if df is None:
        raise HTTPException(status_code=400, detail="Data not loaded. Call /load-data first")

    analysis = {
        "shape": df.shape,
        "unique_crime_types": int(df['CrimeHead_Name'].nunique()),
        "total_records": len(df)
    }
    return analysis

@app.get("/current-statistics/{district}")
def get_current_statistics(district: str):
    """Get current crime statistics for a district"""
    if df is None:
        raise HTTPException(status_code=400, detail="Data not loaded. Call /load-data first")

    district_data = df[df['District_Name'] == district]
    if district_data.empty:
        raise HTTPException(status_code=404, detail=f"No data found for district: {district}")

    # Basic statistics
    total_crimes = len(district_data)

    # Crime type distribution
    crime_counts = district_data['CrimeHead_Name'].value_counts()
    crime_distribution = {
        "crime_types": crime_counts.index.tolist(),
        "counts": crime_counts.values.tolist()
    }

    # Temporal analysis
    district_data_copy = district_data.copy()
    district_data_copy['date_time'] = pd.to_datetime(district_data_copy['date_time'], errors='coerce')
    district_data_copy['hour'] = district_data_copy['date_time'].dt.hour

    hourly_crimes = district_data_copy['hour'].value_counts().sort_index()
    temporal_analysis = {
        "hours": hourly_crimes.index.tolist(),
        "crime_counts": hourly_crimes.values.tolist()
    }

    # Crime locations
    locations = district_data[['Latitude', 'Longitude', 'CrimeHead_Name']].to_dict('records')

    return {
        "district": district,
        "total_crimes": total_crimes,
        "crime_distribution": crime_distribution,
        "temporal_analysis": temporal_analysis,
        "crime_locations": locations
    }

@app.get("/future-predictions/{district}")
def get_future_predictions(district: str):
    """Generate future crime predictions for a district"""
    if df is None or model is None or label_encoders is None:
        raise HTTPException(status_code=400, detail="Data and model not loaded. Call /load-data first")

    try:
        future_predictions = predict_future_hotspots(df, district, model, label_encoders)

        # Convert predictions to JSON-serializable format
        predictions_data = future_predictions[['Latitude', 'Longitude', 'Predicted_Crime']].to_dict('records')

        # Prediction statistics
        pred_crimes = future_predictions['Predicted_Crime'].value_counts()
        prediction_stats = {
            "crime_types": pred_crimes.index.tolist(),
            "counts": pred_crimes.values.tolist()
        }

        return {
            "district": district,
            "predictions": predictions_data,
            "statistics": prediction_stats
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.get("/ai-insights/{district}/{crime_type}")
def get_ai_insights(district: str, crime_type: str):
    """Generate AI-powered crime analysis for specific location and crime type"""
    if df is None:
        raise HTTPException(status_code=400, detail="Data not loaded. Call /load-data first")

    try:
        # Find location data for the specified district and crime type
        location_data = df[
            (df['District_Name'] == district) &
            (df['CrimeHead_Name'] == crime_type)
        ].iloc[0]

        # Generate AI insights
        insights = generate_ai_insights(
            location_data,
            api_key=os.getenv('GROQ_API_KEY',"")
        )

        return {
            "district": district,
            "crime_type": crime_type,
            "location": {
                "latitude": location_data['Latitude'],
                "longitude": location_data['Longitude']
            },
            "analysis": insights
        }

    except IndexError:
        raise HTTPException(status_code=404, detail=f"No data found for district '{district}' and crime type '{crime_type}'")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis error: {str(e)}")

@app.get("/model-performance")
def get_model_performance():
    """Get model performance report"""
    if model_report is None:
        raise HTTPException(status_code=400, detail="Model not trained. Call /load-data first")

    return {"performance_report": model_report}

def preprocess_data(df):
    """Preprocess data with only available columns"""
    df = df.copy()

    # Handle datetime conversion with dayfirst=True
    try:
        df['date_time'] = pd.to_datetime(df['date_time'], dayfirst=True, format='mixed')
        df['hour'] = df['date_time'].dt.hour
        df['day_of_week'] = df['date_time'].dt.dayofweek
        df['month'] = df['date_time'].dt.month
    except Exception as e:
        # Handle datetime conversion error gracefully
        df['hour'] = 0
        df['day_of_week'] = 0
        df['month'] = 0

    # Create basic features from available columns
    feature_columns = ['Latitude', 'Longitude', 'hour', 'day_of_week', 'month']

    # Create label encoder for CrimeHead_Name
    label_encoders = {}
    label_encoders['CrimeHead_Name'] = LabelEncoder()
    df['CrimeHead_Name'] = label_encoders['CrimeHead_Name'].fit_transform(df['CrimeHead_Name'])

    # Filter feature columns that exist in the dataframe
    available_features = [col for col in feature_columns if col in df.columns]

    # Create feature matrix and target variable
    X = df[available_features]
    y = df['CrimeHead_Name']

    return X, y, label_encoders

# Train the model
def train_model(X, y):
    """Train the model with memory-efficient parameters"""
    # Reduce sample size if dataset is too large
    if len(X) > 10000:
        X_sample, _, y_sample, _ = train_test_split(X, y, train_size=10000, random_state=42)
    else:
        X_sample, y_sample = X, y
    
    # Split the sampled data
    X_train, X_test, y_train, y_test = train_test_split(X_sample, y_sample, test_size=0.2, random_state=42)
    
    # Use more memory-efficient RandomForest parameters
    model = RandomForestClassifier(
        n_estimators=50,  # Reduced from 100
        max_depth=10,     # Limit tree depth
        min_samples_split=5,
        min_samples_leaf=2,
        n_jobs=-1,        # Use all CPU cores
        random_state=42
    )
    
    # Train the model
    model.fit(X_train, y_train)
    
    # Generate report
    y_pred = model.predict(X_test)
    report = classification_report(y_test, y_pred)
    
    return model, report

def generate_ai_insights(location_data, api_key):
    """Generate comprehensive AI-powered crime analysis"""
    client = Groq(api_key=api_key)

    prompt = f"""
    As a crime analysis and prevention expert, provide a comprehensive analysis for:
    Location: {location_data['District_Name']} (Lat: {location_data['Latitude']}, Long: {location_data['Longitude']})
    Current Crime Type: {location_data['CrimeHead_Name']}
    Time: {location_data.get('hour', 'N/A')}:00

    Provide a detailed analysis covering:

    1. Crime Pattern Analysis:
    - Historical patterns and trends
    - Temporal analysis (time/day/season)
    - Geographical risk factors
    - Demographic considerations

    2. Predictive Analysis:
    - Likely future crime types
    - High-risk time periods
    - Geographic hotspots
    - Contributing factors

    3. Strategic Deployment Plan:
    - Resource allocation
    - Patrol strategies
    - Response protocols
    - Inter-agency coordination

    4. Prevention Framework:
    - Community engagement
    - Environmental modifications
    - Technology integration
    - Educational initiatives

    5. Monitoring & Evaluation:
    - Key performance indicators
    - Data collection methods
    - Success metrics
    - Adjustment protocols

    Include specific, actionable recommendations with implementation timelines.
    """

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",  # Updated model name
            messages=[
                {
                    "role": "system",
                    "content": """You are an advanced crime analysis expert specializing in:
                        - Predictive policing and pattern analysis
                        - Resource optimization and deployment
                        - Community-oriented policing strategies
                        - Environmental criminology
                        - Data-driven law enforcement
                        Provide practical, evidence-based recommendations."""
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1500,
            top_p=0.9,
            stream=True
        )

        response = ""
        for chunk in completion:
            if hasattr(chunk.choices[0].delta, 'content'):
                response += chunk.choices[0].delta.content or ""

        return response

    except Exception as e:
        return generate_fallback_analysis(location_data)

def generate_fallback_analysis(location_data):
    """Generate detailed fallback analysis when AI service is unavailable"""
    return f"""
    CRIME ANALYSIS REPORT
    Location: {location_data['District_Name']}
    Generated: {datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

    1. CRIME PATTERN ANALYSIS
    • Location Details:
      - District: {location_data['District_Name']}
      - Coordinates: {location_data['Latitude']}, {location_data['Longitude']}
    • Current Incident Type: {location_data['CrimeHead_Name']}
    • Time Analysis: {location_data.get('hour', 'Peak')} hours

    2. PREDICTIVE ANALYSIS
    • Primary Risk Factors:
      - Similar incidents to {location_data['CrimeHead_Name']}
      - Geographic vulnerabilities
      - Temporal patterns
    • Associated Crime Risks

    3. STRATEGIC DEPLOYMENT
    • Immediate Actions:
      - Increased patrol presence
      - Strategic checkpoint placement
      - Rapid response unit positioning
    • Resource Allocation

    4. PREVENTION FRAMEWORK
    • Community Measures:
      - Neighborhood watch programs
      - Public awareness campaigns
      - Community policing initiatives
    • Environmental Modifications

    5. MONITORING & EVALUATION
    • Key Metrics:
      - Incident rate tracking
      - Response time monitoring
      - Community feedback
    • Adjustment Protocols

    This analysis is generated based on available data and standard protocols.
    """

def predict_future_hotspots(df, district, model, label_encoders):
    """Predict future hotspots with memory optimization"""
    # Create future timestamps (next 24 hours)
    current_time = datetime.datetime.now()
    future_times = [current_time + datetime.timedelta(hours=i) for i in range(24)]

    # Get base locations (limit the number of locations if too many)
    base_locations = df[df['District_Name'] == district][['Latitude', 'Longitude']].values
    if len(base_locations) > 100:
        indices = np.random.choice(len(base_locations), 100, replace=False)
        base_locations = base_locations[indices]

    # Create prediction data in chunks
    chunk_size = 1000
    future_data = []

    for time in future_times:
        for lat, lon in base_locations:
            future_data.append({
                'Latitude': lat + np.random.normal(0, 0.001),
                'Longitude': lon + np.random.normal(0, 0.001),
                'hour': time.hour,
                'day_of_week': time.weekday(),
                'month': time.month,
                'District_Name': district
            })

            # Process in chunks if the list gets too large
            if len(future_data) >= chunk_size:
                future_df = pd.DataFrame(future_data)
                # Process chunk
                for col, encoder in label_encoders.items():
                    if col in future_df.columns:
                        future_df[col] = encoder.transform(future_df[col])
                future_data = []  # Clear the list

    # Process any remaining data
    if future_data:
        future_df = pd.DataFrame(future_data)
        for col, encoder in label_encoders.items():
            if col in future_df.columns:
                future_df[col] = encoder.transform(future_df[col])

    # Make predictions in chunks
    predictions = []
    for i in range(0, len(future_df), chunk_size):
        chunk = future_df.iloc[i:i + chunk_size]
        X_chunk = chunk[model.feature_names_in_]
        pred_chunk = model.predict(X_chunk)
        predictions.extend(pred_chunk)

    future_df['Predicted_Crime'] = label_encoders['CrimeHead_Name'].inverse_transform(predictions)
    return future_df
