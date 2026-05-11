import React from 'react';
import loomaLogo from '../../assets/looma-logo.png';

const AppLogo = ({ className = '', imageClassName = '', compact = false }) => (
  <div className={`flex items-center ${className}`}>
    <img
      src={loomaLogo}
      alt="Looma"
      className={`block object-contain ${compact ? 'h-10 w-auto' : 'h-16 w-auto'} ${imageClassName}`}
    />
  </div>
);

export default AppLogo;
