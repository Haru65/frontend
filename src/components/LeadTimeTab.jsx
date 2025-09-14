import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  Clock, TrendingUp, TrendingDown, Filter, Download,
  AlertCircle, RefreshCw, Calendar, Eye, AlertTriangle, Package,
  MapPin, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Search, Activity, Target, Zap, Layers
} from 'lucide-react';
import "./LeadTime.css";

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function LeadTimeTab() {
  // State management
  const [leadTimeData, setLeadTimeData] = useState([]);
  const [allItemsData, setAllItemsData] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [realTimeData, setRealTimeData] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedPriority, setSelectedPriority] = useState('All Priorities');
  const [selectedStage, setSelectedStage] = useState('All Stages');
  const [selectedUrgency, setSelectedUrgency] = useState('All Urgency');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('lead_time_estimation');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalItems, setTotalItems] = useState(0);
  const [tableLoading, setTableLoading] = useState(false);

  // Utility functions
  const getCategoryFromStage = useCallback((stage) => {
    const stageMapping = {
      'WIP_MC': 'Machining Operations',
      'WIP_RAW': 'Raw Material Processing',
      'RFM': 'Ready for Machining',
      'RFD': 'Ready for Dispatch',
      'WIP_DM': 'Data Management'
    };
    return stageMapping[stage] || 'Other';
  }, []);

  // ✅ FIXED: Updated to handle backend 'urgency' field
  const getPriorityFromUrgency = useCallback((urgency) => {
    const priorityMapping = {
      'CRITICAL': 'Critical',
      'HIGH': 'High',
      'MEDIUM': 'Medium',
      'MID': 'Medium',
      'LOW': 'Low'
    };
    return priorityMapping[urgency] || urgency || 'Unknown';
  }, []);

  const getStageColor = useCallback((stage) => {
    const stageColors = {
      'WIP_MC': '#3B82F6',
      'WIP_RAW': '#F59E0B',
      'RFM': '#10B981',
      'RFD': '#8B5CF6',
      'WIP_DM': '#EF4444'
    };
    return stageColors[stage] || '#6B7280';
  }, []);

  // ✅ FIXED: Updated to handle MEDIUM instead of MID
  const getUrgencyColor = useCallback((urgency) => {
    const urgencyColors = {
      'CRITICAL': '#DC2626',
      'HIGH': '#EA580C',
      'MEDIUM': '#CA8A04',
      'MID': '#CA8A04',
      'LOW': '#059669'
    };
    return urgencyColors[urgency] || '#6B7280';
  }, []);

  // Calculate KPIs
  const calculateMetrics = useCallback(() => {
    if (dashboardData?.kpis) {
      return dashboardData.kpis;
    }

    const itemCount = totalItems || leadTimeData.length;
    const avgLeadTime = leadTimeData.length > 0 ?
      leadTimeData.reduce((sum, item) => sum + (item.current_lead_time || 0), 0) / leadTimeData.length : 0;

    // ✅ FIXED: Use 'urgency' field instead of 'urgency_tag'
    const criticalItems = leadTimeData.filter(item => item.urgency === 'CRITICAL').length;
    const onTrackItems = leadTimeData.filter(item => item.delay_status === 'On Track').length;
    const efficiencyRate = leadTimeData.length > 0 ? (onTrackItems / leadTimeData.length) * 100 : 0;

    return {
      avg_lead_time: avgLeadTime,
      critical_items: criticalItems,
      total_products: itemCount,
      efficiency_rate: efficiencyRate
    };
  }, [dashboardData, totalItems, leadTimeData]);

  // Fetch summary data
  const fetchSummaryData = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/active-lead-times`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && data.summary) {
          // ✅ FIXED: Handle urgency_distribution consistently
          const urgencyDist = data.summary.urgency_distribution || data.summary.urgency_tag_distribution || {};

          setDashboardData({
            kpis: {
              avg_lead_time: data.summary.avg_lead_time || 0,
              critical_items: data.summary.critical_jobs || urgencyDist.CRITICAL || 0,
              total_products: data.summary.total_jobs || 0,
              efficiency_rate: data.summary.total_jobs > 0 ?
                ((data.summary.total_jobs - (data.summary.overdue_jobs || 0)) / data.summary.total_jobs * 100) : 85
            },
            priority_distribution: urgencyDist,
            stage_distribution: data.summary.stage_distribution || {}
          });
          return data;
        }
      }
    } catch (e) {
      console.warn('Summary data not available:', e.message);
    }
    return null;
  }, []);

  // Fetch paginated data
  const fetchPaginatedData = useCallback(async (page = 1, pageSize = 50, filters = {}) => {
    setTableLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString()
      });

      if (filters.stage && filters.stage !== 'All Stages') {
        params.append('stage', filters.stage);
      }
      if (filters.urgency && filters.urgency !== 'All Urgency') {
        params.append('urgency', filters.urgency);
      }

      const url = `${API_BASE}/api/active-lead-times?${params}`;
      console.log('🔍 Fetching URL:', url);
      
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.status === 'success') {
        const processedData = result.data.map((item, index) => {
          const currentLT = parseFloat(item.lead_time_estimation || 5);
          const optimizedLT = item.can_parallelize ? currentLT * 0.7 : currentLT * 0.9;
          const timeSavings = currentLT - optimizedLT;
          const efficiencyGain = currentLT > 0 ? (timeSavings / currentLT * 100) : 0;

          // ✅ FIXED: Use 'urgency' field consistently
          const urgency = item.urgency || item.urgency_tag || 'LOW';
          
          return {
            id: (page - 1) * pageSize + index,
            product_id: `PRD-${String((page - 1) * pageSize + index + 1).padStart(4, '0')}`,
            item_code: item.item_code,
            item_name: item.item_name || item.item_code,
            stage: item.stage,
            process: item.process,
            category: item.category || getCategoryFromStage(item.stage),
            current_lead_time: currentLT,
            min_lead_time: optimizedLT,
            max_lead_time: currentLT * 1.2,
            optimized_lead_time: optimizedLT,
            time_savings_days: parseFloat(timeSavings.toFixed(1)),
            efficiency_gain_pct: parseFloat(efficiencyGain.toFixed(1)),
            quantity: parseInt(item.quantity || 0, 10),
            tonnage: parseFloat(item.tonnage || 0),
            aging: parseInt(item.aging || 0, 10),
            days_left: parseInt(item.days_left || 0, 10),
            delay_days: parseInt(item.delay_days || 0, 10),
            priority: getPriorityFromUrgency(urgency),
            status: item.delay_status,
            urgency: urgency,  // ✅ Use 'urgency' field
            urgency_tag: urgency,  // ✅ Keep for backward compatibility
            delay_status: item.delay_status,
            start_date: item.start_date,
            est_completion_date: item.est_completion_date,
            can_parallelize: item.can_parallelize,
            open_qty: parseInt(item.open_qty || 0, 10)
          };
        });

        console.log('📊 Sample processed item:', processedData[0]);
        console.log('🎯 Priority mapping test:', {
          'CRITICAL': getPriorityFromUrgency('CRITICAL'),
          'MEDIUM': getPriorityFromUrgency('MEDIUM'),
          'LOW': getPriorityFromUrgency('LOW')
        });

        setLeadTimeData(processedData);
        setTotalItems(result.summary?.total_jobs || result.pagination?.total_items || 0);
        setRealTimeData(true);

        return result;
      } else {
        throw new Error(result.message || 'Failed to fetch data');
      }
    } catch (e) {
      console.error('Pagination fetch error:', e);
      setError(e.message);
      return null;
    } finally {
      setTableLoading(false);
    }
  }, [getCategoryFromStage, getPriorityFromUrgency]);

  // Fetch all items summary
  const fetchAllItemsSummary = useCallback(async () => {
    try {
      const sampleResponse = await fetch(`${API_BASE}/api/active-lead-times?get_all=false&page=1&page_size=1000`);

      if (sampleResponse.ok) {
        const sampleResult = await sampleResponse.json();
        if (sampleResult.status === 'success') {
          const sampleData = sampleResult.data.map(item => {
            const urgency = item.urgency || item.urgency_tag || 'LOW';
            return {
              stage: item.stage,
              urgency: urgency,  // ✅ Use 'urgency' field
              urgency_tag: urgency,  // ✅ Keep for compatibility
              category: item.category || getCategoryFromStage(item.stage),
              priority: getPriorityFromUrgency(urgency)
            };
          });

          setAllItemsData(sampleData);
          if (sampleResult.summary) {
            setTotalItems(sampleResult.summary.total_jobs || 0);
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch sample data for filters:', e.message);
    }
  }, [getCategoryFromStage, getPriorityFromUrgency]);

  // Main data fetch
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const healthResponse = await fetch(`${API_BASE}/health`);
      if (!healthResponse.ok) {
        throw new Error('Backend server is not responding');
      }

      await fetchSummaryData();
      await fetchAllItemsSummary();
      await fetchPaginatedData(1, itemsPerPage, {
        stage: selectedStage,
        urgency: selectedUrgency
      });

      setLastUpdated(new Date());
    } catch (e) {
      console.error('Data fetch error:', e);
      setError(e.message);
      setRealTimeData(false);
    } finally {
      setLoading(false);
    }
  }, [fetchSummaryData, fetchAllItemsSummary, fetchPaginatedData, itemsPerPage, selectedStage, selectedUrgency]);

  // Effects
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    if (!loading) {
      setCurrentPage(1);
      fetchPaginatedData(1, itemsPerPage, {
        stage: selectedStage,
        urgency: selectedUrgency
      });
    }
  }, [selectedStage, selectedUrgency, itemsPerPage, fetchPaginatedData, loading]);

  useEffect(() => {
    if (!loading && currentPage > 1) {
      fetchPaginatedData(currentPage, itemsPerPage, {
        stage: selectedStage,
        urgency: selectedUrgency
      });
    }
  }, [currentPage, fetchPaginatedData, itemsPerPage, selectedStage, selectedUrgency, loading]);

  // ✅ FIXED: Reset to page 1 when search changes
  useEffect(() => {
    if (searchTerm && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchTerm, currentPage]);

  const metrics = calculateMetrics();

  // Prepare chart data
  const priorityData = dashboardData?.priority_distribution || {};
  const priorityChartData = [
    { name: 'Critical', value: priorityData.CRITICAL || 0, color: '#DC2626' },
    { name: 'High', value: priorityData.HIGH || 0, color: '#EA580C' },
    { name: 'Medium', value: priorityData.MEDIUM || priorityData.MID || 0, color: '#CA8A04' },
    { name: 'Low', value: priorityData.LOW || 0, color: '#059669' }
  ].filter(item => item.value > 0);

  const stageData = dashboardData?.stage_distribution || {};
  const stageChartData = Object.entries(stageData).map(([stage, count]) => ({
    category: getCategoryFromStage(stage),
    stage: stage,
    count: count,
    color: getStageColor(stage)
  }));

  // ✅ FIXED: Proper filtering logic with all criteria
  const filteredData = leadTimeData.filter(item => {
    const matchesSearch = !searchTerm || 
      item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.process.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All Categories' || 
      item.category === selectedCategory;
    
    const matchesPriority = selectedPriority === 'All Priorities' || 
      item.priority === selectedPriority;
      
    return matchesSearch && matchesCategory && matchesPriority;
  });

  // ✅ FIXED: Use actual current data for filter options
  const stages = ['All Stages', ...new Set([
    ...leadTimeData.map(item => item.stage),
    ...allItemsData.map(item => item.stage)
  ].filter(Boolean))];
  
  const urgencies = ['All Urgency', ...new Set([
    ...leadTimeData.map(item => item.urgency),
    ...allItemsData.map(item => item.urgency)
  ].filter(Boolean))];
  
  const categories = ['All Categories', ...new Set([
    ...leadTimeData.map(item => item.category),
    ...allItemsData.map(item => item.category)
  ].filter(Boolean))];
  
  const priorities = ['All Priorities', ...new Set([
    ...leadTimeData.map(item => item.priority),
    ...allItemsData.map(item => item.priority)
  ].filter(Boolean))];

  // Pagination
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Pagination controls
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToPreviousPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  // Export CSV
  const exportToExcel = useCallback(async () => {
    try {
      setLoading(true);
      if (leadTimeData.length === 0) {
        setError('No data to export');
        return;
      }

      const exportData = leadTimeData.map((item) => ({
        'Product ID': item.product_id,
        'Item Code': item.item_code,
        'Item Name': item.item_name,
        'Stage': item.stage,
        'Process': item.process,
        'Category': item.category,
        'Lead Time (days)': item.current_lead_time,
        'Quantity': item.quantity,
        'Tonnage': item.tonnage,
        'Aging (days)': item.aging,
        'Days Left': item.days_left,
        'Delay Days': item.delay_days,
        'Priority': item.priority,
        'Urgency': item.urgency,  // ✅ Use 'urgency' field
        'Status': item.delay_status,
        'Start Date': item.start_date,
        'Est Completion': item.est_completion_date,
        'Can Parallelize': item.can_parallelize ? 'Yes' : 'No',
        'Open Qty': item.open_qty
      }));

      const headers = Object.keys(exportData[0]);
      const csvContent = [
        headers.join(','),
        ...exportData.map(row =>
          headers.map(header => `"${row[header] || ''}"`).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `production-lead-time-analysis-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log(`Exported ${exportData.length} items to CSV`);
    } catch (err) {
      setError(`Export failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [leadTimeData]);

  // Loading, error states
  if (loading && leadTimeData.length === 0) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading production lead time analytics...</p>
        <p className="loading-subtext">Fetching {totalItems > 0 ? `${totalItems.toLocaleString()} items` : 'all items'} from database...</p>
      </div>
    );
  }

  if (error && leadTimeData.length === 0) {
    return (
      <div className="error-container">
        <div className="error-content">
          <div className="error-header">
            <AlertCircle className="icon-lg icon-error" />
            <h3>Connection Error</h3>
          </div>
          <p className="error-text">{error}</p>
          <button onClick={fetchAllData} className="btn btn-retry">
            <RefreshCw className="icon-sm" />
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lead-time-tab">

      {/* Header */}
      <div className="header-section">
        <div className="header-flex">
          <div>
            <h1><Clock className="icon-lg icon-primary" /> Production Lead Time Analytics</h1>
            <p>
              Monitor and optimize your production lead times with real-time data
              {realTimeData ? (
                <span className="data-badge live-data">
                  <span className="live-dot"></span>
                  Live Data - {totalItems.toLocaleString()} Items
                </span>
              ) : (
                <span className="data-badge sample-data">No Data</span>
              )}
            </p>
            {lastUpdated && <p className="last-updated"><Calendar className="icon-xs" /> Last updated: {lastUpdated.toLocaleString()}</p>}
          </div>
          <div className="header-actions">
            <button onClick={fetchAllData} className="btn btn-primary" disabled={loading}>
              <RefreshCw className={`icon-sm ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button onClick={exportToExcel} className="btn btn-export" disabled={loading}>
              <Download className="icon-sm" /> Export CSV
            </button>
          </div>
        </div>
        {error && (
          <div className="warning-box">
            <div className="warning-flex">
              <AlertCircle className="icon" />
              <span>Warning: {error}. Showing available data.</span>
            </div>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="metrics-grid">
        <div className="metric-box enhanced">
          <div className="metric-icon-wrapper blue"><Clock className="icon" /></div>
          <div className="metric-content">
            <label>Average Lead Time</label>
            <div className="metric-value">{metrics.avg_lead_time?.toFixed(1) || 0} days</div>
            <span className="metric-change decrease"><TrendingDown className="icon-xs" /> Optimized</span>
          </div>
        </div>

        <div className="metric-box enhanced">
          <div className="metric-icon-wrapper red"><AlertTriangle className="icon" /></div>
          <div className="metric-content">
            <label>Critical Items</label>
            <div className="metric-value">{metrics.critical_items || 0}</div>
            <span className="metric-change neutral"><Activity className="icon-xs" /> Active</span>
          </div>
        </div>

        <div className="metric-box enhanced">
          <div className="metric-icon-wrapper green"><Package className="icon" /></div>
          <div className="metric-content">
            <label>Total Products</label>
            <div className="metric-value">{metrics.total_products?.toLocaleString() || 0}</div>
            <span className="metric-change increase"><TrendingUp className="icon-xs" /> Growing</span>
          </div>
        </div>

        <div className="metric-box enhanced">
          <div className="metric-icon-wrapper purple"><Target className="icon" /></div>
          <div className="metric-content">
            <label>Efficiency Rate</label>
            <div className="metric-value">{metrics.efficiency_rate?.toFixed(0) || 0}%</div>
            <span className="metric-change increase"><Zap className="icon-xs" /> Improving</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-box enhanced">
          <div className="chart-header">
            <h3><AlertTriangle className="icon-sm" /> Priority Distribution</h3>
            <span className="chart-subtitle">Current workload by urgency</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={priorityChartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {priorityChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [value.toLocaleString(), name]} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-box enhanced">
          <div className="chart-header">
            <h3><Layers className="icon-sm" /> Production Stages</h3>
            <span className="chart-subtitle">Items across manufacturing stages</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stageChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="stage" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value, name) => [value.toLocaleString(), 'Items']}
                labelFormatter={(label) => `Stage: ${label}`}
              />
              <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section enhanced">
        <div className="filters-header">
          <div className="filter-title">
            <Filter className="icon" />
            <span>Filters & Search</span>
          </div>
          <div className="filter-info">
            Showing {startItem.toLocaleString()}-{endItem.toLocaleString()} of {totalItems.toLocaleString()} items
            {searchTerm && <span className="search-info"> (filtered by: "{searchTerm}")</span>}
          </div>
        </div>
        <div className="filters-content">
          <div className="search-box">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search by item code, name, or process..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="search-clear"
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>
          <div className="filter-selects">
            <select
              value={selectedStage}
              onChange={e => setSelectedStage(e.target.value)}
              className="select enhanced"
            >
              {stages.map(stage => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
            <select
              value={selectedUrgency}
              onChange={e => setSelectedUrgency(e.target.value)}
              className="select enhanced"
            >
              {urgencies.map(urgency => (
                <option key={urgency} value={urgency}>{urgency}</option>
              ))}
            </select>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="select enhanced"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <select
              value={selectedPriority}
              onChange={e => setSelectedPriority(e.target.value)}
              className="select enhanced"
            >
              {priorities.map(priority => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>
            <select
              value={itemsPerPage}
              onChange={e => setItemsPerPage(parseInt(e.target.value))}
              className="select enhanced"
            >
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
              <option value={200}>200 per page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-section enhanced">
        <div className="table-header">
          <h3><Eye className="icon-sm" /> Production Items</h3>
          <div className="table-meta">
            {filteredData.length !== leadTimeData.length && (
              <span className="filtered-count">
                {filteredData.length} of {leadTimeData.length} items shown
              </span>
            )}
            {tableLoading && (
              <div className="table-loading">
                <RefreshCw className="icon-sm animate-spin" /> Loading...
              </div>
            )}
          </div>
        </div>
        <div className="table-container-scrollable">
          <table className="data-table enhanced">
            <thead>
              <tr>
                <th>Product ID</th>
                <th>Item Code</th>
                <th>Name</th>
                <th>Stage</th>
                <th>Process</th>
                <th>Lead Time</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Quantity</th>
                <th>Open Qty</th>
                <th>Aging</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item, index) => (
                <tr key={item.id} className={`table-row ${index % 2 === 0 ? 'row-even' : 'row-odd'}`}>
                  <td className="product-id">{item.product_id}</td>
                  <td className="item-code"><code>{item.item_code}</code></td>
                  <td className="item-name" title={item.item_name}>
                    {item.item_name.length > 30 ? `${item.item_name.substring(0, 30)}...` : item.item_name}
                  </td>
                  <td>
                    <span 
                      className="badge stage-badge"
                      style={{ backgroundColor: getStageColor(item.stage), color: 'white' }}
                    >
                      {item.stage}
                    </span>
                  </td>
                  <td className="process-name" title={item.process}>
                    {item.process.length > 20 ? `${item.process.substring(0, 20)}...` : item.process}
                  </td>
                  <td>
                    <div className="lead-time-cell">
                      <span className={`lead-time-value ${
                        item.current_lead_time >= 15 ? 'high'
                          : item.current_lead_time >= 10 ? 'medium'
                          : 'low'
                      }`}>
                        {item.current_lead_time} days
                      </span>
                    </div>
                  </td>
                  <td>
                    {/* ✅ FIXED: Use 'urgency' field consistently */}
                    <span 
                      className="badge priority-badge"
                      style={{ backgroundColor: getUrgencyColor(item.urgency), color: 'white' }}
                      title={`Urgency: ${item.urgency}`}
                    >
                      {item.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`badge status-badge ${
                      item.delay_status === 'Overdue' ? 'status-overdue'
                        : item.delay_status === 'Due Soon' ? 'status-due-soon'
                        : 'status-on-track'
                    }`}>
                      {item.delay_status}
                    </span>
                  </td>
                  <td className="quantity-cell">
                    {item.quantity.toLocaleString()}
                    {item.tonnage > 0 && (
                      <div className="tonnage-info">
                        {item.tonnage}T
                      </div>
                    )}
                  </td>
                  <td className="open-qty-cell">
                    {item.open_qty > 0 ? (
                      <span className="open-qty-value">{item.open_qty.toLocaleString()}</span>
                    ) : (
                      <span className="no-open-qty">-</span>
                    )}
                  </td>
                  <td className="aging-cell">
                    <span className={`aging-value ${
                      item.aging > 30 ? 'aging-high'
                        : item.aging > 14 ? 'aging-medium'
                        : 'aging-low'
                    }`}>
                      {item.aging} days
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="pagination-section enhanced">
          <div className="pagination-info">
            <MapPin className="icon-xs" />
            Page {currentPage} of {totalPages} ({totalItems.toLocaleString()} total items)
          </div>
          <div className="pagination-controls">
            <button 
              onClick={goToFirstPage} 
              disabled={currentPage === 1 || tableLoading}
              className="btn btn-pagination"
              title="First page"
            >
              <ChevronsLeft className="icon-sm" />
            </button>
            <button 
              onClick={goToPreviousPage} 
              disabled={currentPage === 1 || tableLoading}
              className="btn btn-pagination"
              title="Previous page"
            >
              <ChevronLeft className="icon-sm" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              if (pageNum <= totalPages) {
                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    disabled={tableLoading}
                    className={`btn btn-pagination ${currentPage === pageNum ? 'active' : ''}`}
                  >
                    {pageNum}
                  </button>
                );
              }
              return null;
            })}
            <button 
              onClick={goToNextPage} 
              disabled={currentPage === totalPages || tableLoading}
              className="btn btn-pagination"
              title="Next page"
            >
              <ChevronRight className="icon-sm" />
            </button>
            <button 
              onClick={goToLastPage} 
              disabled={currentPage === totalPages || tableLoading}
              className="btn btn-pagination"
              title="Last page"
            >
              <ChevronsRight className="icon-sm" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
