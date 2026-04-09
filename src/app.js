// src/app.js — SPA Entry Point dengan Hash-based Router

import { render as renderLogin } from './modules/auth/auth.js';
import { render as renderDashboard } from './modules/dashboard/dashboard.js';
import { render as renderHistory } from './modules/history/history.js';
import { render as renderReminders } from './modules/reminder/reminderModule.js';
import { render as renderConsultation } from './modules/consultation/consultationModule.js';

const routes = {
  '#/login': renderLogin,
  '#/dashboard': renderDashboard,
  '#/history': renderHistory,
  '#/reminders': renderReminders,
  '#/consultation': renderConsultation,
};

function getContainer() {
  return document.getElementById('app');
}

function handleRoute() {
  const hash = window.location.hash || '';
  const renderFn = routes[hash];

  if (!renderFn) {
    navigate('#/login');
    return;
  }

  const container = getContainer();
  if (container) {
    renderFn(container);
  }
}

export function navigate(route) {
  window.location.hash = route;
}

document.addEventListener('DOMContentLoaded', handleRoute);
window.addEventListener('hashchange', handleRoute);
