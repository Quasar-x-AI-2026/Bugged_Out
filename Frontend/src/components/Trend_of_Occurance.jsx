import React, { useEffect, useState } from "react";
import Plot from "react-plotly.js";
import axios from 'axios';

const TrendOfOccurrence = () => {
    const [districts, setDistricts] = useState([]);
    const [units, setUnits] = useState([]);
    const [selectedDistrict, setSelectedDistrict] = useState("");
    const [selectedUnit, setSelectedUnit] = useState("");
    const [crimeData, setCrimeData] = useState(null);
    const [graphType, setGraphType] = useState("bar");

    const API_URL = "http://127.0.0.1:5005";

    useEffect(() => {
        // Load districts on mount
        axios.get(`${API_URL}/get_districts1`)
            .then((res) => setDistricts(res.data))
            .catch((err) => console.error("Error fetching districts:", err));
    }, []);

    const loadUnits = (district) => {
        if (!district) return;
        axios.get(`${API_URL}/get1_units?district_name=${district}`)
            .then((res) => setUnits(res.data))
            .catch((err) => console.error("Error fetching units:", err));
    };

    // Auto-fetch data when selections change
    useEffect(() => {
        if (!selectedDistrict || !selectedUnit) {
            return;
        }
        axios.get(`${API_URL}/get1_data?district_name=${selectedDistrict}&unit_name=${selectedUnit}`)
            .then((res) => {
                const data = res.data;
                // Map weekday and month names
                const weekdayMap = [
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                ];
                const monthMap = [
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec",
                ];

                data.crime_by_weekday.day_of_week = data.crime_by_weekday.day_of_week.map(
                    (idx) => weekdayMap[idx]
                );
                data.crime_by_month.month = data.crime_by_month.month.map(
                    (idx) => monthMap[idx - 1]
                );
                setCrimeData(data);
            })
            .catch((err) => {
                console.error("Error fetching data:", err);
            });
    }, [selectedDistrict, selectedUnit]);

    const renderPlot = (data, xKey, yKey, title) => {
        if (!data) return null;

        const xData = data[xKey];
        const yData = data[yKey];

        if (!xData || !yData) return null;

        return (
            <Plot
                data={[
                    graphType === "pie"
                        ? {
                            labels: xData,
                            values: yData,
                            type: "pie",
                        }
                        : {
                            x: xData,
                            y: yData,
                            type: graphType,
                            marker: { color: '#8b5cf6' }
                        },
                ]}
                layout={{
                    title: { text: title, font: { color: '#fff' } },
                    xaxis: { title: xKey, color: '#fff', gridcolor: '#ffffff20' },
                    yaxis: { title: yKey, color: '#fff', gridcolor: '#ffffff20' },
                    paper_bgcolor: 'rgba(0,0,0,0)',
                    plot_bgcolor: 'rgba(0,0,0,0)',
                    font: { color: '#fff' },
                }}
                style={{ width: "100%", height: "400px" }}
            />
        );
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white">Trend of Occurrence Analysis</h2>
                <p className="text-purple-200 text-sm mt-1">Temporal pattern analysis to identify crime trends across time periods</p>
            </div>

            {/* Description Card */}
            <div className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 backdrop-blur-md rounded-xl p-4 border border-purple-500/30">
                <h3 className="text-white font-semibold mb-2">How it works:</h3>
                <p className="text-purple-100 text-sm mb-3">
                    Analyze crime patterns over time by selecting a district and unit. View trends by weekday, month, year, and hour
                    to identify peak crime periods. Choose between bar, line, or pie chart visualizations for different perspectives.
                </p>
                <div className="text-purple-200 text-xs">
                    <span className="font-semibold">Use Cases:</span> Shift scheduling optimization • Seasonal crime prediction • Peak hour identification • Long-term trend analysis
                </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-xl space-y-4">
                <div>
                    <label htmlFor="district" className="block text-sm font-medium text-purple-200 mb-2">Select District:</label>
                    <select
                        id="district"
                        className="block w-full rounded-md bg-white/5 border border-white/20 text-white px-4 py-2 focus:ring-purple-500 focus:border-purple-500"
                        value={selectedDistrict}
                        onChange={(e) => {
                            setSelectedDistrict(e.target.value);
                            loadUnits(e.target.value);
                        }}
                    >
                        <option value="" className="bg-indigo-900">-- Select District --</option>
                        {districts.map((district) => (
                            <option key={district} value={district} className="bg-indigo-900">
                                {district}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="unit" className="block text-sm font-medium text-purple-200 mb-2">Select Unit:</label>
                    <select
                        id="unit"
                        className="block w-full rounded-md bg-white/5 border border-white/20 text-white px-4 py-2 focus:ring-purple-500 focus:border-purple-500"
                        value={selectedUnit}
                        onChange={(e) => setSelectedUnit(e.target.value)}
                    >
                        <option value="" className="bg-indigo-900">-- Select Unit --</option>
                        {units.map((unit) => (
                            <option key={unit} value={unit} className="bg-indigo-900">
                                {unit}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="graph-type" className="block text-sm font-medium text-purple-200 mb-2">Graph Type:</label>
                    <select
                        id="graph-type"
                        className="block w-full rounded-md bg-white/5 border border-white/20 text-white px-4 py-2 focus:ring-purple-500 focus:border-purple-500"
                        value={graphType}
                        onChange={(e) => setGraphType(e.target.value)}
                    >
                        <option value="bar" className="bg-indigo-900">Bar Graph</option>
                        <option value="line" className="bg-indigo-900">Line Graph</option>
                        <option value="pie" className="bg-indigo-900">Pie Chart</option>
                    </select>
                </div>
            </div>

            {crimeData && (
                <>
                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-xl">{renderPlot(crimeData?.crime_by_weekday, "day_of_week", "crime_count", "Crime by Weekday")}</div>
                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-xl">{renderPlot(crimeData?.crime_by_month, "month", "crime_count", "Crime by Month")}</div>
                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-xl">{renderPlot(crimeData?.crime_by_year, "year", "crime_count", "Crime by Year")}</div>
                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-xl">{renderPlot(crimeData?.crime_by_hour, "hour", "crime_count", "Crime by Hour")}</div>
                </>
            )}
        </div>
    );
};

export default TrendOfOccurrence;
