import React from 'react';
import { AnalysisSpaceProvider } from '../analysis-space-v2/contexts/AnalysisSpaceContext';
import AnalysisSpaceV3 from './components/AnalysisSpaceV3';

import TheoryBuildingSpace from './components/TheoryBuildingSpace';

interface AnalysisSpaceV3WrapperProps {
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

const AnalysisSpaceV3Wrapper: React.FC<AnalysisSpaceV3WrapperProps> = (props) => {
  return (
    <AnalysisSpaceProvider>
      <AnalysisSpaceV3 {...props} />
    </AnalysisSpaceProvider>
  );
};

export default AnalysisSpaceV3Wrapper;
export { TheoryBuildingSpace };
