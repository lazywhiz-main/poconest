import React, { memo, useRef, useCallback, useMemo, useEffect } from 'react';
import type { NetworkData, NetworkNode, NetworkEdge, Viewport } from '../types';
import { useAnalysisSpace } from '../contexts/AnalysisSpaceContext';

interface NetworkCanvasProps {
  data: NetworkData;
  onNodeClick?: (nodeId: string) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
}

// ノードタイプ別の設定
const NODE_CONFIG = {
  INBOX: { color: '#6c7086', icon: '📥' },
  QUESTIONS: { color: '#fbbf24', icon: '❓' },
  INSIGHTS: { color: '#a855f7', icon: '💡' },
  THEMES: { color: '#3b82f6', icon: '🎯' },
  ACTIONS: { color: '#f97316', icon: '⚡' },
} as const;

// エッジタイプ別の色
const EDGE_COLORS = {
  semantic: '#10b981',
  manual: '#3b82f6',
  derived: '#f59e0b',
} as const;

// 個別ノードコンポーネント（メモ化）
const NetworkNode = memo<{
  node: NetworkNode;
  position: { x: number; y: number };
  isSelected: boolean;
  isHighlighted: boolean;
  transform: Viewport;
  onClick: (nodeId: string) => void;
  onDoubleClick: (nodeId: string) => void;
}>(({ node, position, isSelected, isHighlighted, transform, onClick, onDoubleClick }) => {
  const config = NODE_CONFIG[node.type];
  const size = Math.max(20, Math.min(60, node.size * transform.scale));
  
  const nodeStyle = {
    position: 'absolute' as const,
    left: position.x - size / 2,
    top: position.y - size / 2,
    width: size,
    height: size,
    borderRadius: '50%',
    backgroundColor: config.color,
    border: isSelected ? '3px solid #00ff88' : isHighlighted ? '2px solid #fbbf24' : '2px solid #333366',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: Math.max(12, size * 0.4),
    color: '#ffffff',
    fontWeight: 'bold',
    boxShadow: isSelected ? '0 0 10px rgba(0, 255, 136, 0.5)' : '0 2px 8px rgba(0, 0, 0, 0.3)',
    transition: 'all 0.2s ease',
    zIndex: isSelected ? 10 : isHighlighted ? 5 : 1,
  };

  return (
    <div
      style={nodeStyle}
      onClick={() => onClick(node.id)}
      onDoubleClick={() => onDoubleClick(node.id)}
      title={`${node.title} (${node.type})`}
    >
      {config.icon}
    </div>
  );
});

NetworkNode.displayName = 'NetworkNode';

// 個別エッジコンポーネント（メモ化）
const NetworkEdge = memo<{
  edge: NetworkEdge;
  sourcePos: { x: number; y: number };
  targetPos: { x: number; y: number };
  isHighlighted: boolean;
  transform: Viewport;
  onClick: (edgeId: string) => void;
}>(({ edge, sourcePos, targetPos, isHighlighted, transform, onClick }) => {
  const color = EDGE_COLORS[edge.type];
  const opacity = isHighlighted ? 0.8 : 0.4;
  const strokeWidth = isHighlighted ? 3 : Math.max(1, edge.strength * 2);
  
  // 線の描画（SVG使用）
  const path = `M ${sourcePos.x} ${sourcePos.y} L ${targetPos.x} ${targetPos.y}`;
  
  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <path
        d={path}
        stroke={color}
        strokeWidth={strokeWidth}
        opacity={opacity}
        fill="none"
        strokeLinecap="round"
        onClick={() => onClick(edge.id)}
        style={{ cursor: 'pointer', pointerEvents: 'auto' }}
      />
    </svg>
  );
});

NetworkEdge.displayName = 'NetworkEdge';

