// src/components/NavHUD.tsx
import React from 'react';
import { RouteInfo } from '../types';
import { formatDistance, formatDuration, formatETA, getManeuverIcon } from '../utils/helpers';

interface NavHUDProps {
  route: RouteInfo;
  currentStepIdx: number;
  onStop: () => void;
}

const NavHUD: React.FC<NavHUDProps> = ({ route, currentStepIdx, onStop }) => {
  const step = route.steps[currentStepIdx];
  const remaining = route.steps.slice(currentStepIdx);
  const remainingDist = remaining.reduce((acc, s) => acc + s.distance, 0);
  const remainingDur = remaining.reduce((acc, s) => acc + s.duration, 0);

  if (!step) return null;

  return (
    <div className="nav-hud">
      <div className="hud-label">Next maneuver</div>
      <div className="hud-instruction">
        <span style={{ marginRight: 6 }}>{getManeuverIcon(step.maneuver)}</span>
        {step.instruction}
      </div>
      <div className="hud-stats">
        <div className="hud-stat">
          <span className="val">{formatDistance(remainingDist).split(' ')[0]}</span>
          <span className="unit">{formatDistance(remainingDist).split(' ')[1]}</span>
        </div>
        <div className="hud-stat">
          <span className="val">{formatDuration(remainingDur)}</span>
        </div>
        <div className="hud-stat">
          <span className="val" style={{ fontSize: 14 }}>ETA</span>
          <span className="unit">{formatETA(remainingDur)}</span>
        </div>
      </div>
      <button className="hud-stop" onClick={onStop}>⏹ End Navigation</button>
    </div>
  );
};

export default NavHUD;
