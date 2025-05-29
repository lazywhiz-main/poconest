import React from 'react';

interface MenuItem {
    id: string;
    icon: string;
    text: string;
    badge?: number;
    isActive?: boolean;
}

interface MenuSection {
    title: string;
    items: MenuItem[];
}

interface SideMenuProps {
    sections: MenuSection[];
    onItemClick: (itemId: string) => void;
}

export const SideMenu: React.FC<SideMenuProps> = ({ sections, onItemClick }) => {
    return (
        <div className="side-menu">
            {sections.map((section, index) => (
                <div key={index} className="menu-section">
                    <div className="menu-section-title">{section.title}</div>
                    {section.items.map((item) => (
                        <div
                            key={item.id}
                            className={`menu-item ${item.isActive ? 'active' : ''}`}
                            onClick={() => onItemClick(item.id)}
                        >
                            <div className="menu-icon">{item.icon}</div>
                            <div className="menu-text">{item.text}</div>
                            {item.badge && <div className="menu-badge">{item.badge}</div>}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}; 