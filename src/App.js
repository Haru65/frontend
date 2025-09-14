import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  Package, Clock, AlertCircle, TrendingUp, Factory, Users, 
  Zap, Settings, Bell, Search, Menu, Target, Gauge, Activity,
  Upload, Database, RefreshCw
} from 'lucide-react';
import './index.css';

// Components
import HomePage from './components/HomePage';
import DashboardTab from './components/DashboardTab';
import LeadTimeTab from './components/LeadTimeTab';
import ParallelizableTaskTab from './components/ParallelizableTaskTab';
import UploadETLComponent from './components/UploadETLComponent';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';

const API_BASE = 'http://localhost:8000';

function App() {
  // Initialize state with localStorage persistence
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });

  const [activeTab, setActiveTab] = useState(() => {
    const storedETLStatus = localStorage.getItem('etlCompleted') === 'true';
    return storedETLStatus ? 'home' : 'upload';
  });
  
  const [dashboardData, setDashboardData] = useState(() => {
    const cached = localStorage.getItem('cachedDashboardData');
    return cached ? JSON.parse(cached).dashboardData : null;
  });
  
  const [leadTimeData, setLeadTimeData] = useState(() => {
    const cached = localStorage.getItem('cachedDashboardData');
    return cached ? JSON.parse(cached).leadTimeData : [];
  });
  
  const [stockData, setStockData] = useState(() => {
    const cached = localStorage.getItem('cachedDashboardData');
    return cached ? JSON.parse(cached).stockData : [];
  });
  
  const [parallelizableData, setParallelizableData] = useState(() => {
    const cached = localStorage.getItem('cachedDashboardData');
    return cached ? JSON.parse(cached).parallelizableData : [];
  });
  
  // **NEW: Add state for raw parallelization data**
  const [parallelizationRawData, setParallelizationRawData] = useState(() => {
    const cached = localStorage.getItem('cachedDashboardData');
    return cached ? JSON.parse(cached).parallelizationRawData : [];
  });
  
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications] = useState(12);
  const [error, setError] = useState(null);
  
  const [etlCompleted, setETLCompleted] = useState(() => {
    return localStorage.getItem('etlCompleted') === 'true';
  });
  
  const [dataLastUpdated, setDataLastUpdated] = useState(() => {
    const stored = localStorage.getItem('dataLastUpdated');
    return stored ? new Date(stored) : null;
  });

  // Check for existing data on app load
  useEffect(() => {
    checkExistingData();
  }, []);

  // Auto-refresh data if ETL is completed
  useEffect(() => {
    if (etlCompleted) {
      // Only set interval if we don't have recent cached data
      const cacheTime = localStorage.getItem('cacheTimestamp');
      const isRecentCache = cacheTime && (Date.now() - parseInt(cacheTime)) < 300000; // 5 minutes
      
      if (!isRecentCache) {
        fetchDashboardData();
      }
      
      const interval = setInterval(() => fetchDashboardData(false), 300000); // 5 minutes
      return () => clearInterval(interval);
    }
  }, [etlCompleted]);

  const checkExistingData = async () => {
    try {
      setLoading(true);
      
      // First check localStorage
      const storedETLStatus = localStorage.getItem('etlCompleted') === 'true';
      const storedUpdateTime = localStorage.getItem('dataLastUpdated');
      const cacheTime = localStorage.getItem('cacheTimestamp');
      
      if (storedETLStatus && storedUpdateTime) {
        console.log('Found stored ETL completion status');
        
        // Check if we have recent cached data
        if (cacheTime && (Date.now() - parseInt(cacheTime)) < 300000) { // 5 minutes
          console.log('Using cached data');
          setETLCompleted(true);
          setDataLastUpdated(new Date(storedUpdateTime));
          setActiveTab('home');
          setLoading(false);
          return;
        }
        
        // Check if backend still has the data
        try {
          const response = await axios.get(`${API_BASE}/analysis_status/`);
          
          if (response.data.status === '✅ success') {
            const stats = response.data.completion_stats;
            
            if (stats.etl && stats.etl.completion_percentage > 0) {
              console.log('Backend confirms data exists, fetching fresh data');
              setETLCompleted(true);
              setDataLastUpdated(new Date(storedUpdateTime));
              setActiveTab('home');
              await fetchDashboardData();
              return;
            }
          }
        } catch (backendError) {
          console.log('Backend check failed, but using cached data if available');
          if (dashboardData || leadTimeData.length > 0) {
            setETLCompleted(true);
            setDataLastUpdated(new Date(storedUpdateTime));
            setActiveTab('home');
            setLoading(false);
            return;
          }
        }
      }
      
      // If no valid stored data, clear localStorage and show upload
      clearAllStoredData();
      setETLCompleted(false);
      setActiveTab('upload');
      
    } catch (error) {
      console.log('Error checking existing data:', error);
      // On error, try to use cached data if available
      const storedETLStatus = localStorage.getItem('etlCompleted') === 'true';
      if (storedETLStatus && (dashboardData || leadTimeData.length > 0)) {
        setETLCompleted(true);
        const storedUpdateTime = localStorage.getItem('dataLastUpdated');
        if (storedUpdateTime) {
          setDataLastUpdated(new Date(storedUpdateTime));
        }
        setActiveTab('home');
      } else {
        clearAllStoredData();
        setETLCompleted(false);
        setActiveTab('upload');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleETLComplete = async (results) => {
    console.log('ETL completed with results:', results);
    
    // Persist ETL completion status
    setETLCompleted(true);
    localStorage.setItem('etlCompleted', 'true');
    localStorage.setItem('etlCompletedAt', new Date().toISOString());
    
    const updateTime = new Date();
    setDataLastUpdated(updateTime);
    localStorage.setItem('dataLastUpdated', updateTime.toISOString());
    
    // Wait for files to be written, then fetch data
    setTimeout(async () => {
      await fetchDashboardData();
      setActiveTab('home');
    }, 2000);
  };

  // **UPDATED: Enhanced fetchDashboardData with parallelization endpoint**
  const fetchDashboardData = async (useCache = true) => {
    if (!etlCompleted) return;

    // Use cached data if available and recent (within 5 minutes)
    if (useCache) {
      const cacheTime = localStorage.getItem('cacheTimestamp');
      if (cacheTime && (Date.now() - parseInt(cacheTime)) < 300000) { // 5 minutes
        console.log('Using cached data');
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching fresh data from:', API_BASE);
      
      // **UPDATED: Add parallelization endpoint to requests**
      const requests = [
        axios.get(`${API_BASE}/dashboard-summary`).catch(() => ({ data: null })),
        axios.get(`${API_BASE}/lead-time`).catch(() => ({ data: { data: [] } })),
        axios.get(`${API_BASE}/stock-vs-demand`).catch(() => ({ data: { data: [] } })),
        axios.get(`${API_BASE}/optimized-parallelization`).catch(() => ({ data: { data: [] } })) // **NEW**
      ];

      const [summaryResponse, leadTimeResponse, stockResponse, parallelizationResponse] = await Promise.all(requests);

      console.log('Dashboard Summary Response:', summaryResponse.data);
      console.log('Lead Time Response:', leadTimeResponse.data);
      console.log('Stock Response:', stockResponse.data);
      console.log('Parallelization Response:', parallelizationResponse.data); // **NEW**

      // Process responses
      const newDashboardData = summaryResponse.data?.summary || summaryResponse.data;
      const newLeadTimeData = leadTimeResponse.data?.data || leadTimeResponse.data || [];
      const newStockData = stockResponse.data?.data || stockResponse.data || [];
      const newParallelizationData = parallelizationResponse.data?.data || []; // **NEW**
      
      // **UPDATED: Process parallelizable data with real parallelization data**
      let newParallelizableData = [];
      if (Array.isArray(newParallelizationData) && newParallelizationData.length > 0) {
        // Use real parallelization data from optimized_parallelization table
        console.log(`Processing ${newParallelizationData.length} parallelization records`);
        newParallelizableData = newParallelizationData.map(item => ({
          task_id: `${item.item_1}-${item.item_2}`,
          task_name: `${item.item_1} + ${item.item_2}`,
          item_1: item.item_1,
          item_2: item.item_2,
          current_time: item.sequential_time_days || 0,
          parallel_time: item.parallel_time_days || 0,
          savings: item.time_saved_days || 0,
          efficiency_gain: item.efficiency_gain_pct || 0,
          can_run_parallel: item.can_run_parallel,
          process_conflicts: item.process_conflicts || '',
          machine_conflicts: item.machine_conflicts || '',
          item_1_processes: item.item_1_processes || '',
          item_2_processes: item.item_2_processes || '',
          item_1_urgency: item.item_1_urgency || 'LOW',
          item_2_urgency: item.item_2_urgency || 'LOW',
          item_1_machines: item.item_1_machines || 'GENERAL',
          item_2_machines: item.item_2_machines || 'GENERAL'
        }));
      } else if (Array.isArray(newLeadTimeData)) {
        // Fallback to lead time data transformation (your existing code)
        console.log('Using fallback lead time data for parallelizable tasks');
        newParallelizableData = newLeadTimeData.map(item => ({
          task_id: item.ITEM_CODE || 'Unknown',
          task_name: `Production: ${item.ITEM_CODE || 'Unknown'}`,
          current_time: item.LEAD_TIME_SERIAL || 0,
          parallel_time: item.LEAD_TIME_PARALLELIZED || 0,
          savings: item.TIME_SAVED_DAYS || 0,
          efficiency_gain: item.EFFICIENCY_GAIN_PCT || 0,
          complexity: item.EFFICIENCY_GAIN_PCT > 25 ? 'High' : item.EFFICIENCY_GAIN_PCT > 15 ? 'Medium' : 'Low',
          dependencies: Math.floor(Math.random() * 3),
          resource_requirement: Math.ceil((item.LEAD_TIME_SERIAL || 0) / 20),
          can_run_parallel: item.EFFICIENCY_GAIN_PCT > 0
        }));
      }

      // **UPDATED: Enhanced cache data**
      const cacheData = {
        dashboardData: newDashboardData,
        leadTimeData: newLeadTimeData,
        stockData: newStockData,
        parallelizableData: newParallelizableData,
        parallelizationRawData: newParallelizationData // **NEW: Store raw data**
      };
      
      localStorage.setItem('cachedDashboardData', JSON.stringify(cacheData));
      localStorage.setItem('cacheTimestamp', Date.now().toString());

      // Set state
      setDashboardData(newDashboardData);
      setLeadTimeData(newLeadTimeData);
      setStockData(newStockData);
      setParallelizableData(newParallelizableData);
      setParallelizationRawData(newParallelizationData); // **NEW**
      
      const updateTime = new Date();
      setDataLastUpdated(updateTime);
      localStorage.setItem('dataLastUpdated', updateTime.toISOString());
      
      console.log(`Data cached and state updated. Found ${newParallelizableData.length} parallelizable tasks`);
      
    } catch (error) {
      console.error('Error fetching data from backend:', error);
      setError(`Backend connection failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Clear all stored data
  const clearAllStoredData = () => {
    localStorage.removeItem('etlCompleted');
    localStorage.removeItem('dataLastUpdated');
    localStorage.removeItem('etlCompletedAt');
    localStorage.removeItem('cachedDashboardData');
    localStorage.removeItem('cacheTimestamp');
  };

  // Clear data and reset app
  const clearAllData = () => {
    clearAllStoredData();
    
    setETLCompleted(false);
    setDashboardData(null);
    setLeadTimeData([]);
    setStockData([]);
    setParallelizableData([]);
    setParallelizationRawData([]); // **NEW**
    setDataLastUpdated(null);
    setActiveTab('upload');
    setError(null);
  };

  const handleTabChange = (tabName) => {
    if (!etlCompleted && tabName !== 'upload') {
      return; // Prevent navigation if ETL not completed
    }
    setActiveTab(tabName);
    setSidebarOpen(false);
  };

  const getTabStatus = (tabName) => {
    if (!etlCompleted && tabName !== 'upload') {
      return 'disabled';
    }
    return activeTab === tabName ? 'active' : '';
  };

  if (loading && !etlCompleted) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-spinner">
            <div className="spinner-ring"></div>
            <Factory className="spinner-icon" />
          </div>
          <h2>Loading Manufacturing Dashboard...</h2>
          <p>Checking for existing data...</p>
        </div>
      </div>
    );
  }

  if (error && !etlCompleted) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div style={{ color: '#ef4444', marginBottom: '1rem' }}>
            <AlertCircle size={48} />
          </div>
          <h2>Backend Connection Failed</h2>
          <p>{error}</p>
          <div style={{ marginTop: '2rem', textAlign: 'left', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
            <h4>Required Steps:</h4>
            <ol>
              <li>Start your FastAPI backend: <code>python main.py</code></li>
              <li>Upload Excel files via the upload tab</li>
              <li>Ensure these endpoints return data:</li>
              <ul>
                <li><code>GET /dashboard-summary</code></li>
                <li><code>GET /lead-time</code></li>
                <li><code>GET /stock-vs-demand</code></li>
                <li><code>GET /optimized-parallelization</code></li> {/* **NEW** */}
              </ul>
            </ol>
          </div>
          <button className="btn btn-primary" onClick={checkExistingData} style={{ marginTop: '1rem' }}>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <button 
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu size={24} />
            </button>
            <div className="logo-section">
              <div className="logo">
                <Factory size={32} />
              </div>
              <div className="title-section">
                <h1>SmartFactory</h1>
                <p>Production Intelligence Platform</p>
              </div>
            </div>
          </div>
          
          <div className="header-center">
            <div className="search-box">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                placeholder="Search items, orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={!etlCompleted}
              />
            </div>
          </div>
          
          <div className="header-right">
            <button className="header-btn notification-btn">
              <Bell size={20} />
              {notifications > 0 && <span className="badge">{notifications}</span>}
            </button>
            <button 
              className="header-btn" 
              onClick={() => fetchDashboardData(false)} 
              title="Refresh Data"
              disabled={!etlCompleted || loading}
            >
              <Activity size={20} className={loading ? 'spinning' : ''} />
            </button>
            <button 
              className="header-btn" 
              onClick={clearAllData}
              title="Reset All Data"
            >
              <Database size={20} />
            </button>
            <button 
              className="header-btn"
              onClick={() => {
                localStorage.removeItem('isAuthenticated');
                setIsAuthenticated(false);
              }}
              title="Logout"
            >
              <Users size={20} />
            </button>
            <div className="last-updated">
              <span>{etlCompleted ? 'Last Updated' : 'No Data'}</span>
              <strong>
                {dataLastUpdated ? dataLastUpdated.toLocaleTimeString() : 'Upload Required'}
              </strong>
            </div>
          </div>
        </div>
      </header>

      <div className="app-body">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <nav className="sidebar-nav">
            <button
              className={`nav-item ${getTabStatus('admin')}`}
              onClick={() => handleTabChange('admin')}
            >
              <Settings size={20} />
              <span>Admin Panel</span>
            </button>

            <button
              className={`nav-item ${getTabStatus('upload')}`}
              onClick={() => handleTabChange('upload')}
            >
              <Upload size={20} />
              <span>Upload Data</span>
              {!etlCompleted && <span className="nav-badge required">!</span>}
            </button>
            
            <button
              className={`nav-item ${getTabStatus('home')} ${!etlCompleted ? 'disabled' : ''}`}
              onClick={() => handleTabChange('home')}
              disabled={!etlCompleted}
            >
              <Target size={20} />
              <span>Home Overview</span>
              {!etlCompleted && <span className="nav-lock">🔒</span>}
            </button>
            
            <button
              className={`nav-item ${getTabStatus('dashboard')} ${!etlCompleted ? 'disabled' : ''}`}
              onClick={() => handleTabChange('dashboard')}
              disabled={!etlCompleted}
            >
              <Gauge size={20} />
              <span>Production Dashboard</span>
              {Array.isArray(stockData) && stockData.filter(item => 
                (item.STOCK_ADEQUACY || item.stock_status) === 'Out of Stock'
              ).length > 0 && etlCompleted && (
                <span className="nav-badge">
                  {stockData.filter(item => 
                    (item.STOCK_ADEQUACY || item.stock_status) === 'Out of Stock'
                  ).length}
                </span>
              )}
              {!etlCompleted && <span className="nav-lock">🔒</span>}
            </button>
            
            <button
              className={`nav-item ${getTabStatus('leadtime')} ${!etlCompleted ? 'disabled' : ''}`}
              onClick={() => handleTabChange('leadtime')}
              disabled={!etlCompleted}
            >
              <Clock size={20} />
              <span>Lead Time Analytics</span>
              {!etlCompleted && <span className="nav-lock">🔒</span>}
            </button>
            
            <button
              className={`nav-item ${getTabStatus('parallelizable')} ${!etlCompleted ? 'disabled' : ''}`}
              onClick={() => handleTabChange('parallelizable')}
              disabled={!etlCompleted}
            >
              <TrendingUp size={20} />
              <span>Parallelizable Tasks</span>
              {/* **NEW: Show parallelizable count badge** */}
              {Array.isArray(parallelizableData) && parallelizableData.filter(item => 
                item.can_run_parallel
              ).length > 0 && etlCompleted && (
                <span className="nav-badge success">
                  {parallelizableData.filter(item => item.can_run_parallel).length}
                </span>
              )}
              {!etlCompleted && <span className="nav-lock">🔒</span>}
            </button>
          </nav>
          
          <div className="system-status">
            <div className="status-card">
              {etlCompleted ? (
                <>
                  <Zap size={20} className="status-icon success" />
                  <div>
                    <span className="status-title">System Ready</span>
                    <p className="status-text">
                      {dataLastUpdated ? `Data from ${dataLastUpdated.toLocaleDateString()}` : 'Real-time data active'}
                      {/* **NEW: Show parallelization status** */}
                      {parallelizableData.length > 0 && (
                        <>
                          <br />
                          <small>{parallelizableData.length} parallelizable tasks found</small>
                        </>
                      )}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Database size={20} className="status-icon warning" />
                  <div>
                    <span className="status-title">Upload Required</span>
                    <p className="status-text">Please upload Excel files</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          {activeTab === 'admin' && (
            <AdminDashboard />
          )}
          {activeTab === 'upload' && (
            <UploadETLComponent onETLComplete={handleETLComplete} />
          )}
          {activeTab === 'home' && etlCompleted && (
            <HomePage 
              data={dashboardData} 
              stockData={stockData} 
              leadTimeData={leadTimeData}
              parallelizableData={parallelizableData}
            />
          )}
          {activeTab === 'dashboard' && etlCompleted && (
            <DashboardTab 
              data={dashboardData} 
              stockData={stockData} 
            />
          )}
          {activeTab === 'leadtime' && etlCompleted && (
            <LeadTimeTab 
              leadTimeData={leadTimeData} 
            />
          )}
          {activeTab === 'parallelizable' && etlCompleted && (
            <ParallelizableTaskTab 
              leadTimeData={leadTimeData}
              parallelizableData={parallelizableData}
              parallelizationRawData={parallelizationRawData} // **NEW: Pass raw data**
            />
          )}
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && <div className="mobile-overlay" onClick={() => setSidebarOpen(false)}></div>}
    </div>
  );
}

export default App;
