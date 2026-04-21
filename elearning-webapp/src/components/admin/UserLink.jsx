import React from 'react';

/**
 * UserLink Component
 * A standardized way to display clickable user names that link to the User Detail Modal.
 * 
 * @param {string} userId - The unique identifier for the user.
 * @param {string} userName - The name to display.
 * @param {function} onViewUser - Click handler to open the UserDetailModal.
 * @param {string} className - Optional tailwind classes for the link.
 */
const UserLink = ({ userId, userName, onViewUser, className = '' }) => {
  // Data safety check: if no userId is provided, render as a plain string to avoid crashes
  if (!userId) {
    return <span className="text-slate-400 italic">ไม่ระบุชื่อพนักงาน</span>;
  }

  return (
    <button
      type="button"
      onClick={() => onViewUser?.(userId)}
      className={`font-bold text-slate-700 transition-colors hover:text-primary hover:underline text-left ${className}`}
      title={`ดูประวัติของ ${userName}`}
    >
      {userName || 'Unknown User'}
    </button>
  );
};

export default UserLink;
