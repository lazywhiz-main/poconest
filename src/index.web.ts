import './index.css';
import { createRoot } from 'react-dom/client';
import React from 'react';
import App from './App'; // Re-enable App import
import { setupVectorIconsForWeb } from './utils/iconSetup'; // Re-enable

setupVectorIconsForWeb(); // Re-enable

// const TestApp = () => { ... }; // TestApp commented out or removed

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = createRoot(rootElement);
root.render(React.createElement(App)); // Render App again 