import { createRoot } from 'react-dom/client';
import React from 'react';
import App from './App';
import { setupVectorIconsForWeb } from './utils/iconSetup';

// Set up Vector Icons for web
setupVectorIconsForWeb();

// Initialize the app on web
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = createRoot(rootElement);
root.render(React.createElement(App));

// Handle global styling for React Native Web
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

// Add the stylesheet to the document head
document.head.appendChild(styleSheet); 