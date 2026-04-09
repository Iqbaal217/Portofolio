// src/app.js — SPA Entry Point dengan Hash-based Router

import { render as renderLogin, getSession } from './modules/auth/auth.js';
import { render as renderDashboard } from './modules/dashboard/dashboard.js';
import { render as renderHistory } from './modules/history/history.js';
import { render as renderReminders } from './modules/reminder/reminderModule.js';
import { render as renderConsultation } from './modules/consultation/consultationModule.js';
import { render as renderOnboarding, isOnboardingComplete } from './modules/user-profile/userProfile.js';

const routes = {
  '#/login':        renderLogin,
  '#/onboarding':   renderOnboarding,
  '#/dashboard':    renderDashboard,
  '#/history':      renderHistory,
  '#/reminders':    renderReminders,
  '#/consultation': renderConsultation,
};

function getContainer() {
  return document.getElementById('app');
}

function handleRoute() {
  const hash = window.location.hash || '';
  const container = getContainer();
  if (!container) return;

  // Jika tidak ada session → login
  if (hash !== '#/login' && !getSession()) {
    navigate('#/login');
    return;
  }

  // Jika sudah login tapi belum onboarding → onboarding
  if (hash === '#/dashboard' && getSession() && !isOnboardingComplete()) {
    navigate('#/onboarding');
    return;
  }

  const renderFn = routes[hash];
  if (!renderFn) {
    navigate(getSession() ? '#/dashboard' : '#/login');
    return;
  }

  renderFn(container);
}

export function navigate(route) {
  window.location.hash = route;
}

document.addEventListener('DOMContentLoaded', handleRoute);
window.addEventListener('hashchange', handleRoute);
