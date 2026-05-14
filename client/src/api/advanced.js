import api from './axios';

// Batch jobs
export const createBatchJob = (data) => api.post('/advanced/batch-jobs', data);
export const listBatchJobs = (params = {}) => api.get('/advanced/batch-jobs', { params });
export const getBatchJob = (id) => api.get(`/advanced/batch-jobs/${id}`);
export const deleteBatchJob = (id) => api.delete(`/advanced/batch-jobs/${id}`);

// Comparison reports
export const createComparison = (data) => api.post('/advanced/comparisons', data);
export const listComparisons = (params = {}) => api.get('/advanced/comparisons', { params });
export const getComparison = (id) => api.get(`/advanced/comparisons/${id}`);
export const deleteComparison = (id) => api.delete(`/advanced/comparisons/${id}`);

// Auditor invitations
export const createInvite = (data) => api.post('/advanced/invites', data);
export const listInvites = (params = {}) => api.get('/advanced/invites', { params });
export const revokeInvite = (id) => api.delete(`/advanced/invites/${id}`);
export const accessInvite = (token) => api.get(`/advanced/invites/access/${token}`);

// CI/CD webhooks
export const triggerWebhookScan = (data) => api.post('/advanced/webhooks/scan', data);
export const listWebhookResults = (params = {}) => api.get('/advanced/webhooks/results', { params });

// Skill matrix
export const listSkills = (params = {}) => api.get('/advanced/skills', { params });
export const createSkill = (data) => api.post('/advanced/skills', data);
export const updateSkill = (id, data) => api.patch(`/advanced/skills/${id}`, data);
export const deleteSkill = (id) => api.delete(`/advanced/skills/${id}`);
export const suggestSkills = () => api.get('/advanced/skills/suggest');

// Portfolio scorecard
export const getPortfolio = () => api.get('/advanced/portfolio');

// Legal risk dashboard (existing analytics)
export const getLegalRisk = () => api.get('/analytics/legal-risk');

// Single-issue remediation (existing)
export const remediate = (data) => api.post('/ai/remediate', data);

// AI history
export const getAiHistory = (params = {}) => api.get('/ai/history', { params });

// User profile
export const getProfile = () => api.get('/advanced/profile');
export const updateProfile = (data) => api.put('/advanced/profile', data);
export const changePassword = (data) => api.post('/advanced/change-password', data);

// WCAG Knowledge Base
export const getWcagKb = (params = {}) => api.get('/advanced/wcag-kb', { params });

// Global search
export const globalSearch = (q, params = {}) => api.get('/search', { params: { q, ...params } });

// Export
export const exportItem = (feature, id, format = 'csv') =>
  api.get(`/export/${feature}/${id}`, { params: { format }, responseType: 'blob' });

// Score history
export const getScoreHistory = (feature, id) => api.get(`/score-history/${feature}/${id}`);

// Quick scan
export const quickScan = (html) => api.post('/ai/quick-scan', { html });
