import React, { useState, useEffect } from "react";
import Plot from "react-plotly.js";

const LocationBasedPerformance = () => {
    const [districts, setDistricts] = useState([]);
    const [units, setUnits] = useState([]);
    const [selectedDistrict, setSelectedDistrict] = useState("");
    const [unit1, setUnit1] = useState("");
    const [unit2, setUnit2] = useState("");
    const [crimeData, setCrimeData] = useState(null);

    const API_URL = "http://127.0.0.1:5002";

    // Fetch districts on component mount
    useEffect(() => {
        fetch(`${API_URL}/get_districts`)
            .then((response) => response.json())
            .then((data) => setDistricts(data.districts))
            .catch(() => console.error("Error fetching districts"));
    }, []);

    // Fetch units when a district is selected
    const fetchUnits = (district) => {
        fetch(`${API_URL}/get_units`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ district }),
        })
            .then((response) => response.json())
            .then((data) => setUnits(data.units))
            .catch(() => console.error("Error fetching units"));
    };

    // Auto-fetch data when selections change
    useEffect(() => {
        if (selectedDistrict && unit1 && unit2) {
            fetch(`${API_URL}/get_data`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ district: selectedDistrict, unit1, unit2 }),
            })
                .then((response) => response.json())
                .then((data) => setCrimeData(data))
                .catch(() => console.error("Error fetching data"));
        }
    }, [selectedDistrict, unit1, unit2]);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white">Location-Based Performance Analysis</h2>
                <p className="text-purple-200 text-sm mt-1">Compare crime statistics and performance metrics across police units and districts</p>
            </div>

            {/* Description Card */}
            <div className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 backdrop-blur-md rounded-xl p-4 border border-purple-500/30">
                <h3 className="text-white font-semibold mb-2">How it works:</h3>
                <p className="text-purple-100 text-sm mb-3">
                    Select a district and two units to compare their crime statistics. The tool generates comprehensive visualizations
                    including total crime counts, crime distribution by unit, top crime categories, and side-by-side unit comparisons.
                </p>
                <div className="text-purple-200 text-xs">
                    <span className="font-semibold">Use Cases:</span> Unit performance evaluation • Resource distribution analysis • Crime category identification • Comparative benchmarking
                </div>
            </div>

            {/* Dropdowns for district and units */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-xl space-y-4">
                <div className="space-y-2">
                    <label htmlFor="district" className="block text-sm font-medium text-purple-200">
                        Select District:
                    </label>
                    <select
                        id="district"
                        value={selectedDistrict}
                        onChange={(e) => {
                            setSelectedDistrict(e.target.value);
                            fetchUnits(e.target.value);
                        }}
                        className="block w-full rounded-md bg-white/5 border border-white/20 text-white focus:ring-purple-500 focus:border-purple-500 px-4 py-2"
                    >
                        <option value="" className="bg-indigo-900">Select District</option>
                        {districts.map((district) => (
                            <option key={district} value={district} className="bg-indigo-900">
                                {district}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label htmlFor="unit1" className="block text-sm font-medium text-purple-200">
                        Select Unit 1:
                    </label>
                    <select
                        id="unit1"
                        value={unit1}
                        onChange={(e) => setUnit1(e.target.value)}
                        className="block w-full rounded-md bg-white/5 border border-white/20 text-white focus:ring-purple-500 focus:border-purple-500 px-4 py-2"
                    >
                        <option value="" className="bg-indigo-900">Select Unit 1</option>
                        {units.map((unit) => (
                            <option key={unit} value={unit} className="bg-indigo-900">
                                {unit}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label htmlFor="unit2" className="block text-sm font-medium text-purple-200">
                        Select Unit 2:
                    </label>
                    <select
                        id="unit2"
                        value={unit2}
                        onChange={(e) => setUnit2(e.target.value)}
                        className="block w-full rounded-md bg-white/5 border border-white/20 text-white focus:ring-purple-500 focus:border-purple-500 px-4 py-2"
                    >
                        <option value="" className="bg-indigo-900">Select Unit 2</option>
                        {units.map((unit) => (
                            <option key={unit} value={unit} className="bg-indigo-900">
                                {unit}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Total Crimes */}
            {crimeData?.total_crimes && (
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 shadow-xl">
                    <h2 className="text-3xl font-bold text-white">
                        Total Crimes in {selectedDistrict}: {crimeData.total_crimes.total}
                    </h2>
                </div>
            )}

            {/* Bar Chart */}
            {crimeData?.bar_chart && (
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-xl">
                    <Plot
                        data={[
                            {
                                x: crimeData.bar_chart.x,
                                y: crimeData.bar_chart.y,
                                type: "bar",
                                marker: { color: '#8b5cf6' }
                            },
                        ]}
                        layout={{
                            title: { text: crimeData.bar_chart.title, font: { color: '#fff' } },
                            xaxis: { title: "Units", color: '#fff', gridcolor: '#ffffff20' },
                            yaxis: { title: "Crime Count", color: '#fff', gridcolor: '#ffffff20' },
                            paper_bgcolor: 'rgba(0,0,0,0)',
                            plot_bgcolor: 'rgba(0,0,0,0)',
                            font: { color: '#fff' },
                            autosize: true,
                        }}
                        useResizeHandler
                        style={{ width: "100%", height: "100%" }}
                    />
                </div>
            )}

            {/* Pie Chart */}
            {crimeData?.pie_chart && (
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-xl">
                    <Plot
                        data={[
                            {
                                labels: crimeData.pie_chart.labels,
                                values: crimeData.pie_chart.values,
                                type: "pie",
                            },
                        ]}
                        layout={{
                            title: { text: crimeData.pie_chart.title, font: { color: '#fff' } },
                            paper_bgcolor: 'rgba(0,0,0,0)',
                            font: { color: '#fff' },
                            autosize: true
                        }}
                        useResizeHandler
                        style={{ width: "100%", height: "100%" }}
                    />
                </div>
            )}

            {/* Comparison Chart */}
            {crimeData?.comparison && (
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-xl">
                    <Plot
                        data={[
                            {
                                x: Object.keys(crimeData.comparison.unit1.data),
                                y: Object.values(crimeData.comparison.unit1.data),
                                type: "bar",
                                name: crimeData.comparison.unit1.name,
                                marker: { color: '#8b5cf6' }
                            },
                            {
                                x: Object.keys(crimeData.comparison.unit2.data),
                                y: Object.values(crimeData.comparison.unit2.data),
                                type: "bar",
                                name: crimeData.comparison.unit2.name,
                                marker: { color: '#ec4899' }
                            },
                        ]}
                        layout={{
                            title: {
                                text: `Comparison of Crimes between ${crimeData.comparison.unit1.name} and ${crimeData.comparison.unit2.name}`,
                                font: { color: '#fff' }
                            },
                            barmode: "group",
                            xaxis: { title: "Crime Categories", color: '#fff', gridcolor: '#ffffff20' },
                            yaxis: { title: "Crime Count", color: '#fff', gridcolor: '#ffffff20' },
                            paper_bgcolor: 'rgba(0,0,0,0)',
                            plot_bgcolor: 'rgba(0,0,0,0)',
                            font: { color: '#fff' },
                            autosize: true,
                        }}
                        useResizeHandler
                        style={{ width: "100%", height: "100%" }}
                    />
                </div>
            )}
        </div>
    );
};

export default LocationBasedPerformance;
