import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, LineChart, Line
} from 'recharts';
import { 
  Clock, TrendingUp, TrendingDown, Filter, Download, 
  FileText, BarChart3, Activity, Target, RefreshCw
} from 'lucide-react';

export default function LeadTimeTab() {
  const [leadTimeData, setLeadTimeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedPriority, setSelectedPriority] = useState('All Priorities');
  const [sortBy, setSortBy] = useState('savings');
  const [sortOrder, setSortOrder] = useState('desc');

  // Fetch lead time data from backend
  const fetchLeadTimeData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📡 Fetching lead time data from backend...');
      const response = await fetch('https://backend-1-n2xg.onrender.com');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new Error('Invalid response format - expected JSON');
      }
      
      const result = await response.json();
      console.log('Lead time data received:', result);
      
      if (result.status === 'error') {
        throw new Error(result.error || 'Server returned error');
      }
      
      setLeadTimeData(result.data || []);
      
    } catch (e) {
      console.error('Failed to fetch lead time data:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeadTimeData();
  }, []);

  console.log('LeadTimeTab - Raw leadTimeData:', leadTimeData);

  // Map backend field names to frontend field names
  const safeLeadTimeData = leadTimeData.map(item => ({
    item_code: item.ITEM_CODE || item.item_code || item.itemCode || 'Unknown',
    current_days: item.LEAD_TIME_SERIAL || item.current_days || item.currentDays || 0,
    optimized_days: item.LEAD_TIME_PARALLELIZED || item.optimized_days || item.optimizedDays || 0,
    savings: item.TIME_SAVED_DAYS || item.savings || item.timeSavings || 0,
    efficiency: item.EFFICIENCY_GAIN_PCT || item.efficiency || item.efficiencyGain || 0,
    category: item.CATEGORY || item.category || 'General',
    priority: item.PRIORITY || item.priority || 'Medium'
  }));

  console.log('LeadTimeTab - Mapped safeLeadTimeData:', safeLeadTimeData);

  // Loading state
  if (loading) {
    return (
      <div className="lead-time-tab fade-in">
        <div className="dashboard-header">
          <div className="header-info">
            <h1 className="dashboard-title">📊 Lead Time Analytics</h1>
            <p className="dashboard-subtitle">Analyzing production timelines and optimization opportunities...</p>
          </div>
        </div>
        
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <Clock size={48} style={{ color: '#6b7280', animation: 'pulse 2s infinite' }} />
          <p style={{ marginTop: '1rem', fontSize: '1.1rem' }}>Loading lead time analysis...</p>
          <div style={{ marginTop: '1rem' }}>
            <div className="loading-spinner" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="lead-time-tab fade-in">
        <div className="dashboard-header">
          <div className="header-info">
            <h1 className="dashboard-title">📊 Lead Time Analytics</h1>
            <p className="dashboard-subtitle">Optimize production timelines and identify improvement opportunities</p>
          </div>
        </div>
        
        <div className="no-data-state">
          <Clock size={64} className="no-data-icon" />
          <h3>Error Loading Lead Time Data</h3>
          <p className="error-message">Error: {error}</p>
          <p>Make sure the ETL process has been completed and lead time analysis is available.</p>
          <button 
            className="btn btn-primary" 
            onClick={fetchLeadTimeData}
            style={{ marginTop: '1rem' }}
          >
            <RefreshCw size={16} style={{ marginRight: '0.5rem' }} />
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  // Show empty state if no data
  if (!leadTimeData || safeLeadTimeData.length === 0) {
    return (
      <div className="lead-time-tab fade-in">
        <div className="dashboard-header">
          <div className="header-info">
            <h1 className="dashboard-title">📊 Lead Time Analytics</h1>
            <p className="dashboard-subtitle">Optimize production timelines and identify improvement opportunities</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-primary" onClick={fetchLeadTimeData}>
              <RefreshCw size={16} style={{ marginRight: '0.5rem' }} />
              Refresh Data
            </button>
          </div>
        </div>
        
        <div className="no-data-state">
          <Clock size={64} className="no-data-icon" />
          <h3>No Lead Time Data Available</h3>
          <p>No lead time analysis data found. This could mean:</p>
          <ul style={{ textAlign: 'left', maxWidth: '400px', margin: '1rem auto' }}>
            <li>ETL process hasn't been run yet</li>
            <li>Lead time analysis file is missing</li>
            <li>No items have been processed for analysis</li>
          </ul>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
            <button className="btn btn-primary" onClick={fetchLeadTimeData}>
              <RefreshCw size={16} style={{ marginRight: '0.5rem' }} />
              Retry Loading
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Rest of your existing component logic remains the same...
  // (Chart data, summary calculations, filtering, etc.)

  // Chart data for lead time comparison
  const chartData = safeLeadTimeData.slice(0, 10).map(item => ({
    name: item.item_code.length > 10 ? item.item_code.substring(0, 10) + '...' : item.item_code,
    current: item.current_days,
    optimized: item.optimized_days,
    savings: item.savings,
    efficiency: item.efficiency
  }));

  // Summary calculations
  const totalItems = safeLeadTimeData.length;
  const totalSavings = safeLeadTimeData.reduce((sum, item) => sum + item.savings, 0);
  const avgEfficiency = safeLeadTimeData.reduce((sum, item) => sum + item.efficiency, 0) / totalItems;
  const avgCurrentTime = safeLeadTimeData.reduce((sum, item) => sum + item.current_days, 0) / totalItems;
  const avgOptimizedTime = safeLeadTimeData.reduce((sum, item) => sum + item.optimized_days, 0) / totalItems;

  // Filter and sort data
  let filteredData = [...safeLeadTimeData];
  
  if (selectedCategory !== 'All Categories') {
    filteredData = filteredData.filter(item => item.category === selectedCategory);
  }
  
  if (selectedPriority !== 'All Priorities') {
    filteredData = filteredData.filter(item => item.priority === selectedPriority);
  }

  // Sort data
  filteredData.sort((a, b) => {
    const aValue = a[sortBy] || 0;
    const bValue = b[sortBy] || 0;
    return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
  });

  // Categories and priorities for filters
  const categories = ['All Categories', ...new Set(safeLeadTimeData.map(item => item.category).filter(Boolean))];
  const priorities = ['All Priorities', ...new Set(safeLeadTimeData.map(item => item.priority).filter(Boolean))];

  return (
    <div className="lead-time-tab fade-in">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-info">
          <h1 className="dashboard-title">📊 Lead Time Analytics</h1>
          <p className="dashboard-subtitle">Optimize production timelines and identify improvement opportunities</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-outline"
            onClick={fetchLeadTimeData}
          >
            <RefreshCw size={16} style={{ marginRight: '0.5rem' }} />
            Refresh
          </button>
          <button className="btn btn-outline">
            <Download size={16} style={{ marginRight: '0.5rem' }} />
            Export Data ({totalItems} items)
          </button>
          <button className="btn btn-primary">
            <Activity size={16} style={{ marginRight: '0.5rem' }} />
            Optimize All
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-icon" style={{backgroundColor: '#eff6ff'}}>
              <BarChart3 size={24} style={{color: '#2563eb'}} />
            </div>
            <TrendingUp size={16} className="trend-icon positive" />
          </div>
          <div className="metric-title">Total Items</div>
          <div className="metric-value">{totalItems.toLocaleString()}</div>
          <div className="metric-description">in analysis</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-icon" style={{backgroundColor: '#f0fdf4'}}>
              <Clock size={24} style={{color: '#16a34a'}} />
            </div>
            <TrendingDown size={16} className="trend-icon positive" />
          </div>
          <div className="metric-title">Total Time Savings</div>
          <div className="metric-value">{totalSavings.toFixed(1)}d</div>
          <div className="metric-description">potential reduction</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-icon" style={{backgroundColor: '#faf5ff'}}>
              <Target size={24} style={{color: '#9333ea'}} />
            </div>
            <TrendingUp size={16} className="trend-icon positive" />
          </div>
          <div className="metric-title">Avg Efficiency Gain</div>
          <div className="metric-value">{avgEfficiency.toFixed(1)}%</div>
          <div className="metric-description">improvement potential</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-icon" style={{backgroundColor: '#fff7ed'}}>
              <TrendingUp size={24} style={{color: '#ea580c'}} />
            </div>
            <TrendingDown size={16} className="trend-icon positive" />
          </div>
          <div className="metric-title">Lead Time Reduction</div>
          <div className="metric-value">{avgCurrentTime > 0 ? ((avgCurrentTime - avgOptimizedTime) / avgCurrentTime * 100).toFixed(1) : 0}%</div>
          <div className="metric-description">average reduction</div>
        </div>
      </div>

      {/* Rest of your existing JSX remains the same... */}
      {/* Filters */}
      <div className="filters-section">
        <h3 className="section-title">Analysis Filters</h3>
        <div className="filters-grid">
          <div className="filter-group">
            <label className="filter-label">Category</label>
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="filter-select"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Priority</label>
            <select 
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="filter-select"
            >
              {priorities.map(priority => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Sort By</label>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="savings">Time Savings</option>
              <option value="efficiency">Efficiency Gain</option>
              <option value="current_days">Current Lead Time</option>
              <option value="optimized_days">Optimized Lead Time</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Order</label>
            <select 
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="filter-select"
            >
              <option value="desc">Highest First</option>
              <option value="asc">Lowest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lead Time Optimization Chart */}
      <div className="chart-container">
        <div className="chart-header">
          <h3 className="chart-title">Lead Time Optimization Opportunities</h3>
          <div className="chart-legend-inline">
            <span className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#ef4444'}}></div>
              Current Lead Time
            </span>
            <span className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#10b981'}}></div>
              Optimized Lead Time
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              angle={-45} 
              textAnchor="end" 
              height={80}
              interval={0}
              stroke="#64748b"
            />
            <YAxis stroke="#64748b" />
            <Tooltip 
              formatter={(value, name) => [
                `${value} days`, 
                name === 'current' ? 'Current Lead Time' : 'Optimized Lead Time'
              ]}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Bar dataKey="current" name="current" fill="#ef4444" radius={[2, 2, 0, 0]} />
            <Bar dataKey="optimized" name="optimized" fill="#10b981" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Analysis Table */}
      <div className="analysis-section">
        <div className="section-header">
          <h3 className="section-title">Detailed Lead Time Analysis</h3>
          <div className="section-info">
            Showing {filteredData.length} of {totalItems} items
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Category</th>
                <th>Current Lead Time</th>
                <th>Optimized Lead Time</th>
                <th>Time Savings</th>
                <th>Efficiency Gain</th>
                <th>Priority</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item, index) => (
                <tr key={index}>
                  <td className="item-code">{item.item_code}</td>
                  <td className="category">{item.category}</td>
                  <td className="current-time">{item.current_days} days</td>
                  <td className="optimized-time">{item.optimized_days} days</td>
                  <td className="savings-value">{item.savings} days</td>
                  <td className="efficiency-gain">{item.efficiency.toFixed(1)}%</td>
                  <td>
                    <span className={`priority-badge priority-${item.priority?.toLowerCase()}`}>
                      {item.priority}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-outline">
                      Optimize
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
