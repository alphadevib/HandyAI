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

function query(params) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '' && value !== false) {
      search.set(key, String(value))
    }
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

const slugPath = (slug) => encodeURIComponent(slug)

/**
 * The link behind every Buy / Try it button: HandyAI records the hand-off, then the server
 * redirects to the vendor's own site. {@code source} says where the click came from.
 */
export function vendorLink(slug, source, visitor) {
  return `${BASE_URL}/go/${slugPath(slug)}${query({ src: source, v: visitor })}`
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),
  me: () => request('/auth/me'),
  updateProfile: (payload) => request('/auth/me', { method: 'PUT', body: payload }),

  professions: (signal) => request('/professions', { signal, auth: false }),
  categories: (signal) => request('/categories', { signal }),
  stats: (signal) => request('/stats', { signal }),

  /** Marketplace search: q, category, freePlan, priceMin, priceMax, currency, sort, page, size. */
  tools: (params = {}, signal) => request(`/tools${query({ size: 12, ...params })}`, { signal }),
  priceRanges: (currency, signal) => request(`/tools/price-ranges${query({ currency })}`, { signal }),
  featured: (limit = 6, signal) => request(`/tools/featured?limit=${limit}`, { signal }),
  trending: (limit = 8, signal) => request(`/tools/trending?limit=${limit}`, { signal }),
  tool: (slug, signal) => request(`/tools/${slugPath(slug)}`, { signal }),

  reviews: (slug, signal) => request(`/tools/${slugPath(slug)}/reviews`, { signal }),
  myReview: (slug, signal) => request(`/tools/${slugPath(slug)}/reviews/mine`, { signal }),
  saveReview: (slug, payload) =>
    request(`/tools/${slugPath(slug)}/reviews`, { method: 'PUT', body: payload }),
  deleteReview: (slug, id) =>
    request(`/tools/${slugPath(slug)}/reviews/${id}`, { method: 'DELETE' }),

  toggleFavorite: (slug) => request(`/tools/${slugPath(slug)}/favorite`, { method: 'POST' }),
  favorites: (signal) => request('/me/favorites', { signal }),

  recommend: (payload, signal) =>
    request('/recommendations', { method: 'POST', body: payload, signal }),
  chat: (message, context, signal) =>
    request('/chat', { method: 'POST', body: { message, context }, signal }),

  subscriptions: (signal) => request('/me/subscriptions', { signal }),
  addSubscription: (payload) => request('/me/subscriptions', { method: 'POST', body: payload }),
  updateSubscription: (id, payload) =>
    request(`/me/subscriptions/${id}`, { method: 'PUT', body: payload }),
  removeSubscription: (id) => request(`/me/subscriptions/${id}`, { method: 'DELETE' }),

  presence: (visitorId, path) =>
    request('/presence', { method: 'POST', body: { visitorId, path } }).catch(() => null),
  adminStats: (signal) => request('/admin/stats', { signal }),

  organisations: (status, signal) => request(`/admin/organisations${query({ status })}`, { signal }),
  approveOrganisation: (id) => request(`/admin/organisations/${id}/approve`, { method: 'POST' }),
  rejectOrganisation: (id, reason) =>
    request(`/admin/organisations/${id}/reject`, { method: 'POST', body: { reason } }),
}
