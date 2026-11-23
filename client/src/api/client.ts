/**
 * LabLink API client wrapper
 */

const BASE_URL = '/api';

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Also include token from localStorage if available (as well as cookies)
  const token = localStorage.getItem('lablink_token');
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // send cookies
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorObj: ApiError = data?.error || {
      code: 'REQUEST_FAILED',
      message: response.statusText || 'Network request failed',
    };
    const error = new Error(errorObj.message) as any;
    error.code = errorObj.code;
    error.statusCode = response.status;
    error.details = errorObj.details;
    throw error;
  }

  return data as T;
}
