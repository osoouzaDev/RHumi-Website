import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

const deviceTheme = window.matchMedia('(prefers-color-scheme: dark)');
const applySavedTheme = () => {
  const themePreference = localStorage.getItem('rhumi_theme');
  const resolvedTheme = themePreference === 'light' || themePreference === 'dark'
    ? themePreference
    : deviceTheme.matches ? 'dark' : 'light';
  document.documentElement.dataset['theme'] = resolvedTheme;
  document.documentElement.style.colorScheme = resolvedTheme;
};

applySavedTheme();
deviceTheme.addEventListener('change', () => {
  const themePreference = localStorage.getItem('rhumi_theme');
  if (themePreference !== 'light' && themePreference !== 'dark') applySavedTheme();
});

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
