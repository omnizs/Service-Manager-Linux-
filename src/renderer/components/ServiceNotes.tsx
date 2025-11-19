import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { ServiceNote } from '../../types/service';

interface ServiceNotesProps {
  serviceId: string;
  serviceName: string;
  note?: ServiceNote;
  onSave: (note: string, tags: string[]) => void;
  onDelete: () => void;
  editingTrigger?: number | null;
}

const ServiceNotes: React.FC<ServiceNotesProps> = ({
  serviceId,
  serviceName,
  note,
  onSave,
  onDelete,
  editingTrigger,
}) => {
  const [noteText, setNoteText] = useState(note?.note || '');
  const [tags, setTags] = useState<string[]>(note?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setNoteText(note?.note || '');
    setTags(note?.tags || []);
    setHasChanges(false);
  }, [note, serviceId]);

  useEffect(() => {
    if (editingTrigger == null) return;
    setIsEditing(true);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  }, [editingTrigger, serviceId]);

  const handleSave = useCallback(() => {
    onSave(noteText, tags);
    setIsEditing(false);
    setHasChanges(false);
  }, [noteText, tags, onSave]);

  const handleCancel = useCallback(() => {
    setNoteText(note?.note || '');
    setTags(note?.tags || []);
    setIsEditing(false);
    setHasChanges(false);
  }, [note]);

  const handleNoteChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNoteText(e.target.value);
    setHasChanges(true);
  }, []);

  const handleAddTag = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!tags.includes(newTag)) {
        setTags([...tags, newTag]);
        setHasChanges(true);
      }
      setTagInput('');
    }
  }, [tagInput, tags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
    setHasChanges(true);
  }, [tags]);

  const handleDelete = useCallback(() => {
    if (window.confirm(`Delete note for ${serviceName}?`)) {
      onDelete();
      setNoteText('');
      setTags([]);
      setIsEditing(false);
      setHasChanges(false);
    }
  }, [serviceName, onDelete]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Service Notes
        </h3>
        <div className="flex gap-2">
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs px-2 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
              aria-label="Edit note"
            >
              {note ? 'Edit' : 'Add Note'}
            </button>
          )}
          {isEditing && (
            <>
              <button
                onClick={handleSave}
                disabled={!hasChanges}
                className="text-xs px-2 py-1 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                aria-label="Save note"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="text-xs px-2 py-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                aria-label="Cancel editing"
              >
                Cancel
              </button>
            </>
          )}
          {note && !isEditing && (
            <button
              onClick={handleDelete}
              className="text-xs px-2 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              aria-label="Delete note"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <textarea
            ref={textareaRef}
            value={noteText}
            onChange={handleNoteChange}
            placeholder="Add your notes about this service..."
            rows={4}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            aria-label="Service note text"
          />
          
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tags (press Enter to add)
            </label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="e.g., critical, monitoring, backup..."
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              aria-label="Add tag"
            />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-blue-600 dark:hover:text-blue-400"
                      aria-label={`Remove tag ${tag}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : note ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {note.note}
          </p>
          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {note.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-block px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Last updated: {formatDate(note.updatedAt)}
          </p>
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-500 italic">
          No notes for this service.
        </p>
      )}
    </div>
  );
};

export default ServiceNotes;
