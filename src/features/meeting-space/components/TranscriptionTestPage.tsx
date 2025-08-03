import React from 'react';
import TranscriptionTest from './TranscriptionTest';

const TranscriptionTestPage: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>文字起こしテストページ</h1>
      <p>このページで文字起こし機能をテストできます。</p>
      <TranscriptionTest />
    </div>
  );
};

export default TranscriptionTestPage; 