import React, { useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const FileUpload = ({ onFileUpload, isLoading, processingStatus }) => {
  const [masterFile, setMasterFile] = useState(null);
  const [liveStockFile, setLiveStockFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const validateFile = (file) => {
    if (!file) return false;
    
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    const maxSize = 50 * 1024 * 1024; // 50MB

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      setUploadError('Please select only Excel files (.xlsx or .xls)');
      return false;
    }

    if (file.size > maxSize) {
      setUploadError('File size must be less than 50MB');
      return false;
    }

    return true;
  };

  const handleFileChange = (event, fileType) => {
    const file = event.target.files[0];
    setUploadError(null);
    
    if (file && validateFile(file)) {
      if (fileType === 'master') {
        setMasterFile(file);
        console.log('✅ Master file selected:', file.name);
      } else {
        setLiveStockFile(file);
        console.log('✅ Live stock file selected:', file.name);
      }
    } else {
      // Clear the file input
      event.target.value = '';
    }
  };

  const handleDrop = (event, fileType) => {
    event.preventDefault();
    setDragOver(false);
    
    const file = event.dataTransfer.files[0];
    setUploadError(null);
    
    if (file && validateFile(file)) {
      if (fileType === 'master') {
        setMasterFile(file);
        console.log('✅ Master file dropped:', file.name);
      } else {
        setLiveStockFile(file);
        console.log('✅ Live stock file dropped:', file.name);
      }
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const clearFile = (fileType) => {
    if (fileType === 'master') {
      setMasterFile(null);
      document.getElementById('master-file').value = '';
    } else {
      setLiveStockFile(null);
      document.getElementById('live-stock-file').value = '';
    }
    setUploadError(null);
    setUploadSuccess(false);
  };

  const handleSubmit = async () => {
    setUploadError(null);
    setUploadSuccess(false);

    // Validation
    if (!masterFile) {
      setUploadError('Please select the Master.xlsx file');
      return;
    }
    
    if (!liveStockFile) {
      setUploadError('Please select the Live Stock file');
      return;
    }

    try {
      console.log('🚀 Starting file upload...');
      console.log('Master file:', masterFile.name, masterFile.size, 'bytes');
      console.log('Live stock file:', liveStockFile.name, liveStockFile.size, 'bytes');

      // Create FormData with exact field names expected by backend
      const formData = new FormData();
      formData.append('master_file', masterFile); // Exact match with FastAPI parameter
      formData.append('live_stock_file', liveStockFile); // Exact match with FastAPI parameter

      // Debug FormData contents
      for (let [key, value] of formData.entries()) {
        console.log(`📎 FormData entry: ${key} = ${value.name || value} (${value.size || 0} bytes)`);
      }

      const response = await fetch(`${API_BASE}/run_etl/`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - let browser set it with boundary
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Upload failed:', errorText);
        
        let errorMessage;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorText;
          
          // Handle FastAPI validation errors specifically
          if (Array.isArray(errorData.detail)) {
            const fieldErrors = errorData.detail.map(err => 
              `${err.loc?.join('.')} - ${err.msg}`
            ).join(', ');
            errorMessage = `Validation Error: ${fieldErrors}`;
          }
        } catch (e) {
          errorMessage = errorText;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Upload successful:', result);
      
      setUploadSuccess(true);
      
      // Call parent callback
      if (onFileUpload) {
        onFileUpload(masterFile, liveStockFile);
      }

    } catch (err) {
      console.error('❌ Upload error:', err);
      setUploadError(`Upload failed: ${err.message}`);
    }
  };

  const getProgressWidth = () => {
    return processingStatus?.progress ? `${processingStatus.progress}%` : '0%';
  };

  const getStatusColor = () => {
    if (uploadError) return '#ef4444';
    if (uploadSuccess) return '#10b981';
    if (isLoading) return '#f59e0b';
    return '#6b7280';
  };

  return (
    <div className="file-upload-container">
      <div className="upload-header">
        <h2>📁 Upload Manufacturing Data Files</h2>
        <p>Upload your Excel files to process manufacturing analytics</p>
      </div>
      
      {/* Status Messages */}
      {uploadError && (
        <div className="error-banner">
          <AlertCircle size={20} />
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="error-close">
            <X size={16} />
          </button>
        </div>
      )}

      {uploadSuccess && (
        <div className="success-banner">
          <CheckCircle size={20} />
          <span>Files uploaded successfully! Processing ETL pipeline...</span>
        </div>
      )}
      
      <div className="upload-section">
        {/* Master File Upload */}
        <div className="file-upload-group">
          <label className="file-group-label">
            <FileSpreadsheet size={20} />
            Master.xlsx File
          </label>
          <div 
            className={`file-drop-zone ${dragOver ? 'drag-over' : ''} ${masterFile ? 'has-file' : ''}`}
            onDrop={(e) => handleDrop(e, 'master')}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              type="file"
              id="master-file"
              accept=".xlsx,.xls"
              onChange={(e) => handleFileChange(e, 'master')}
              className="file-input"
            />
            <label htmlFor="master-file" className="file-label">
              {masterFile ? (
                <div className="file-selected">
                  <FileSpreadsheet size={24} />
                  <div className="file-info">
                    <span className="file-name">{masterFile.name}</span>
                    <span className="file-size">{(masterFile.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={(e) => {
                      e.preventDefault();
                      clearFile('master');
                    }}
                    className="file-remove"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="file-placeholder">
                  <Upload size={32} />
                  <span className="file-placeholder-text">
                    Drop Master.xlsx file here or click to browse
                  </span>
                  <span className="file-placeholder-hint">
                    Contains Process, Routing, Orders, WIP data
                  </span>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Live Stock File Upload */}
        <div className="file-upload-group">
          <label className="file-group-label">
            <FileSpreadsheet size={20} />
            Live Stock File
          </label>
          <div 
            className={`file-drop-zone ${dragOver ? 'drag-over' : ''} ${liveStockFile ? 'has-file' : ''}`}
            onDrop={(e) => handleDrop(e, 'liveStock')}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              type="file"
              id="live-stock-file"
              accept=".xlsx,.xls"
              onChange={(e) => handleFileChange(e, 'liveStock')}
              className="file-input"
            />
            <label htmlFor="live-stock-file" className="file-label">
              {liveStockFile ? (
                <div className="file-selected">
                  <FileSpreadsheet size={24} />
                  <div className="file-info">
                    <span className="file-name">{liveStockFile.name}</span>
                    <span className="file-size">{(liveStockFile.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={(e) => {
                      e.preventDefault();
                      clearFile('liveStock');
                    }}
                    className="file-remove"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="file-placeholder">
                  <Upload size={32} />
                  <span className="file-placeholder-text">
                    Drop Live Stock file here or click to browse
                  </span>
                  <span className="file-placeholder-hint">
                    Contains current inventory stock data
                  </span>
                </div>
              )}
            </label>
          </div>
        </div>
      </div>

      {/* Processing Status */}
      {isLoading && (
        <div className="processing-status">
          <div className="status-header">
            <div className="status-indicator" style={{ backgroundColor: getStatusColor() }}>
              <div className="status-pulse"></div>
            </div>
            <span className="status-text">
              {processingStatus?.message || 'Processing files...'}
            </span>
          </div>
          <div className="progress-container">
            <div 
              className="progress-bar" 
              style={{ 
                width: getProgressWidth(),
                backgroundColor: getStatusColor()
              }}
            ></div>
          </div>
          <div className="progress-text">
            {processingStatus?.progress || 0}% Complete
          </div>
        </div>
      )}

      {/* Upload Button */}
      <div className="upload-actions">
        <button 
          onClick={handleSubmit}
          disabled={!masterFile || !liveStockFile || isLoading}
          className={`upload-button ${(!masterFile || !liveStockFile) ? 'disabled' : ''}`}
        >
          {isLoading ? (
            <>
              <div className="button-spinner"></div>
              Processing...
            </>
          ) : (
            <>
              <Upload size={20} />
              Start ETL Analysis
            </>
          )}
        </button>
        
        {(masterFile || liveStockFile) && !isLoading && (
          <button 
            onClick={() => {
              clearFile('master');
              clearFile('liveStock');
            }}
            className="clear-button"
          >
            <X size={16} />
            Clear All
          </button>
        )}
      </div>

      {/* Upload Requirements */}
      <div className="upload-requirements">
        <h4>📋 File Requirements</h4>
        <ul>
          <li>✅ Excel files only (.xlsx or .xls)</li>
          <li>✅ Maximum file size: 50MB each</li>
          <li>✅ Master file should contain: Process, Routing, Orders, WIP sheets</li>
          <li>✅ Live Stock file should contain current inventory data</li>
        </ul>
      </div>
    </div>
  );
};

export default FileUpload;
