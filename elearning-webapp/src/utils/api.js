import axios from 'axios';
import { DEFAULT_VALUES } from './constants/defaults';
import { API_DEFAULTS } from './constants/api';

// Smart API URL Detection
const getApiUrl = () => {
  const configuredApiUrl = import.meta.env.VITE_API_URL;
  if (configuredApiUrl) return configuredApiUrl;
  if (typeof window !== 'undefined') {
    return new URL(API_DEFAULTS.API_PATH, window.location.origin).toString();
  }
  return new URL(API_DEFAULTS.API_PATH, 'http://localhost:5000').toString();
};

const getBaseUrl = (apiUrl) => {
  if (/^https?:\/\//i.test(apiUrl)) {
    return new URL('.', apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`).toString().replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  if (apiUrl.endsWith(API_DEFAULTS.API_PATH)) {
    return apiUrl.slice(0, -API_DEFAULTS.API_PATH.length) || '';
  }

  return apiUrl.replace(/\/$/, '');
};

const API_URL = getApiUrl();
const BASE_URL = getBaseUrl(API_URL);

export const getFullUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads')) return `${BASE_URL}${url}`;
  return url;
};

export const isSignatureStorageKey = (url) => Boolean(url && !url.startsWith('http') && url.startsWith('signatures/'));

export const getSignaturePreviewUrl = async (fileKey) => {
  if (!isSignatureStorageKey(fileKey)) return getFullUrl(fileKey);
  const response = await api.get('/upload/signature-url', { params: { key: fileKey } });
  return response?.data?.url || '';
};

export const DEFAULT_COURSE_IMAGE = DEFAULT_VALUES.DEFAULT_COURSE_IMAGE;
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add interceptor to inject auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add interceptor to handle token expiry / unauth / response unwrapping
api.interceptors.response.use(
  (response) => {
    // 1. If the API returns success: false, treat it as an error to prevent state pollution
    if (response.data && response.data.success === false) {
      return Promise.reject({
        response: response,
        message: response.data.message || 'API Error'
      });
    }

    // 2. Automatically unwrap { success: true, data: ... } 
    // We return the WHOLE response object but with response.data being the inner data
    // This maintains compatibility with standard Axios usage (res.data)
    // CRITICAL: We must preserve sibling fields like 'summary', 'pagination', 'hasCertificate'
    if (response.data && response.data.success === true) {
      const { data, success, ...metadata } = response.data;
      if (data !== undefined) {
        return { 
          ...response, 
          data: data,
          ...metadata // Merges summary, pagination, etc. into the response object
        };
      }
    }
    return response;
  },
  (error) => {
    console.error("API Error Interceptor:", error.response ? { status: error.response.status, data: error.response.data } : error.message);
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Only redirect to login if we're not already there.
      // This prevents the page from refreshing on a failed login attempt,
      // which would wipe out the error message shown to the user.
      if (!window.location.pathname.endsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  getCurrentUser: () => api.get('/auth/me')
};

export const userAPI = {
  getCourses: () => api.get('/user/courses'),
  getBookmarkedCourses: () => api.get('/user/course-bookmarks'),
  getAnnouncements: () => api.get('/user/announcements'),
  getCourseDetails: (id) => api.get(`/user/courses/${id}`),
  getAnnouncementDetails: (id) => api.get(`/user/announcements/${id}`),
  enrollCourse: (id) => api.post(`/user/courses/${id}/enroll`),
  bookmarkCourse: (id) => api.post(`/user/courses/${id}/bookmark`),
  unbookmarkCourse: (id) => api.delete(`/user/courses/${id}/bookmark`),
  updateProgress: (lessonId, progress) => api.put(`/user/lessons/${lessonId}/progress`, { progress }),
  getPoints: () => api.get('/user/points'),
  getRewards: () => api.get('/user/rewards'),
  getCategories: () => api.get('/user/categories'),
  requestRedeem: (rewardId) => api.post(`/user/redeem/${rewardId}`),
  submitQuiz: (lessonId, data) => api.post(`/user/lessons/${lessonId}/quiz`, data),
  getAssessmentSubmission: (lessonId) => api.get(`/user/lessons/${lessonId}/assessment`),
  submitAssessment: (lessonId, data) => api.post(`/user/lessons/${lessonId}/assessment`, data),
  getAssessmentSubmissionDownloadUrl: (submissionId) => api.get(`/user/assessment-submissions/${submissionId}/download-url`),
  submitAnnouncementQuiz: (announcementId, data) => api.post(`/user/announcements/${announcementId}/quiz`, data),
  getLessonQuestions: (lessonId) => api.get(`/user/lessons/${lessonId}/questions`),
  getAnnouncementQuestions: (announcementId) => api.get(`/user/announcements/${announcementId}/questions`),
  getLessonDocumentAccess: (lessonId) => api.get(`/user/lessons/${lessonId}/document-access`),
  getAnnouncementDocumentAccess: (announcementId) => api.get(`/user/announcements/${announcementId}/document-access`),
  updateProfile: (data) => api.put('/user/profile', data),
  getCertificates: () => api.get('/user/certificates'),
  getUploadedCertificateDownloadUrl: (id) => api.get(`/user/certificates/${id}/download-url`),
  getLmsCertificates: () => api.get('/certificates/me'),
  getCertificateDownloadUrl: (id) => api.get(`/certificates/${id}/download-url`),
  verifyLmsCertificate: (token) => api.get(`/certificates/verify/${token}`),
  createCertificate: (data) => api.post('/user/certificates', data),
  updateCertificate: (id, data) => api.put(`/user/certificates/${id}`, data),
  deleteCertificate: (id) => api.delete(`/user/certificates/${id}`),
  getPointsHistory: () => api.get('/user/points'), // Alias for clarity
  getNotifications: () => api.get('/user/notifications'),
  markNotificationRead: (notificationId) => api.put(`/user/notifications/${notificationId}/read`),
  markAllNotificationsRead: () => api.put('/user/notifications/read-all'),
  clearAllNotifications: () => api.delete('/user/notifications'),
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadCertificateFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/certificate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadProfileImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/profile-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadProfileFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/profile-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getProfileFileDownloadUrl: (fileKey) => api.get('/upload/profile-file-url', { params: { key: fileKey } }),
  uploadAssessmentFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/assessment', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadSignatureFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/signature', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getSettings: () => api.get('/settings'),
  getGoals: () => api.get('/goals'),
  getGoalDetails: (id) => api.get(`/goals/${id}`)
};

// Admin Endpoints
export const adminAPI = {
  getDashboardStats: (params) => api.get('/admin/dashboard', { params }),
  getAdvancedAnalytics: (params) => api.get('/admin/analytics', { params }),

  getUsers: () => api.get('/admin/users'),
  getUserDetails: (id) => api.get(`/admin/users/${id}/details`),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),

  getDepartments: () => api.get('/admin/departments'),
  createDepartment: (data) => api.post('/admin/departments', data),
  updateDepartment: (id, data) => api.put(`/admin/departments/${id}`, data),
  deleteDepartment: (id) => api.delete(`/admin/departments/${id}`),

  getTiers: () => api.get('/admin/tiers'),
  createTier: (data) => api.post('/admin/tiers', data),
  updateTier: (id, data) => api.put(`/admin/tiers/${id}`, data),
  deleteTier: (id) => api.delete(`/admin/tiers/${id}`),
  reorderTiers: (tierIds) => api.put('/admin/tiers/reorder', { tierIds }),

  getInstructorPresets: () => api.get('/admin/instructor-presets'),
  createInstructorPreset: (data) => api.post('/admin/instructor-presets', data),
  updateInstructorPreset: (id, data) => api.put(`/admin/instructor-presets/${id}`, data),
  deleteInstructorPreset: (id) => api.delete(`/admin/instructor-presets/${id}`),

  getOrganizationPresets: () => api.get('/admin/organization-presets'),
  createOrganizationPreset: (data) => api.post('/admin/organization-presets', data),
  updateOrganizationPreset: (id, data) => api.put(`/admin/organization-presets/${id}`, data),
  deleteOrganizationPreset: (id) => api.delete(`/admin/organization-presets/${id}`),

  getCourses: () => api.get('/admin/courses'),
  createCourse: (data) => api.post('/admin/courses', data),
  updateCourse: (id, data) => api.put(`/admin/courses/${id}`, data),
  republishCourse: (id) => api.put(`/admin/courses/${id}/republish`),
  archiveCourse: (id) => api.put(`/admin/courses/${id}/archive`),
  getCourseHistory: (id, params) => api.get(`/admin/courses/${id}/history`, { params }),
  deleteCourse: (id) => api.delete(`/admin/courses/${id}`),

  getAnnouncements: () => api.get('/admin/announcements'),
  createAnnouncement: (data) => api.post('/admin/announcements', data),
  getAnnouncementHistory: (id, config = {}) => api.get(`/admin/announcements/${id}/history`, config),
  archiveAnnouncement: (id) => api.put(`/admin/announcements/${id}/archive`),
  republishAnnouncement: (id) => api.put(`/admin/announcements/${id}/republish`),
  updateAnnouncement: (id, data) => api.put(`/admin/announcements/${id}`, data),
  deleteAnnouncement: (id) => api.delete(`/admin/announcements/${id}`),

  getCategories: () => api.get('/admin/categories'),
  createCategory: (data) => api.post('/admin/categories', data),
  updateCategory: (id, data) => api.put(`/admin/categories/${id}`, data),
  republishCategory: (id) => api.put(`/admin/categories/${id}/republish`),
  archiveCategory: (id) => api.put(`/admin/categories/${id}/archive`),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),
  reorderCategories: (data) => api.put('/admin/categories/reorder', data),

  getLessons: (courseId) => api.get(`/admin/courses/${courseId}/lessons`),
  createLesson: (data) => api.post('/admin/lessons', data),
  updateLesson: (id, data) => api.put(`/admin/lessons/${id}`, data),
  deleteLesson: (id) => api.delete(`/admin/lessons/${id}`),
  reorderLessons: (lessonIds) => api.put('/admin/lessons/reorder', { lessonIds }),

  getRewards: () => api.get('/admin/rewards'),
  createReward: (data) => api.post('/admin/rewards', data),
  updateReward: (id, data) => api.put(`/admin/rewards/${id}`, data),
  deleteReward: (id) => api.delete(`/admin/rewards/${id}`),

  getRedeems: () => api.get('/admin/redeems'),
  updateRedeemStatus: (id, status, adminNote = '') => api.put(`/admin/redeems/${id}/status`, { status, adminNote }),

  getCourseQuizReports: (courseId) => api.get(`/admin/courses/${courseId}/quiz-reports`),
  getAllAssessmentSubmissions: (params) => api.get('/admin/assessments', { params }),
  getCourseAssessmentSubmissions: (courseId) => api.get(`/courses/${courseId}/assessment-submissions`),
  gradeAssessmentSubmission: (courseId, submissionId, data) => api.patch(`/courses/${courseId}/assessment-submissions/${submissionId}/grade`, data),
  getAssessmentSubmissionDownloadUrl: (courseId, submissionId) => api.get(`/courses/${courseId}/assessment-submissions/${submissionId}/download-url`),
  // Certificates
  getPendingCertificates: () => api.get('/admin/certificates/pending'),
  getCourseCertificates: (courseId) => api.get(`/admin/courses/${courseId}/certificates`),
  getAllCertificates: (params) => api.get('/admin/certificates', { params }),
  retryCertificatePdf: (certificateId) => api.post(`/admin/certificates/${certificateId}/retry`),
  getCertificateDownloadUrl: (id) => api.get(`/certificates/${id}/download-url`),
  issueManual: (courseId, userId) => api.post(`/courses/${courseId}/certificates/issue/${userId}`),
  retryCertificate: (id) => api.post(`/certificates/${id}/retry`),
  reissueCertificate: (id) => api.post(`/certificates/${id}/reissue`),
  revokeCertificate: (id, data = {}) => api.post(`/certificates/${id}/revoke`, data),

  // File Upload
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadSignatureFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/signature', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // System Settings
  getSettings: () => api.get('/settings'),
  updateSetting: (key, value) => api.patch(`/settings/${key}`, { value }),

  // Goals
  getGoals: () => api.get('/goals?includeExpired=true'),
  createGoal: (data) => api.post('/goals', data),
  updateGoal: (id, data) => api.put(`/goals/${id}`, data),
  archiveGoal: (id) => api.put(`/goals/${id}/archive`),
  republishGoal: (id) => api.put(`/goals/${id}/republish`),
  deleteGoal: (id) => api.delete(`/goals/${id}`),
  getGoalReport: (id, config = {}) => api.get(`/goals/${id}/report`, config),
  getGoalTrackingSummary: (config = {}) => api.get('/goals/tracking-summary', config),

};

export const courseStaffAPI = {
  getStaff: (courseId) => api.get(`/courses/${courseId}/staff`),
  assignStaff: (courseId, data) => api.post(`/courses/${courseId}/staff`, data),
  updateStaff: (courseId, staffId, data) => api.patch(`/courses/${courseId}/staff/${staffId}`, data),
  deleteStaff: (courseId, staffId) => api.delete(`/courses/${courseId}/staff/${staffId}`)
};

export default api;
