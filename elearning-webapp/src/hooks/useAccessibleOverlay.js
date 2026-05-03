import React from 'react';
import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const getFocusableElements = (container) => {
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      !element.hasAttribute('disabled') &&
      element.getAttribute('aria-hidden') !== 'true' &&
      !element.hidden
  );
};

const focusElement = (element) => {
  if (element && typeof element.focus === 'function') {
    element.focus();
  }
};

const useAccessibleOverlay = ({
  isOpen,
  onClose,
  containerRef,
  initialFocusRef,
}) => {
  const previousActiveElementRef = React.useRef(null);
  const onCloseRef = React.useRef(onClose);

  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    previousActiveElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const animationFrame = window.requestAnimationFrame(() => {
      const focusTarget =
        initialFocusRef?.current ||
        getFocusableElements(containerRef.current)[0] ||
        containerRef.current;

      focusElement(focusTarget);
    });

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = getFocusableElements(containerRef.current);

      if (focusableElements.length === 0) {
        event.preventDefault();
        focusElement(containerRef.current);
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        focusElement(lastElement);
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        focusElement(firstElement);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      focusElement(previousActiveElementRef.current);
    };
  }, [containerRef, initialFocusRef, isOpen]);
};

export default useAccessibleOverlay;