// メインのネットワークキャンバスコンポーネント
const NetworkCanvas: React.FC<NetworkCanvasProps> = memo(({ 
  data, 
  onNodeClick, 
  onNodeDoubleClick, 
  onEdgeClick 
}) => {
  const { state, setSelectedNode, setHighlightedNodes, setTransform } = useAnalysisSpace();
  const canvasRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  // 表示範囲内のノードのみをフィルタリング（仮想化）
  const visibleNodes = useMemo(() => {
    const { transform, containerDimensions } = state.network;
    const margin = 100; // ビューポート外のマージン
    
    return data.nodes.filter(node => {
      const pos = state.network.nodePositions[node.id] || { x: node.x, y: node.y };
      const screenX = (pos.x + transform.x) * transform.scale;
      const screenY = (pos.y + transform.y) * transform.scale;
      
      return screenX >= -margin && 
             screenX <= containerDimensions.width + margin &&
             screenY >= -margin && 
             screenY <= containerDimensions.height + margin;
    });
  }, [data.nodes, state.network.transform, state.network.nodePositions, state.network.containerDimensions]);

  // 表示範囲内のエッジのみをフィルタリング
  const visibleEdges = useMemo(() => {
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
    
    return data.edges.filter(edge => 
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );
  }, [data.edges, visibleNodes]);

  // マウスイベントハンドラー
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      setSelectedNode(null);
    }
  }, [setSelectedNode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDraggingRef.current && canvasRef.current) {
      const deltaX = e.clientX - lastMousePosRef.current.x;
      const deltaY = e.clientY - lastMousePosRef.current.y;
      
      // トランスフォームを更新
      const newTransform = {
        ...state.network.transform,
        x: state.network.transform.x + deltaX / state.network.transform.scale,
        y: state.network.transform.y + deltaY / state.network.transform.scale,
      };
      
      // コンテキスト経由でトランスフォームを更新
      setTransform(newTransform);
      
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    }
  }, [state.network.transform, setTransform]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    // preventDefaultを安全に呼び出し
    try {
      e.preventDefault();
    } catch (error) {
      // passiveイベントリスナーの場合は無視
      console.warn('Wheel event preventDefault failed (passive listener):', error);
    }
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(3, state.network.transform.scale * delta));
    
    // ズーム中心をマウス位置に設定
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const newTransform = {
        ...state.network.transform,
        scale: newScale,
        x: state.network.transform.x + (mouseX / newScale - mouseX / state.network.transform.scale),
        y: state.network.transform.y + (mouseY / newScale - mouseY / state.network.transform.scale),
      };
      
      // コンテキスト経由でトランスフォームを更新
      setTransform(newTransform);
    }
  }, [state.network.transform, setTransform]);

  const handleNodeClick = useCallback((nodeId: string) => {
    const node = visibleNodes.find(n => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
    }
    onNodeClick?.(nodeId);
  }, [setSelectedNode, onNodeClick, visibleNodes]);

  const handleNodeDoubleClick = useCallback((nodeId: string) => {
    onNodeDoubleClick?.(nodeId);
  }, [onNodeDoubleClick]);

  const handleEdgeClick = useCallback((edgeId: string) => {
    onEdgeClick?.(edgeId);
  }, [onEdgeClick]);

  // キャンバスのスタイル
  const canvasStyle = {
    position: 'relative' as const,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#0f0f23',
    cursor: isDraggingRef.current ? 'grabbing' : 'grab',
  };

  return (
    <div
      ref={canvasRef}
      style={canvasStyle}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* エッジの描画 */}
      {visibleEdges.map(edge => {
        const sourceNode = visibleNodes.find(n => n.id === edge.source);
        const targetNode = visibleNodes.find(n => n.id === edge.target);
        
        if (!sourceNode || !targetNode) return null;
        
        const sourcePos = state.network.nodePositions[sourceNode.id] || { x: sourceNode.x, y: sourceNode.y };
        const targetPos = state.network.nodePositions[targetNode.id] || { x: targetNode.x, y: targetNode.y };
        
        // トランスフォームを適用
        const transformedSourcePos = {
          x: (sourcePos.x + state.network.transform.x) * state.network.transform.scale,
          y: (sourcePos.y + state.network.transform.y) * state.network.transform.scale,
        };
        const transformedTargetPos = {
          x: (targetPos.x + state.network.transform.x) * state.network.transform.scale,
          y: (targetPos.y + state.network.transform.y) * state.network.transform.scale,
        };
        
        return (
          <NetworkEdge
            key={edge.id}
            edge={edge}
            sourcePos={transformedSourcePos}
            targetPos={transformedTargetPos}
            isHighlighted={state.network.highlightedNodes.has(edge.source) || state.network.highlightedNodes.has(edge.target)}
            transform={state.network.transform}
            onClick={handleEdgeClick}
          />
        );
      })}
      
      {/* ノードの描画 */}
      {visibleNodes.map(node => {
        const pos = state.network.nodePositions[node.id] || { x: node.x, y: node.y };
        
        // トランスフォームを適用
        const transformedPos = {
          x: (pos.x + state.network.transform.x) * state.network.transform.scale,
          y: (pos.y + state.network.transform.y) * state.network.transform.scale,
        };
        
        return (
          <NetworkNode
            key={node.id}
            node={node}
            position={transformedPos}
            isSelected={state.network.selectedNode?.id === node.id}
            isHighlighted={state.network.highlightedNodes.has(node.id)}
            transform={state.network.transform}
            onClick={handleNodeClick}
            onDoubleClick={handleNodeDoubleClick}
          />
        );
      })}
    </div>
  );
});

NetworkCanvas.displayName = 'NetworkCanvas';

export default NetworkCanvas;
