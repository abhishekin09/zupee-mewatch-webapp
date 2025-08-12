import React, { useState, useEffect } from 'react';

const SnapshotComparison = ({ websocket }) => {
  const [snapshots, setSnapshots] = useState([]);
  const [comparisons, setComparisons] = useState([]);
  const [activeComparison, setActiveComparison] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({});

  // Fetch snapshots from API
  const fetchSnapshots = async () => {
    try {
      const response = await fetch('/api/snapshots');
      const data = await response.json();
      setSnapshots(data.snapshots.map(snapshot => ({
        ...snapshot,
        status: 'completed'
      })));
    } catch (error) {
      console.error('Error fetching snapshots:', error);
    }
  };

  // Fetch comparisons from API
  const fetchComparisons = async () => {
    try {
      const response = await fetch('/api/snapshots/comparisons');
      const data = await response.json();
      
      // Fetch detailed analysis for each comparison
      const comparisonsWithDetails = await Promise.all(
        data.comparisons.map(async (comp) => {
          try {
            const detailResponse = await fetch(`/api/snapshots/comparisons/${comp.sessionId}`);
            const detailData = await detailResponse.json();
            return {
              ...comp,
              id: comp.sessionId,
              analysis: detailData.analysis,
              status: detailData.status || comp.status
            };
          } catch (error) {
            console.error(`Error fetching comparison details for ${comp.sessionId}:`, error);
            return {
              ...comp,
              id: comp.sessionId
            };
          }
        })
      );
      
      setComparisons(comparisonsWithDetails);
    } catch (error) {
      console.error('Error fetching comparisons:', error);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchSnapshots();
    fetchComparisons();

    // Set up periodic refresh every 5 seconds
    const interval = setInterval(() => {
      fetchSnapshots();
      fetchComparisons();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'uploading': return '#ffa500';
      case 'completed': return '#28a745';
      case 'analyzing': return '#007bff';
      case 'failed': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  return (
    <div className="snapshot-comparison">
      <div className="section-header">
        <h2>Heap Snapshot Analysis</h2>
        <p>Zero-downtime memory leak detection with pod scaling</p>
      </div>

      {/* Snapshots Section */}
      <div className="card">
        <div className="card-header">
          <h3>Snapshots ({snapshots.length})</h3>
        </div>
        <div className="snapshots-grid">
          {snapshots.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">No Snapshots</div>
              <div className="empty-state-description">
                Use <code>leak-detector capture</code> to start collecting snapshots
              </div>
            </div>
          ) : (
            snapshots.map(snapshot => (
              <div key={snapshot.id} className="snapshot-card">
                <div className="snapshot-header">
                  <div className="snapshot-phase" data-phase={snapshot.phase}>
                    {snapshot.phase.toUpperCase()}
                  </div>
                  <div 
                    className="snapshot-status"
                    style={{ color: getStatusColor(snapshot.status) }}
                  >
                    {snapshot.status}
                  </div>
                </div>
                
                <div className="snapshot-details">
                  <div className="detail-row">
                    <span className="detail-label">Service:</span>
                    <span className="detail-value">{snapshot.serviceName}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Size:</span>
                    <span className="detail-value">{formatFileSize(snapshot.size)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Time:</span>
                    <span className="detail-value">
                      {new Date(snapshot.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {snapshot.status === 'uploading' && (
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${snapshot.progress || 0}%` }}
                    ></div>
                    <span className="progress-text">{snapshot.progress || 0}%</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Comparisons Section */}
      <div className="card">
        <div className="card-header">
          <h3>Analysis Results ({comparisons.length})</h3>
        </div>
        <div className="comparisons-list">
          {comparisons.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">No Comparisons</div>
              <div className="empty-state-description">
                Snapshot comparisons will appear here automatically
              </div>
            </div>
          ) : (
            comparisons.map(comparison => (
              <div 
                key={comparison.id} 
                className={`comparison-card ${activeComparison === comparison.id ? 'active' : ''}`}
                onClick={() => setActiveComparison(comparison.id)}
              >
                <div className="comparison-header">
                  <div className="comparison-service">
                    <h4>{comparison.serviceName}</h4>
                  </div>
                  <div 
                    className="comparison-status"
                    style={{ color: getStatusColor(comparison.status) }}
                  >
                    {comparison.status}
                  </div>
                </div>

                {comparison.status === 'completed' && comparison.analysis && (
                  <div className="analysis-summary">
                    <div className="growth-indicator">
                      <span className="growth-label">Growth:</span>
                      <span 
                        className={`growth-value ${comparison.analysis.summary.suspiciousGrowth ? 'negative' : 'positive'}`}
                      >
                        {comparison.analysis.summary.suspiciousGrowth ? '⚠️' : '✅'} 
                        {comparison.analysis.summary.totalGrowthMB.toFixed(2)} MB
                      </span>
                    </div>
                    
                    <div className="confidence-score">
                      Confidence: {(comparison.analysis.summary.confidence * 100).toFixed(0)}%
                    </div>

                    {comparison.analysis.offenders && comparison.analysis.offenders.length > 0 && (
                      <div className="top-offenders">
                        <h5>Top Offenders:</h5>
                        {comparison.analysis.offenders.slice(0, 3).map((offender, index) => (
                          <div key={index} className="offender-item">
                            <span className="offender-type">{offender.type}</span>
                            <span 
                              className="offender-severity"
                              style={{ color: getSeverityColor(offender.severity) }}
                            >
                              +{(offender.deltaSize / (1024 * 1024)).toFixed(2)} MB
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {comparison.analysis.recommendations && (
                      <div className="recommendations">
                        <h5>Recommendations:</h5>
                        <ul>
                          {comparison.analysis.recommendations.slice(0, 2).map((rec, index) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {comparison.status === 'failed' && (
                  <div className="error-message">
                    <span className="error-icon">❌</span>
                    <span>{comparison.error}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="card usage-card">
        <div className="card-header">
          <h3>Usage</h3>
        </div>
        <div className="usage-content">
          <h4>Simplified Capture Command:</h4>
          <div className="code-block">
            <code>
              zupee-memwatch capture \<br/>
              &nbsp;&nbsp;--container-id my-container \<br/>
              &nbsp;&nbsp;--timeframe 10
            </code>
          </div>
          <p style={{ fontSize: '14px', color: '#6c757d', margin: '10px 0' }}>
            Defaults: strategy=docker, service-name=container-id, dashboard-url=ngrok
          </p>
          
          <h4>What happens:</h4>
          <ol>
            <li>🚀 Scales up pods to ensure zero downtime</li>
            <li>📸 Takes before snapshot from target container</li>
            <li>⏳ Waits specified timeframe for memory activity</li>
            <li>📸 Takes after snapshot</li>
            <li>📤 Uploads both snapshots to this dashboard</li>
            <li>🔬 Automatically analyzes for memory leaks</li>
            <li>📊 Shows results with actionable recommendations</li>
            <li>📉 Scales back to original pod count</li>
          </ol>
        </div>
      </div>

      <style jsx>{`
        .snapshot-comparison {
          padding: 20px;
        }

        .section-header {
          margin-bottom: 30px;
        }

        .section-header h2 {
          color: #2c3e50;
          margin-bottom: 5px;
        }

        .section-header p {
          color: #7f8c8d;
          margin: 0;
        }

        .card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 20px;
          overflow: hidden;
        }

        .card-header {
          background: #f8f9fa;
          padding: 15px 20px;
          border-bottom: 1px solid #e9ecef;
        }

        .card-header h3 {
          margin: 0;
          color: #495057;
        }

        .snapshots-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          padding: 20px;
        }

        .snapshot-card {
          border: 1px solid #e9ecef;
          border-radius: 6px;
          padding: 15px;
          background: #f8f9fa;
        }

        .snapshot-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .snapshot-phase {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
        }

        .snapshot-phase[data-phase="before"] {
          background: #d4edda;
          color: #155724;
        }

        .snapshot-phase[data-phase="after"] {
          background: #f8d7da;
          color: #721c24;
        }

        .snapshot-status {
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
        }

        .snapshot-details {
          margin-bottom: 15px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }

        .detail-label {
          color: #6c757d;
          font-size: 14px;
        }

        .detail-value {
          color: #495057;
          font-weight: 500;
          font-size: 14px;
        }

        .progress-bar {
          position: relative;
          height: 20px;
          background: #e9ecef;
          border-radius: 10px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #007bff, #0056b3);
          transition: width 0.3s ease;
        }

        .progress-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 12px;
          color: white;
          font-weight: bold;
        }

        .comparisons-list {
          padding: 20px;
        }

        .comparison-card {
          border: 1px solid #e9ecef;
          border-radius: 6px;
          padding: 20px;
          margin-bottom: 15px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .comparison-card:hover {
          border-color: #007bff;
          box-shadow: 0 2px 8px rgba(0,123,255,0.1);
        }

        .comparison-card.active {
          border-color: #007bff;
          background: #f8f9ff;
        }

        .comparison-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .comparison-service h4 {
          margin: 0;
          color: #2c3e50;
        }

        .analysis-summary {
          border-top: 1px solid #e9ecef;
          padding-top: 15px;
        }

        .growth-indicator {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          font-size: 16px;
          font-weight: 500;
        }

        .growth-value.negative {
          color: #dc3545;
        }

        .growth-value.positive {
          color: #28a745;
        }

        .confidence-score {
          color: #6c757d;
          font-size: 14px;
          margin-bottom: 15px;
        }

        .top-offenders {
          margin-bottom: 15px;
        }

        .top-offenders h5 {
          margin: 0 0 10px 0;
          color: #495057;
          font-size: 14px;
        }

        .offender-item {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
          border-bottom: 1px solid #f1f1f1;
        }

        .offender-type {
          font-family: monospace;
          font-size: 13px;
        }

        .offender-severity {
          font-weight: 500;
          font-size: 13px;
        }

        .recommendations {
          margin-top: 15px;
        }

        .recommendations h5 {
          margin: 0 0 10px 0;
          color: #495057;
          font-size: 14px;
        }

        .recommendations ul {
          margin: 0;
          padding-left: 20px;
        }

        .recommendations li {
          margin-bottom: 5px;
          font-size: 13px;
          color: #6c757d;
        }

        .error-message {
          color: #dc3545;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: #f8d7da;
          border-radius: 4px;
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: #6c757d;
        }

        .empty-state-title {
          font-weight: 500;
          margin-bottom: 5px;
        }

        .empty-state-description {
          font-size: 14px;
        }

        .usage-card .card-header {
          background: #e3f2fd;
        }

        .usage-content {
          padding: 20px;
        }

        .usage-content h4 {
          color: #2c3e50;
          margin: 0 0 10px 0;
        }

        .code-block {
          background: #f1f3f4;
          padding: 15px;
          border-radius: 4px;
          margin: 10px 0 20px 0;
          font-family: monospace;
          font-size: 14px;
          overflow-x: auto;
        }

        .usage-content ol {
          margin: 10px 0;
          padding-left: 20px;
        }

        .usage-content li {
          margin-bottom: 8px;
          color: #495057;
        }
      `}</style>
    </div>
  );
};

export default SnapshotComparison;
