/**
 * Release notes, newest first. To announce a release:
 *   1. bump "version" in package.json,
 *   2. add an entry here with the same version,
 *   3. deploy.
 * The newest entry is shown as "What's new" to every visitor for 48 hours after the deployment
 * that carries it, once per browser. Open tabs notice the deployment and refresh themselves.
 */
export const RELEASES = [
  {
    version: '2.0.0',
    title: 'HandyAI 2.0 is here',
    highlights: [
      'A new dark look with floating controls and smoother animations',
      'Live marketplace prices in rupees or dollars, per month, quarter or year',
      'Ask the AI Chat by voice and get tools picked for your profession',
      'Track every AI subscription you pay for in one place',
      'Send us suggestions: they go straight to the team building HandyAI',
    ],
  },
]

/** How long "What's new" stays up after a release is deployed. */
export const WHATS_NEW_WINDOW_MS = 48 * 60 * 60 * 1000
