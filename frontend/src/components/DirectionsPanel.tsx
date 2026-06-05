// src/components/DirectionsPanel.tsx
import React from 'react';
import { RouteInfo } from '../types';
import { formatDistance, formatDuration, getManeuverIcon } from '../utils/helpers';

interface DirectionsPanelProps {
  route: RouteInfo;
  activeStep: number;
  onStepClick: (idx: number) => void;
}

const DirectionsPanel: React.FC<DirectionsPanelProps> = ({ route, activeStep, onStepClick }) => {
  return (
    <div className="directions-panel">
      <div className="directions-header">Turn-by-turn directions</div>
      {route.steps.map((step, idx) => (
        <div
          key={idx}
          className={`step-item ${idx === activeStep ? 'active' : ''}`}
          onClick={() => onStepClick(idx)}
        >
          <div className="step-num">{idx + 1}</div>
          <div className="step-content">
            <div className="step-instruction">{step.instruction}</div>
            <div className="step-meta">
              {step.distance > 0 && <span>{formatDistance(step.distance)}</span>}
              {step.duration > 0 && <span>{formatDuration(step.duration)}</span>}
              {step.streetName && <span style={{ fontStyle: 'italic' }}>{step.streetName}</span>}
            </div>
          </div>
          <div className="step-maneuver">{getManeuverIcon(step.maneuver)}</div>
        </div>
      ))}
    </div>
  );
};

export default DirectionsPanel;
