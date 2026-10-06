# HandyAI

Find the AI tool that fits the job. Describe what you are trying to get done and HandyAI ranks a
curated catalogue of AI platforms against it, with the reasons behind every pick.

- `backend/handy-ai` — Spring Boot 4.1 REST API (Java 17, JPA, H2 or MySQL)
- `frontend` — React 19 + Vite single page app (home page and sign in / sign up)

## Running it

Two terminals. The backend first.

```bash
cd backend/handy-ai
./mvnw spring-boot:run          # Windows: mvnw.cmd spring-boot:run
```

It starts on <http://localhost:8080> with an in-memory H2 database and seeds 13 categories and
39 tools on first run. Nothing to install or configure.

```bash
cd frontend
npm install
npm run dev
```

The app is on <http://localhost:5173>. The dev server proxies `/api` to port 8080, and it listens
on the network too, so a phone on the same Wi-Fi can open `http://<your-ip>:5173` and see the
mobile layout.

Demo account: `demo@handyai.app` / `demo12345` (the sign-in page can fill it in for you).

### Using MySQL instead

```bash
mysql -u root -p -e "CREATE DATABASE handyai CHARACTER SET utf8mb4;"
cd backend/handy-ai
./mvnw spring-boot:run -Dspring-boot.run.profiles=mysql
```

Connection details come from `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DB`, `MYSQL_USER` and
`MYSQL_PASSWORD`, all with sensible localhost defaults — see
`src/main/resources/application-mysql.properties`. The seeder is idempotent, so restarting against
a persistent database inserts only what is missing.

### Tests

```bash
cd backend/handy-ai && ./mvnw test
cd frontend && npm run lint && npm run build
```

## API

Everything lives under `/api`. Browsing is public; anything tied to a person needs
`Authorization: Bearer <token>` from register or login.

| Method | Path | Auth | What it does |
| --- | --- | --- | --- |
| POST | `/auth/register` | — | Create an account, returns a token |
| POST | `/auth/login` | — | Sign in, returns a token |
| GET | `/auth/me` | yes | The signed-in profile |
| PUT | `/auth/me` | yes | Update name / profession |
| GET | `/tools` | optional | Search with `q`, `category`, `pricing`, `sort`, `page`, `size` |
| GET | `/tools/featured`, `/tools/trending` | optional | Home page rails |
| GET | `/tools/{slug}` | optional | One tool |
| GET | `/tools/{slug}/reviews` | — | Reviews for a tool |
| PUT | `/tools/{slug}/reviews` | yes | Add or replace your review (1–5 plus a comment) |
| DELETE | `/tools/{slug}/reviews/{id}` | yes | Remove your own review |
| POST | `/tools/{slug}/favorite` | yes | Toggle saved, returns the new state |
| GET | `/me/favorites` | yes | Your saved tools |
| GET | `/categories`, `/categories/{slug}` | — | Categories with tool counts |
| POST | `/recommendations` | optional | The matcher: `goal`, `profession`, `categorySlugs`, `pricing`, `limit` |
| GET | `/stats`, `/health` | — | Counters and a liveness check |

Signing in only sharpens the results: a token adds your saved flag to every card and nudges
recommendations towards the categories you favourite and rate highly.

Errors always come back in one shape, so the frontend has a single path to handle:

```json
{
  "timestamp": "2026-09-22T09:10:41Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Enter a valid email address",
  "path": "/api/auth/register",
  "fieldErrors": { "email": "Enter a valid email address" }
}
```

## How the backend is put together

```
com.handyai.build
├── config        WebConfig (CORS), CatalogueSeeder
├── controller    Auth, Tool, Category, Favorite, Recommendation, Meta
├── domain        User, Category, AiTool, Review, Favorite, Role, PricingModel
├── dto           Request/response records — entities never leave the service layer
├── exception     Typed failures + GlobalExceptionHandler
├── repository    Spring Data JPA interfaces
├── security      PasswordHasher (PBKDF2), JwtService (HS256), filter, CurrentUserProvider
└── service       AuthService, ToolService, CategoryService, ReviewService,
                  FavoriteService, RecommendationService
```

Deliberate choices that keep concurrent requests out of each other's way:

- **No bidirectional relations.** Every `@ManyToOne` is lazy and nothing owns a collection, so a
  read is one predictable query and JSON can never recurse.
- **`spring.jpa.open-in-view=false`.** The persistence session closes when the service call
  returns, so no request holds a pooled connection while the response is being written.
- **Fixed lock order on writes.** A review is written before the tool row it belongs to, always in
  that order, so two reviews on the same tool queue instead of dead-locking.
- **Ratings are re-derived, not incremented.** After any review write the sum and count come from
  an aggregate query, so interleaved transactions cannot lose an update.
- **Stateless auth.** JWTs mean no server-side session map to synchronise on.
- **Unique constraints backed by a handler.** A duplicate email or double-tapped favourite comes
  back as a clean `409` instead of a `500`.

Passwords are hashed with PBKDF2-HMAC-SHA256 (210k iterations, per-user salt) using the JDK only.
Set `HANDYAI_JWT_SECRET` (32+ characters) in any environment that is not your laptop.
