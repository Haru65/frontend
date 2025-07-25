import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  Package, Clock, AlertCircle, TrendingUp, Target,
  Gauge, Factory, Zap
} from 'lucide-react';

export default function DashboardTab({ data, stockData }) {
  const [activeJobFilter, setActiveJobFilter] = useState(null);

  const summaryData = data?.summary || data || {};

  const processedStockData = Array.isArray(stockData)
    ? stockData
    : Array.isArray(stockData?.data)
      ? stockData.data
      : [];

  const criticalItems = processedStockData.filter(
    (item) => item?.STOCK_ADEQUACY === 'Out of Stock'
  );
  const shortageItems = processedStockData.filter(
    (item) => item?.STOCK_ADEQUACY === 'Shortage'
  );

  const stockCounts = {
    out_of_stock: summaryData.stock?.out_of_stock || 0,
    shortage: summaryData.stock?.shortage || 0,
    adequate: summaryData.stock?.adequate || 0,
    excess: summaryData.stock?.excess || 0,
  };

  const stockChartData = [
    { name: 'Out of Stock', value: stockCounts.out_of_stock, color: '#ef4444' },
    { name: 'Shortage', value: stockCounts.shortage, color: '#f97316' },
    { name: 'Adequate', value: stockCounts.adequate, color: '#10b981' },
    { name: 'Excess', value: stockCounts.excess, color: '#3b82f6' },
  ];

  const machineData = [
    { name: 'Overloaded', count: summaryData.machines?.overloaded || 0, color: '#ef4444' },
    { name: 'High Load', count: summaryData.machines?.high_load || 0, color: '#f97316' },
    { name: 'Medium Load', count: summaryData.machines?.medium_load || 0, color: '#eab308' },
    { name: 'Available', count: summaryData.machines?.available || 0, color: '#10b981' }
  ];

  const jobSummary = summaryData.jobs || {};
  const jobUrgency = jobSummary.by_urgency || {};
  const jobStages = jobSummary.by_stage || {};
  const allJobs = jobSummary.all_jobs || [];

  const jobUrgencyChart = [
    { name: 'Critical', value: jobUrgency.CRITICAL || 0, color: '#dc2626' },
    { name: 'High', value: jobUrgency.HIGH || 0, color: '#f97316' },
    { name: 'Medium', value: jobUrgency.MEDIUM || 0, color: '#facc15' },
    { name: 'Low', value: jobUrgency.LOW || 0, color: '#10b981' }
  ];

  // Filter jobs based on card
  let filteredJobs = allJobs;
  if (activeJobFilter === 'RFM') {
    filteredJobs = allJobs.filter((j) => j.STAGE === 'RFM');
  } else if (activeJobFilter === 'RFD') {
    filteredJobs = allJobs.filter((j) => j.STAGE === 'RFD');
  } else if (activeJobFilter === 'CRITICAL') {
    filteredJobs = allJobs.filter((j) => j.URGENCY === 'CRITICAL');
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

  if (!data && (!stockData || stockData.length === 0)) {
    return (
      <div className="dashboard-tab fade-in">
        <div className="dashboard-header">
          <div className="header-info">
            <h1 className="dashboard-title">Production Dashboard</h1>
            <p className="dashboard-subtitle">Connecting to backend...</p>
          </div>
        </div>
        <div className="no-data-state">
          <Factory size={64} className="no-data-icon" />
          <h3>No Dashboard Data Available</h3>
          <p>Make sure your backend is running and has processed data:</p>
          <div style={{ textAlign: 'left', marginTop: '1rem' }}>
            <p><code>POST /run_complete_analysis/</code> - Upload Excel files</p>
            <p><code>GET /dashboard-summary</code> - Dashboard metrics</p>
            <p><code>GET /stock-vs-demand</code> - Stock data</p>
          </div>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

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
          <div className="metric-value">{summaryData.lead_time?.total_items || 0}</div>
          <div className="metric-description">in production</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-icon" style={{ backgroundColor: '#f0fdf4' }}>
              <Gauge size={24} style={{ color: '#16a34a' }} />
            </div>
            <span className="metric-change">+{summaryData.lead_time?.avg_efficiency_gain?.toFixed(1) || 0}%</span>
          </div>
          <div className="metric-title">Efficiency Gain</div>
          <div className="metric-value">{summaryData.lead_time?.avg_efficiency_gain?.toFixed(1) || 0}%</div>
          <div className="metric-description">optimization potential</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-icon" style={{ backgroundColor: '#faf5ff' }}>
              <Clock size={24} style={{ color: '#9333ea' }} />
            </div>
            <span className="metric-change">-{summaryData.lead_time?.total_time_savings?.toFixed(0) || 0}d</span>
          </div>
          <div className="metric-title">Time Savings</div>
          <div className="metric-value">{summaryData.lead_time?.total_time_savings?.toFixed(0) || 0} days</div>
          <div className="metric-description">potential reduction</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-icon" style={{ backgroundColor: '#fff7ed' }}>
              <TrendingUp size={24} style={{ color: '#ea580c' }} />
            </div>
            <span className="metric-change">+{summaryData.demand?.avg_fulfillment_rate?.toFixed(1) || 0}%</span>
          </div>
          <div className="metric-title">Fulfillment Rate</div>
          <div className="metric-value">{summaryData.demand?.avg_fulfillment_rate?.toFixed(1) || 0}%</div>
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
            <span className="metric-change">{jobStages.RFM || 0}</span>
          </div>
          <div className="metric-title">RFM Jobs</div>
          <div className="metric-value">{jobStages.RFM || 0}</div>
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
            <span className="metric-change">{jobStages.RFD || 0}</span>
          </div>
          <div className="metric-title">RFD Jobs</div>
          <div className="metric-value">{jobStages.RFD || 0}</div>
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
            <span className="metric-change">{jobUrgency.CRITICAL || 0}</span>
          </div>
          <div className="metric-title">Critical Jobs</div>
          <div className="metric-value">{jobUrgency.CRITICAL || 0}</div>
          <div className="metric-description">Urgent WIP</div>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="charts-grid">
        <div className="chart-container" style={{ gridColumn: 'span 2' }}>
          <div className="chart-header">
            <h3 className="chart-title">Production Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
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
                {filteredJobs.slice(0, 50).map((job, index) => (
                  <tr key={index}>
                    <td>{job.ITEM_CODE}</td>
                    <td>{job.STAGE}</td>
                    <td>{job.PROCESS}</td>
                    <td>{job.QUANTITY}</td>
                    <td>{job.LEAD_TIME_ESTIMATE}</td>
                    <td>{job.URGENCY}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
