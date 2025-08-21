import React, { memo, useRef, useCallback, useMemo, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
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
  
  // イベントハンドラーをuseCallbackで最適化
  const handleClick = useCallback(() => {
    onClick(node.id);
  }, [onClick, node.id]);

  const handleDoubleClick = useCallback(() => {
    onDoubleClick(node.id);
  }, [onDoubleClick, node.id]);
  
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
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
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
  
  // イベントハンドラーをuseCallbackで最適化
  const handleClick = useCallback(() => {
    onClick(edge.id);
  }, [onClick, edge.id]);
  
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
        zIndex: isHighlighted ? 2 : 1,
      }}
    >
      <path
        d={path}
        stroke={color}
        strokeWidth={strokeWidth}
        opacity={opacity}
        fill="none"
        style={{ cursor: 'pointer' }}
        onClick={handleClick}
      />
    </svg>
  );
});

NetworkEdge.displayName = 'NetworkEdge';

// 仮想化されたノードリストコンポーネント
const VirtualizedNodeList = memo<{
  nodes: NetworkNode[];
  transform: Viewport;
  nodePositions: Record<string, { x: number; y: number }>;
  selectedNode: NetworkNode | null;
  highlightedNodes: Set<string>;
  onNodeClick: (nodeId: string) => void;
  onNodeDoubleClick: (nodeId: string) => void;
}>(({ 
  nodes, 
  transform, 
  nodePositions, 
  selectedNode, 
  highlightedNodes, 
  onNodeClick, 
  onNodeDoubleClick 
}) => {
  const renderNode = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const node = nodes[index];
    const pos = nodePositions[node.id] || { x: node.x, y: node.y };
    
    // トランスフォームを適用
    const transformedPos = {
      x: (pos.x + transform.x) * transform.scale,
      y: (pos.y + transform.y) * transform.scale,
    };
    
    return (
      <div style={style}>
        <NetworkNode
          node={node}
          position={transformedPos}
          isSelected={selectedNode?.id === node.id}
          isHighlighted={highlightedNodes.has(node.id)}
          transform={transform}
          onClick={onNodeClick}
          onDoubleClick={onNodeDoubleClick}
        />
      </div>
    );
  }, [nodes, nodePositions, transform, selectedNode, highlightedNodes, onNodeClick, onNodeDoubleClick]);

  // 大量データの場合のみ仮想化を有効化
  if (nodes.length < 100) {
    return (
      <>
        {nodes.map(node => {
          const pos = nodePositions[node.id] || { x: node.x, y: node.y };
          const transformedPos = {
            x: (pos.x + transform.x) * transform.scale,
            y: (pos.y + transform.y) * transform.scale,
          };
          
          return (
            <NetworkNode
              key={node.id}
              node={node}
              position={transformedPos}
              isSelected={selectedNode?.id === node.id}
              isHighlighted={highlightedNodes.has(node.id)}
              transform={transform}
              onClick={onNodeClick}
              onDoubleClick={onNodeDoubleClick}
            />
          );
        })}
      </>
    );
  }

  return (
    <AutoSizer>
      {({ height, width }: { height: number; width: number }) => (
        <List
          height={height}
          width={width}
          itemCount={nodes.length}
          itemSize={60}
          itemData={nodes}
          overscanCount={5}
        >
          {renderNode}
        </List>
      )}
    </AutoSizer>
  );
});

VirtualizedNodeList.displayName = 'VirtualizedNodeList';

