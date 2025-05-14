import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../types/board';
import { useBoard } from '../contexts/BoardContext';
import { generateRelationshipGraph, GraphData } from '../utils/RelationshipGraphGenerator';
import { BrandColors } from '../constants/Colors';

// react-native-svg と d3 をインポート
// これらのパッケージは別途インストールが必要
// npm install react-native-svg d3
import Svg, { Circle, Line, Text as SvgText, G } from 'react-native-svg';
import * as d3 from 'd3';

interface KnowledgeMapViewProps {
  centerCardId?: string;  // 中心となるカードのID（省略時は全体マップ）
  onCardPress?: (cardId: string) => void;
  onClose?: () => void;
}

const KnowledgeMapView: React.FC<KnowledgeMapViewProps> = ({ 
  centerCardId,
  onCardPress,
  onClose 
}) => {
  const { cards } = useBoard();
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulation, setSimulation] = useState<any>(null);
  const [nodePositions, setNodePositions] = useState<{[key: string]: {x: number, y: number}}>({}); 
  
  const windowWidth = Dimensions.get('window').width;
  const windowHeight = Dimensions.get('window').height;
  const width = windowWidth;
  const height = windowHeight * 0.7;
  
  // グラフデータの生成
  useEffect(() => {
    if (cards.length === 0) {
      setLoading(false);
      return;
    }
    
    try {
      const data = generateRelationshipGraph(cards, centerCardId);
      setGraphData(data);
      
      if (data.nodes.length > 0) {
        // D3.jsのシミュレーションを初期化
        const sim = d3.forceSimulation()
          .force('link', d3.forceLink().id((d: any) => d.id).distance(100))
          .force('charge', d3.forceManyBody().strength(-150))
          .force('center', d3.forceCenter(width / 2, height / 2))
          .force('collision', d3.forceCollide().radius((d: any) => d.value * 1.5));
          
        // ノードとリンクを設定
        sim.nodes(data.nodes as any[]);
        (sim.force('link') as d3.ForceLink<any, any>).links(data.edges);
        
        // 位置が更新されるたびに状態を更新
        sim.on('tick', () => {
          const positions: {[key: string]: {x: number, y: number}} = {};
          data.nodes.forEach((node, i) => {
            // typescriptの型エラーを回避するためにanyでキャスト
            const d3Node = sim.nodes()[i] as any;
            positions[node.id] = {
              x: Math.max(30, Math.min(width - 30, d3Node.x)),
              y: Math.max(30, Math.min(height - 30, d3Node.y))
            };
          });
          setNodePositions(positions);
        });
        
        setSimulation(sim);
      }
    } catch (error) {
      console.error('知識マップ生成エラー:', error);
    } finally {
      setLoading(false);
    }
    
    return () => {
      if (simulation) {
        simulation.stop();
      }
    };
  }, [cards, centerCardId, width, height]);
  
  // カテゴリ（カラム）に応じた色を返す
  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'inbox':
        return '#4FC3F7';  // 水色
      case 'insights':
        return '#66BB6A';  // 緑色
      case 'themes':
        return '#FFA726';  // オレンジ色
      case 'zoom':
        return '#EF5350';  // 赤色
      default:
        return '#BDBDBD';  // グレー
    }
  };
  
  // カテゴリ名を日本語で取得
  const getCategoryName = (category: string): string => {
    switch (category) {
      case 'inbox':
        return 'Inbox';
      case 'insights':
        return '洞察';
      case 'themes':
        return 'テーマ';
      case 'zoom':
        return 'Zoom';
      default:
        return category;
    }
  };
  
  // ノードをタップしたときの処理
  const handleNodePress = (nodeId: string) => {
    if (onCardPress) {
      onCardPress(nodeId);
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BrandColors.primary} />
        <Text style={styles.loadingText}>知識マップを生成中...</Text>
      </View>
    );
  }
  
  if (!graphData || graphData.nodes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="leaf-outline" size={48} color={BrandColors.text.tertiary} />
        <Text style={styles.emptyText}>表示できるカードがありません</Text>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>閉じる</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {centerCardId ? 'カード関連マップ' : '知識マップ全体'}
        </Text>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>
      
      {/* カテゴリー凡例 */}
      <View style={styles.legend}>
        {['inbox', 'insights', 'themes', 'zoom'].map(category => (
          <View key={category} style={styles.legendItem}>
            <View 
              style={[
                styles.legendColor, 
                { backgroundColor: getCategoryColor(category) }
              ]} 
            />
            <Text style={styles.legendText}>{getCategoryName(category)}</Text>
          </View>
        ))}
      </View>
      
      {/* グラフ表示 */}
      <View style={styles.graphContainer}>
        <Svg width={width} height={height}>
          {/* エッジ（リンク）の描画 */}
          {graphData.edges.map((edge, index) => {
            const sourcePos = nodePositions[edge.source];
            const targetPos = nodePositions[edge.target];
            
            if (!sourcePos || !targetPos) return null;
            
            return (
              <Line
                key={`edge-${index}`}
                x1={sourcePos.x}
                y1={sourcePos.y}
                x2={targetPos.x}
                y2={targetPos.y}
                stroke="#BDBDBD"
                strokeWidth={(edge.value / 10) * 2}
                strokeOpacity={0.6}
              />
            );
          })}
          
          {/* ノード（カード）の描画 */}
          {graphData.nodes.map((node, index) => {
            const pos = nodePositions[node.id];
            if (!pos) return null;
            
            return (
              <G
                key={`node-${index}`}
                onPress={() => handleNodePress(node.id)}
              >
                <Circle
                  cx={pos.x}
                  cy={pos.y}
                  r={node.value}
                  fill={getCategoryColor(node.category)}
                  fillOpacity={0.8}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                />
                <SvgText
                  x={pos.x}
                  y={pos.y}
                  fontSize={node.value / 2.5}
                  fill="#FFFFFF"
                  fontWeight="bold"
                  textAnchor="middle"
                  alignmentBaseline="central"
                >
                  {node.label}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>
      
      {/* 説明テキスト */}
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          • ノードをタップするとカードの詳細を表示します
        </Text>
        <Text style={styles.instructionText}>
          • 線の太さは関連度の強さを表します
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    backgroundColor: BrandColors.primary,
    height: 60,
    zIndex: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  graphContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: BrandColors.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: BrandColors.text.secondary,
    textAlign: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButtonSmall: {
    padding: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: BrandColors.text.secondary,
  },
  instructions: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  instructionText: {
    fontSize: 12,
    color: BrandColors.text.tertiary,
    marginBottom: 4,
  },
});

export default KnowledgeMapView; 