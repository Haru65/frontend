import React, { useMemo, useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { TrendingUp, Clock, Zap, AlertTriangle, CheckCircle, RefreshCw, Search } from 'lucide-react';
import './ParallelizableTaskTab.css';

const API_BASE = 'http://localhost:8000';

const n = (v, fallback = 0) => {
  const num = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(num) ? num : fallback;
};
const pct = (v, d = 1) => n(v).toFixed(d);
const days = (v, d = 1) => n(v).toFixed(d);

const ParallelizableTaskTab = () => {
  const [parallelizableData, setParallelizableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [filterSettings, setFilterSettings] = useState({
    minEfficiency: 0,
    sortBy: 'efficiency_gain',
    urgencyFilter: 'ALL', // NEW dropdown: ALL, CRITICAL, MEDIUM, LOW
  });
  const [searchTerm, setSearchTerm] = useState('');

  const fetchParallelizableData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/optimized-parallelization`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      setParallelizableData(result.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParallelizableData();
  }, []);

  // Normalize
  const normalized = useMemo(() => {
    const src = Array.isArray(parallelizableData) ? parallelizableData : [];
    return src.map((it, idx) => ({
      task_id: it.task_id ?? it.id ?? `${it.item_1 || 'UNK'}-${it.item_2 || 'UNK'}-${idx}`,
      item_1: it.item_1 ?? 'N/A',
      item_2: it.item_2 ?? 'N/A',
      item_1_urgency: (it.item_1_urgency ?? '').toString().toUpperCase(),
      item_2_urgency: (it.item_2_urgency ?? '').toString().toUpperCase(),
      current_time: n(it.current_time),
      parallel_time: n(it.parallel_time),
      savings: n(it.savings),
      efficiency_gain: n(it.efficiency_gain),
      process_conflicts: it.process_conflicts || '',
      machine_conflicts: it.machine_conflicts || '',
    }));
  }, [parallelizableData]);

  // Filtering with new urgency dropdown & search by item names
  const filteredData = useMemo(() => {
    const { minEfficiency, showOnlyParallelizable, sortBy, urgencyFilter } = filterSettings;
    const sTerm = searchTerm.trim().toUpperCase();

    const filtered = normalized.filter(item => {
      if (n(item.efficiency_gain) < n(minEfficiency)) return false;

      // Urgency dropdown filter
      if (urgencyFilter !== 'ALL') {
        if (item.item_1_urgency !== urgencyFilter && item.item_2_urgency !== urgencyFilter) return false;
      }

      // Search on item_1 or item_2 substrings
      if (sTerm) {
        if (
          !item.item_1.toUpperCase().includes(sTerm) &&
          !item.item_2.toUpperCase().includes(sTerm)
        ) return false;
      }

      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'efficiency_gain') return n(b.efficiency_gain) - n(a.efficiency_gain);
      if (sortBy === 'time_savings') return n(b.savings) - n(a.savings);
      if (sortBy === 'current_time') return n(b.current_time) - n(a.current_time);
      return 0;
    });

    return sorted.slice(0, 50);
  }, [normalized, filterSettings, searchTerm]);

  // Summaries
  const totalSavings = useMemo(() => filteredData.reduce((sum, it) => sum + n(it.savings), 0), [filteredData]);
  const avgEfficiency = useMemo(() => filteredData.length
    ? filteredData.reduce((sum, it) => sum + n(it.efficiency_gain), 0) / filteredData.length
    : 0, [filteredData]);
  const maxSavings = useMemo(() => filteredData.length
    ? Math.max(...filteredData.map(it => n(it.savings)))
    : 0, [filteredData]);

  return (
    <div className="tab-content">
      <div className="tab-header">
        <div className="tab-title">
          <TrendingUp className="tab-icon" />
          <div>
            <h1>Parallelizable Manufacturing Tasks</h1>
            <p>Optimize production through parallel processing - Real-time analysis from database</p>
          </div>
          <button
            className={`refresh-button ${loading ? 'spinning' : ''}`}
            onClick={fetchParallelizableData}
            disabled={loading}
            aria-label="Refresh data"
            title="Refresh data"
          >
            <RefreshCw size={20} />
          </button>
        </div>

        {error && (
          <div className="error-banner" role="alert" aria-live="assertive">
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
        )}

        <div className="summary-grid">
          <div className="summary-card">
            <CheckCircle size={24} className="summary-icon success" />
            <div className="summary-content">
              <h3>Parallelizable Pairs</h3>
              <div className="summary-value">{filteredData.length}</div>
              <div className="summary-change positive">Total pairs</div>
            </div>
          </div>
          <div className="summary-card">
            <Clock size={24} className="summary-icon warning" />
            <div className="summary-content">
              <h3>Total Time Savings</h3>
              <div className="summary-value">{days(totalSavings)} days</div>
              <div className="summary-change positive">Potential reduction</div>
            </div>
          </div>
          <div className="summary-card">
            <Zap size={24} className="summary-icon info" />
            <div className="summary-content">
              <h3>Avg Efficiency Gain</h3>
              <div className="summary-value">{pct(avgEfficiency)}%</div>
              <div className="summary-change positive">Production improvement</div>
            </div>
          </div>
          <div className="summary-card">
            <TrendingUp size={24} className="summary-icon accent" />
            <div className="summary-content">
              <h3>Max Single Savings</h3>
              <div className="summary-value">{days(maxSavings)} days</div>
              <div className="summary-change positive">Best opportunity</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters with urgency dropdown & item search */}
      <div className="content-section">
        <div className="filters-card" role="region" aria-labelledby="filtersLabel">
          <h3 id="filtersLabel">Filter & Sort Options</h3>
          <div className="filters-grid">

            <div className="filter-group">
              <label htmlFor="minEfficiencyRange">Minimum Efficiency Gain (%)</label>
              <input
                id="minEfficiencyRange"
                type="range"
                min="0"
                max="50"
                value={filterSettings.minEfficiency}
                onChange={e => setFilterSettings(s => ({ ...s, minEfficiency: parseInt(e.target.value, 10) }))}
              />
              <span>{filterSettings.minEfficiency}%</span>
            </div>

            <div className="filter-group">
              <label htmlFor="sortBySelect">Sort By</label>
              <select
                id="sortBySelect"
                value={filterSettings.sortBy}
                onChange={e => setFilterSettings(s => ({ ...s, sortBy: e.target.value }))}
              >
                <option value="efficiency_gain">Efficiency Gain</option>
                <option value="time_savings">Time Savings</option>
                <option value="current_time">Current Time</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="urgencyDropdown">Filter by Urgency</label>
              <select
                id="urgencyDropdown"
                value={filterSettings.urgencyFilter}
                onChange={e => setFilterSettings(s => ({ ...s, urgencyFilter: e.target.value }))}
              >
                <option value="ALL">All</option>
                <option value="CRITICAL">Critical</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            <div className="filter-group search-group" style={{ flexGrow: 1, minWidth: 200 }}>
              <label htmlFor="itemSearchInput">Search Items</label>
              <div className="search-input-wrapper">
                <Search size={16} />
                <input
                  id="itemSearchInput"
                  type="search"
                  placeholder="Search by Item 1 or Item 2"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  aria-label="Search tasks by item names"
                />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="content-section">
        <div className="chart-card">
          <h3>Time Savings Analysis</h3>
          <div className="chart-container" style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredData.slice(0, 10)} aria-label="Bar chart showing time savings" role="img">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="task_id" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip formatter={(value, name) => {
                  const label = name === 'current_time' ? 'Sequential Time' :
                                name === 'parallel_time' ? 'Parallel Time' : 'Time Saved';
                  return [`${days(value)} days`, label];
                }} />
                <Bar dataKey="current_time" fill="#ef4444" name="current_time" />
                <Bar dataKey="parallel_time" fill="#22c55e" name="parallel_time" />
                <Bar dataKey="savings" fill="#3b82f6" name="savings" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Scrollable Table */}
      <div className="content-section">
        <div className="table-card">
          <h3>Parallelizable Task Pairs</h3>
          <div
            className="table-container scrollable-table"
            style={{
              maxHeight: 400,
              overflowY: 'auto',
              scrollBehavior: 'smooth',
              border: '1px solid #ddd',
              borderRadius: 6,
            }}
          >
            <table className="data-table" role="grid" aria-label="Table of parallelizable task pairs">
              <thead>
                <tr>
                  <th scope="col">Item 1</th>
                  <th scope="col">Item 2</th>
                  <th scope="col">Urgency 1</th>
                  <th scope="col">Urgency 2</th>
                  <th scope="col">Sequential Time</th>
                  <th scope="col">Parallel Time</th>
                  <th scope="col">Time Saved</th>
                  <th scope="col">Efficiency Gain</th>
                  <th scope="col">Conflicts</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '1em' }}>
                      No tasks found matching criteria.
                    </td>
                  </tr>
                ) : filteredData.map((item, idx) => {
                  const u1 = item.item_1_urgency || 'NA';
                  const u2 = item.item_2_urgency || 'NA';
                  return (
                    <tr key={`${item.task_id}-${idx}`}>
                      <td><strong>{item.item_1}</strong></td>
                      <td><strong>{item.item_2}</strong></td>
                      <td><span className={`status-badge ${u1.toLowerCase()}`}>{u1}</span></td>
                      <td><span className={`status-badge ${u2.toLowerCase()}`}>{u2}</span></td>
                      <td>{days(item.current_time)} days</td>
                      <td>{days(item.parallel_time)} days</td>
                      <td><strong className="text-success">{days(item.savings)} days</strong></td>
                      <td><strong className="text-primary">{pct(item.efficiency_gain)}%</strong></td>
                      <td>
                        <div className="conflicts-cell">
                          {item.process_conflicts && <div className="conflict-item">Process: {item.process_conflicts}</div>}
                          {item.machine_conflicts && <div className="conflict-item">Machine: {item.machine_conflicts}</div>}
                          {!item.process_conflicts && !item.machine_conflicts && <span className="text-success">None</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParallelizableTaskTab;
