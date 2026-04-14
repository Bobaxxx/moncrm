import axios from 'axios';
import { supabase } from '../lib/supabase';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
});

// Middleware Axios: Injecter le Token Supabase dans chaque requête
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Prospects
export const getProspectDetail = (id) => api.get(`/prospects/${id}`);
export const getProspectLogs = (id) => api.get(`/prospects/${id}/logs`);
export const getProspects = (params) => api.get('/prospects', { params });
export const getProspectStats = () => api.get('/prospects/stats');
export const getKanbanData = () => api.get('/prospects/kanban');
export const createProspect = (data) => api.post('/prospects', data);
export const updateProspect = (id, data) => api.patch(`/prospects/${id}`, data);
export const deleteProspect = (id) => api.delete(`/prospects/${id}`);
export const bulkDeleteProspects = (ids) => api.delete('/prospects', { data: { ids } });
export const bulkUpdateProspects = (ids, updates) => api.post('/prospects/bulk-update', { ids, updates });

// Analytics
export const getDailyReport = (days = 30) => api.get(`/analytics/daily-report?days=${days}`);
export const getAnalyticsSummary = () => api.get('/analytics/summary');

// Import
export const uploadFile = (files, useFilter = true, reqData = {}) => {
  const formData = new FormData();
  if (Array.isArray(files)) {
    files.forEach(f => formData.append('files', f));
  } else {
    formData.append('files', files);
  }
  formData.append('useFilter', useFilter);
  if (reqData && reqData.category) {
    formData.append('category', reqData.category);
  }
  return api.post('/imports/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const previewFile = (files, useFilter = true) => {
  const formData = new FormData();
  if (Array.isArray(files)) {
    files.forEach(f => formData.append('files', f));
  } else {
    formData.append('files', files);
  }
  formData.append('useFilter', useFilter);
  return api.post('/imports/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000
  });
};

export const getImportHistory = () => api.get('/imports');
export const deleteImport = (id) => api.delete(`/imports/${id}`);
export const bulkDeleteImports = (ids) => api.post('/imports/bulk-delete', { ids });
export const updateImportOrder = (ids) => api.patch('/imports/reorder', { ids });
export const updateImportStatus = (id, is_completed) => api.patch(`/imports/${id}`, { is_completed });
export const updateImport = (id, data) => api.patch(`/imports/${id}`, data);

// SMS
export const getSmsTemplates = () => api.get('/sms/templates');
export const generateSmsLink = (prospectId) => api.get(`/sms/generate/${prospectId}`);

// Planning
export const getPlanningTasks = (params) => api.get('/planning', { params });
export const createPlanningTask = (data) => api.post('/planning', data);
export const updatePlanningTask = (id, data) => api.patch(`/planning/${id}`, data);
export const deletePlanningTask = (id) => api.delete(`/planning/${id}`);

export default api;
