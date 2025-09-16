import { QueryClient, QueryFunction } from '@tanstack/react-query';

// URL base del backend
const API_BASE_URL = '';

async function throwIfResNotOk (res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest (
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  const res = await fetch(fullUrl, {
    method,
    headers: data ? { 'Content-Type': 'application/json' } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include',
  });

  await throwIfResNotOk(res);
  return await res.json();
}

type UnauthorizedBehavior = 'returnNull' | 'throw';
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      let url = queryKey[0] as string;
      
      // Construir URL completa
      if (!url.startsWith('http')) {
        url = `${API_BASE_URL}${url}`;
      }

      // If there are query parameters, append them to the URL
      if (queryKey.length > 1 && queryKey[1]) {
        const params = queryKey[1] as Record<string, string | number | boolean>;
        const urlParams = new URLSearchParams();

        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            urlParams.append(key, String(value));
          }
        });

        const paramString = urlParams.toString();
        if (paramString) {
          url += `?${paramString}`;
        }
      }

      const res = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (unauthorizedBehavior === 'returnNull' && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: 'throw' }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
