import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  Clock, 
  Gauge, 
  Zap, 
  Target, 
  TrendingUp, 
  Factory, 
  Filter,
  Download,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

export default function ParallelizationTab() {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'EFFICIENCY_GAIN_PCT', direction: 'desc' });
  const [filterConfig, setFilterConfig] = useState({
    urgency: 'all',
    minEfficiency: 0,
    minTimeSaved: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPairs, setSelectedPairs] = useState(new Set());

  const fetchOptimizedParallelization = useCallback(async () => {
  try {
    setLoading(true);
    setError(null);
    
    console.log('📡 Making request to /optimized-parallelization');
    const response = await fetch('https://backend-1-n2xg.onrender.com/optimized-parallelization');
    
    // Get raw response for debugging
    const responseText = await response.text();
    console.log('Raw response:', responseText.substring(0, 200));
    
    if (!response.ok) {
      throw new Error(`Server error (${response.status}): ${responseText}`);
    }
    
    // Try to parse JSON
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON parse failed. Response was:', responseText);
      throw new Error(`Server returned invalid JSON: ${responseText.substring(0, 100)}...`);
    }
    
    console.log('Parsed data:', result);
    
    if (result.status === 'error') {
      setError(result.error || 'Server returned error status');
      return;
    }
    
    // Set data
    const validData = Array.isArray(result.data) ? result.data.filter(item => 
      item && typeof item === 'object' && item.ITEM_1 && item.ITEM_2
    ) : [];
    
    setData(validData);
    setSummary(result.summary || {
      total_pairs_analyzed: 0,
      parallelizable_pairs: 0,
      total_time_savings: 0,
      avg_efficiency_gain: 0,
      top_efficiency_gain: 0
    });
    
  } catch (e) {
    console.error("Fetch failed:", e);
    setError(`Failed to load data: ${e.message}`);
  } finally {
    setLoading(false);
  }
}, []);


  useEffect(() => {
    fetchOptimizedParallelization();
  }, [fetchOptimizedParallelization]);

  // Enhanced filtering and sorting
  const filteredAndSortedData = useMemo(() => {
    let filtered = data.filter(item => {
      if (!item.CAN_RUN_PARALLEL) return false;
      
      // Search filter
      if (searchTerm && !`${item.ITEM_1} ${item.ITEM_2}`.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Urgency filter
      if (filterConfig.urgency !== 'all') {
        const hasUrgency = item.ITEM_1_URGENCY === filterConfig.urgency || 
                          item.ITEM_2_URGENCY === filterConfig.urgency;
        if (!hasUrgency) return false;
      }
      
      // Efficiency filter
      if (item.EFFICIENCY_GAIN_PCT < filterConfig.minEfficiency) return false;
      
      // Time saved filter
      if (item.TIME_SAVED_DAYS < filterConfig.minTimeSaved) return false;
      
      return true;
    });

    // Sort data
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        
        if (sortConfig.direction === 'asc') {
          return aStr.localeCompare(bStr);
        }
        return bStr.localeCompare(aStr);
      });
    }

    return filtered;
  }, [data, searchTerm, sortConfig, filterConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleSelectPair = (index, checked) => {
    const newSelected = new Set(selectedPairs);
    if (checked) {
      newSelected.add(index);
    } else {
      newSelected.delete(index);
    }
    setSelectedPairs(newSelected);
  };

  const exportSelectedPairs = () => {
    const selectedData = filteredAndSortedData.filter((_, index) => selectedPairs.has(index));
    const csvContent = [
      'Item 1,Item 2,Item 1 Urgency,Item 2 Urgency,Machine 1,Machine 2,Sequential Time,Parallel Time,Time Saved,Efficiency Gain',
      ...selectedData.map(pair => 
        `${pair.ITEM_1},${pair.ITEM_2},${pair.ITEM_1_URGENCY},${pair.ITEM_2_URGENCY},${pair.ITEM_1_MACHINES},${pair.ITEM_2_MACHINES},${pair.SEQUENTIAL_TIME_DAYS},${pair.PARALLEL_TIME_DAYS},${pair.TIME_SAVED_DAYS},${pair.EFFICIENCY_GAIN_PCT}`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parallelization-opportunities-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="parallel-tab fade-in">
        <div className="dashboard-header">
          <div className="header-info">
            <h1 className="dashboard-title">🔄 Optimized Parallelization Opportunities</h1>
            <p className="dashboard-subtitle">Items that can run simultaneously to maximize efficiency</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <Factory size={48} style={{ color: '#6b7280', animation: 'pulse 2s infinite' }} />
          <p style={{ marginTop: '1rem', fontSize: '1.1rem' }}>Analyzing parallelization opportunities...</p>
          <div style={{ marginTop: '1rem' }}>
            <div className="loading-spinner" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="parallel-tab fade-in">
        <div className="dashboard-header">
          <div className="header-info">
            <h1 className="dashboard-title">🔄 Optimized Parallelization Opportunities</h1>
            <p className="dashboard-subtitle">Items that can run simultaneously to maximize efficiency</p>
          </div>
        </div>
        <div className="no-data-state">
          <AlertTriangle size={64} className="no-data-icon" style={{ color: '#ef4444' }} />
          <h3>Error Loading Parallelization Data</h3>
          <p className="error-message">Error: {error}</p>
          <p>Make sure you've run the ETL process first to generate the analysis.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
            <button 
              className="btn btn-primary" 
              onClick={fetchOptimizedParallelization}
            >
              <RefreshCw size={16} style={{ marginRight: '0.5rem' }} />
              Retry Analysis
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (filteredAndSortedData.length === 0) {
    return (
      <div className="parallel-tab fade-in">
        <div className="dashboard-header">
          <div className="header-info">
            <h1 className="dashboard-title">🔄 Optimized Parallelization Opportunities</h1>
            <p className="dashboard-subtitle">Items that can run simultaneously to maximize efficiency</p>
          </div>
        </div>
        <div className="no-data-state">
          <Zap size={64} className="no-data-icon" />
          <h3>No Parallelizable Item Pairs Found</h3>
          <p>
            {data.length === 0 
              ? 'All items may have resource conflicts or analysis data is not available.'
              : 'No pairs match your current filter criteria.'
            }
          </p>
          <p>Total pairs analyzed: {summary.total_pairs_analyzed || 0}</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
            <button 
              className="btn btn-primary" 
              onClick={fetchOptimizedParallelization}
            >
              <RefreshCw size={16} style={{ marginRight: '0.5rem' }} />
              Retry Analysis
            </button>
            {data.length > 0 && (
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setSearchTerm('');
                  setFilterConfig({ urgency: 'all', minEfficiency: 0, minTimeSaved: 0 });
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="parallel-tab fade-in">
      <div className="dashboard-header">
        <div className="header-info">
          <h1 className="dashboard-title">🔄 Optimized Parallelization Opportunities</h1>
          <p className="dashboard-subtitle">Items that can run simultaneously to maximize efficiency</p>
        </div>
        <div className="dashboard-actions">
          <button 
            className="btn btn-outline"
            onClick={fetchOptimizedParallelization}
            disabled={loading}
          >
            <RefreshCw size={16} style={{ marginRight: '0.5rem' }} />
            Refresh
          </button>
          {selectedPairs.size > 0 && (
            <button 
              className="btn btn-primary"
              onClick={exportSelectedPairs}
            >
              <Download size={16} style={{ marginRight: '0.5rem' }} />
              Export Selected ({selectedPairs.size})
            </button>
          )}
        </div>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="metrics-grid" style={{ marginBottom: '2rem' }}>
        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-icon" style={{ backgroundColor: '#e0f2fe' }}>
              <Target size={24} style={{ color: '#0369a1' }} />
            </div>
            <span className="metric-change positive">{summary.parallelizable_pairs || 0}</span>
          </div>
          <div className="metric-title">Parallelizable Pairs</div>
          <div className="metric-value">{summary.parallelizable_pairs || 0}</div>
          <div className="metric-description">can run simultaneously</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-icon" style={{ backgroundColor: '#f0fdf4' }}>
              <Clock size={24} style={{ color: '#16a34a' }} />
            </div>
            <span className="metric-change positive">+{(summary.total_time_savings || 0).toFixed(1)}d</span>
          </div>
          <div className="metric-title">Total Time Savings</div>
          <div className="metric-value">{(summary.total_time_savings || 0).toFixed(1)} days</div>
          <div className="metric-description">potential reduction</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-icon" style={{ backgroundColor: '#fef3c7' }}>
              <TrendingUp size={24} style={{ color: '#d97706' }} />
            </div>
            <span className="metric-change positive">+{(summary.avg_efficiency_gain || 0).toFixed(1)}%</span>
          </div>
          <div className="metric-title">Avg Efficiency Gain</div>
          <div className="metric-value">{(summary.avg_efficiency_gain || 0).toFixed(1)}%</div>
          <div className="metric-description">average improvement</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-icon" style={{ backgroundColor: '#fef2f2' }}>
              <Gauge size={24} style={{ color: '#dc2626' }} />
            </div>
            <span className="metric-change positive">{(summary.top_efficiency_gain || 0).toFixed(1)}%</span>
          </div>
          <div className="metric-title">Max Efficiency Gain</div>
          <div className="metric-value">{(summary.top_efficiency_gain || 0).toFixed(1)}%</div>
          <div className="metric-description">best opportunity</div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="controls-section" style={{ marginBottom: '2rem' }}>
        <div className="search-container">
          <Search size={20} style={{ color: '#6b7280' }} />
          <input
            type="text"
            placeholder="Search by item codes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <button 
          className="btn btn-outline"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={16} style={{ marginRight: '0.5rem' }} />
          Filters
          {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {showFilters && (
        <div className="filters-panel" style={{ marginBottom: '2rem' }}>
          <div className="filter-group">
            <label>Urgency Level</label>
            <select 
              value={filterConfig.urgency}
              onChange={(e) => setFilterConfig(prev => ({ ...prev, urgency: e.target.value }))}
            >
              <option value="all">All Urgencies</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Min Efficiency Gain (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={filterConfig.minEfficiency}
              onChange={(e) => setFilterConfig(prev => ({ ...prev, minEfficiency: Number(e.target.value) }))}
            />
          </div>
          
          <div className="filter-group">
            <label>Min Time Saved (days)</label>
            <input
              type="number"
              min="0"
              value={filterConfig.minTimeSaved}
              onChange={(e) => setFilterConfig(prev => ({ ...prev, minTimeSaved: Number(e.target.value) }))}
            />
          </div>
          
          <button 
            className="btn btn-secondary"
            onClick={() => {
              setFilterConfig({ urgency: 'all', minEfficiency: 0, minTimeSaved: 0 });
              setSearchTerm('');
            }}
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Enhanced Parallelizable Pairs Table */}
      <div className="table-section">
        <div className="section-header">
          <h3 className="section-title">🎯 Parallelizable Item Pairs</h3>
          <div className="status-summary">
            <span className="status-count success">
              <CheckCircle size={16} />
              {filteredAndSortedData.length} Parallelizable Pairs
            </span>
            <span className="status-count info">{summary.total_pairs_analyzed || 0} Total Analyzed</span>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPairs(new Set(filteredAndSortedData.map((_, i) => i)));
                      } else {
                        setSelectedPairs(new Set());
                      }
                    }}
                    checked={selectedPairs.size === filteredAndSortedData.length && filteredAndSortedData.length > 0}
                  />
                </th>
                <th onClick={() => handleSort('ITEM_1')} className="sortable">
                  Item 1 {getSortIcon('ITEM_1')}
                </th>
                <th onClick={() => handleSort('ITEM_2')} className="sortable">
                  Item 2 {getSortIcon('ITEM_2')}
                </th>
                <th>Urgency</th>
                <th>Machine 1</th>
                <th>Machine 2</th>
                <th onClick={() => handleSort('SEQUENTIAL_TIME_DAYS')} className="sortable">
                  Sequential Time (d) {getSortIcon('SEQUENTIAL_TIME_DAYS')}
                </th>
                <th onClick={() => handleSort('PARALLEL_TIME_DAYS')} className="sortable">
                  Parallel Time (d) {getSortIcon('PARALLEL_TIME_DAYS')}
                </th>
                <th onClick={() => handleSort('TIME_SAVED_DAYS')} className="sortable">
                  Time Saved (d) {getSortIcon('TIME_SAVED_DAYS')}
                </th>
                <th onClick={() => handleSort('EFFICIENCY_GAIN_PCT')} className="sortable">
                  Efficiency Gain {getSortIcon('EFFICIENCY_GAIN_PCT')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedData.map((pair, index) => (
                <tr key={`${pair.ITEM_1}-${pair.ITEM_2}-${index}`} className={selectedPairs.has(index) ? 'selected' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedPairs.has(index)}
                      onChange={(e) => handleSelectPair(index, e.target.checked)}
                    />
                  </td>
                  <td className="item-code">{pair.ITEM_1}</td>
                  <td className="item-code">{pair.ITEM_2}</td>
                  <td>
                    <div className="urgency-stack">
                      <span className={`status-badge status-${getUrgencyClass(pair.ITEM_1_URGENCY)}`}>
                        {pair.ITEM_1_URGENCY}
                      </span>
                      <span className={`status-badge status-${getUrgencyClass(pair.ITEM_2_URGENCY)}`}>
                        {pair.ITEM_2_URGENCY}
                      </span>
                    </div>
                  </td>
                  <td className="machine-code">{pair.ITEM_1_MACHINES || 'General'}</td>
                  <td className="machine-code">{pair.ITEM_2_MACHINES || 'General'}</td>
                  <td className="time-value">{pair.SEQUENTIAL_TIME_DAYS}</td>
                  <td className="time-value parallel-time">{pair.PARALLEL_TIME_DAYS}</td>
                  <td className="time-value time-saved">
                    <strong>+{pair.TIME_SAVED_DAYS}</strong>
                  </td>
                  <td className="efficiency-value">
                    <strong>+{pair.EFFICIENCY_GAIN_PCT.toFixed(1)}%</strong>
                    <div className="efficiency-bar">
                      <div 
                        className="efficiency-fill" 
                        style={{ width: `${Math.min(pair.EFFICIENCY_GAIN_PCT, 100)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  function getSortIcon(key) {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  }
}

// Enhanced helper function for urgency styling
function getUrgencyClass(urgency) {
  if (!urgency) return 'normal';
  switch (urgency.toUpperCase()) {
    case 'CRITICAL': return 'critical';
    case 'HIGH': return 'warning';
    case 'MEDIUM': return 'info';
    case 'LOW': return 'success';
    default: return 'normal';
  }
}
