import React from 'react';
import { PlayerHeader } from './PlayerHeader';

interface LoadingProps {
  playerName: string;
}

export function Loading({ playerName }: LoadingProps) {
  return (
    <div className="container">
      <PlayerHeader playerName={playerName} />
      
      <div className="main-content">
        <div className="loading-section">
          <div className="loading-spinner"></div>
          <p>Connecting to room...</p>
        </div>
      </div>
    </div>
  );
} 