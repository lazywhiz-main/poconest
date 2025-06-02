import { supabase } from '@services/supabase';
import { v4 as uuidv4 } from 'uuid';
import { SpaceType } from 'src/types/nestSpace.types';

export class SampleNestService {
  /**
   * サンプルNESTを作成
   */
  async createSampleNests(userId: string): Promise<void> {
    try {
      // サンプルNESTのデータ
      const sampleNests = [
        {
          name: '開発チーム',
          description: '開発チームのためのNEST',
          icon: '💻',
          spaces: [
            { type: SpaceType.CHAT, name: '全体チャット', icon: '💬' },
            { type: SpaceType.BOARD, name: 'タスク管理', icon: '📋' },
            { type: SpaceType.MEETING, name: 'ミーティング', icon: '🎥' }
          ]
        },
        {
          name: 'デザインチーム',
          description: 'デザインチームのためのNEST',
          icon: '🎨',
          spaces: [
            { type: SpaceType.CHAT, name: 'デザインチャット', icon: '💬' },
            { type: SpaceType.BOARD, name: 'デザインボード', icon: '🎯' },
            { type: SpaceType.ANALYSIS, name: 'ユーザー分析', icon: '📊' }
          ]
        },
        {
          name: 'プロジェクト管理',
          description: 'プロジェクト管理のためのNEST',
          icon: '📈',
          spaces: [
            { type: SpaceType.CHAT, name: 'プロジェクトチャット', icon: '💬' },
            { type: SpaceType.BOARD, name: 'プロジェクトボード', icon: '📋' },
            { type: SpaceType.MEETING, name: 'プロジェクト会議', icon: '🎥' }
          ]
        }
      ];

      // 各サンプルNESTを作成
      for (const nest of sampleNests) {
        // NESTを作成
        const { data: nestData, error: nestError } = await supabase
          .from('nests')
          .insert({
            id: uuidv4(),
            name: nest.name,
            description: nest.description,
            owner_id: userId,
            icon: nest.icon,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_active: true
          })
          .select()
          .single();

        if (nestError) throw nestError;

        // スペースを作成
        for (const space of nest.spaces) {
          const { error: spaceError } = await supabase
            .from('spaces')
            .insert({
              id: uuidv4(),
              nest_id: nestData.id,
              name: space.name,
              type: space.type,
              icon: space.icon,
              description: `${space.name}のための空間`,
              created_by: userId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              settings: {},
              is_default: false
            });

          if (spaceError) throw spaceError;
        }

        // ユーザーをNESTのメンバーとして追加
        const { error: memberError } = await supabase
          .from('nest_members')
          .insert({
            id: uuidv4(),
            nest_id: nestData.id,
            user_id: userId,
            role: 'owner',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (memberError) throw memberError;
      }
    } catch (error) {
      console.error('Failed to create sample nests:', error);
      throw error;
    }
  }
} 