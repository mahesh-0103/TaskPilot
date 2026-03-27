import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const extractTasks = async (text) => {
  const response = await api.post('/extract-tasks', { text });
  return response.data.tasks;
};

export const createWorkflow = async (tasks) => {
  const response = await api.post('/create-workflow', { tasks });
  return response.data.tasks;
};

export const monitorWorkflows = async (tasks) => {
  const response = await api.post('/monitor', { tasks });
  return response.data.logs;
};

export const selfHeal = async (tasks) => {
  const response = await api.post('/self-heal', { tasks });
  return response.data.tasks;
};

export const executeTasks = async (tasks) => {
  const response = await api.post('/execute-tasks', { tasks });
  return response.data.tasks;
};

export const simulateDelay = async (taskId) => {
  const response = await api.post('/simulate-delay', { task_id: taskId });
  return response.data;
};

export const getLogs = async () => {
  const response = await api.get('/logs');
  return response.data.logs;
};

export default {
  extractTasks,
  createWorkflow,
  monitorWorkflows,
  selfHeal,
  executeTasks,
  simulateDelay,
  getLogs,
};
