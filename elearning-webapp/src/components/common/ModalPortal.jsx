import React from 'react';
import { createPortal } from 'react-dom';

const ModalPortal = ({ children, isOpen = true, lockScroll = true }) => {
  React.useEffect(() => {
    if (!isOpen || !lockScroll || typeof document === 'undefined') {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, lockScroll]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  return createPortal(children, document.body);
};

export default ModalPortal;
