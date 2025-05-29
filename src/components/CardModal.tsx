import { useState, useEffect } from 'react';

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (card: {
    id?: number;
    title: string;
    content: string;
    sources: Array<{
      id?: number;
      title: string;
      url: string;
      description?: string;
    }>;
  }) => void;
  initialData?: {
    id?: number;
    title: string;
    content: string;
    sources: Array<{
      id?: number;
      title: string;
      url: string;
      description?: string;
    }>;
    created_at?: string;
    updated_at?: string;
    created_by?: string;
  };
}

export default function CardModal({ isOpen, onClose, onSave, initialData }: CardModalProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [sources, setSources] = useState<Array<{
    id?: number;
    title: string;
    url: string;
    description?: string;
  }>>(initialData?.sources || []);
  const [newSource, setNewSource] = useState({ title: '', url: '', description: '' });

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setContent(initialData.content);
      setSources(initialData.sources);
    } else {
      setTitle('');
      setContent('');
      setSources([]);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initialData?.id,
      title,
      content,
      sources,
    });
  };

  const addSource = () => {
    if (newSource.title && newSource.url) {
      setSources([...sources, newSource]);
      setNewSource({ title: '', url: '', description: '' });
    }
  };

  const removeSource = (index: number) => {
    setSources(sources.filter((_: unknown, i: number) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-4">
          {initialData ? 'カードを編集' : '新しいカードを作成'}
        </h2>
        <form onSubmit={handleSubmit}>
          {/* メタ情報表示 */}
          {initialData && (
            <div className="mb-4 text-xs text-gray-500">
              {initialData.created_at && (
                <div>作成日: {new Date(initialData.created_at).toLocaleString()}</div>
              )}
              {initialData.updated_at && (
                <div>最終更新: {new Date(initialData.updated_at).toLocaleString()}</div>
              )}
              {initialData.created_by && (
                <div>作成者: {initialData.created_by}</div>
              )}
            </div>
          )}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タイトル
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              内容
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-2 border rounded h-32"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              出典
            </label>
            {sources.map((source: { title: string; url: string; description?: string }, index: number) => (
              <div key={index} className="flex items-center gap-2 mb-2">
                <div className="flex-1">
                  <div className="text-sm font-medium">{source.title}</div>
                  <div className="text-sm text-gray-500">{source.url}</div>
                  {source.description && (
                    <div className="text-sm text-gray-500">{source.description}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeSource(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  削除
                </button>
              </div>
            ))}
            <div className="mt-2">
              <input
                type="text"
                placeholder="タイトル"
                value={newSource.title}
                onChange={(e) => setNewSource({ ...newSource, title: e.target.value })}
                className="w-full p-2 border rounded mb-2"
              />
              <input
                type="url"
                placeholder="URL"
                value={newSource.url}
                onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                className="w-full p-2 border rounded mb-2"
              />
              <input
                type="text"
                placeholder="説明（任意）"
                value={newSource.description}
                onChange={(e) => setNewSource({ ...newSource, description: e.target.value })}
                className="w-full p-2 border rounded mb-2"
              />
              <button
                type="button"
                onClick={addSource}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                出典を追加
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-100"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 