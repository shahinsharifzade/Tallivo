import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './index.css';
import { App } from './App';
import { LocalStorageRepository } from './data/localStorageRepository';
import { AppDataProvider } from './state/AppDataProvider';

// The only place that picks a concrete storage backend.
const repository = new LocalStorageRepository();

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <AppDataProvider repository={repository}>
      <App />
    </AppDataProvider>
  </StrictMode>,
);
