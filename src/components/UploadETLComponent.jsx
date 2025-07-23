import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Play,
  RefreshCw,
  Database,
  FileText
} from 'lucide-react';

export default function UploadETLComponent({ onETLComplete }) {
  const [files, setFiles] = useState({
    master: null,
    inventory: null
  });
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const masterFileRef = useRef(null);
  const inventoryFileRef = useRef(null);

  // File validation
  const validateFile = (file) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (!validTypes.includes(file.type)) {
      return 'Please select a valid Excel file (.xlsx or .xls)';
    }
    
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      return 'File size must be less than 50MB';
    }
    
    return null;
  };

  // Handle file selection
  const handleFileSelect = (fileType, event) => {
    const file = event.target.files[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      setError(error);
      return;
    }

    setFiles(prev => ({
      ...prev,
      [fileType]: file
    }));
    setError(null);
  };

  // Remove selected file
  const removeFile = (fileType) => {
    setFiles(prev => ({
      ...prev,
      [fileType]: null
    }));
    
    if (fileType === 'master' && masterFileRef.current) {
      masterFileRef.current.value = '';
    }
    if (fileType === 'inventory' && inventoryFileRef.current) {
      inventoryFileRef.current.value = '';
    }
  };

  // Upload files and run ETL
  const handleUpload = async () => {
    if (!files.master || !files.inventory) {
      setError('Please select both Master and Inventory files');
      return;
    }

    setUploading(true);
    setUploadStatus('uploading');
    setUploadProgress(0);
    setError(null);
    setResults(null);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('master_file', files.master);
      formData.append('inventory_file', files.inventory);

      console.log('🚀 Starting ETL upload...');
      console.log('Master file:', files.master.name);
      console.log('Inventory file:', files.inventory.name);

      // Simulate progress (since we can't track actual progress easily)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      setUploadStatus('processing');

      const response = await fetch('http://localhost:8000/run_etl/', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      console.log('ETL Result:', result);

      if (result.status.includes('success')) {
        setUploadStatus('success');
        setResults(result);
        
        // Notify parent component that ETL is complete
        if (onETLComplete) {
          onETLComplete(result);
        }
      } else {
        throw new Error(result.message || 'ETL process failed');
      }

    } catch (err) {
      console.error('ETL Upload error:', err);
      setError(err.message);
      setUploadStatus('error');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFiles({ master: null, inventory: null });
    setUploadStatus(null);
    setUploadProgress(0);
    setResults(null);
    setError(null);
    if (masterFileRef.current) masterFileRef.current.value = '';
    if (inventoryFileRef.current) inventoryFileRef.current.value = '';
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="etl-upload-component">
      <div className="upload-header">
        <h2 className="upload-title">
          <Database size={24} style={{ marginRight: '0.5rem' }} />
          ETL Data Upload
        </h2>
        <p className="upload-subtitle">
          Upload your Excel files to run the complete ETL process and generate analytics
        </p>
      </div>

      {/* File Upload Cards */}
      <div className="upload-cards">
        {/* Master File Upload */}
        <div className="upload-card">
          <div className="upload-card-header">
            <FileSpreadsheet size={20} />
            <span>Master File</span>
            <span className="required">*</span>
          </div>
          
          {!files.master ? (
            <div 
              className="upload-dropzone"
              onClick={() => masterFileRef.current?.click()}
            >
              <Upload size={32} className="upload-icon" />
              <p>Click to select Master.xlsx file</p>
              <p className="upload-hint">Contains process definitions and routing information</p>
              <input
                ref={masterFileRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => handleFileSelect('master', e)}
                style={{ display: 'none' }}
              />
            </div>
          ) : (
            <div className="file-selected">
              <div className="file-info">
                <FileSpreadsheet size={16} />
                <div className="file-details">
                  <span className="file-name">{files.master.name}</span>
                  <span className="file-size">{formatFileSize(files.master.size)}</span>
                </div>
              </div>
              <button 
                className="btn-remove" 
                onClick={() => removeFile('master')}
                disabled={uploading}
              >
                <XCircle size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Inventory File Upload */}
        <div className="upload-card">
          <div className="upload-card-header">
            <FileSpreadsheet size={20} />
            <span>Inventory File</span>
            <span className="required">*</span>
          </div>
          
          {!files.inventory ? (
            <div 
              className="upload-dropzone"
              onClick={() => inventoryFileRef.current?.click()}
            >
              <Upload size={32} className="upload-icon" />
              <p>Click to select Live Stock file</p>
              <p className="upload-hint">Contains current inventory and WIP data</p>
              <input
                ref={inventoryFileRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => handleFileSelect('inventory', e)}
                style={{ display: 'none' }}
              />
            </div>
          ) : (
            <div className="file-selected">
              <div className="file-info">
                <FileSpreadsheet size={16} />
                <div className="file-details">
                  <span className="file-name">{files.inventory.name}</span>
                  <span className="file-size">{formatFileSize(files.inventory.size)}</span>
                </div>
              </div>
              <button 
                className="btn-remove" 
                onClick={() => removeFile('inventory')}
                disabled={uploading}
              >
                <XCircle size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="upload-progress">
          <div className="progress-header">
            <span className="progress-text">
              {uploadStatus === 'uploading' ? 'Uploading files...' : 
               uploadStatus === 'processing' ? 'Processing ETL...' : 'Complete'}
            </span>
            <span className="progress-percentage">{uploadProgress}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Results Display */}
      {results && uploadStatus === 'success' && (
        <div className="upload-results">
          <div className="results-header">
            <CheckCircle size={20} className="success-icon" />
            <h3>ETL Process Completed Successfully!</h3>
          </div>
          
          <div className="results-content">
            <div className="results-section">
              <h4>📊 Generated Files:</h4>
              <ul className="file-list">
                {results.files && results.files.map((file, index) => (
                  <li key={index} className="file-item">
                    <FileText size={14} />
                    <span>{file}</span>
                  </li>
                ))}
              </ul>
            </div>

            {results.inserted_rows && (
              <div className="results-section">
                <h4>🗄️ Database Records:</h4>
                <div className="database-stats">
                  {Object.entries(results.inserted_rows).map(([table, count]) => (
                    <div key={table} className="stat-item">
                      <span className="stat-label">{table}:</span>
                      <span className="stat-value">{count} rows</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="upload-actions">
        {uploadStatus === 'success' ? (
          <button 
            className="btn btn-secondary" 
            onClick={resetForm}
          >
            <RefreshCw size={16} style={{ marginRight: '0.5rem' }} />
            Upload New Files
          </button>
        ) : (
          <>
            <button 
              className="btn btn-primary" 
              onClick={handleUpload}
              disabled={!files.master || !files.inventory || uploading}
            >
              {uploading ? (
                <>
                  <RefreshCw size={16} className="spinning" style={{ marginRight: '0.5rem' }} />
                  Processing...
                </>
              ) : (
                <>
                  <Play size={16} style={{ marginRight: '0.5rem' }} />
                  Run ETL Process
                </>
              )}
            </button>
            
            {(files.master || files.inventory) && (
              <button 
                className="btn btn-secondary" 
                onClick={resetForm}
                disabled={uploading}
              >
                Clear All
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
