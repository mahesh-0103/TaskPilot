import client from './client';
import useAuthStore from '../store/authStore';

const getToken = () => useAuthStore.getState().providerToken;

export const extractTasks = async (text) => {
  const { data } = await client.post('/extract-tasks', { text, token: getToken() });
  return data.tasks || [];
};

export const createWorkflow = async (tasks) => {
  const { data } = await client.post('/create-workflow', { tasks, token: getToken() });
  return data.tasks || tasks;
};

export const simulateDelay = async (taskId) => {
  const { data } = await client.post('/simulate-delay', { task_id: taskId, token: getToken() });
  return data;
};

export const selfHeal = async (tasks) => {
  const { data } = await client.post('/self-heal', { tasks, token: getToken() });
  return data.tasks || [];
};

export const getLogs = async () => {
  const { data } = await client.get('/logs');
  return data.logs || [];
};

export const getTasks = async () => {
  const { data } = await client.get('/tasks');
  return data.tasks || [];
};

export const pushToCalendar = async (taskId, accessToken) => {
  const { data } = await client.post('/calendar/push-task', {
    task_id: taskId,
    token: accessToken || getToken(),
  });
  return data;
};

export const sendReminder = async (taskId, accessToken, email) => {
  const { data } = await client.post('/send-reminder', {
    task_id: taskId,
    token: accessToken || getToken(),
    email,
  });
  return data;
};
