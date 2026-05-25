import React from 'react';
import fdaLogo from '../../assets/fda-logo.webp';

const AppLogo = ({ className = '', imageClassName = '', height = 'h-16', width = 'w-auto' }) => (
  <div className={`flex items-center ${className}`}>
    <img
      src={fdaLogo}
      alt="FDA"
      className={`block object-contain ${height} ${width} ${imageClassName}`}
    />
  </div>
);

export default AppLogo;
