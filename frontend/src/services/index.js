import api from './api';

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

export const clientService = {
  list: (params) => api.get('/clients', { params }),
  get: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  suggest: (params) => api.get('/clients/suggest', { params }),
  setLocation: (id, data) => api.patch(`/clients/${id}/set-location`, data),
};

export const activityService = {
  checkIn: (data) => api.post('/activities/checkin', data),
  checkOut: (id, data) => api.post(`/activities/${id}/checkout`, data),
  quick: (data) => api.post('/activities/quick', data),
  myActivities: (params) => api.get('/activities/my', { params }),
  teamActivities: (params) => api.get('/activities/team', { params }),
  get: (id) => api.get(`/activities/${id}`),
  update: (id, data) => api.put(`/activities/${id}`, data),
  delete: (id) => api.delete(`/activities/${id}`),
};

export const catalogService = {
  list: (type, params) => api.get(`/catalogs/${type}`, { params }),
  create: (type, data) => api.post(`/catalogs/${type}`, data),
  update: (type, id, data) => api.put(`/catalogs/${type}/${id}`, data),
};

export const complianceService = {
  today: () => api.get('/compliance/today'),
  range: (params) => api.get('/compliance/range', { params }),
  kpis: (params) => api.get('/compliance/kpis', { params }),
};

export const dashboardService = {
  kpis: (params) => api.get('/dashboard/kpis', { params }),
  missing: (params) => api.get('/dashboard/missing', { params }),
  commercialStatus: (params) => api.get('/dashboard/commercial-status', { params }),
};

export const userService = {
  list: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  activate: (id) => api.patch(`/users/${id}/activate`),
  deactivate: (id) => api.patch(`/users/${id}/deactivate`),
  setRole: (id, role) => api.patch(`/users/${id}/role`, { role }),
  setManager: (id, managerUserId) => api.patch(`/users/${id}/manager`, { managerUserId }),
};

export const auditService = {
  list: (params) => api.get('/audit', { params }),
};

export const settingsService = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
};

export const biService = {
  factActivities: (params) => api.get('/bi/fact-activities', { params }),
  dimClients: () => api.get('/bi/dim-clients'),
  dimUsers: () => api.get('/bi/dim-users'),
  dimCatalogs: () => api.get('/bi/dim-catalogs'),
};
