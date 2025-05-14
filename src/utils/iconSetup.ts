/**
 * Utility to set up React Native Vector Icons for Web
 * This includes creating CSS for the icon fonts
 */

export const setupVectorIconsForWeb = () => {
  // Only run this in browser environment
  if (typeof document === 'undefined') {
    return;
  }

  // Create a style element for Ionicons font
  const iconFontStyles = `
    @font-face {
      src: url(https://cdn.jsdelivr.net/npm/ionicons@5.5.1/dist/fonts/ionicons.woff2) format('woff2'),
           url(https://cdn.jsdelivr.net/npm/ionicons@5.5.1/dist/fonts/ionicons.woff) format('woff'),
           url(https://cdn.jsdelivr.net/npm/ionicons@5.5.1/dist/fonts/ionicons.ttf) format('truetype');
      font-family: 'Ionicons';
      font-weight: normal;
      font-style: normal;
    }
    
    @font-face {
      src: url(https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/webfonts/fa-solid-900.woff2) format('woff2'),
           url(https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/webfonts/fa-solid-900.woff) format('woff'),
           url(https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/webfonts/fa-solid-900.ttf) format('truetype');
      font-family: 'FontAwesome';
      font-weight: 900;
      font-style: normal;
    }
    
    @font-face {
      src: url(https://cdn.jsdelivr.net/npm/material-icons@1.13.6/iconfont/MaterialIcons-Regular.woff2) format('woff2'),
           url(https://cdn.jsdelivr.net/npm/material-icons@1.13.6/iconfont/MaterialIcons-Regular.woff) format('woff'),
           url(https://cdn.jsdelivr.net/npm/material-icons@1.13.6/iconfont/MaterialIcons-Regular.ttf) format('truetype');
      font-family: 'Material Icons';
      font-weight: normal;
      font-style: normal;
    }
  `;
  
  // Inject the style tag into the document head
  const style = document.createElement('style');
  style.type = 'text/css';
  style.appendChild(document.createTextNode(iconFontStyles));
  document.head.appendChild(style);
}; 