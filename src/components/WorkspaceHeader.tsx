import React from 'react';

interface WorkspaceHeaderProps {
    title: string;
    onSettingsClick?: () => void;
    onWorkspaceClick?: () => void;
    onMinimizeClick?: () => void;
    onCloseClick?: () => void;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
    title,
    onSettingsClick,
    onWorkspaceClick,
    onMinimizeClick,
    onCloseClick,
}) => {
    return (
        <div className="workspace-header">
            <div className="workspace-title">{title}</div>
            <div className="workspace-controls">
                <button className="workspace-btn" onClick={onSettingsClick}>⚙</button>
                <button className="workspace-btn" onClick={onWorkspaceClick}>◉</button>
                <button className="workspace-btn" onClick={onMinimizeClick}>▲</button>
                <button className="workspace-btn" onClick={onCloseClick}>■</button>
            </div>
        </div>
    );
}; 