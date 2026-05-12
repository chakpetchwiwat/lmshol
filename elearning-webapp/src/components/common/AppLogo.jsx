import React from 'react';
import loomaLogo from '../../assets/looma-logo.png';

const AppLogo = ({ className = '', imageClassName = '', height = 'h-16', width = 'w-auto' }) => (
  <div className={`flex items-center ${className}`}>
    <img
      src={loomaLogo}
      alt="Looma"
      className={`block object-contain ${height} ${width} ${imageClassName}`}
    />
  </div>
);

export default AppLogo;
