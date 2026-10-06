# HandyAI — frontend

React 19 + Vite. Two screens: the home page (hero, matcher, categories, catalogue) and the
sign in / sign up page. Routing is a 40-line history router in `src/router.jsx`; there is no
routing or state library.

```bash
npm install
npm run dev      # http://localhost:5173, proxies /api to http://localhost:8080
npm run build
npm run lint
```

Start the Spring Boot API first (`backend/handy-ai`), or every request falls back to the
"cannot reach the HandyAI server" message.

| Path | Purpose |
| --- | --- |
| `src/api/client.js` | Every call to the backend, plus token storage and one error shape |
| `src/context/AuthContext.jsx` | Who is signed in; verifies a stored token once on load |
| `src/pages/Home.jsx` | Hero, the "tell us the job" matcher, categories, filtered catalogue |
| `src/pages/Login.jsx` | Sign in and sign up, same screen, `/login` and `/signup` |
| `src/index.css` | Tokens, light + dark, element defaults |
| `src/App.css` | Layout and components, mobile first |

Point the build at a different API with `VITE_API_BASE_URL`, and the dev proxy elsewhere with
`VITE_API_PROXY`.
