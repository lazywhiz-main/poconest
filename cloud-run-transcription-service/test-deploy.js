const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// テストエンドポイント
app.post('/test', (req, res) => {
  res.json({ message: 'Test endpoint working', body: req.body });
});

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});
