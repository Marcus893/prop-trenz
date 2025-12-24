// Checklist component for a stage
import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { ChecklistItem, TransactionStage } from '@/lib/transactions/types';
import { Check, Circle, Plus, Trash2, ChevronDown, ChevronUp, Star, GripHorizontal } from 'lucide-react';

interface StageChecklistProps {
  items: ChecklistItem[];
  stage: TransactionStage;
  onToggle: (id: string, isCompleted: boolean) => Promise<void>;
  onAddItem?: (title: string, description?: string) => Promise<void>;
  onDeleteItem?: (id: string) => Promise<void>;
  onReorder?: (orderedIds: string[]) => Promise<void>;
  disabled?: boolean;
  isLoading?: boolean;
}

export function StageChecklist({
  items,
  stage,
  onToggle,
  onAddItem,
  onDeleteItem,
  onReorder,
  disabled = false,
  isLoading = false,
}: StageChecklistProps) {
  const { t } = useTranslation('transactions');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [togglingItem, setTogglingItem] = useState<string | null>(null);

  // Drag & drop state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const handleToggle = async (item: ChecklistItem) => {
    setTogglingItem(item.id);
    try {
      await onToggle(item.id, !item.is_completed);
    } finally {
      setTogglingItem(null);
    }
  };

  const handleAddItem = async () => {
    if (!newItemTitle.trim() || !onAddItem) return;
    await onAddItem(newItemTitle.trim(), newItemDescription.trim() || undefined);
    setNewItemTitle('');
    setNewItemDescription('');
    setShowAddForm(false);
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getItemTitle = (item: ChecklistItem): string => {
    if (item.custom_title) return item.custom_title;
    if (item.template?.title_key) return t(item.template.title_key, item.template.title_key);
    return 'Untitled';
  };

  const getItemDescription = (item: ChecklistItem): string | null => {
    if (item.custom_description) return item.custom_description;
    if (item.template?.description_key) return t(item.template.description_key, '');
    return null;
  };

  const completedCount = items.filter((i) => i.is_completed).length;
  const totalCount = items.length;

  // Primary ordering: use explicit item_order when available (manual ordering)
  const orderedItemsBase = [...items].sort((a, b) => ( (a.item_order ?? 0) - (b.item_order ?? 0) ));

  // If user is currently reordering, display localOrder mapping
  const displayItems = localOrder
    ? localOrder.map((id) => orderedItemsBase.find((it) => it.id === id)!).filter(Boolean)
    : orderedItemsBase;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {t('checklist.title')}
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {completedCount}/{totalCount}
          </span>
        </div>
      </div>

      {disabled ? (
        <div className="p-6 text-center text-gray-600 dark:text-gray-400">
          <p className="font-medium">{t('skipped_label')}</p>
          <p className="text-sm mt-1">{t('skip_financing_help')}</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {displayItems.map((item) => {
          const description = getItemDescription(item);
          const isExpanded = expandedItems.has(item.id);
          const isToggling = togglingItem === item.id;
          const isDragging = draggingId === item.id;
          const isDragOver = dragOverId === item.id;

          return (
            <div
              key={item.id}
              role="listitem"
              aria-grabbed={isDragging}
              draggable
              onDragStart={(e) => { e.dataTransfer.setData('text/plain', item.id); setDraggingId(item.id); }}
              onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
              onDragOver={(e) => { e.preventDefault(); setDragOverId(item.id); }}
              onDrop={async (e) => {
                e.preventDefault();
                const draggedId = e.dataTransfer.getData('text/plain');
                if (!draggedId) return;

                // Build new order
                const currentIds = displayItems.map((it) => it.id);
                const fromIndex = currentIds.indexOf(draggedId);
                const toIndex = currentIds.indexOf(item.id);
                if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

                const newIds = [...currentIds];
                newIds.splice(fromIndex, 1);
                newIds.splice(toIndex, 0, draggedId);

                // Optimistic local order
                setLocalOrder(newIds);
                setIsReordering(true);
                try {
                  if (onReorder) await onReorder(newIds);
                } catch (err) {
                  // revert local order on error
                  setLocalOrder(null);
                } finally {
                  setIsReordering(false);
                  setDraggingId(null);
                  setDragOverId(null);
                }
              }}
              className={`p-3 ${item.is_completed ? 'bg-gray-50 dark:bg-gray-900/50' : ''} ${isDragOver ? 'ring-2 ring-dashed ring-blue-300' : ''} ${isDragging ? 'opacity-60' : 'opacity-100'}`}
            >
              <div className="flex items-start gap-3">
                {/* Drag handle */}
                <div
                  className={`flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600 cursor-grab select-none ${isDragging ? 'text-blue-500' : ''}`}
                  title={t('checklist.drag_handle', 'Drag to reorder')}
                  aria-hidden="true"
                >
                  <GripHorizontal className="w-4 h-4" />
                </div>

                {/* Checkbox */}
                <button
                  onClick={() => handleToggle(item)}
                  disabled={isToggling}
                  className={`
                    mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center
                    transition-colors
                    ${item.is_completed
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
                    }
                    ${isToggling ? 'opacity-50' : ''}
                  `}
                >
                  {item.is_completed && <Check className="w-3 h-3" />}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`
                        font-medium
                        ${item.is_completed
                          ? 'text-gray-500 dark:text-gray-400 line-through'
                          : 'text-gray-900 dark:text-white'
                        }
                      `}
                    >
                      {getItemTitle(item)}
                    </span>
                    {item.template?.is_required && (
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>

                  {/* Description toggle */}
                  {description && (
                    <button
                      onClick={() => toggleExpanded(item.id)}
                      className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3 h-3" />
                          {t('checklist.hide_details')}
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3" />
                          {t('checklist.show_details')}
                        </>
                      )}
                    </button>
                  )}

                  {/* Expanded description */}
                  {isExpanded && description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 bg-gray-50 dark:bg-gray-900 p-2 rounded">
                      {description}
                    </p>
                  )}
                </div>

                {/* Delete button for custom items */}
                {!item.template_id && onDeleteItem && (
                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            {t('checklist.empty')}
          </div>
        )}
      </div>
      )}

      {/* Add custom item */}
      {onAddItem && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          {showAddForm ? (
            <div className="space-y-2 w-full">
              <input
                type="text"
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                placeholder={t('checklist.add_placeholder')}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddItem();
                  if (e.key === 'Escape') {
                    setShowAddForm(false);
                    setNewItemTitle('');
                    setNewItemDescription('');
                  }
                }}
                autoFocus
              />

              <textarea
                value={newItemDescription}
                onChange={(e) => setNewItemDescription(e.target.value)}
                placeholder={t('checklist.add_description_placeholder', 'Enter details (optional)')}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none h-20"
                onKeyDown={(e) => {
                  // Allow Ctrl/Cmd+Enter to submit from textarea
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleAddItem();
                  }
                }}
              />

              <div className="flex gap-2 items-center">
                <button
                  onClick={handleAddItem}
                  disabled={!newItemTitle.trim()}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('checklist.add_button')}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewItemTitle('');
                    setNewItemDescription('');
                  }}
                  className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              <Plus className="w-4 h-4" />
              {t('checklist.add_custom')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default StageChecklist;
