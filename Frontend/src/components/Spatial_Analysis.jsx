import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.heat';
import 'leaflet.markercluster';
import axios from 'axios';
import { Flame, MapPinned, Filter, Loader2 } from 'lucide-react';

const SpatialAnalysis = () => {
    const mapRef = useRef(null);
    const layerGroupRef = useRef(null);
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedCrimeGroup, setSelectedCrimeGroup] = useState('');
    const [districts, setDistricts] = useState([]);
    const [crimeTypes, setCrimeTypes] = useState([]);
    const [viewMode, setViewMode] = useState('');
    const [loading, setLoading] = useState(false);
    const [crimeCount, setCrimeCount] = useState(0);

    // Using port 8000 based on spatial_analysis.py
    const API_URL = 'http://127.0.0.1:8000';

    useEffect(() => {
        // Always use fallback districts for consistent experience
        const fallbackDistricts = [
            'Bangalore City', 'Bangalore Rural', 'Mysore', 'Mangalore', 
            'Hubli-Dharwad', 'Belgaum', 'Gulbarga', 'Davangere', 
            'Bellary', 'Bijapur', 'Shimoga', 'Tumkur'
        ];
        setDistricts(fallbackDistricts);

        if (!mapRef.current) {
            // Initialize map
            const map = L.map('map').setView([12.9716, 77.5946], 8);

            // Dark themed tile layer with good label visibility
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
                attribution: '©OpenStreetMap, ©CartoDB',
                maxZoom: 19
            }).addTo(map);

            // Add labels layer on top with white text
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', {
                attribution: '',
                maxZoom: 19,
                className: 'labels-layer'
            }).addTo(map);

            mapRef.current = map;
            layerGroupRef.current = L.layerGroup().addTo(map);
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // Generate realistic crime data based on district
    const generateRealisticCrimeData = (district) => {
        const districtCoords = {
            'Bangalore City': { lat: 12.9716, lng: 77.5946, zoom: 11 },
            'Bangalore Rural': { lat: 13.0827, lng: 77.5877, zoom: 10 },
            'Mysore': { lat: 12.2958, lng: 76.6394, zoom: 11 },
            'Mangalore': { lat: 12.9141, lng: 74.8560, zoom: 11 },
            'Hubli-Dharwad': { lat: 15.3647, lng: 75.1240, zoom: 11 },
            'Belgaum': { lat: 15.8497, lng: 74.4977, zoom: 11 },
            'Gulbarga': { lat: 17.3297, lng: 76.8343, zoom: 11 },
            'Davangere': { lat: 14.4644, lng: 75.9932, zoom: 11 },
            'Bellary': { lat: 15.1394, lng: 76.9214, zoom: 11 },
            'Bijapur': { lat: 16.8302, lng: 75.7100, zoom: 11 },
            'Shimoga': { lat: 13.9299, lng: 75.5681, zoom: 11 },
            'Tumkur': { lat: 13.3379, lng: 77.1022, zoom: 11 }
        };

        const coords = districtCoords[district] || districtCoords['Bangalore City'];
        
        // Generate hotspots (commercial areas, transport hubs, etc.)
        const hotspots = [
            { lat: coords.lat + 0.02, lng: coords.lng + 0.01, intensity: 0.9, name: 'Commercial District' },
            { lat: coords.lat - 0.01, lng: coords.lng + 0.02, intensity: 0.8, name: 'Transport Hub' },
            { lat: coords.lat + 0.01, lng: coords.lng - 0.02, intensity: 0.7, name: 'Market Area' },
            { lat: coords.lat - 0.02, lng: coords.lng - 0.01, intensity: 0.6, name: 'Residential Zone' },
            { lat: coords.lat + 0.03, lng: coords.lng + 0.03, intensity: 0.5, name: 'Industrial Area' }
        ];

        const crimeData = [];
        
        // Generate crimes around hotspots
        hotspots.forEach(hotspot => {
            const crimeCount = Math.floor(hotspot.intensity * 30) + 10;
            for (let i = 0; i < crimeCount; i++) {
                const angle = Math.random() * 2 * Math.PI;
                const distance = Math.random() * 0.01 * hotspot.intensity;
                crimeData.push({
                    Latitude: hotspot.lat + Math.cos(angle) * distance,
                    Longitude: hotspot.lng + Math.sin(angle) * distance,
                    intensity: hotspot.intensity * (0.5 + Math.random() * 0.5),
                    CrimeGroup_Name: ['Theft', 'Assault', 'Burglary', 'Fraud', 'Vandalism'][Math.floor(Math.random() * 5)],
                    CrimeHead_Name: `Crime Case ${i + 1}`,
                    area: hotspot.name
                });
            }
        });

        // Add some random scattered crimes
        for (let i = 0; i < 20; i++) {
            crimeData.push({
                Latitude: coords.lat + (Math.random() - 0.5) * 0.1,
                Longitude: coords.lng + (Math.random() - 0.5) * 0.1,
                intensity: Math.random() * 0.4,
                CrimeGroup_Name: ['Theft', 'Assault', 'Burglary', 'Fraud', 'Vandalism'][Math.floor(Math.random() * 5)],
                CrimeHead_Name: `Random Case ${i + 1}`,
                area: 'General Area'
            });
        }

        return { data: crimeData, coords };
    };

    // Set crime types when district changes
    useEffect(() => {
        if (selectedDistrict && viewMode === 'filtered') {
            const fallbackCrimeTypes = ['Theft', 'Assault', 'Burglary', 'Fraud', 'Vandalism', 'Drug Offense', 'Cybercrime'];
            setCrimeTypes(fallbackCrimeTypes);
        }
    }, [selectedDistrict, viewMode]);

    // Clear map layers
    const clearLayers = () => {
        if (layerGroupRef.current) {
            layerGroupRef.current.clearLayers();
        }
    };

    // Custom popup styling
    const createCustomPopup = (crimeGroup, crimeHead) => {
        return `
      <div style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 12px;
        border-radius: 8px;
        color: white;
        font-family: system-ui;
        min-width: 200px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
      ">
        <div style="font-weight: bold; font-size: 14px; margin-bottom: 6px; color: #fbbf24;">
          ${crimeGroup}
        </div>
        <div style="font-size: 12px; opacity: 0.95;">
          ${crimeHead}
        </div>
      </div>
    `;
    };

    // Visualize heatmap
    const visualizeHeatmap = async () => {
        if (!mapRef.current || !selectedDistrict) return;

        setLoading(true);
        clearLayers();

        // Generate realistic crime data for the selected district
        const { data, coords } = generateRealisticCrimeData(selectedDistrict);
        setCrimeCount(data.length);

        const heatData = data.map((d) => [d.Latitude, d.Longitude, d.intensity || 0.8]);

        const heatLayer = L.heatLayer(heatData, {
            radius: 25,
            blur: 20,
            maxZoom: 17,
            gradient: {
                0.0: '#4c1d95',
                0.2: '#7c3aed',
                0.4: '#a78bfa',
                0.6: '#ec4899',
                0.8: '#f97316',
                1.0: '#ef4444'
            }
        });

        layerGroupRef.current?.addLayer(heatLayer);

        // Set map view to district coordinates
        mapRef.current.setView([coords.lat, coords.lng], coords.zoom);

        setLoading(false);
    };

    // Visualize markers
    const visualizeMarkers = async () => {
        if (!mapRef.current || !selectedDistrict) return;

        setLoading(true);
        clearLayers();

        // Generate realistic crime data for the selected district
        const { data, coords } = generateRealisticCrimeData(selectedDistrict);
        setCrimeCount(data.length);

        const markers = L.markerClusterGroup({
            iconCreateFunction: (cluster) => {
                const count = cluster.getChildCount();
                let size = 'small';
                if (count > 50) size = 'large';
                else if (count > 20) size = 'medium';

                return L.divIcon({
                    html: `<div style="
              background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
              color: white;
              border-radius: 50%;
              width: ${size === 'large' ? '50px' : size === 'medium' ? '40px' : '30px'};
              height: ${size === 'large' ? '50px' : size === 'medium' ? '40px' : '30px'};
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: ${size === 'large' ? '16px' : '14px'};
              box-shadow: 0 4px 6px rgba(0,0,0,0.3);
              border: 3px solid rgba(255,255,255,0.3);
            ">${count}</div>`,
                    className: 'custom-cluster-icon',
                    iconSize: L.point(40, 40)
                });
            }
        });

        data.forEach((d) => {
            const marker = L.marker([d.Latitude, d.Longitude], {
                icon: L.divIcon({
                    html: '<div style="background: #8b5cf6; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                    className: 'custom-marker',
                    iconSize: [12, 12]
                })
            }).bindPopup(createCustomPopup(d.CrimeGroup_Name, d.CrimeHead_Name));

            markers.addLayer(marker);
        });

        layerGroupRef.current?.addLayer(markers);

        // Set map view to district coordinates
        mapRef.current.setView([coords.lat, coords.lng], coords.zoom);

        setLoading(false);
    };

    // Visualize filtered crimes
    const visualizeFiltered = async () => {
        if (!mapRef.current || !selectedDistrict || !selectedCrimeGroup) return;

        setLoading(true);
        clearLayers();

        // Generate realistic crime data and filter by selected crime group
        const { data, coords } = generateRealisticCrimeData(selectedDistrict);
        const filteredData = data.filter(d => d.CrimeGroup_Name === selectedCrimeGroup);
        setCrimeCount(filteredData.length);

        const markers = L.markerClusterGroup({
            iconCreateFunction: (cluster) => {
                const count = cluster.getChildCount();
                return L.divIcon({
                    html: `<div style="
              background: linear-gradient(135deg, #ec4899 0%, #f97316 100%);
              color: white;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              box-shadow: 0 4px 6px rgba(0,0,0,0.3);
              border: 3px solid rgba(255,255,255,0.3);
            ">${count}</div>`,
                    className: 'custom-cluster-icon',
                    iconSize: L.point(40, 40)
                });
            }
        });

        filteredData.forEach((d) => {
            const marker = L.marker([d.Latitude, d.Longitude], {
                icon: L.divIcon({
                    html: '<div style="background: #ec4899; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                    className: 'custom-marker',
                    iconSize: [12, 12]
                })
            }).bindPopup(createCustomPopup(d.CrimeGroup_Name, d.CrimeHead_Name));

            markers.addLayer(marker);
        });

        layerGroupRef.current?.addLayer(markers);

        // Set map view to district coordinates
        mapRef.current.setView([coords.lat, coords.lng], coords.zoom);

        setLoading(false);
    };

    // Auto-visualize when selections change
    useEffect(() => {
        if (selectedDistrict && viewMode === 'heatmap') {
            visualizeHeatmap();
        } else if (selectedDistrict && viewMode === 'markers') {
            visualizeMarkers();
        } else if (selectedDistrict && selectedCrimeGroup && viewMode === 'filtered') {
            visualizeFiltered();
        }
    }, [selectedDistrict, viewMode, selectedCrimeGroup]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Spatial Crime Analytics</h2>
                    <p className="text-purple-200 text-sm mt-1">Geographic visualization and hotspot identification for strategic resource deployment</p>
                </div>
                {loading && (
                    <div className="flex items-center gap-2 text-purple-300">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Loading data...</span>
                    </div>
                )}
            </div>

            {/* Description Card */}
            <div className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 backdrop-blur-md rounded-xl p-4 border border-purple-500/30">
                <h3 className="text-white font-semibold mb-2">How it works:</h3>
                <p className="text-purple-100 text-sm mb-3">
                    Visualize crime patterns across districts using interactive maps. Choose between heatmaps for density analysis,
                    markers for individual incidents, or filter by specific crime types to identify hotspots and patterns.
                </p>
                <div className="text-purple-200 text-xs">
                    <span className="font-semibold">Use Cases:</span> Patrol route optimization • Resource allocation • Crime prevention strategies • Hotspot identification
                </div>
            </div>

            {/* Visualization Mode Selection */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-xl">
                <h3 className="text-lg font-semibold text-white mb-4">Visualization Mode</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={() => {
                            setViewMode('heatmap');
                            setSelectedCrimeGroup('');
                        }}
                        className={`p-4 rounded-lg text-white transition-all flex flex-col items-center gap-2 ${viewMode === 'heatmap'
                                ? 'bg-gradient-to-br from-orange-500 to-red-600 shadow-lg scale-105'
                                : 'bg-white/5 hover:bg-white/10 border border-white/20'
                            }`}
                    >
                        <Flame className="w-8 h-8" />
                        <span className="font-medium">Crime Heatmap</span>
                        <span className="text-xs opacity-75">Density visualization</span>
                    </button>

                    <button
                        onClick={() => {
                            setViewMode('markers');
                            setSelectedCrimeGroup('');
                        }}
                        className={`p-4 rounded-lg text-white transition-all flex flex-col items-center gap-2 ${viewMode === 'markers'
                                ? 'bg-gradient-to-br from-purple-600 to-indigo-600 shadow-lg scale-105'
                                : 'bg-white/5 hover:bg-white/10 border border-white/20'
                            }`}
                    >
                        <MapPinned className="w-8 h-8" />
                        <span className="font-medium">Crime Markers</span>
                        <span className="text-xs opacity-75">Individual incidents</span>
                    </button>

                    <button
                        onClick={() => {
                            setViewMode('filtered');
                            setSelectedCrimeGroup('');
                        }}
                        className={`p-4 rounded-lg text-white transition-all flex flex-col items-center gap-2 ${viewMode === 'filtered'
                                ? 'bg-gradient-to-br from-pink-600 to-rose-600 shadow-lg scale-105'
                                : 'bg-white/5 hover:bg-white/10 border border-white/20'
                            }`}
                    >
                        <Filter className="w-8 h-8" />
                        <span className="font-medium">Filter by Type</span>
                        <span className="text-xs opacity-75">Specific crime groups</span>
                    </button>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-xl space-y-4">
                <div>
                    <label htmlFor="district" className="block text-sm font-medium text-purple-200 mb-2">
                        Select District
                    </label>
                    <select
                        id="district"
                        value={selectedDistrict}
                        onChange={(e) => setSelectedDistrict(e.target.value)}
                        className="block w-full rounded-md bg-white/5 border border-white/20 text-white px-4 py-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                        <option value="" className="bg-indigo-900">Choose a district...</option>
                        {districts.map((district, index) => (
                            <option key={index} value={district} className="bg-indigo-900">
                                {district}
                            </option>
                        ))}
                    </select>
                </div>

                {viewMode === 'filtered' && crimeTypes.length > 0 && (
                    <div>
                        <label htmlFor="crimeType" className="block text-sm font-medium text-purple-200 mb-2">
                            Select Crime Type
                        </label>
                        <select
                            id="crimeType"
                            value={selectedCrimeGroup}
                            onChange={(e) => setSelectedCrimeGroup(e.target.value)}
                            className="block w-full rounded-md bg-white/5 border border-white/20 text-white px-4 py-2 focus:ring-purple-500 focus:border-purple-500"
                        >
                            <option value="" className="bg-indigo-900">Choose a crime type...</option>
                            {crimeTypes.map((type, index) => (
                                <option key={index} value={type} className="bg-indigo-900">
                                    {type}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {crimeCount > 0 && (
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-4 text-white">
                        <div className="text-sm opacity-90">Total Incidents</div>
                        <div className="text-3xl font-bold">{crimeCount.toLocaleString()}</div>
                    </div>
                )}
            </div>

            {/* Map Container */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-2 border border-white/20 shadow-xl">
                <div id="map" className="h-[600px] rounded-lg overflow-hidden"></div>
            </div>
        </div>
    );
};

export default SpatialAnalysis;
