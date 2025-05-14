import createIconSet from './createIconSetShim';

// ダミーのグリフマップ
const glyphMap = {};

// よく使用されるアイコン名をマップに追加
[
  'add', 'remove', 'edit', 'delete', 'check', 'close', 'menu',
  'search', 'settings', 'person', 'home', 'arrow_back', 'arrow_forward',
  'chat', 'mail', 'favorite', 'star', 'warning', 'info', 'error',
  'camera', 'photo', 'image', 'video', 'music', 'play', 'pause',
  'share', 'save', 'upload', 'download', 'cloud', 'folder', 'file',
  'visibility', 'visibility_off', 'lock', 'lock_open', 'notifications'
].forEach(name => {
  glyphMap[name] = name.charCodeAt(0); // ダミーのコードポイント
});

export default createIconSet(glyphMap, 'Material Icons', 'MaterialIcons.ttf'); 