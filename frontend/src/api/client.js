/**
 * One place that knows how to talk to the Spring Boot API.
 *
 * Every response shape the backend can return is normalised here, so components only ever deal
 * with data or with an Error that already carries a readable message.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'
const TOKEN_KEY = 'handyai.token'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* private browsing: the session simply does not survive a reload */
  }
}

export class ApiError extends Error {
  constructor(message, status, fieldErrors) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors ?? {}
  }
}

async function request(path, { method = 'GET', body, auth = true, signal } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const token = auth ? getToken() : null
  if (token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError('Cannot reach the HandyAI server. Is the backend running?', 0)
  }

  if (response.status === 204) return null

  const text = await response.text()
  const payload = text ? safeParse(text) : null

  if (!response.ok) {
    if (response.status === 401) setToken(null)
    throw new ApiError(
      payload?.message ?? `Request failed (${response.status})`,
      response.status,
      payload?.fieldErrors,
    )
  }
  return payload
}

function safeParse(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),
  me: () => request('/auth/me'),
  updateProfile: (payload) => request('/auth/me', { method: 'PUT', body: payload }),

  categories: (signal) => request('/categories', { signal }),
  stats: (signal) => request('/stats', { signal }),

  tools: ({ q, category, pricing, sort, page = 0, size = 12 } = {}, signal) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (category) params.set('category', category)
    if (pricing && pricing !== 'ALL') params.set('pricing', pricing)
    if (sort) params.set('sort', sort)
    params.set('page', String(page))
    params.set('size', String(size))
    return request(`/tools?${params.toString()}`, { signal })
  },
  featured: (limit = 6, signal) => request(`/tools/featured?limit=${limit}`, { signal }),
  trending: (limit = 8, signal) => request(`/tools/trending?limit=${limit}`, { signal }),
  tool: (slug, signal) => request(`/tools/${encodeURIComponent(slug)}`, { signal }),
  reviews: (slug, signal) => request(`/tools/${encodeURIComponent(slug)}/reviews`, { signal }),
  saveReview: (slug, payload) =>
    request(`/tools/${encodeURIComponent(slug)}/reviews`, { method: 'PUT', body: payload }),
  toggleFavorite: (slug) =>
    request(`/tools/${encodeURIComponent(slug)}/favorite`, { method: 'POST' }),
  favorites: (signal) => request('/me/favorites', { signal }),

  recommend: (payload, signal) =>
    request('/recommendations', { method: 'POST', body: payload, signal }),
}
