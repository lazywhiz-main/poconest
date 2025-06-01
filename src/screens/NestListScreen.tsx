import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Nest } from '../features/nest-space/types/nestSpace.types';
import { useAuth } from '../contexts/AuthContext';
import '../styles/nestlist.css';
import { ServiceHeader } from '../components/ServiceHeader';

export const NestListScreen: React.FC = () => {
  const [nests, setNests] = useState<Nest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'building' | 'inactive'>('all');
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    fetchNests();
  }, []);

  const fetchNests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('nests')
        .select('*');
      if (error) throw error;
      setNests(data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNest = () => {
    navigate('/create-nest');
  };

  const handleNestOpen = (nestId: string) => {
    navigate(`/nest-top?nestId=${nestId}`);
  };

  const handleNestSettings = (nestId: string) => {
    navigate(`/nest-settings?nestId=${nestId}`);
  };

  const filteredNests = nests.filter(nest => {
    if (filter === 'all') return true;
    return true;
  });

  return (
    <div style={{ width: '100%' }}>
      <ServiceHeader />
      <main className="main-content" role="main">
        <div className="page-header">
          <h1 className="page-title">NEST LIST</h1>
          <p className="page-subtitle">
            あなたのNEST（巣）を一覧・管理できます。<br />
            新しいNESTの作成や、既存NESTの設定・詳細もここから。
          </p>
          <div className="page-actions">
            <button className="btn" aria-label="新しいNESTを作成" onClick={handleCreateNest}>
              <span aria-hidden="true">＋</span> 新規作成
            </button>
            <div className="filter-tabs" role="tablist" aria-label="NESTフィルター">
              <button className={`filter-tab${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')} role="tab" aria-selected={filter === 'all'}>ALL</button>
              <button className={`filter-tab${filter === 'active' ? ' active' : ''}`} onClick={() => setFilter('active')} role="tab" aria-selected={filter === 'active'}>ACTIVE</button>
              <button className={`filter-tab${filter === 'building' ? ' active' : ''}`} onClick={() => setFilter('building')} role="tab" aria-selected={filter === 'building'}>BUILDING</button>
              <button className={`filter-tab${filter === 'inactive' ? ' active' : ''}`} onClick={() => setFilter('inactive')} role="tab" aria-selected={filter === 'inactive'}>INACTIVE</button>
            </div>
          </div>
        </div>
        <div className="workspace-grid" role="region" aria-label="NEST一覧">
          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <div style={{ color: 'var(--primary-red)' }}>{error}</div>
          ) : filteredNests.length === 0 ? (
            <div style={{ color: 'var(--text-muted)' }}>NESTがありません</div>
          ) : (
            filteredNests.map((nest) => (
              <article className="workspace-card" key={nest.id} data-status="active" tabIndex={0}>
                <div className="workspace-status status-active">
                  <span className="status-dot" aria-hidden="true"></span>
                  ACTIVE
                </div>
                <div className="workspace-card-main-col">
                  <h2 className="workspace-name">{nest.name}</h2>
                  <p className="workspace-description">{nest.description || 'Next.js + TypeScript + Prisma を使用したモダンECサイト。マイクロサービスアーキテクチャで高可用性を実現。'}</p>
                </div>
                <div className="workspace-meta-box">
                  <div className="meta-item">
                    <span className="meta-label">CREATED</span>
                    <span className="meta-value">{nest.created_at ? new Date(nest.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-'}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">UPDATED</span>
                    <span className="meta-value">{nest.updated_at ? new Date(nest.updated_at).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-'}</span>
                  </div>
                </div>
                <div className="workspace-tech tight">
                  <span className="tech-tag primary">NEXT.JS</span>
                  <span className="tech-tag">TYPESCRIPT</span>
                  <span className="tech-tag">PRISMA</span>
                  <span className="tech-tag">POSTGRESQL</span>
                  <span className="tech-tag">REDIS</span>
                </div>
                <div className="workspace-team-list">
                  <div className="team-initials">
                    <span className="team-initial">田</span>
                    <span className="team-initial">佐</span>
                    <span className="team-initial">山</span>
                    <span className="team-initial">+2</span>
                  </div>
                  <div className="team-count">5 members</div>
                </div>
                <div className="workspace-actions">
                  <button className="action-btn primary action-btn-open" onClick={() => handleNestOpen(nest.id)}>OPEN</button>
                  <button className="action-btn action-btn-settings" onClick={() => handleNestSettings(nest.id)}>SETTINGS</button>
                </div>
              </article>
            ))
          )}
        </div>
      </main>
    </div>
  );
}; 