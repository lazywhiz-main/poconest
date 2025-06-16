import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase/client';
import { Nest } from '../features/nest-space/types/nestSpace.types';
import { useAuth } from '../contexts/AuthContext';
import '../styles/nestlist.css';
import { ServiceHeader } from '../components/ServiceHeader';
import CommonButton from '../components/CommonButton';
import Icon from '../components/ui/Icon';
import { useNest } from '../features/nest/contexts/NestContext';
import LegalFooter from '../components/layout/LegalFooter';

interface OwnerInfo {
  id: string;
  display_name: string;
  avatar_url?: string;
}

export const NestListScreen: React.FC = () => {
  console.log('NestListScreen mounted!');
  const [nests, setNests] = useState<Nest[]>([]);
  const [loading, setLoading] = useState(false);  // Start with false
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'building' | 'inactive'>('all');
  const { user, isAuthenticated, session } = useAuth();
  const navigate = useNavigate();
  const [nestStats, setNestStats] = useState<Record<string, { cardCount: number; memberCount: number }>>({});
  const [ownerInfo, setOwnerInfo] = useState<Record<string, OwnerInfo>>({});
  const { setCurrentNestById } = useNest();

  // Failsafe timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.log('Failsafe: forcing loading to false');
      setLoading(false);
    }, 5000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    console.log('[NestListScreen] isAuthenticated:', isAuthenticated, 'loading:', loading, 'user:', user, 'session:', session);
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    console.log('🚀 useEffect[fetchNests] - 認証状態チェック:');
    console.log('  - isAuthenticated:', isAuthenticated);
    console.log('  - user:', user);
    console.log('  - session:', session);
    console.log('  - loading:', loading);
    
    // Fetch when authenticated (don't wait for loading to complete)
    if (isAuthenticated && user) {
      console.log('✅ 認証済み - fetchNests 実行');
      fetchNests();
    } else {
      console.log('❌ 未認証 - fetchNests スキップ');
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (nests.length === 0) return;
    const fetchStats = async () => {
      const stats: Record<string, { cardCount: number; memberCount: number }> = {};
      for (const nest of nests) {
        // ボードID取得
        const { data: boards } = await supabase.from('boards').select('id').eq('nest_id', nest.id);
        const boardIds = boards?.map(b => b.id) || [];
        // カード数
        let cardCount = 0;
        if (boardIds.length > 0) {
          const { count } = await supabase.from('board_cards').select('id', { count: 'exact', head: true }).in('board_id', boardIds);
          cardCount = count || 0;
        }
        // メンバー数
        const { count: memberCount } = await supabase.from('nest_members').select('user_id', { count: 'exact', head: true }).eq('nest_id', nest.id);
        stats[nest.id] = { cardCount, memberCount: memberCount || 0 };
      }
      setNestStats(stats);
    };
    fetchStats();
  }, [nests]);

  useEffect(() => {
    if (nests.length > 0) {
      fetchOwnerInfo();
    }
  }, [nests]);

  const fetchNests = async () => {
    try {
      console.log('🔍 fetchNests 開始 - ユーザー:', user?.id, user?.email);
      setLoading(true);
      
      if (!user) {
        console.log('❌ ユーザーが認証されていません');
        setError('認証されていません');
        setNests([]);
        return;
      }

      // 1. 自分がownerのNEST
      console.log('📋 Step 1: Fetching owned nests for user:', user.id);
      const { data: ownerNests, error: ownerError } = await supabase
        .from('nests')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      console.log('✅ ownerNests result:');
      console.log('  - count:', ownerNests?.length || 0);
      console.log('  - data:', ownerNests);
      console.log('  - error:', ownerError);
      if (ownerError) throw ownerError;

      // 2. 自分がmemberのNEST
      console.log('👥 Step 2: Fetching member relationships for user:', user.id);
      const { data: memberNests, error: memberError } = await supabase
        .from('nest_members')
        .select('nest_id')
        .eq('user_id', user.id);
      
      console.log('✅ memberNests result:');
      console.log('  - count:', memberNests?.length || 0);
      console.log('  - data:', memberNests);
      console.log('  - error:', memberError);
      if (memberError) throw memberError;
      
      const memberNestIds = memberNests?.map(m => m.nest_id) ?? [];
      console.log('📝 Extracted member nest IDs:', memberNestIds);

      // 3. メンバーNESTの詳細を取得
      let joinedNests = [];
      if (memberNestIds.length > 0) {
        console.log('🔍 Step 3: Fetching details for member nests:', memberNestIds);
        const { data: joinedNestsData, error: joinedError } = await supabase
          .from('nests')
          .select('*')
          .in('id', memberNestIds)
          .order('created_at', { ascending: false });

        console.log('✅ joinedNests result:');
        console.log('  - count:', joinedNestsData?.length || 0);
        console.log('  - data:', joinedNestsData);
        console.log('  - error:', joinedError);
        
        if (joinedError) throw joinedError;
        joinedNests = joinedNestsData || [];
      } else {
        console.log('⚠️ No member nest IDs found, skipping joined nests fetch');
      }

      // 4. 両方をマージ（重複除去）
      console.log('🔄 Step 4: Merging owned and joined nests');
      const ownedNestIds = new Set((ownerNests || []).map(n => n.id));
      const filteredJoinedNests = joinedNests.filter(n => !ownedNestIds.has(n.id));
      
      const allNests = [
        ...(ownerNests ?? []),
        ...filteredJoinedNests
      ];

      console.log('📊 Final results:');
      console.log('  - owned nests:', ownerNests?.length || 0);
      console.log('  - joined nests (after dedup):', filteredJoinedNests.length);
      console.log('  - total nests:', allNests.length);
      console.log('  - all nests data:', allNests);

      setNests(allNests);
      setError(null);

    } catch (err) {
      console.error('💥 Exception in fetchNests:', err);
      setError('Nestの取得に失敗しました: ' + (err as Error).message);
      setNests([]);
    } finally {
      setLoading(false);
      console.log('🏁 fetchNests 完了');
    }
  };

  const fetchOwnerInfo = async () => {
    try {
      const uniqueOwnerIds = [...new Set(nests.map(nest => nest.owner_id))];
      const ownerMap: Record<string, OwnerInfo> = {};
      
      // 各ユーザーの情報を個別に取得
      for (const ownerId of uniqueOwnerIds) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('id, display_name, avatar_url')
            .eq('id', ownerId)
            .single();
          
          console.log(`Fetching owner info for ${ownerId}:`, data, error);
          
          if (data && !error) {
            ownerMap[ownerId] = data;
          } else {
            console.error(`Error or no data for owner ${ownerId}:`, error);
            // デフォルト値を設定
            ownerMap[ownerId] = {
              id: ownerId,
              display_name: 'Anonymous User',
              avatar_url: undefined
            };
          }
        } catch (err) {
          console.error(`Exception fetching owner ${ownerId}:`, err);
          ownerMap[ownerId] = {
            id: ownerId,
            display_name: 'Anonymous User',
            avatar_url: undefined
          };
        }
      }
      
      setOwnerInfo(ownerMap);
    } catch (err) {
      console.error('Error in fetchOwnerInfo:', err);
    }
  };

  const handleCreateNest = () => {
    navigate('/nests/create');
  };

  const handleNestClick = async (nestId: string) => {
    await setCurrentNestById(nestId);
    navigate(`/nests/${nestId}`);
  };

  const handleNestSettings = (nestId: string) => {
    navigate(`/nest-settings?nestId=${nestId}`);
  };

  const filteredNests = nests.filter(nest => {
    if (filter === 'all') return true;
    return true;
  });

  console.log('[NestListScreen] RENDER: loading=', loading, 'error=', error, 'nestsCount=', nests.length);
  
  if (loading && nests.length === 0) {
    return (
      <div className="nest-list-screen">
        <ServiceHeader />
        <div style={{ padding: '20px', textAlign: 'center' }}>
          Loading nests...
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
            Debug: loading={loading.toString()}, nestsCount={nests.length}
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="nest-list-screen">
        <ServiceHeader />
        <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <ServiceHeader />
      <main className="main-content" role="main">
        <div className="page-header">
          <h1 className="page-title" style={{ fontSize: '1.5rem' }}>NEST LIST</h1>
          <p className="page-subtitle" style={{ fontSize: '0.9rem' }}>
            あなたのNEST（巣）を一覧・管理できます。<br />
            新しいNESTの作成や、既存NESTの設定・詳細もここから。
          </p>
          <div className="page-actions">
            <CommonButton variant="primary" onPress={handleCreateNest}>＋NEW NEST</CommonButton>
          </div>
        </div>
        <div className="workspace-grid" role="region" aria-label="NEST一覧">
          {filteredNests.length === 0 ? (
            <div style={{ color: 'var(--text-muted)' }}>
              NESTがありません
              <div style={{ marginTop: '20px', fontSize: '12px', fontFamily: 'monospace', textAlign: 'left', padding: '10px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>
                <div>🔍 デバッグ情報:</div>
                <div>- isAuthenticated: {isAuthenticated.toString()}</div>
                <div>- user.id: {user?.id || 'null'}</div>
                <div>- nests.length: {nests.length}</div>
                <div>- loading: {loading.toString()}</div>
                <div>- error: {error || 'null'}</div>
              </div>
            </div>
          ) : (
            filteredNests.map((nest) => (
              <article className="workspace-card" key={nest.id} data-status="active" tabIndex={0}>
                <div className="workspace-header">
                  <h3 className="nest-header-title">{nest.name}</h3>
                </div>
                <p className="workspace-description">{nest.description}</p>
                <div className="nest-stats-box">
                  <div className="nest-stat-item">
                    <span className="nest-stat-label">CARDS</span>
                    <span className="nest-stat-value">{nestStats[nest.id]?.cardCount ?? '-'}</span>
                  </div>
                  <div className="nest-stat-item">
                    <span className="nest-stat-label">MEMBERS</span>
                    <span className="nest-stat-value">{nestStats[nest.id]?.memberCount ?? '-'}</span>
                  </div>
                </div>
                <div className="nest-tag-badges">
                  <span className="tag-badge category-tech">AI支援</span>
                  <span className="tag-badge category-collab">コラボ</span>
                  <span className="tag-badge">ダミー</span>
                </div>
                <div className="nest-meta-info" style={{ fontSize: '11px', fontFamily: 'var(--font-family-mono)', color: 'var(--text-secondary)', marginTop: '8px', marginBottom: '8px' }}>
                  <div>Created : {new Date(nest.created_at).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/')}</div>
                  <div>Owner : {ownerInfo[nest.owner_id]?.display_name || 'Anonymous User'}</div>
                </div>
                <div className="nestlist-btn-row">
                  <CommonButton variant="primary" onPress={() => handleNestClick(nest.id)} style={{ borderRadius: 2, flex: 2, width: '100%' }}>ENTER</CommonButton>
                  <CommonButton variant="default" onPress={() => handleNestSettings(nest.id)} style={{ borderRadius: 2, flex: 1, width: '100%', marginLeft: 0 }}>SETTINGS</CommonButton>
                </div>
              </article>
            ))
          )}
        </div>
      </main>
      <LegalFooter />
    </div>
  );
};  