import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Plotly from 'plotly.js-dist';

const PoliceBeatComparison = () => {
    const [districts, setDistricts] = useState([]);
    const [units, setUnits] = useState([]);
    const [crimeHeads, setCrimeHeads] = useState([]);
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedUnit, setSelectedUnit] = useState('');
    const [selectedCrimeHead, setSelectedCrimeHead] = useState('');
    const [chartData, setChartData] = useState({ x: [], y: [] });

    const baseUrl = "http://127.0.0.1:5010"; // Flask API URL

    // Fetch districts
    useEffect(() => {
        axios.get(`${baseUrl}/get_districts`)
            .then(response => {
                setDistricts(response.data);
            })
            .catch(() => {
                console.error('Error fetching districts');
            });
    }, []);

    // Fetch units when district is selected
    useEffect(() => {
        if (selectedDistrict) {
            axios.get(`${baseUrl}/get_units?district=${selectedDistrict}`)
                .then(response => {
                    setUnits(response.data);
                })
                .catch(() => {
                    console.error('Error fetching units');
                });
        } else {
            setUnits([]);
            setCrimeHeads([]);
        }
    }, [selectedDistrict]);

    // Fetch crime heads when unit is selected
    useEffect(() => {
        if (selectedDistrict && selectedUnit) {
            axios.get(`${baseUrl}/get_crimeheads?district=${selectedDistrict}&unit=${selectedUnit}`)
                .then(response => {
                    setCrimeHeads(response.data);
                })
                .catch(() => {
                    console.error('Error fetching crime heads');
                });
        } else {
            setCrimeHeads([]);
        }
    }, [selectedDistrict, selectedUnit]);

    // Fetch crime data and render chart
    useEffect(() => {
        if (selectedDistrict && selectedUnit && selectedCrimeHead) {
            axios.get(`${baseUrl}/get_crime_data`, {
                params: {
                    district: selectedDistrict,
                    unit_name: selectedUnit,
                    crime_type: selectedCrimeHead,
                    page: 1,
                }
            })
                .then(response => {
                    const beatCounts = {};

                    // Count crimes per Beat_Name
                    response.data.data.forEach((item) => {
                        const beat = item.Beat_Name;
                        beatCounts[beat] = (beatCounts[beat] || 0) + 1;
                    });

                    // Prepare data for the chart
                    const x = Object.keys(beatCounts);  // Beat Names
                    const y = Object.values(beatCounts);  // Counts

                    // Update chartData state to render chart
                    setChartData({ x, y });
                })
                .catch(() => {
                    console.error('Error fetching crime data');
                });
        }
    }, [selectedDistrict, selectedUnit, selectedCrimeHead]);

    // Plot the chart whenever chartData is updated
    useEffect(() => {
        if (chartData.x.length > 0) {
            Plotly.newPlot('chart', [{
                x: chartData.x,
                y: chartData.y,
                type: 'bar',
                marker: { color: '#8b5cf6' }
            }], {
                title: { text: 'Crime Distribution by Beat', font: { color: '#fff' } },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                xaxis: { color: '#fff', gridcolor: '#ffffff20' },
                yaxis: { color: '#fff', gridcolor: '#ffffff20' },
                font: { color: '#fff' },
            });
        }
    }, [chartData]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Police Beat Comparison</h1>
                <p className="text-purple-200 text-sm mt-1">Analyze and compare crime distribution across different police beats within units</p>
            </div>

            {/* Description Card */}
            <div className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 backdrop-blur-md rounded-xl p-4 border border-purple-500/30">
                <h3 className="text-white font-semibold mb-2">How it works:</h3>
                <p className="text-purple-100 text-sm mb-3">
                    Select a district, unit, and crime type to visualize how crimes are distributed across different police beats.
                    The bar chart shows which beats have higher crime concentrations for the selected crime category.
                </p>
                <div className="text-purple-200 text-xs">
                    <span className="font-semibold">Use Cases:</span> Beat-level resource allocation • Patrol zone prioritization • Crime concentration analysis • Inter-beat performance comparison
                </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-xl space-y-4">
                {/* District Dropdown */}
                <div>
                    <label htmlFor="district" className="block text-sm font-medium text-purple-200 mb-2">Select District:</label>
                    <select
                        id="district"
                        value={selectedDistrict}
                        onChange={(e) => setSelectedDistrict(e.target.value)}
                        className="block w-full rounded-md bg-white/5 border border-white/20 text-white px-4 py-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                        <option value="" className="bg-indigo-900">Select a District</option>
                        {districts.map((district) => (
                            <option key={district} value={district} className="bg-indigo-900">{district}</option>
                        ))}
                    </select>
                </div>

                {/* Unit Dropdown */}
                <div>
                    <label htmlFor="unit" className="block text-sm font-medium text-purple-200 mb-2">Select Unit:</label>
                    <select
                        id="unit"
                        value={selectedUnit}
                        onChange={(e) => setSelectedUnit(e.target.value)}
                        className="block w-full rounded-md bg-white/5 border border-white/20 text-white px-4 py-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                        <option value="" className="bg-indigo-900">Select a Unit</option>
                        {units.map((unit) => (
                            <option key={unit} value={unit} className="bg-indigo-900">{unit}</option>
                        ))}
                    </select>
                </div>

                {/* Crime Type Dropdown */}
                <div>
                    <label htmlFor="crimehead" className="block text-sm font-medium text-purple-200 mb-2">Select Crime Type:</label>
                    <select
                        id="crimehead"
                        value={selectedCrimeHead}
                        onChange={(e) => setSelectedCrimeHead(e.target.value)}
                        className="block w-full rounded-md bg-white/5 border border-white/20 text-white px-4 py-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                        <option value="" className="bg-indigo-900">Select a Crime Type</option>
                        {crimeHeads.map((crimehead) => (
                            <option key={crimehead} value={crimehead} className="bg-indigo-900">{crimehead}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Chart Div */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-xl">
                <div id="chart" style={{ width: '100%', height: '400px' }}></div>
            </div>
        </div>
    );
};

export default PoliceBeatComparison;
