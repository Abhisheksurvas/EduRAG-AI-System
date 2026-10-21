const API_BASE = '/api';

export const getToken = (): string | null => {
  return localStorage.getItem('edurag_token');
};

export const setToken = (token: string): void => {
  localStorage.setItem('edurag_token', token);
};

export const removeToken = (): void => {
  localStorage.removeItem('edurag_token');
};

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    ...options.headers,
  };

  if (token) {
    (headers as any)['Authorization'] = `Bearer ${token}`;
  }

  // Do not set Content-Type if sending FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type' as keyof HeadersInit]) {
    (headers as any)['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  register: (body: any) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getMe: () => request('/auth/me'),

  // Dashboard
  getDashboard: () => request('/dashboard'),

  // Documents
  getDocuments: () => request('/documents'),
  getDocument: (id: string) => request(`/documents/${id}`),
  getDocumentChunks: (id: string) => request(`/documents/${id}/chunks`),
  uploadDocument: (formData: FormData) => request('/documents/upload', { method: 'POST', body: formData }),
  seedSampleDocuments: () => request('/documents/seed-sample', { method: 'POST' }),
  deleteDocument: (id: string) => request(`/documents/${id}`, { method: 'DELETE' }),
  deleteAllDocuments: () => request('/documents', { method: 'DELETE' }),

  // Chat
  getConversations: () => request('/chat/conversations'),
  createConversation: (title?: string) =>
    request('/chat/conversations', { method: 'POST', body: JSON.stringify({ title }) }),
  getConversation: (id: string) => request(`/chat/conversations/${id}`),
  updateConversation: (id: string, title: string) =>
    request(`/chat/conversations/${id}`, { method: 'PUT', body: JSON.stringify({ title }) }),
  deleteConversation: (id: string) => request(`/chat/conversations/${id}`, { method: 'DELETE' }),
  sendMessage: (body: { conversationId?: string; question: string; documentId?: string; marks?: number; language?: string }) =>
    request('/chat/message', { method: 'POST', body: JSON.stringify(body) }),
  editMessage: (messageId: string, body: { newQuestion: string; documentId?: string; marks?: number; language?: string }) =>
    request(`/chat/message/${messageId}`, { method: 'PUT', body: JSON.stringify(body) }),
  regenerateMessage: (messageId: string, body?: { marks?: number; documentId?: string; language?: string }) =>
    request(`/chat/message/${messageId}/regenerate`, { method: 'POST', body: JSON.stringify(body || {}) }),

  // Notes
  getNotes: () => request('/notes'),
  getNote: (id: string) => request(`/notes/${id}`),
  generateNotes: (body: any) => request('/notes/generate', { method: 'POST', body: JSON.stringify(body) }),
  updateNote: (id: string, body: any) => request(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteNote: (id: string) => request(`/notes/${id}`, { method: 'DELETE' }),
  deleteAllNotes: () => request('/notes', { method: 'DELETE' }),

  // Quiz
  getQuizzes: () => request('/quiz'),
  getQuiz: (id: string) => request(`/quiz/${id}`),
  generateQuiz: (body: any) => request('/quiz/generate', { method: 'POST', body: JSON.stringify(body) }),
  submitQuiz: (id: string, answers: Record<number, number>) =>
    request(`/quiz/${id}/submit`, { method: 'POST', body: JSON.stringify({ answers }) }),
  retryQuiz: (id: string) => request(`/quiz/${id}/retry`, { method: 'POST' }),
  deleteQuiz: (id: string) => request(`/quiz/${id}`, { method: 'DELETE' }),

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id: string) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'PUT' }),
  deleteNotification: (id: string) => request(`/notifications/${id}`, { method: 'DELETE' }),
  deleteAllNotifications: () => request('/notifications/clear-all', { method: 'DELETE' }),

  // Profile
  getProfile: () => request('/profile'),
  updateProfile: (body: any) => request('/profile', { method: 'PUT', body: JSON.stringify(body) }),

  // Search
  search: (q: string) => request(`/search?q=${encodeURIComponent(q)}`),

  // Health & Mongo Atlas
  getHealth: () => request('/health'),
  connectMongo: (mongoUri: string, dbName?: string) =>
    request('/health/connect-mongo', { method: 'POST', body: JSON.stringify({ mongoUri, dbName }) }),
};