// WebGLレンダラークラス
class WebGLRenderer {
  private gl: WebGLRenderingContext | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private program: WebGLProgram | null = null;
  private isInitialized = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.initWebGL();
  }

  private initWebGL() {
    if (!this.canvas) return;

    try {
      // WebGLコンテキストの取得
      this.gl = this.canvas.getContext('webgl') as WebGLRenderingContext || 
                 this.canvas.getContext('experimental-webgl') as WebGLRenderingContext;
      
      if (!this.gl) {
        console.warn('WebGL not supported, falling back to Canvas 2D');
        return;
      }

      // WebGLの初期化
      this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
      
      // シェーダーの初期化
      this.initShaders();
      
      this.isInitialized = true;
      console.log('WebGL initialized successfully');
    } catch (error) {
      console.error('WebGL initialization failed:', error);
    }
  }

  private initShaders() {
    if (!this.gl) return;

    // 頂点シェーダー
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec4 a_color;
      varying vec4 v_color;
      uniform mat3 u_matrix;
      
      void main() {
        gl_Position = vec4((u_matrix * vec3(a_position, 1.0)).xy, 0, 1);
        v_color = a_color;
      }
    `;

    // フラグメントシェーダー
    const fragmentShaderSource = `
      precision mediump float;
      varying vec4 v_color;
      
      void main() {
        gl_FragColor = v_color;
      }
    `;

    // シェーダーの作成とリンク
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    if (vertexShader && fragmentShader) {
      this.program = this.createProgram(vertexShader, fragmentShader);
    }
  }

  private createShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;

    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  private createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
    if (!this.gl) return null;

    const program = this.gl.createProgram();
    if (!program) return null;

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Program linking error:', this.gl.getProgramInfoLog(program));
      this.gl.deleteProgram(program);
      return null;
    }

    return program;
  }

  // 強制的な初期化（Zoom操作の代替）
  public forceInitialization() {
    if (!this.gl || !this.canvas) return;

    // 最小限の描画を実行してGPUコンテキストを初期化
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    
    // 1x1ピクセルの描画でGPUコンテキストを確実に初期化
    this.gl.drawArrays(this.gl.POINTS, 0, 1);
    
    console.log('WebGL force initialization completed');
  }

  // ノードの描画
  public renderNodes(nodes: NetworkNode[], transform: Viewport) {
    if (!this.gl || !this.program || !this.isInitialized) {
      return false; // WebGLが利用できない場合はfalse
    }

    // WebGLでの描画処理
    this.gl.useProgram(this.program);
    
    // トランスフォーム行列の設定
    const matrixLocation = this.gl.getUniformLocation(this.program, 'u_matrix');
    if (matrixLocation) {
      const matrix = [
        transform.scale, 0, 0,
        0, transform.scale, 0,
        transform.x, transform.y, 1
      ];
      this.gl.uniformMatrix3fv(matrixLocation, false, matrix);
    }

    // ノードの描画
    nodes.forEach(node => {
      // ノードの位置と色を設定
      const positionLocation = this.gl!.getAttribLocation(this.program!, 'a_position');
      const colorLocation = this.gl!.getAttribLocation(this.program!, 'a_color');
      
      if (positionLocation !== -1 && colorLocation !== -1) {
        // 位置データ
        const positions = new Float32Array([node.x, node.y]);
        const positionBuffer = this.gl!.createBuffer();
        this.gl!.bindBuffer(this.gl!.ARRAY_BUFFER, positionBuffer);
        this.gl!.bufferData(this.gl!.ARRAY_BUFFER, positions, this.gl!.STATIC_DRAW);
        this.gl!.enableVertexAttribArray(positionLocation);
        this.gl!.vertexAttribPointer(positionLocation, 2, this.gl!.FLOAT, false, 0, 0);

        // 色データ
        const colors = new Float32Array([1.0, 1.0, 1.0, 1.0]); // 白色
        const colorBuffer = this.gl!.createBuffer();
        this.gl!.bindBuffer(this.gl!.ARRAY_BUFFER, colorBuffer);
        this.gl!.bufferData(this.gl!.ARRAY_BUFFER, colors, this.gl!.STATIC_DRAW);
        this.gl!.enableVertexAttribArray(colorLocation);
        this.gl!.vertexAttribPointer(colorLocation, 4, this.gl!.FLOAT, false, 0, 0);

        // 描画
        this.gl!.drawArrays(this.gl!.POINTS, 0, 1);
      }
    });

    return true; // WebGL描画が成功
  }

  // クリーンアップ
  public dispose() {
    if (this.gl && this.program) {
      this.gl.deleteProgram(this.program);
    }
  }
}

// メインのネットワークキャンバスコンポーネント
const NetworkCanvas: React.FC<NetworkCanvasProps> = memo(({
  data,
  onNodeClick,
  onNodeDoubleClick,
  onEdgeClick
}) => {
  const { state, setSelectedNode, setTransform } = useAnalysisSpace();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webglRendererRef = useRef<WebGLRenderer | null>(null);
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  // WebGLレンダラーの初期化
  useEffect(() => {
    if (canvasRef.current && !webglRendererRef.current) {
      webglRendererRef.current = new WebGLRenderer(canvasRef.current);
      
      // 強制的な初期化を実行
      setTimeout(() => {
        webglRendererRef.current?.forceInitialization();
      }, 100);
    }

    return () => {
      if (webglRendererRef.current) {
        webglRendererRef.current.dispose();
        webglRendererRef.current = null;
      }
    };
  }, []);

  // キャンバスサイズの調整
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      
      // WebGLレンダラーが利用可能な場合は強制初期化
      if (webglRendererRef.current) {
        webglRendererRef.current.forceInitialization();
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // マウスイベントハンドラー
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;

    const deltaX = e.clientX - lastMousePosRef.current.x;
    const deltaY = e.clientY - lastMousePosRef.current.y;

    const newTransform = {
      ...state.network.transform,
      x: state.network.transform.x + deltaX,
      y: state.network.transform.y + deltaY,
    };

    setTransform(newTransform);
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  }, [state.network.transform, setTransform]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    try {
      e.preventDefault();
    } catch (error) {
      console.warn('Wheel event preventDefault failed:', error);
    }
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(3, state.network.transform.scale * delta));
    
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
      
      setTransform(newTransform);
      
      // Zoom操作後にWebGLの強制初期化を実行
      setTimeout(() => {
        webglRendererRef.current?.forceInitialization();
      }, 50);
    }
  }, [state.network.transform, setTransform]);

  // ノードクリックハンドラー
  const handleNodeClick = useCallback((nodeId: string) => {
    const node = data.nodes.find(n => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
    }
    onNodeClick?.(nodeId);
  }, [data.nodes, setSelectedNode, onNodeClick]);

  const handleNodeDoubleClick = useCallback((nodeId: string) => {
    onNodeDoubleClick?.(nodeId);
  }, [onNodeDoubleClick]);

  const handleEdgeClick = useCallback((edgeId: string) => {
    onEdgeClick?.(edgeId);
  }, [onEdgeClick]);

  // 表示するノードとエッジの計算
  const visibleNodes = useMemo(() => {
    return data.nodes.filter(node => {
      const pos = state.network.nodePositions[node.id] || { x: node.x, y: node.y };
      const transformedPos = {
        x: (pos.x + state.network.transform.x) * state.network.transform.scale,
        y: (pos.y + state.network.transform.y) * state.network.transform.scale,
      };
      
      // ビューポート内のノードのみ表示
      return transformedPos.x >= -100 && 
             transformedPos.x <= window.innerWidth + 100 &&
             transformedPos.y >= -100 && 
             transformedPos.y <= window.innerHeight + 100;
    });
  }, [data.nodes, state.network.nodePositions, state.network.transform]);

  const visibleEdges = useMemo(() => {
    return data.edges.filter(edge => {
      const sourceNode = visibleNodes.find(n => n.id === edge.source);
      const targetNode = visibleNodes.find(n => n.id === edge.target);
      return sourceNode && targetNode;
    });
  }, [data.edges, visibleNodes]);

  // WebGL描画の実行
  useEffect(() => {
    if (webglRendererRef.current && visibleNodes.length > 0) {
      const webglSuccess = webglRendererRef.current.renderNodes(visibleNodes, state.network.transform);
      
      if (!webglSuccess) {
        // WebGLが失敗した場合はCanvas 2Dにフォールバック
        console.log('WebGL rendering failed, using Canvas 2D fallback');
      }
    }
  }, [visibleNodes, state.network.transform]);

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
      style={canvasStyle}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* WebGLキャンバス */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
      
      {/* エッジの描画（SVG） */}
      {visibleEdges.map(edge => {
        const sourceNode = visibleNodes.find(n => n.id === edge.source);
        const targetNode = visibleNodes.find(n => n.id === edge.target);
        
        if (!sourceNode || !targetNode) return null;
        
        const sourcePos = state.network.nodePositions[sourceNode.id] || { x: sourceNode.x, y: sourceNode.y };
        const targetPos = state.network.nodePositions[targetNode.id] || { x: targetNode.x, y: targetNode.y };
        
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
      
      {/* ノードの描画（仮想化） */}
      <VirtualizedNodeList
        nodes={visibleNodes}
        transform={state.network.transform}
        nodePositions={state.network.nodePositions}
        selectedNode={state.network.selectedNode}
        highlightedNodes={state.network.highlightedNodes}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
      />
    </div>
  );
});

NetworkCanvas.displayName = 'NetworkCanvas';

export default NetworkCanvas;
