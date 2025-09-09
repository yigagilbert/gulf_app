// utils/storage.js
import { logger } from './logger';

export const secureStorage = {
  setItem: (key, value) => {
    try {
      const serializedValue = JSON.stringify({
        value,
        timestamp: Date.now(),
        version: '1.0'
      });
      localStorage.setItem(key, serializedValue);
    } catch (error) {
      logger.error('Failed to save to localStorage:', error);
    }
  },

  getItem: (key) => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      
      // Check for data structure version compatibility
      if (parsed.version !== '1.0') {
        logger.warn('Storage version mismatch, clearing item:', key);
        localStorage.removeItem(key);
        return null;
      }

      return parsed.value;
    } catch (error) {
      logger.error('Failed to read from localStorage:', error);
      localStorage.removeItem(key);
      return null;
    }
  },

  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      logger.error('Failed to remove from localStorage:', error);
    }
  },

  clear: () => {
    try {
      localStorage.clear();
    } catch (error) {
      logger.error('Failed to clear localStorage:', error);
    }
  }
};