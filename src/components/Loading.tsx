import React from 'react';

export function Loading() {
  return (
    <div className="container">
      <header className="header">
        <h1>🎈 PartyKit Lobby</h1>
        <p>Loading...</p>
      </header>
      
      <div className="main-content">
        <div className="loading-section">
          <div className="loading-spinner"></div>
          <p>Connecting to room...</p>
        </div>
      </div>
    </div>
  );
} 