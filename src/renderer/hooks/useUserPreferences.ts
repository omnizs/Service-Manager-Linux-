import { useState, useEffect, useCallback, useRef } from 'react';
import type { ServiceNote } from '../../types/service';

interface UserPreferences {
  favorites: Set<string>;
  notes: Map<string, ServiceNote>;
}

const STORAGE_KEY = 'service-manager-preferences';

const loadPreferences = (): UserPreferences => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        favorites: new Set(parsed.favorites || []),
        notes: new Map(Object.entries(parsed.notes || {})),
      };
    }
  } catch (error) {
    console.error('Failed to load preferences', error);
  }
  return {
    favorites: new Set(),
    notes: new Map(),
  };
};

const savePreferences = (preferences: UserPreferences): void => {
  try {
    const serialized = {
      favorites: Array.from(preferences.favorites),
      notes: Object.fromEntries(preferences.notes),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch (error) {
    console.error('Failed to save preferences', error);
  }
};

export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences>(loadPreferences);
  const favoritesRef = useRef<Set<string>>(preferences.favorites);

  useEffect(() => {
    favoritesRef.current = preferences.favorites;
  }, [preferences.favorites]);

  useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);

  const toggleFavorite = useCallback((serviceId: string) => {
    setPreferences(prev => {
      const newFavorites = new Set(prev.favorites);
      if (newFavorites.has(serviceId)) {
        newFavorites.delete(serviceId);
      } else {
        newFavorites.add(serviceId);
      }
      return { ...prev, favorites: newFavorites };
    });
  }, []);

  const isFavorite = useCallback((serviceId: string): boolean => {
    return favoritesRef.current.has(serviceId);
  }, []);

  const setNote = useCallback((serviceId: string, note: string, tags: string[] = []) => {
    setPreferences(prev => {
      const newNotes = new Map(prev.notes);
      const existing = newNotes.get(serviceId);
      const now = Date.now();
      
      if (note.trim() === '' && tags.length === 0) {
        newNotes.delete(serviceId);
      } else {
        newNotes.set(serviceId, {
          serviceId,
          note: note.trim(),
          tags,
          createdAt: existing?.createdAt || now,
          updatedAt: now,
        });
      }
      
      return { ...prev, notes: newNotes };
    });
  }, []);

  const getNote = useCallback((serviceId: string): ServiceNote | undefined => {
    return preferences.notes.get(serviceId);
  }, [preferences.notes]);

  const deleteNote = useCallback((serviceId: string) => {
    setPreferences(prev => {
      const newNotes = new Map(prev.notes);
      newNotes.delete(serviceId);
      return { ...prev, notes: newNotes };
    });
  }, []);

  return {
    favorites: preferences.favorites,
    notes: preferences.notes,
    toggleFavorite,
    isFavorite,
    setNote,
    getNote,
    deleteNote,
  };
};
