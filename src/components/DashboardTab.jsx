import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  Package, Clock, AlertCircle, TrendingUp, Target,
  Gauge, Factory, Zap
} from 'lucide-react';

const numberOrZero = (v) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const toFixedSafe = (v, d = 1) => {
  const n = numberOrZero(v);
  return n.toFixed(d);
};

function DashboardTab({ data, stockData }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [stockDataState, setStockDataState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeJobFilter, setActiveJobFilter] = useState(null);

  useEffect(() => {
    const ac = new AbortController();

    const fetchJSON = async (url) => {
      const res = await fetch(url, {
        signal: ac.signal,
        // credentials/config if needed: credentials: 'include',
        headers: { 'Accept': 'application/json' },
      });
      // Explicit HTTP error handling; fetch resolves on 4xx/5xx
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${res.statusText} at ${url}: ${text?.slice(0, 200)}`);
      }
      return res.json();
    };

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [dashboardDataFetched, stockDataFetched] = await Promise.all([
          fetchJSON('http://localhost:8000/dashboard-summary'),
          fetchJSON('http://localhost:8000/stock-vs-demand'),
        ]);

        setDashboardData(dashboardDataFetched);
        setStockDataState(stockDataFetched);
      } catch (err) {
        if (err.name === 'AbortError') return;
        // Helpful CORS/network hint
        const hint = err.message.includes('TypeError') || err.message.includes('Failed to fetch')
          ? 'Possible network/CORS issue. Confirm FastAPI CORS allow_origins includes your frontend origin.'
          : '';
        setError(`${err.message}${hint ? ` • ${hint}` : ''}`);
        // Log for deeper debugging in dev tools/Sentry
        // console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    return () => ac.abort();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-tab fade-in">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Production Dashboard</h1>
          <p className="dashboard-subtitle">Loading dashboard data...</p>
        </div>
        <div className="no-data-state">
          <Factory size={64} className="no-data-icon spinning" />
          <h3>Loading Dashboard...</h3>
          <p>Fetching production metrics and analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-tab fade-in">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Production Dashboard</h1>
          <p className="dashboard-subtitle">Connection Error</p>
        </div>
        <div className="no-data-state">
          <AlertCircle size={64} className="no-data-icon" style={{ color: '#ef4444' }} />
          <h3>Backend Connection Failed</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>Error: {error}</p>
          <div style={{ textAlign: 'left', marginTop: '1rem' }}>
            <p><strong>Check these steps:</strong></p>
            <p>1. Is FastAPI running on port 8000 with proper CORS allow_origins for the frontend origin? e.g., http://localhost:3000</p>
            <p>2. Have you run the ETL pipeline with Excel files?</p>
            <p>3. Are /dashboard-summary and /stock-vs-demand returning JSON 200?</p>
          </div>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Normalize summary shape
  const summaryRoot = dashboardData?.summary || dashboardData || {};
  const summaryData = typeof summaryRoot === 'object' && summaryRoot ? summaryRoot : {};

  // Normalize stock shape
  const processedStockData = Array.isArray(stockDataState?.data)
    ? stockDataState.data
    : Array.isArray(stockDataState)
      ? stockDataState
      : Array.isArray(stockData)
        ? stockData
        : [];

  const criticalItems = processedStockData.filter(item => item?.STOCK_ADEQUACY === 'Out of Stock');
  const shortageItems = processedStockData.filter(item => item?.STOCK_ADEQUACY === 'Shortage');

  const stockCounts = {
    out_of_stock: numberOrZero(summaryData.stock?.out_of_stock),
    shortage: numberOrZero(summaryData.stock?.shortage),
    adequate: numberOrZero(summaryData.stock?.adequate),
    excess: numberOrZero(summaryData.stock?.excess),
  };

  const stockChartData = [
    { name: 'Out of Stock', value: stockCounts.out_of_stock, color: '#ef4444' },
    { name: 'Shortage', value: stockCounts.shortage, color: '#f97316' },
    { name: 'Adequate', value: stockCounts.adequate, color: '#10b981' },
    { name: 'Excess', value: stockCounts.excess, color: '#3b82f6' },
  ];

  const machineData = [
    { name: 'Overloaded', count: numberOrZero(summaryData.machines?.overloaded), color: '#ef4444' },
    { name: 'High Load', count: numberOrZero(summaryData.machines?.high_load), color: '#f97316' },
    { name: 'Medium Load', count: numberOrZero(summaryData.machines?.medium_load), color: '#eab308' },
    { name: 'Available', count: numberOrZero(summaryData.machines?.available), color: '#10b981' }
  ];

  const jobSummary = summaryData.jobs || {};
  const jobUrgency = jobSummary.by_urgency || {};
  const jobStages = jobSummary.by_stage || {};
  const allJobs = Array.isArray(jobSummary.all_jobs) ? jobSummary.all_jobs : [];

  const jobUrgencyChart = [
    { name: 'Critical', value: numberOrZero(jobUrgency.CRITICAL), color: '#dc2626' },
    { name: 'High', value: numberOrZero(jobUrgency.HIGH), color: '#f97316' },
    { name: 'Medium', value: numberOrZero(jobUrgency.MEDIUM), color: '#facc15' },
    { name: 'Low', value: numberOrZero(jobUrgency.LOW), color: '#10b981' }
  ];

  let filteredJobs = allJobs;
  if (activeJobFilter === 'RFM') {
    filteredJobs = allJobs.filter((j) => j?.STAGE === 'RFM');
  } else if (activeJobFilter === 'RFD') {
    filteredJobs = allJobs.filter((j) => j?.STAGE === 'RFD');
  } else if (activeJobFilter === 'CRITICAL') {
    filteredJobs = allJobs.filter((j) => j?.URGENCY === 'CRITICAL');
  }

  const productionTrend = [
    { day: 'Mon', fulfilled: 85, target: 90 },
    { day: 'Tue', fulfilled: 78, target: 90 },
    { day: 'Wed', fulfilled: 82, target: 90 },
    { day: 'Thu', fulfilled: 75, target: 90 },
    { day: 'Fri', fulfilled: 88, target: 90 },
    { day: 'Sat', fulfilled: 72, target: 85 },
    { day: 'Sun', fulfilled: 68, target: 80 },
  ];

  const resetOrApplyFilter = (filterName) => {
    setActiveJobFilter((prev) => (prev === filterName ? null : filterName));
  };

  return (
    <div className="dashboard-tab fade-in">
      <div className="dashboard-header">
        <div className="header-info">
          <h1 className="dashboard-title">Production Dashboard</h1>
          <p className="dashboard-subtitle">Real-time production metrics and system status</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-icon" style={{ backgroundColor: '#eff6ff' }}>
              <Target size={24} style={{ color: '#2563eb' }} />
            </div>
            <span className="metric-change">Live</span>
          </div>
          <div className="metric-title">Total Items</div>
          <div className="metric-value">{numberOrZero(summaryData.lead_time?.total_items)}</div>
          <div className="metric-description">in production</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-icon" style={{ backgroundColor: '#f0fdf4' }}>
              <Gauge size={24} style={{ color: '#16a34a' }} />
            </div>
            <span className="metric-change">+{toFixedSafe(summaryData.lead_time?.avg_efficiency_gain, 1)}%</span>
          </div>
          <div className="metric-title">Efficiency Gain</div>
          <div className="metric-value">{toFixedSafe(summaryData.lead_time?.avg_efficiency_gain, 1)}%</div>
          <div className="metric-description">optimization potential</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-icon" style={{ backgroundColor: '#faf5ff' }}>
              <Clock size={24} style={{ color: '#9333ea' }} />
            </div>
            <span className="metric-change">-{toFixedSafe(summaryData.lead_time?.total_time_savings, 0)}d</span>
          </div>
          <div className="metric-title">Time Savings</div>
          <div className="metric-value">{toFixedSafe(summaryData.lead_time?.total_time_savings, 0)} days</div>
          <div className="metric-description">potential reduction</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-icon" style={{ backgroundColor: '#fff7ed' }}>
              <TrendingUp size={24} style={{ color: '#ea580c' }} />
            </div>
            <span className="metric-change">+{toFixedSafe(summaryData.demand?.avg_fulfillment_rate, 1)}%</span>
          </div>
          <div className="metric-title">Fulfillment Rate</div>
          <div className="metric-value">{toFixedSafe(summaryData.demand?.avg_fulfillment_rate, 1)}%</div>
          <div className="metric-description">order completion</div>
        </div>

        {/* RFM Jobs (clickable) */}
        <div
          className={`metric-card ${activeJobFilter === 'RFM' ? 'active-filter' : ''}`}
          onClick={() => resetOrApplyFilter('RFM')}
          style={{ cursor: 'pointer' }}
        >
          <div className="metric-card-header">
            <div className="metric-icon" style={{ backgroundColor: '#fef9c3' }}>
              <Package size={24} style={{ color: '#b45309' }} />
            </div>
            <span className="metric-change">{numberOrZero(jobStages.RFM)}</span>
          </div>
          <div className="metric-title">RFM Jobs</div>
          <div className="metric-value">{numberOrZero(jobStages.RFM)}</div>
          <div className="metric-description">Ready for Machining</div>
        </div>

        {/* RFD Jobs (clickable) */}
        <div
          className={`metric-card ${activeJobFilter === 'RFD' ? 'active-filter' : ''}`}
          onClick={() => resetOrApplyFilter('RFD')}
          style={{ cursor: 'pointer' }}
        >
          <div className="metric-card-header">
            <div className="metric-icon" style={{ backgroundColor: '#fee2e2' }}>
              <Zap size={24} style={{ color: '#ef4444' }} />
            </div>
            <span className="metric-change">{numberOrZero(jobStages.RFD)}</span>
          </div>
          <div className="metric-title">RFD Jobs</div>
          <div className="metric-value">{numberOrZero(jobStages.RFD)}</div>
          <div className="metric-description">Ready for Dispatch</div>
        </div>

        {/* Critical Jobs (clickable) */}
        <div
          className={`metric-card ${activeJobFilter === 'CRITICAL' ? 'active-filter' : ''}`}
          onClick={() => resetOrApplyFilter('CRITICAL')}
          style={{ cursor: 'pointer' }}
        >
          <div className="metric-card-header">
            <div className="metric-icon" style={{ backgroundColor: '#fef2f2' }}>
              <AlertCircle size={24} style={{ color: '#dc2626' }} />
            </div>
            <span className="metric-change">{numberOrZero(jobUrgency.CRITICAL)}</span>
          </div>
          <div className="metric-title">Critical Jobs</div>
          <div className="metric-value">{numberOrZero(jobUrgency.CRITICAL)}</div>
          <div className="metric-description">Urgent WIP</div>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="charts-grid">
        <div className="chart-container" style={{ gridColumn: 'span 2', minHeight: 320 }}>
          <div className="chart-header">
            <h3 className="chart-title">Production Trend</h3>
          </div>
          {/* Ensure parent has height; ResponsiveContainer relies on it */}
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={productionTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Area type="monotone" dataKey="fulfilled" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
                <Area type="monotone" dataKey="target" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Jobs */}
      {filteredJobs.length > 0 && (
        <div className="alerts-section">
          <h3 className="section-title">
            ⚙️ Top Jobs by Lead Time {activeJobFilter ? ` (Filtered: ${activeJobFilter})` : ''}
          </h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Stage</th>
                  <th>Process</th>
                  <th>Qty</th>
                  <th>Lead Time</th>
                  <th>Urgency</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.slice(0, 50).map((job, index) => {
                  const key = [job?.ITEM_CODE, job?.STAGE, job?.PROCESS, index].filter(Boolean).join('|');
                  return (
                    <tr key={key}>
                      <td>{job?.ITEM_CODE}</td>
                      <td>{job?.STAGE}</td>
                      <td>{job?.PROCESS}</td>
                      <td>{job?.QUANTITY}</td>
                      <td>{job?.LEAD_TIME_ESTIMATE}</td>
                      <td>{job?.URGENCY}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardTab;
