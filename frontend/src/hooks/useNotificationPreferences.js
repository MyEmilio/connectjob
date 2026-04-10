import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState({
    favorite_categories: [],
    notify_new_jobs: true,
    notify_messages: true,
    notify_applications: true,
    is_subscribed: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Fetch preferences on mount
  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/notifications/preferences');
      setPreferences(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching preferences:', err);
      setError(err.response?.data?.error || 'Eroare la încărcarea preferințelor');
    } finally {
      setLoading(false);
    }
  };

  // Update preferences
  const updatePreferences = useCallback(async (newPrefs) => {
    try {
      setSaving(true);
      await api.put('/notifications/preferences', newPrefs);
      setPreferences(prev => ({ ...prev, ...newPrefs }));
      setError(null);
      return true;
    } catch (err) {
      console.error('Error updating preferences:', err);
      setError(err.response?.data?.error || 'Eroare la salvarea preferințelor');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  // Add favorite category
  const addFavoriteCategory = useCallback(async (category) => {
    try {
      setSaving(true);
      const { data } = await api.post('/notifications/favorite-category', { category });
      setPreferences(prev => ({ ...prev, favorite_categories: data.favorite_categories }));
      setError(null);
      return true;
    } catch (err) {
      console.error('Error adding category:', err);
      setError(err.response?.data?.error || 'Eroare la adăugarea categoriei');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  // Remove favorite category
  const removeFavoriteCategory = useCallback(async (category) => {
    try {
      setSaving(true);
      const { data } = await api.delete(`/notifications/favorite-category/${encodeURIComponent(category)}`);
      setPreferences(prev => ({ ...prev, favorite_categories: data.favorite_categories }));
      setError(null);
      return true;
    } catch (err) {
      console.error('Error removing category:', err);
      setError(err.response?.data?.error || 'Eroare la ștergerea categoriei');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  // Toggle category (add if not exists, remove if exists)
  const toggleFavoriteCategory = useCallback(async (category) => {
    const normalizedCategory = category.toLowerCase();
    if (preferences.favorite_categories.includes(normalizedCategory)) {
      return removeFavoriteCategory(normalizedCategory);
    } else {
      return addFavoriteCategory(normalizedCategory);
    }
  }, [preferences.favorite_categories, addFavoriteCategory, removeFavoriteCategory]);

  return {
    preferences,
    loading,
    saving,
    error,
    fetchPreferences,
    updatePreferences,
    addFavoriteCategory,
    removeFavoriteCategory,
    toggleFavoriteCategory,
  };
}

export default useNotificationPreferences;
