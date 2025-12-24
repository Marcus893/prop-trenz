// Transaction Notes component
import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { TransactionNote, NoteType } from '@/lib/transactions/types';
import { Plus, Trash2, MessageSquare, Phone, Mail, Users, Lightbulb } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es, zhCN, enUS } from 'date-fns/locale';

interface TransactionNotesProps {
  notes: TransactionNote[];
  onAddNote: (content: string, noteType: NoteType) => Promise<void>;
  onDeleteNote?: (id: string) => Promise<void>;
  maxDisplay?: number;
}

const NOTE_TYPE_ICONS: Record<NoteType, React.ReactNode> = {
  general: <MessageSquare className="w-4 h-4" />,
  call: <Phone className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  meeting: <Users className="w-4 h-4" />,
  decision: <Lightbulb className="w-4 h-4" />,
};

const NOTE_TYPE_COLORS: Record<NoteType, string> = {
  general: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  call: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
  email: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400',
  meeting: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
  decision: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400',
};

export function TransactionNotes({
  notes,
  onAddNote,
  onDeleteNote,
  maxDisplay,
}: TransactionNotesProps) {
  const { t } = useTranslation('transactions');
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteType, setNewNoteType] = useState<NoteType>('general');
  const [showAll, setShowAll] = useState(false);

  const locale = router.locale === 'es' ? es : router.locale === 'zh' ? zhCN : enUS;

  const displayedNotes = maxDisplay && !showAll ? notes.slice(0, maxDisplay) : notes;
  const hasMore = maxDisplay && notes.length > maxDisplay && !showAll;

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;
    await onAddNote(newNoteContent.trim(), newNoteType);
    setNewNoteContent('');
    setNewNoteType('general');
    setShowAddForm(false);
  };

  const noteTypes: NoteType[] = ['general', 'call', 'email', 'meeting', 'decision'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {t('notes.title')}
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {notes.length} {t('notes.entries')}
          </span>
        </div>
      </div>

      {/* Notes list */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-96 overflow-y-auto">
        {displayedNotes.map((note) => (
          <div key={note.id} className="p-3">
            <div className="flex items-start gap-3">
              {/* Type icon */}
              <div className={`p-2 rounded-full ${NOTE_TYPE_COLORS[note.note_type]}`}>
                {NOTE_TYPE_ICONS[note.note_type]}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                  {note.content}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale })}
                </p>
              </div>

              {/* Delete button */}
              {onDeleteNote && (
                <button
                  onClick={() => onDeleteNote(note.id)}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}

        {notes.length === 0 && (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            {t('notes.empty')}
          </div>
        )}
      </div>

      {/* Show more */}
      {hasMore && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full p-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 border-t border-gray-200 dark:border-gray-700"
        >
          {t('notes.show_all', { count: notes.length - (maxDisplay || 0) })}
        </button>
      )}

      {/* Add note form */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        {showAddForm ? (
          <div className="space-y-3">
            {/* Note type selector */}
            <div className="flex gap-2">
              {noteTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setNewNoteType(type)}
                  className={`
                    flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                    ${newNoteType === type
                      ? NOTE_TYPE_COLORS[type]
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    }
                  `}
                >
                  {NOTE_TYPE_ICONS[type]}
                  {t(`notes.types.${type}`)}
                </button>
              ))}
            </div>

            {/* Content */}
            <textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder={t('notes.add_placeholder')}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none"
              autoFocus
            />

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewNoteContent('');
                  setNewNoteType('general');
                }}
                className="px-3 py-2 text-gray-600 dark:text-gray-400"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleAddNote}
                disabled={!newNoteContent.trim()}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {t('notes.add_button')}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700"
          >
            <Plus className="w-4 h-4" />
            {t('notes.add')}
          </button>
        )}
      </div>
    </div>
  );
}

export default TransactionNotes;
