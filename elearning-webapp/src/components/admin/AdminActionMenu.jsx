import React from 'react';
import ModalPortal from '../common/ModalPortal';

/**
 * Premium Admin Action Menu (Portal First)
 * 
 * @param {boolean} isOpen - Menu visibility state
 * @param {Function} onToggle - Function to toggle visibility
 * @param {Array} actions - Array of action objects: { icon: string, label: string, onClick: Function, className: string, iconClassName: string, hidden: boolean }
 */
const AdminActionMenu = ({ isOpen, onToggle, actions = [] }) => {
  const triggerRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const [menuPosition, setMenuPosition] = React.useState(null);

  useLayoutEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const menuHeight = 260; // Approximate height for course actions menu
      const spaceBelow = viewportHeight - rect.bottom;
      
      const shouldOpenUp = spaceBelow < menuHeight && rect.top > menuHeight;
      setMenuPosition({
        side: shouldOpenUp ? 'top' : 'bottom',
        top: rect.top + window.scrollY,
        bottom: rect.bottom + window.scrollY,
        left: rect.right + window.scrollX,
      });

      const handleScroll = () => onToggle();
      const handleClickOutside = (event) => {
        if (
          menuRef.current && !menuRef.current.contains(event.target) &&
          triggerRef.current && !triggerRef.current.contains(event.target)
        ) {
          onToggle();
        }
      };

      window.addEventListener('scroll', handleScroll, true);
      document.addEventListener('mousedown', handleClickOutside);
      
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    } else {
      setMenuPosition(null);
    }
  }, [isOpen, onToggle]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full border px-4 text-[13px] font-bold transition-all duration-200 ${
          isOpen 
            ? 'bg-slate-900 border-slate-900 shadow-lg text-white scale-[0.98]' 
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 shadow-sm active:scale-95'
        }`}
      >
        จัดการ
      </button>

      {isOpen && menuPosition && (
        <ModalPortal isOpen={isOpen} lockScroll={false}>
          <div 
            ref={menuRef}
            className={`fixed z-[9999] w-52 overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 p-1.5 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] backdrop-blur-xl animate-in fade-in duration-200 ${
              menuPosition.side === 'top' ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'
            }`}
            style={{
              top: menuPosition.side === 'top' ? 'auto' : `${menuPosition.bottom + 8}px`,
              bottom: menuPosition.side === 'top' ? `${window.innerHeight - (menuPosition.top - window.scrollY) + 8}px` : 'auto',
              left: `${menuPosition.left - 208}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {actions.filter(a => !a.hidden).map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    action.onClick();
                    onToggle();
                  }}
                  className={`group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-bold transition-all active:scale-98 ${action.className || 'text-slate-600 hover:bg-slate-50 hover:text-primary'}`}
                >
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${action.iconClassName || 'bg-slate-50 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary'}`}>
                    <Icon size={15} />
                  </div>
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        </ModalPortal>
      )}
    </>
  );
};

export default AdminActionMenu;
