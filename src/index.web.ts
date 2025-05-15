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

// Re-enable global styles 
const styleSheet = document.createElement('style');
styleSheet.type = 'text/css';
styleSheet.textContent = `
  html, body, #root {
    display: flex;
    flex: 1 1 100%;
    height: 100%;
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
    margin: 0;
    padding: 0;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Ubuntu, sans-serif;
  }

  @media (prefers-color-scheme: dark) {
    body {
      background-color: #121212;
      color: #ffffff;
    }
  }
`;
document.head.appendChild(styleSheet); 