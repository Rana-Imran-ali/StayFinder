import { api } from './api';

export const favoritesApi = {
  /**
   * Get the current user's favorited properties.
   */
  getFavorites: async () => {
    const res: any = await api.get('/favorites');
    return res?.data ?? res;
  },

  /**
   * Toggle favorite for a property (add or remove).
   * Returns { is_favorited: boolean, message: string }
   */
  toggleFavorite: async (propertyId: number) => {
    const res: any = await api.post(`/favorites/${propertyId}/toggle`);
    return res as { is_favorited: boolean; message: string };
  },

  /**
   * Check if a property is favorited by the current user.
   */
  checkFavorite: async (propertyId: number) => {
    const res: any = await api.get(`/favorites/${propertyId}/check`);
    return res as { is_favorited: boolean };
  },
};
