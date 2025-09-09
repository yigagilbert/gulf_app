// utils/api.js
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants';
import { logger } from './logger';

export const handleApiError = (error) => {
  logger.error('API Error:', error);

  if (!error.response) {
    return new Error(ERROR_MESSAGES.NETWORK_ERROR);
  }

  const { status, data } = error.response;

  switch (status) {
    case HTTP_STATUS.UNAUTHORIZED:
      return new Error(data?.message || ERROR_MESSAGES.UNAUTHORIZED);
    case HTTP_STATUS.FORBIDDEN:
      return new Error(data?.message || ERROR_MESSAGES.FORBIDDEN);
    case HTTP_STATUS.NOT_FOUND:
      return new Error(data?.message || ERROR_MESSAGES.NOT_FOUND);
    case HTTP_STATUS.UNPROCESSABLE_ENTITY:
      return new Error(data?.message || ERROR_MESSAGES.VALIDATION_ERROR);
    case HTTP_STATUS.INTERNAL_SERVER_ERROR:
    case HTTP_STATUS.SERVICE_UNAVAILABLE:
      return new Error(data?.message || ERROR_MESSAGES.SERVER_ERROR);
    default:
      return new Error(data?.message || ERROR_MESSAGES.UNKNOWN_ERROR);
  }
};

export const createApiResponse = (data, status = 'success') => ({
  status,
  data,
  timestamp: new Date().toISOString()
});