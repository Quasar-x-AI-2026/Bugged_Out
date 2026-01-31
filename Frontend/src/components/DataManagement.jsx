import React, { useState, useEffect } from 'react';
import { Upload, Database, Trash2, CheckCircle, XCircle, FileText, Calendar, BarChart3 } from 'lucide-react';
import axios from 'axios';

const DataManagement = () => {
    const [datasets, setDatasets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [selectedFile, setSelectedFile] = useState(null);
    const [datasetName, setDatasetName] = useState('');
    const [showUploadModal, setShowUploadModal] = useState(false);

    // Assuming Data_upload.py runs on port 5004
    const API_URL = 'http://127.0.0.1:5004';

    useEffect(() => {
        fetchDatasets();
    }, []);

    const fetchDatasets = async () => {
        try {
            const response = await axios.get(`${API_URL}/datasets`);
            setDatasets(response.data.datasets);
        } catch (error) {
            console.error('Error fetching datasets:', error);
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();

        if (!selectedFile || !datasetName) {
            setMessage({ type: 'error', text: 'Please select a file and enter a dataset name' });
            return;
        }

        setUploading(true);
        setMessage({ type: '', text: '' });

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('dataset_name', datasetName);

        try {
            const response = await axios.post(`${API_URL}/upload-csv`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setMessage({
                type: 'success',
                text: `Dataset uploaded successfully! ${response.data.final_records} records processed (${response.data.removed_records} removed during cleaning)`
            });

            setSelectedFile(null);
            setDatasetName('');
            setShowUploadModal(false);
            fetchDatasets();
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.error || 'Failed to upload dataset'
            });
        } finally {
            setUploading(false);
        }
    };

    const handleSetActive = async (datasetId) => {
        if (!confirm('Set this dataset as active? All tools will use this data.')) return;

        try {
            await axios.post(`${API_URL}/set-active-dataset`, { dataset_id: datasetId });
            setMessage({ type: 'success', text: 'Dataset activated successfully!' });
            fetchDatasets();
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.error || 'Failed to activate dataset'
            });
        }
    };

    const handleDelete = async (datasetId) => {
        if (!confirm('Are you sure you want to delete this dataset? This cannot be undone.')) return;

        try {
            await axios.post(`${API_URL}/delete-dataset`, { dataset_id: datasetId });
            setMessage({ type: 'success', text: 'Dataset deleted successfully!' });
            fetchDatasets();
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.error || 'Failed to delete dataset'
            });
        }
    };

    const requiredColumns = [
        'District_Name', 'UnitName', 'date_time', 'Beat_Name',
        'CrimeHead_Name', 'Latitude', 'Longitude', 'CrimeGroup_Name'
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Data Management</h2>
                    <p className="text-purple-200 text-sm mt-1">Upload and manage crime datasets</p>
                </div>
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg"
                >
                    <Upload className="w-5 h-5" />
                    Upload New Dataset
                </button>
            </div>

            {/* Messages */}
            {message.text && (
                <div className={`rounded-lg p-4 ${message.type === 'success'
                        ? 'bg-green-500/20 border border-green-500/30 text-green-300'
                        : 'bg-red-500/20 border border-red-500/30 text-red-300'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Required Columns Info */}
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Required CSV Columns
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {requiredColumns.map((col) => (
                        <div key={col} className="text-blue-200 text-sm bg-blue-500/10 px-2 py-1 rounded">
                            {col}
                        </div>
                    ))}
                </div>
            </div>

            {/* Datasets List */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-white/20">
                    <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-purple-300" />
                        <h3 className="text-lg font-medium text-white">Available Datasets</h3>
                    </div>
                    <p className="mt-1 text-sm text-purple-200">Total datasets: {datasets.length}</p>
                </div>

                {datasets.length === 0 ? (
                    <div className="p-8 text-center text-purple-200">
                        No datasets uploaded yet. Upload your first dataset to get started.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">Dataset Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">Filename</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">Records</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">Upload Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {datasets.map((dataset) => (
                                    <tr key={dataset.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {dataset.status === 'active' ? (
                                                <span className="flex items-center gap-2 text-green-400">
                                                    <CheckCircle className="w-5 h-5" />
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-2 text-gray-400">
                                                    <XCircle className="w-5 h-5" />
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-white font-medium">
                                            {dataset.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-purple-200 text-sm">
                                            {dataset.filename}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-purple-200">
                                            <div className="flex items-center gap-2">
                                                <BarChart3 className="w-4 h-4" />
                                                {dataset.record_count.toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-purple-200 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4" />
                                                {new Date(dataset.upload_date).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                {dataset.status !== 'active' && (
                                                    <button
                                                        onClick={() => handleSetActive(dataset.id)}
                                                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                                                    >
                                                        Set Active
                                                    </button>
                                                )}
                                                {dataset.status !== 'active' && (
                                                    <button
                                                        onClick={() => handleDelete(dataset.id)}
                                                        className="text-red-400 hover:text-red-300 transition-colors"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-xl border border-white/20 shadow-2xl max-w-lg w-full">
                        <div className="p-6 border-b border-white/20">
                            <h3 className="text-xl font-bold text-white">Upload New Dataset</h3>
                            <p className="text-purple-200 text-sm mt-1">Upload a CSV file with crime data</p>
                        </div>

                        <form onSubmit={handleUpload} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-purple-200 mb-2">
                                    Dataset Name
                                </label>
                                <input
                                    type="text"
                                    value={datasetName}
                                    onChange={(e) => setDatasetName(e.target.value)}
                                    className="block w-full rounded-md bg-white/5 border border-white/20 text-white placeholder-purple-300 focus:border-purple-500 focus:ring-purple-500 px-4 py-2"
                                    placeholder="e.g., Crime Data 2024 Q1"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-purple-200 mb-2">
                                    CSV File
                                </label>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileSelect}
                                    className="block w-full text-purple-200 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                                    required
                                />
                                {selectedFile && (
                                    <p className="text-sm text-purple-300 mt-2">
                                        Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                                    </p>
                                )}
                            </div>

                            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
                                <p className="text-yellow-200 text-sm">
                                    <strong>Note:</strong> The system will automatically clean the data by removing null values and duplicates.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowUploadModal(false);
                                        setSelectedFile(null);
                                        setDatasetName('');
                                    }}
                                    className="flex-1 px-4 py-2 border border-white/20 rounded-md text-sm font-medium text-purple-200 hover:bg-white/10 transition-colors"
                                    disabled={uploading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-md hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg disabled:opacity-50"
                                >
                                    {uploading ? 'Uploading...' : 'Upload Dataset'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataManagement;
