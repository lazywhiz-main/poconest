interface CardProps {
  id: string;
  title: string;
  content: string;
  sources: any[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByDisplayName?: string;
  onEdit: () => void;
  onDelete: () => void;
}

export default function Card({
  id,
  title,
  content,
  sources,
  createdAt,
  updatedAt,
  createdBy,
  createdByDisplayName,
  onEdit,
  onDelete,
}: CardProps) {
  const truncatedContent = content.length > 80 ? `${content.slice(0, 80)}...` : content;
  const formattedCreatedAt = new Date(createdAt).toLocaleString('ja-JP');
  const formattedUpdatedAt = new Date(updatedAt).toLocaleString('ja-JP');

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold">{title}</h3>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="text-blue-500 hover:text-blue-700"
          >
            編集
          </button>
          <button
            onClick={onDelete}
            className="text-red-500 hover:text-red-700"
          >
            削除
          </button>
        </div>
      </div>
      <p className="text-gray-600 mb-4">{truncatedContent}</p>
      {sources.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">出典</h4>
          <div className="space-y-2">
            {sources.map((source, index) => (
              <div key={index} className="text-sm">
                <div className="font-medium">{source.title}</div>
                <div className="text-gray-500">{source.url}</div>
                {source.description && (
                  <div className="text-gray-500">{source.description}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="text-sm text-gray-500">
        <div>作成: {formattedCreatedAt}</div>
        <div>更新: {formattedUpdatedAt}</div>
        <div>作成者: {createdByDisplayName || createdBy}</div>
      </div>
    </div>
  );
} 