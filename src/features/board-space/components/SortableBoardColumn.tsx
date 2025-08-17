import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { BoardItem } from '../../../services/SmartClusteringService';
import theme from '../../../styles/theme';

interface SortableBoardColumnProps {
  cards: BoardItem[];
  onEdit: (card: BoardItem) => void;
  onOrderChange: (newOrder: BoardItem[]) => void;
  renderCard: (card: BoardItem) => React.ReactNode;
  columnTitle: string;
  onAddCard: () => void;
}

const SortableCard: React.FC<{ card: BoardItem; onEdit: (card: BoardItem) => void; renderCard: (card: BoardItem) => React.ReactNode; }> = ({ card, onEdit, renderCard }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  
  const handleClick = (e: React.MouseEvent) => {
    if (!isDragging) {
      e.stopPropagation();
      onEdit(card);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (listeners?.onMouseDown) {
      listeners.onMouseDown(e);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (listeners?.onMouseUp) {
      listeners.onMouseUp(e);
    }
    handleClick(e);
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        marginBottom: 8,
        cursor: 'pointer',
        touchAction: 'none',
      }}
      {...attributes}
      {...listeners}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {renderCard(card)}
    </div>
  );
};

const SortableBoardColumn: React.FC<SortableBoardColumnProps> = ({ cards, onEdit, onOrderChange, renderCard, columnTitle, onAddCard }) => {
  const [localCards, setLocalCards] = useState<BoardItem[]>([]);

  useEffect(() => {
    setLocalCards([...cards].sort((a, b) => a.order_index - b.order_index));
  }, [cards]);

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = localCards.findIndex(card => card.id === active.id);
    const newIndex = localCards.findIndex(card => card.id === over.id);
    const reordered = arrayMove(localCards, oldIndex, newIndex);
    setLocalCards(reordered);
    onOrderChange(reordered);
  };

  return (
    <View style={styles.column}>
      <View style={styles.columnHeader}>
        <Text style={styles.columnTitle}>{columnTitle}</Text>
        <TouchableOpacity style={styles.addCardButton} onPress={onAddCard}>
          <Text style={styles.iconText}>＋</Text>
        </TouchableOpacity>
      </View>
      <div style={{overflowY: 'auto', maxHeight: 600}}>
        <DndContext onDragEnd={handleDragEnd}>
          <SortableContext items={localCards.map(card => card.id)} strategy={verticalListSortingStrategy}>
            {localCards.map(card => (
              <SortableCard key={card.id} card={card} onEdit={onEdit} renderCard={renderCard} />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </View>
  );
};

const styles = StyleSheet.create({
  column: {
    flex: 1,
    margin: 4,
    backgroundColor: theme.colors.background.paper,
    borderRadius: 8,
    padding: 8,
  },
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  columnTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  addCardButton: {
    padding: 4,
  },
  iconText: {
    fontSize: 24,
    color: theme.colors.text.primary,
    textAlign: 'center',
    width: 24,
    height: 24,
  },
});

export default SortableBoardColumn; 