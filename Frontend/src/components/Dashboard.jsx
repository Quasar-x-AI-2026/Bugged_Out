import { useState, useEffect } from 'react';
import { 
    BarChart3, 
    MapPin, 
    TrendingUp, 
    Shield, 
    AlertTriangle, 
    Users, 
    Calendar,
    Activity,
    Target,
    Database,
    Zap,
    Eye,
    Brain,
    Clock,
    Loader2
} from 'lucide-react';
import Plot from 'react-plotly.js';

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalCrimes: 0,
        activeCases: 0,
        solvedCases: 0,
        districts: 0
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [crimeDistribution, setCrimeDistribution] = useState({ labels: [], values: [] });
    const [trendData, setTrendData] = useState({ x: [], y: [] });
    const [loading, setLoading] = useState(true);

    // Fallback data for demo
    const fallbackStats = {
        totalCrimes: 15847,
        activeCases: 2847,
        solvedCases: 13000,
        districts: 12,
        clearanceRate: 82.1
    };

    const fallbackDistribution = {
        labels: ['Theft', 'Assault', 'Burglary', 'Fraud', 'Vandalism', 'Drug Offense'],
        values: [4521, 3892, 2847, 2156, 1734, 697]
    };

    const fallbackTrend = {
        x: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
        y: [45, 32, 28, 19, 15, 22, 67, 134, 189, 245, 298, 356, 423, 467, 512, 589, 634, 678, 598, 456, 334, 234, 156, 89]
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            
            // Try to fetch from backend
            const districtsResponse = await fetch('http://127.0.0.1:5000/districts');
            
            if (districtsResponse.ok) {
                const districts = await districtsResponse.json();
                
                if (districts.length > 0) {
                    const statsResponse = await fetch(`http://127.0.0.1:5000/current-statistics/${districts[0]}`);
                    if (statsResponse.ok) {
                        const statsData = await statsResponse.json();
                        
                        setStats({
                            totalCrimes: statsData.total_crimes || fallbackStats.totalCrimes,
                            activeCases: Math.floor((statsData.total_crimes || fallbackStats.totalCrimes) * 0.18),
                            solvedCases: Math.floor((statsData.total_crimes || fallbackStats.totalCrimes) * 0.82),
                            districts: districts.length,
                            clearanceRate: 82.1
                        });

                        setCrimeDistribution({
                            labels: statsData.crime_distribution?.crime_types || fallbackDistribution.labels,
                            values: statsData.crime_distribution?.counts || fallbackDistribution.values
                        });

                        setTrendData({
                            x: statsData.temporal_analysis?.hours || fallbackTrend.x,
                            y: statsData.temporal_analysis?.crime_counts || fallbackTrend.y
                        });
                    }
                }
            } else {
                throw new Error('Backend not available');
            }
        } catch (error) {
            console.warn('Backend not available, using fallback data');
            // Use fallback data
            setStats(fallbackStats);
            setCrimeDistribution(fallbackDistribution);
            setTrendData(fallbackTrend);
        } finally {
            // Set activity data
            setRecentActivity([
                { id: 1, type: 'Critical Alert', description: 'Multiple theft reports in Commercial Street area', time: '3 mins ago', severity: 'high', icon: AlertTriangle },
                { id: 2, type: 'Pattern Detected', description: 'AI identified unusual activity pattern in Koramangala', time: '12 mins ago', severity: 'medium', icon: Brain },
                { id: 3, type: 'Case Resolved', description: 'Burglary case closed with suspect apprehended', time: '28 mins ago', severity: 'low', icon: Shield },
                { id: 4, type: 'System Update', description: 'Crime prediction model updated with latest data', time: '1 hour ago', severity: 'info', icon: Database },
                { id: 5, type: 'Patrol Alert', description: 'Increased patrol requested in Brigade Road area', time: '2 hours ago', severity: 'medium', icon: Eye }
            ]);
            setLoading(false);
        }
    };

    const StatCard = ({ icon: Icon, title, value, change, color, subtitle }) => (
        <div className="group relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:border-white/30 transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
                <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl ${color} group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-6 h-6 text-white" />
                    </div>
                    {change && (
                        <span className={`text-sm font-semibold px-2 py-1 rounded-full ${
                            change > 0 ? 'text-red-400 bg-red-400/20' : 'text-green-400 bg-green-400/20'
                        }`}>
                            {change > 0 ? '+' : ''}{change}%
                        </span>
                    )}
                </div>
                <h3 className="text-3xl font-bold text-white mb-2">{value}</h3>
                <p className="text-gray-300 font-medium">{title}</p>
                {subtitle && <p className="text-gray-400 text-sm mt-1">{subtitle}</p>}
            </div>
        </div>
    );

    const ActivityItem = ({ activity }) => {
        const Icon = activity.icon;
        const severityColors = {
            high: 'from-red-500/20 to-red-600/20 border-red-500/30',
            medium: 'from-yellow-500/20 to-orange-600/20 border-yellow-500/30',
            low: 'from-green-500/20 to-emerald-600/20 border-green-500/30',
            info: 'from-blue-500/20 to-indigo-600/20 border-blue-500/30'
        };

        const iconColors = {
            high: 'text-red-400',
            medium: 'text-yellow-400',
            low: 'text-green-400',
            info: 'text-blue-400'
        };

        return (
            <div className={`bg-gradient-to-r ${severityColors[activity.severity]} backdrop-blur-sm rounded-xl p-4 border hover:scale-105 transition-all duration-200`}>
                <div className="flex items-start space-x-4">
                    <div className={`p-2 rounded-lg bg-white/10 ${iconColors[activity.severity]}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-white font-semibold text-sm">{activity.type}</p>
                            <span className="text-gray-400 text-xs">{activity.time}</span>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">{activity.description}</p>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400 mx-auto"></div>
                    <p className="text-white text-lg">Loading Analytics Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-6">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Hero Header */}
                <div className="text-center space-y-6">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl mb-4">
                        <Shield className="w-10 h-10 text-white" />
                    </div>
                    <div>
                        <h1 className="text-5xl font-bold text-white mb-4">
                            Intelligent Crime Analytics Hub
                        </h1>
                        <p className="text-xl text-blue-200 max-w-3xl mx-auto">
                            Advanced AI-powered platform for crime pattern analysis, prediction, and strategic law enforcement operations
                        </p>
                    </div>
                    
                    {/* Quick Stats Bar */}
                    <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-white">{stats.clearanceRate}%</div>
                                <div className="text-blue-200 text-sm">Case Clearance Rate</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-white">24/7</div>
                                <div className="text-blue-200 text-sm">Active Monitoring</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-white">{stats.districts}</div>
                                <div className="text-blue-200 text-sm">Districts Covered</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-white">AI</div>
                                <div className="text-blue-200 text-sm">Powered Analytics</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        icon={Database}
                        title="Total Crime Records"
                        value={stats.totalCrimes.toLocaleString()}
                        change={-3.2}
                        color="bg-gradient-to-r from-blue-600 to-cyan-600"
                        subtitle="Comprehensive database"
                    />
                    <StatCard
                        icon={AlertTriangle}
                        title="Active Investigations"
                        value={stats.activeCases.toLocaleString()}
                        change={1.8}
                        color="bg-gradient-to-r from-red-600 to-pink-600"
                        subtitle="Ongoing cases"
                    />
                    <StatCard
                        icon={Target}
                        title="Cases Resolved"
                        value={stats.solvedCases.toLocaleString()}
                        change={-2.1}
                        color="bg-gradient-to-r from-green-600 to-emerald-600"
                        subtitle="Successfully closed"
                    />
                    <StatCard
                        icon={MapPin}
                        title="Coverage Areas"
                        value={stats.districts}
                        color="bg-gradient-to-r from-purple-600 to-indigo-600"
                        subtitle="Districts monitored"
                    />
                </div>

                {/* Analytics Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Crime Distribution */}
                    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/20">
                        <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                            <BarChart3 className="w-6 h-6 mr-3" />
                            Crime Category Analysis
                        </h3>
                        {crimeDistribution.labels.length > 0 ? (
                            <Plot
                                data={[{
                                    type: 'pie',
                                    labels: crimeDistribution.labels,
                                    values: crimeDistribution.values,
                                    hole: 0.5,
                                    marker: {
                                        colors: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899']
                                    },
                                    textinfo: 'label+percent',
                                    textfont: { color: 'white', size: 12 },
                                    hovertemplate: '<b>%{label}</b><br>Count: %{value}<br>Percentage: %{percent}<extra></extra>'
                                }]}
                                layout={{
                                    paper_bgcolor: 'transparent',
                                    plot_bgcolor: 'transparent',
                                    font: { color: 'white' },
                                    showlegend: false,
                                    margin: { t: 0, b: 0, l: 0, r: 0 },
                                    annotations: [{
                                        text: `<b>${crimeDistribution.values.reduce((a, b) => a + b, 0).toLocaleString()}</b><br><span style="font-size:14px">Total Cases</span>`,
                                        x: 0.5, y: 0.5,
                                        font: { size: 20, color: 'white' },
                                        showarrow: false
                                    }]
                                }}
                                config={{ displayModeBar: false }}
                                style={{ width: '100%', height: '400px' }}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-64 text-gray-400">
                                <Loader2 className="w-8 h-8 animate-spin mr-2" />
                                Loading analytics...
                            </div>
                        )}
                    </div>

                    {/* Temporal Trends */}
                    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/20">
                        <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                            <TrendingUp className="w-6 h-6 mr-3" />
                            24-Hour Activity Pattern
                        </h3>
                        {trendData.x.length > 0 ? (
                            <Plot
                                data={[{
                                    type: 'scatter',
                                    mode: 'lines+markers',
                                    x: trendData.x,
                                    y: trendData.y,
                                    line: { 
                                        color: '#8B5CF6', 
                                        width: 4,
                                        shape: 'spline'
                                    },
                                    marker: { 
                                        color: '#8B5CF6', 
                                        size: 8,
                                        line: { color: 'white', width: 2 }
                                    },
                                    fill: 'tonexty',
                                    fillcolor: 'rgba(139, 92, 246, 0.2)',
                                    hovertemplate: '<b>Hour: %{x}:00</b><br>Incidents: %{y}<extra></extra>'
                                }]}
                                layout={{
                                    paper_bgcolor: 'transparent',
                                    plot_bgcolor: 'transparent',
                                    font: { color: 'white' },
                                    xaxis: { 
                                        gridcolor: 'rgba(255,255,255,0.1)',
                                        title: 'Hour of Day',
                                        tickmode: 'linear',
                                        tick0: 0,
                                        dtick: 4
                                    },
                                    yaxis: { 
                                        gridcolor: 'rgba(255,255,255,0.1)',
                                        title: 'Crime Incidents'
                                    },
                                    margin: { t: 20, b: 60, l: 60, r: 20 }
                                }}
                                config={{ displayModeBar: false }}
                                style={{ width: '100%', height: '400px' }}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-64 text-gray-400">
                                <Loader2 className="w-8 h-8 animate-spin mr-2" />
                                Loading trends...
                            </div>
                        )}
                    </div>
                </div>

                {/* Real-time Activity Feed */}
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/20">
                    <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                        <Activity className="w-6 h-6 mr-3" />
                        Live Activity Stream
                    </h3>
                    <div className="space-y-4">
                        {recentActivity.map((activity) => (
                            <ActivityItem key={activity.id} activity={activity} />
                        ))}
                    </div>
                </div>

                {/* Quick Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="group bg-gradient-to-br from-blue-600/20 to-cyan-600/20 backdrop-blur-md rounded-2xl p-8 border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 cursor-pointer hover:scale-105">
                        <MapPin className="w-10 h-10 text-blue-400 mb-4 group-hover:scale-110 transition-transform duration-300" />
                        <h4 className="text-xl font-bold text-white mb-2">Spatial Intelligence</h4>
                        <p className="text-blue-100 leading-relaxed">Interactive crime mapping with AI-powered hotspot detection and geographic pattern analysis</p>
                    </div>
                    <div className="group bg-gradient-to-br from-green-600/20 to-emerald-600/20 backdrop-blur-md rounded-2xl p-8 border border-green-500/30 hover:border-green-400/50 transition-all duration-300 cursor-pointer hover:scale-105">
                        <Brain className="w-10 h-10 text-green-400 mb-4 group-hover:scale-110 transition-transform duration-300" />
                        <h4 className="text-xl font-bold text-white mb-2">Predictive Analytics</h4>
                        <p className="text-green-100 leading-relaxed">Machine learning algorithms forecast crime trends and identify potential risk factors</p>
                    </div>
                    <div className="group bg-gradient-to-br from-purple-600/20 to-indigo-600/20 backdrop-blur-md rounded-2xl p-8 border border-purple-500/30 hover:border-purple-400/50 transition-all duration-300 cursor-pointer hover:scale-105">
                        <Zap className="w-10 h-10 text-purple-400 mb-4 group-hover:scale-110 transition-transform duration-300" />
                        <h4 className="text-xl font-bold text-white mb-2">Performance Metrics</h4>
                        <p className="text-purple-100 leading-relaxed">Comprehensive beat analysis and resource optimization for maximum operational efficiency</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;