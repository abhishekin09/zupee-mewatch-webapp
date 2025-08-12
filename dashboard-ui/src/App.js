import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import SessionView from './components/SessionView';
import SnapshotComparison from './components/SnapshotComparison';
import './App.css';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:4000/dashboard';

function App() {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [ws, setWs] = useState(null);
  const [activeView, setActiveView] = useState('sessions');

  const connectWebSocket = useCallback(() => {
    const websocket = new WebSocket(WS_URL);
    
    websocket.onopen = () => {
      console.log('Connected to dashboard server');
      setConnectionStatus('connected');
    };

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    websocket.onclose = () => {
      console.log('Disconnected from dashboard server');
      setConnectionStatus('disconnected');
      
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (connectionStatus !== 'connected') {
          connectWebSocket();
        }
      }, 3000);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('error');
    };

    setWs(websocket);
    
    return websocket;
  }, [connectionStatus]);

  const handleWebSocketMessage = (message) => {
    // Handle snapshot-related WebSocket messages if needed
    console.log('WebSocket message received:', message);
  };

  useEffect(() => {
    // Connect WebSocket for snapshot functionality
    const websocket = connectWebSocket();
    
    return () => {
      if (websocket) {
        websocket.close();
      }
    };
  }, [connectWebSocket]);

  return (
    <div className="app">
      <Header connectionStatus={connectionStatus} />
      
      <nav className="view-tabs">
        <button 
          className={`tab-button ${activeView === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveView('sessions')}
        >
          📁 Sessions
        </button>
        <button 
          className={`tab-button ${activeView === 'realtime' ? 'active' : ''}`}
          onClick={() => setActiveView('realtime')}
        >
          🔴 Real-time
        </button>
      </nav>
      
      <main className="main-content">
        {activeView === 'sessions' ? (
          <SessionView />
        ) : (
          <SnapshotComparison websocket={ws} />
        )}
      </main>
    </div>
  );
}

export default App;
