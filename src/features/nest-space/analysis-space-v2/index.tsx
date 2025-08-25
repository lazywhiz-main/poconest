import React from 'react';
import { AnalysisSpaceProvider } from './contexts/AnalysisSpaceContext';
import AnalysisSpaceV2 from './components/AnalysisSpaceV2';

interface AnalysisSpaceV2WrapperProps {
  cards: any[];
  relationships: Array<{
    card_id: string;
    related_card_id: string;
    strength: number;
    relationship_type: string;
  }>;
  onNodeSelect?: (nodeId: string) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
  boardId: string;
  nestId: string;
}

const AnalysisSpaceV2Wrapper: React.FC<AnalysisSpaceV2WrapperProps> = (props) => {
  return (
    <AnalysisSpaceProvider>
      <AnalysisSpaceV2 {...props} />
    </AnalysisSpaceProvider>
  );
};

export default AnalysisSpaceV2Wrapper;
export { AnalysisSpaceProvider, useAnalysisSpace } from './contexts/AnalysisSpaceContext';
export { default as AnalysisSpaceV2TestPage } from './components/AnalysisSpaceV2TestPage';
export { default as RelationsSidePeak } from './components/RelationsSidePeak';
export { default as ClusteringSidePeak } from './components/ClusteringSidePeak';
export type * from './types';
