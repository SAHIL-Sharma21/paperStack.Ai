export const HTTP_METHODS = {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    DELETE: 'DELETE',
    PATCH: 'PATCH',
} as const;

export type HTTP_METHODS = typeof HTTP_METHODS[keyof typeof HTTP_METHODS];