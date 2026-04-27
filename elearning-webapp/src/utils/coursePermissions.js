/**
 * Simplified logic for course-level permissions (Frontend UX only)
 * 
 * Rules:
 * 1. Admin (role/effectiveRole/isAdmin) -> 'full'
 * 2. Course owner -> 'full'
 * 3. Course instructor -> 'limited'
 * 4. Course trainer -> 'read-only'
 * 5. Otherwise -> 'none'
 * 
 * Note: Manager logic is handled by the backend. Frontend remains conservative.
 * 
 * @param {Object} params
 * @param {Object} params.currentUser - The currently logged in user
 * @param {Array} params.staff - List of staff assigned to the course
 * @returns {'full' | 'limited' | 'read-only' | 'none'}
 */
export const getCourseAccess = ({ currentUser, staff }) => {
  if (!currentUser) return 'none';

  // ID normalize
  const currentUserId = currentUser.userId || currentUser.id;

  // Admin check
  const isAdmin = 
    currentUser.role === 'admin' || 
    currentUser.effectiveRole === 'admin' || 
    currentUser.isAdmin === true;

  if (isAdmin) return 'full';

  if (!staff || !Array.isArray(staff)) return 'none';

  // Find all staff rows for current user
  const staffRoles = staff
    .filter((member) => {
      // Handle various ID field names from backend responses
      const memberUserId = member.userId || member.user?.id || member.id;
      return memberUserId === currentUserId;
    })
    .map((member) => member.role);

  // Apply priority
  if (staffRoles.includes('owner')) return 'full';
  if (staffRoles.includes('instructor')) return 'limited';
  if (staffRoles.includes('trainer')) return 'read-only';

  return 'none';
};

/**
 * Helper to check if a user has full edit permissions
 */
export const canUserEditCourse = (access) => access === 'full';

/**
 * Helper to check if a user has limited edit permissions (e.g. content only)
 */
export const canUserManageContent = (access) => access === 'full' || access === 'limited';

/**
 * Helper to check if a user has at least read access
 */
export const canUserViewCourse = (access) => access !== 'none';
