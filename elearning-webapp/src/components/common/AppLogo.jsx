import React from 'react';
import loomaLogo from '../../assets/looma-logo.png';

const AppLogo = ({ className = '', imageClassName = '', compact = false }) => (
  <div className={`flex items-center ${className}`}>
    <img
      src={loomaLogo}
      alt="Looma"
      className={`block object-contain ${compact ? 'h-9 w-auto' : 'h-12 w-auto'} ${imageClassName}`}
    />
  </div>
);

export default AppLogo;
