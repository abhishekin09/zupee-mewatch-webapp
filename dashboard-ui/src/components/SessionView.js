import React, { useState, useEffect } from 'react';

const SessionView = () => {
  const [sessions, setSessions] = useState([]);
  const [comparisons, setComparisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [snapshotsRes, comparisonsRes] = await Promise.all([
        fetch('/api/snapshots'),
        fetch('/api/snapshots/comparisons')
      ]);
      
      const snapshotsData = await snapshotsRes.json();
      const comparisonsData = await comparisonsRes.json();
      
      setSessions(snapshotsData.sessions || []);
      setComparisons(comparisonsData.comparisons || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleCompareSession = async (session) => {
    const beforeSnapshot = session.snapshots.find(s => s.phase === 'before');
    const afterSnapshot = session.snapshots.find(s => s.phase === 'after');
    
    if (!beforeSnapshot || !afterSnapshot) {
      alert('Both before and after snapshots are required for comparison');
      return;
    }

    try {
      const response = await fetch('/api/snapshots/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceName: session.serviceName,
          containerId: session.containerId,
          beforeSnapshotId: beforeSnapshot.id,
          afterSnapshotId: afterSnapshot.id,
          timeframe: 0 // Not used in simple analysis
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Comparison started:', result);
        fetchData(); // Refresh to get updated comparisons
      }
    } catch (error) {
      console.error('Error starting comparison:', error);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'complete': return '#28a745';
      case 'partial': return '#ffc107';
      case 'analyzing': return '#007bff';
      case 'completed': return '#28a745';
      case 'failed': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getSessionComparison = (sessionId) => {
    return comparisons.find(comp => comp.sessionId.includes(sessionId) || sessionId.includes(comp.sessionId));
  };

  if (loading) {
    return <div className="loading">Loading sessions...</div>;
  }

  return (
    <div className="session-view">
      <div className="section-header">
        <h2>Snapshot Sessions</h2>
        <p>Grouped snapshots by capture session for easy before/after analysis</p>
      </div>

      {sessions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">No Sessions Found</div>
          <div className="empty-state-description">
            Use <code>zupee-memwatch capture --container-id [container] --timeframe [minutes]</code> to start capturing snapshots
          </div>
          <div className="example-command">
            Example: <code>zupee-memwatch capture --container-id my-container --timeframe 5</code>
          </div>
        </div>
      ) : (
        <div className="sessions-grid">
          {sessions.map(session => {
            const comparison = getSessionComparison(session.sessionId);
            const beforeSnapshot = session.snapshots.find(s => s.phase === 'before');
            const afterSnapshot = session.snapshots.find(s => s.phase === 'after');
            
            return (
              <div 
                key={session.sessionId} 
                className={`session-card ${selectedSession === session.sessionId ? 'selected' : ''}`}
                onClick={() => setSelectedSession(selectedSession === session.sessionId ? null : session.sessionId)}
              >
                <div className="session-header">
                  <div className="session-info">
                    <h3>{session.serviceName}</h3>
                    <div className="session-meta">
                      <span className="container-id">🐳 {session.containerId}</span>
                      <span className="session-time">
                        🕒 {new Date(session.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div 
                    className="session-status"
                    style={{ color: getStatusColor(session.status) }}
                  >
                    {session.status.toUpperCase()}
                  </div>
                </div>

                <div className="snapshots-summary">
                  <div className="snapshot-count">
                    📸 {session.snapshots.length} snapshot{session.snapshots.length !== 1 ? 's' : ''}
                  </div>
                  <div className="snapshot-phases">
                    {beforeSnapshot && (
                      <span className="phase-indicator before">BEFORE</span>
                    )}
                    {afterSnapshot && (
                      <span className="phase-indicator after">AFTER</span>
                    )}
                  </div>
                </div>

                {session.status === 'complete' && (
                  <div className="session-actions">
                    {!comparison ? (
                      <button 
                        className="compare-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCompareSession(session);
                        }}
                      >
                        🔬 Analyze Memory
                      </button>
                    ) : (
                      <div className="comparison-status">
                        <span 
                          className="status-indicator"
                          style={{ color: getStatusColor(comparison.status) }}
                        >
                          {comparison.status === 'completed' ? '✅' : '⏳'} 
                          {comparison.status.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {selectedSession === session.sessionId && (
                  <div className="session-details">
                    <div className="snapshots-detail">
                      <h4>Snapshots in this session:</h4>
                      {session.snapshots.map(snapshot => (
                        <div key={snapshot.id} className="snapshot-detail-item">
                          <div className="snapshot-detail-header">
                            <span className={`phase-badge ${snapshot.phase}`}>
                              {snapshot.phase.toUpperCase()}
                            </span>
                            <span className="snapshot-size">
                              {formatFileSize(snapshot.size)}
                            </span>
                          </div>
                          <div className="snapshot-detail-meta">
                            <span className="snapshot-time">
                              {new Date(snapshot.timestamp).toLocaleTimeString()}
                            </span>
                            <span className="snapshot-file">
                              📄 {snapshot.filename}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {comparison && comparison.status === 'completed' && comparison.analysis && (
                      <div className="analysis-results">
                        <h4>Analysis Results:</h4>
                        <div className="analysis-summary">
                          <div className="growth-result">
                            <span className="growth-label">Memory Growth:</span>
                            <span 
                              className={`growth-value ${comparison.analysis.summary.suspiciousGrowth ? 'negative' : 'positive'}`}
                            >
                              {comparison.analysis.summary.suspiciousGrowth ? '⚠️ DETECTED' : '✅ STABLE'} 
                              ({comparison.analysis.summary.totalGrowthMB?.toFixed(2) || 'N/A'} MB)
                            </span>
                          </div>
                          
                          {comparison.analysis.summary.confidence && (
                            <div className="confidence-result">
                              <span className="confidence-label">Confidence:</span>
                              <span className="confidence-value">
                                {(comparison.analysis.summary.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          )}

                          {comparison.analysis.recommendations && comparison.analysis.recommendations.length > 0 && (
                            <div className="recommendations-result">
                              <h5>💡 Recommendations:</h5>
                              <ul>
                                {comparison.analysis.recommendations.slice(0, 3).map((rec, index) => (
                                  <li key={index}>{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .session-view {
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

        .loading {
          text-align: center;
          padding: 40px;
          color: #6c757d;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #6c757d;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .empty-state-title {
          font-size: 20px;
          font-weight: 500;
          margin-bottom: 10px;
          color: #495057;
        }

        .empty-state-description {
          font-size: 16px;
          margin-bottom: 20px;
        }

        .example-command {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 6px;
          font-family: monospace;
          border: 1px solid #e9ecef;
        }

        .sessions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 20px;
        }

        .session-card {
          background: white;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .session-card:hover {
          border-color: #007bff;
          box-shadow: 0 4px 12px rgba(0,123,255,0.15);
        }

        .session-card.selected {
          border-color: #007bff;
          background: #f8f9ff;
        }

        .session-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 15px;
        }

        .session-info h3 {
          margin: 0 0 5px 0;
          color: #2c3e50;
          font-size: 18px;
        }

        .session-meta {
          display: flex;
          flex-direction: column;
          gap: 3px;
          font-size: 13px;
          color: #6c757d;
        }

        .session-status {
          font-size: 12px;
          font-weight: bold;
          padding: 4px 8px;
          border-radius: 4px;
          background: #f8f9fa;
        }

        .snapshots-summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 6px;
        }

        .snapshot-count {
          font-size: 14px;
          color: #495057;
        }

        .snapshot-phases {
          display: flex;
          gap: 8px;
        }

        .phase-indicator {
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: bold;
        }

        .phase-indicator.before {
          background: #d4edda;
          color: #155724;
        }

        .phase-indicator.after {
          background: #f8d7da;
          color: #721c24;
        }

        .session-actions {
          margin-top: 15px;
        }

        .compare-btn {
          background: #007bff;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }

        .compare-btn:hover {
          background: #0056b3;
        }

        .comparison-status {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-indicator {
          font-size: 14px;
          font-weight: 500;
        }

        .session-details {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #e9ecef;
        }

        .snapshots-detail h4,
        .analysis-results h4 {
          color: #495057;
          margin: 0 0 15px 0;
          font-size: 16px;
        }

        .snapshot-detail-item {
          background: #f8f9fa;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 10px;
        }

        .snapshot-detail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 5px;
        }

        .phase-badge {
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 10px;
          font-weight: bold;
        }

        .phase-badge.before {
          background: #d4edda;
          color: #155724;
        }

        .phase-badge.after {
          background: #f8d7da;
          color: #721c24;
        }

        .snapshot-size {
          font-weight: 500;
          color: #495057;
        }

        .snapshot-detail-meta {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #6c757d;
        }

        .analysis-results {
          margin-top: 20px;
          padding: 15px;
          background: #f8f9ff;
          border-radius: 6px;
          border: 1px solid #e3f2fd;
        }

        .analysis-summary {
          margin-top: 10px;
        }

        .growth-result,
        .confidence-result {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          font-size: 14px;
        }

        .growth-label,
        .confidence-label {
          font-weight: 500;
          color: #495057;
        }

        .growth-value.negative {
          color: #dc3545;
          font-weight: bold;
        }

        .growth-value.positive {
          color: #28a745;
          font-weight: bold;
        }

        .confidence-value {
          font-weight: 500;
          color: #007bff;
        }

        .recommendations-result {
          margin-top: 15px;
        }

        .recommendations-result h5 {
          margin: 0 0 8px 0;
          color: #495057;
          font-size: 14px;
        }

        .recommendations-result ul {
          margin: 0;
          padding-left: 20px;
        }

        .recommendations-result li {
          margin-bottom: 4px;
          font-size: 13px;
          color: #6c757d;
        }
      `}</style>
    </div>
  );
};

export default SessionView;
