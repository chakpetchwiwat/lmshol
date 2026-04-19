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
  return new URL(API_DEFAULTS.API_PATH, API_DEFAULTS.LOCAL_API_ORIGIN).toString();
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
    if (response.data && response.data.success === true && response.data.data !== undefined) {
      return { ...response, data: response.data.data };
    }
    return response;
  },
  (error) => {
    console.error("API Error Interceptor:", error.response?.data || error.message);
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
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
  getAnnouncements: () => api.get('/user/announcements'),
  getCourseDetails: (id) => api.get(`/user/courses/${id}`),
  getAnnouncementDetails: (id) => api.get(`/user/announcements/${id}`),
  enrollCourse: (id) => api.post(`/user/courses/${id}/enroll`),
  updateProgress: (lessonId, progress) => api.put(`/user/lessons/${lessonId}/progress`, { progress }),
  getPoints: () => api.get('/user/points'),
  getRewards: () => api.get('/user/rewards'),
  getCategories: () => api.get('/user/categories'),
  requestRedeem: (rewardId) => api.post(`/user/redeem/${rewardId}`),
  submitQuiz: (lessonId, data) => api.post(`/user/lessons/${lessonId}/quiz`, data),
  submitAnnouncementQuiz: (announcementId, data) => api.post(`/user/announcements/${announcementId}/quiz`, data),
  getLessonQuestions: (lessonId) => api.get(`/user/lessons/${lessonId}/questions`),
  getAnnouncementQuestions: (announcementId) => api.get(`/user/announcements/${announcementId}/questions`),
  getLessonDocumentAccess: (lessonId) => api.get(`/user/lessons/${lessonId}/document-access`),
  getAnnouncementDocumentAccess: (announcementId) => api.get(`/user/announcements/${announcementId}/document-access`),
  updateProfile: (data) => api.put('/user/profile', data),
  getPointsHistory: () => api.get('/user/points'), // Alias for clarity
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getSettings: () => api.get('/settings'),
  getGoals: () => api.get('/goals'),
  getGoalDetails: (id) => api.get(`/goals/${id}`)
};

// Admin Endpoints
export const adminAPI = {
  getDashboardStats: () => api.get('/admin/dashboard'),
  getAdvancedAnalytics: () => api.get('/admin/analytics'),

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


  getCourses: () => api.get('/admin/courses'),
  createCourse: (data) => api.post('/admin/courses', data),
  updateCourse: (id, data) => api.put(`/admin/courses/${id}`, data),
  republishCourse: (id) => api.put(`/admin/courses/${id}/republish`),
  archiveCourse: (id) => api.put(`/admin/courses/${id}/archive`),
  getCourseHistory: (id, params) => api.get(`/admin/courses/${id}/history`, { params }),
  deleteCourse: (id) => api.delete(`/admin/courses/${id}`),

  getAnnouncements: () => api.get('/admin/announcements'),
  createAnnouncement: (data) => api.post('/admin/announcements', data),
  getAnnouncementHistory: (id) => api.get(`/admin/announcements/${id}/history`),
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

  // File Upload
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // System Settings
  getSettings: () => api.get('/settings'),
  updateSetting: (key, value) => api.patch(`/settings/${key}`, { value }),
  
  // Goals
  getGoals: () => api.get('/goals?includeExpired=true'),
  createGoal: (data) => api.post('/goals', data),
  archiveGoal: (id) => api.put(`/goals/${id}/archive`),
  republishGoal: (id) => api.put(`/goals/${id}/republish`),
  deleteGoal: (id) => api.delete(`/goals/${id}`),
  getGoalReport: (id) => api.get(`/goals/${id}/report`),

};

export default api;
