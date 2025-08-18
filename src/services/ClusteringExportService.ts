import type { BoardItem } from './SmartClusteringService';

export interface ClusterExportData {
  exportDate: string;
  totalClusters: number;
  totalCards: number;
  clusters: ClusterExportItem[];
}

export interface ClusterExportItem {
  id: string;
  label: string;
  cardCount: number;
  cards: CardExportItem[];
  createdAt: string;
}

export interface CardExportItem {
  id: string;
  content: string;
  type: string;
  created_at: string;
  tags: string[];
}

export class ClusteringExportService {
  /**
   * クラスタリング結果をCSV形式でエクスポート
   */
  static exportToCSV(
    clusters: any[],
    clusterLabels: any[],
    cards: BoardItem[],
    filename?: string
  ): void {
    if (!clusters || clusters.length === 0) {
      throw new Error('エクスポートするクラスターがありません');
    }

    const csvData = clusters.map((cluster, index) => {
      const label = clusterLabels.find(l => l.clusterId === cluster.id)?.text || `Cluster ${index + 1}`;
      const cardIds = cluster.members || [];
      const clusterCards = cards.filter(card => cardIds.includes(card.id));
      
      return {
        'Cluster ID': cluster.id,
        'Cluster Label': label,
        'Card Count': cardIds.length,
        'Card IDs': cardIds.join(', '),
        'Card Contents': clusterCards.map(card => card.content).join(' | '),
        'Card Types': clusterCards.map(card => card.column_type || 'unknown').join(', '),
        'Created At': cluster.createdAt || new Date().toISOString()
      };
    });

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    this.downloadFile(csvContent, 'text/csv;charset=utf-8;', filename || `clustering_results_${this.getDateString()}.csv`);
  }

  /**
   * クラスタリング結果をJSON形式でエクスポート
   */
  static exportToJSON(
    clusters: any[],
    clusterLabels: any[],
    cards: BoardItem[],
    filename?: string
  ): void {
    if (!clusters || clusters.length === 0) {
      throw new Error('エクスポートするクラスターがありません');
    }

    const exportData: ClusterExportData = {
      exportDate: new Date().toISOString(),
      totalClusters: clusters.length,
      totalCards: cards.length,
      clusters: clusters.map((cluster, index) => {
        const label = clusterLabels.find(l => l.clusterId === cluster.id)?.text || `Cluster ${index + 1}`;
        const cardIds = cluster.members || [];
        const clusterCards = cards.filter(card => cardIds.includes(card.id));
        
        return {
          id: cluster.id,
          label: label,
          cardCount: cardIds.length,
          cards: clusterCards.map(card => ({
            id: card.id,
            content: card.content,
            type: card.column_type || 'unknown',
            created_at: card.created_at,
            tags: (card.metadata as any)?.tags || []
          })),
          createdAt: cluster.createdAt || new Date().toISOString()
        };
      })
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    this.downloadFile(jsonContent, 'application/json', filename || `clustering_results_${this.getDateString()}.json`);
  }

  /**
   * クラスタリング結果をExcel形式でエクスポート（CSVとして）
   */
  static exportToExcel(
    clusters: any[],
    clusterLabels: any[],
    cards: BoardItem[],
    filename?: string
  ): void {
    // Excel形式は複雑なので、CSVとして出力（Excelで開ける）
    this.exportToCSV(clusters, clusterLabels, cards, filename?.replace('.xlsx', '.csv') || `clustering_results_${this.getDateString()}.csv`);
  }

  /**
   * ファイルをダウンロード
   */
  private static downloadFile(content: string, mimeType: string, filename: string): void {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  /**
   * 日付文字列を取得
   */
  private static getDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * エクスポート可能かチェック
   */
  static canExport(clusters: any[]): boolean {
    return clusters && clusters.length > 0;
  }

  /**
   * サポートされているエクスポート形式
   */
  static getSupportedFormats(): Array<{ value: string; label: string; description: string }> {
    return [
      { value: 'csv', label: 'CSV', description: 'ExcelやGoogle Sheetsで開ける形式' },
      { value: 'json', label: 'JSON', description: 'プログラムで処理しやすい形式' },
      { value: 'excel', label: 'Excel (CSV)', description: 'CSVとして出力（Excelで開ける）' }
    ];
  }
}
