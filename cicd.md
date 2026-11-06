# CI/CD — what it is, what it solves, and how GitHub Actions does it

---

## 0. Checking your current understanding

| What you said | Verdict | Small correction / addition |
|---|---|---|
| **CI** = when you push or open a PR, the code is tested, linted, etc. automatically before it reaches `main` | ✅ Correct | CI runs on the PR **and again on `main` after the merge**. The merged result can break even when both branches passed separately. |
| **CD** = deploying code that is in a deployable state. *Delivery* has a final manual approval; *Deployment* is fully automatic | ✅ Correct | Both start the same way: every change that passes CI becomes a **ready-to-ship artifact** (e.g. a Docker image). They differ only in the last step. |
| In real projects CI/CD is set up **at the start**, not at the end | ✅ Correct | This is often called a "walking skeleton": get `hello world` going all the way from push to deploy on day 1, then add features into a pipeline that already works. |

Your definitions are right. The missing piece is **why**, so let's start there.

---

## 1. The problem CI/CD solves

### Life WITHOUT CI/CD

Picture 4 developers on QuickBite, no CI:

```
 Mark  ── works on auth for 2 weeks ──────────────┐
 Sara  ── works on orders for 2 weeks ────────────┤
 Omar  ── changes the DB schema ──────────────────┤──► "Merge day" 💥
 Lina  ── upgrades a library ─────────────────────┘
                                                      - 47 conflicts
                                                      - tests? "I ran them... last week"
                                                      - "works on my machine"
                                                      - deploy = someone SSHs into the server,
                                                        git pull, npm install, restarts...
                                                        forgets to run migrations. Prod down.
```

The problems:

1. **"Works on my machine"**. Your laptop has a `.env`, a running Postgres, a cached `node_modules`, and Node 22. The next person's laptop doesn't.
2. **People forget to run the tests.** Or they run only the unit tests. Or they run them on an old commit.
3. **Bugs are found late.** A bug found 2 weeks after it was written costs far more to fix than one found 5 minutes after.
4. **Big, scary merges.** The longer branches live, the worse merging gets.
5. **Deploying is manual and error-prone.** It's a checklist in someone's head, so steps get skipped, it's done differently each time, and nobody wants to deploy on Friday.

### You already hit problem #1 this week

Your tests **passed locally** but **failed in CI**:

```
ZodError: DB_MIGRATIONS_DIRECTORY ... expected string, received undefined
```

Why? On your laptop, `.env.test` existed and filled in the right variables. `.env.test` is gitignored, so the CI machine never had it, and `docker-compose.test.yml` had misspelled names (`DB_MIGRATION_DIRECTORY`, `MAILJET_SECRET_KEY`).

**That is CI doing exactly its job.** It ran your code on a **clean machine that knows nothing except what's in the repo**. Without CI, you'd have found this bug when a teammate cloned the repo, or worse, in production.

> 🧠 **CI's core promise:** *"If it's green in CI, it works from a fresh clone of the repo, not just on my laptop."*

### Life WITH CI/CD

```
 Mark: small change ──► push ──► CI (3–8 min) ──► ✅ green ──► merge ──► auto-deploy to staging
                                     │
                                     └──► ❌ red: "test X failed" ──► fix within minutes
                                          (you still remember what you changed!)
```

- Small changes merged often, so conflicts stay small.
- Every change is checked **the same way, every time, by a machine that doesn't forget**.
- Deploying becomes boring: a button (Delivery) or nothing at all (Deployment).

---

## 2. The big picture

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                   DEVELOPER                                       │
│   git checkout -b feature/cart  →  code  →  git push  →  open Pull Request        │
└──────────────────────────────────────────┬────────────────────────────────────────┘
                                           │ (event: push / pull_request)
                                           ▼
┌───────────────────────────────────── CI ──────────────────────────────────────────┐
│                                                                                   │
│   checkout ─► install deps ─► lint ─► type-check/build ─► unit tests ─►           │
│   integration tests (real Postgres/Redis/RabbitMQ in containers)                  │
│                                                                                   │
│   Result shown on the PR:   ✅ All checks passed   /   ❌ Build and Test failed    │
└──────────────────────────────────────────┬────────────────────────────────────────┘
                                           │ PR approved by reviewer + CI green
                                           ▼
                                   merge into main
                                           │
                                           ▼
┌──────────────────────────────── CI on main + PACKAGE ─────────────────────────────┐
│   run tests again on the merged code                                              │
│   docker build (using YOUR Dockerfile) ─► image: quickbite-core:sha-c2439d1       │
│   docker push ─► container registry (GHCR / Docker Hub / AWS ECR)                 │
└──────────────────────────────────────────┬────────────────────────────────────────┘
                                           │  the "artifact": a versioned image
                                           ▼
┌─────────────────────────────────────── CD ────────────────────────────────────────┐
│                                                                                   │
│   deploy image to STAGING ─► smoke tests ─► ┬─► [ human clicks "Approve" ] ─► PROD│  ← Continuous DELIVERY
│                                             │                                     │
│                                             └─► (no human) ───────────────► PROD  │  ← Continuous DEPLOYMENT
└───────────────────────────────────────────────────────────────────────────────────┘
```

Key idea: **the same image** that was tested is the one that goes to staging, then to prod.
You never rebuild for prod. You promote the artifact you already tested.

---

## 3. Concepts every CI/CD tool shares

These ideas show up in GitHub Actions, GitLab CI, Jenkins, CircleCI, Azure DevOps and the rest. Only the YAML syntax changes.

| Concept | Meaning | In your project |
|---|---|---|
| **Pipeline / Workflow** | The whole automated process, defined as code in the repo | `.github/workflows/ci.yml` |
| **Trigger / Event** | What starts the pipeline | `push` to main, `pull_request`, manual button (`workflow_dispatch`), a schedule (cron), a git tag |
| **Job** | A group of steps that runs on **one machine** | `test` ("Build and Test") |
| **Step** | One command or action inside a job | `Checkout code`, `Run tests`, `Stop containers` |
| **Runner / Agent** | The machine that executes a job | GitHub's `ubuntu-latest` VM |
| **Clean environment** | Each run starts from a **fresh, empty machine**. Nothing is left over from last time | That's why `.env.test` wasn't there |
| **Artifact** | Something the pipeline produces and keeps | A Docker image, a `dist/` folder, a coverage report |
| **Registry** | Where built images are stored | GHCR (`ghcr.io`), Docker Hub, AWS ECR |
| **Secrets** | Passwords and keys given to the pipeline **without being in the code** | `${{ secrets.DEPLOY_SSH_KEY }}` |
| **Environment** | A deploy target with its own secrets and rules | `staging`, `production` |
| **Gate / Approval** | A pause until someone approves | The manual step in Continuous **Delivery** |
| **Status check** | The ✅/❌ shown on a commit or PR | "Build and Test" check on your PR |
| **Branch protection** | A rule saying "you can't merge into main unless checks pass" | Repo settings, see §7 |
| **Fail fast** | Stop at the first failure so feedback is quick | `sh -e` in your compose command |
| **Caching** | Reuse `node_modules` / Docker layers between runs for speed | `actions/setup-node` with `cache: npm` |

---

## 4. GitHub Actions in detail

### 4.1 Where it lives

```
your-repo/
└── .github/
    └── workflows/
        ├── ci.yml        ← every .yml file here is a separate workflow
        └── deploy.yml
```

GitHub scans this folder automatically. No setup is needed beyond pushing the file.

### 4.2 Anatomy: your own `ci.yml`, annotated

```yaml
name: CI                         # name shown in the Actions tab

on:                              # ── TRIGGERS: when should this run?
  push:
    branches: [main, develop]    #   someone pushes to main/develop
  pull_request:
    branches: [main, develop]    #   a PR targets main/develop
  workflow_dispatch:             #   a "Run workflow" button in the UI

jobs:                            # ── JOBS: run in parallel unless linked with `needs:`
  test:                          #   job id (internal)
    name: Build and Test         #   name shown in the UI / on the PR
    runs-on: ubuntu-latest       #   RUNNER: a fresh Ubuntu VM rented from GitHub

    steps:                       # ── STEPS: run in order on that VM
      - name: Checkout code
        uses: actions/checkout@v4          # `uses:` = a ready-made action from the marketplace
                                           #  (this one does a git clone of your repo)

      - name: Run tests
        run: docker compose -f docker-compose.test.yml run --rm test
                                           # `run:` = a plain shell command

      - name: Stop containers
        if: always()                       # run even if the previous step failed (cleanup)
        run: docker compose -f docker-compose.test.yml down -v
```

### 4.3 What actually happened when you typed `git push`

```
 You                     GitHub                        Runner (fresh Ubuntu VM)
  │  git push main  ──►   │                                  │
  │                       │ sees .github/workflows/ci.yml    │
  │                       │ event "push to main" matches `on`│
  │                       │ creates Run #1, job "queued" ⏳  │
  │                       │   (stuck here earlier = no free  │
  │                       │    runner / GitHub outage)       │
  │                       │ ── assigns job ────────────────► │ boots VM (Docker preinstalled)
  │                       │                                  │ step 1: git clone your repo
  │                       │                                  │ step 2: docker compose run test
  │                       │                                  │    ├─ pulls postgis, redis, rabbitmq, node images
  │                       │                                  │    ├─ waits for healthchecks
  │                       │                                  │    └─ npm ci → build → test → test:integration
  │                       │                                  │ step 3: docker compose down -v
  │                       │ ◄─────── exit code 0 / non-0 ─── │ VM is DESTROYED afterwards
  │ ◄── ✅ / ❌ on commit  │                                  │
```

**Exit codes are everything.** A step passes if its command exits with `0` and fails otherwise.
`jest` exits non-zero when a test fails → `docker compose run` passes that on → the step fails → the job fails → ❌.

### 4.4 Useful building blocks you'll see often

```yaml
# Job ordering: deploy only runs if test succeeded
jobs:
  test:   { ... }
  deploy:
    needs: test

# Only on main, not on PRs
    if: github.ref == 'refs/heads/main'

# Secrets (set in repo Settings → Secrets and variables → Actions)
    env:
      DB_PASSWORD: ${{ secrets.PROD_DB_PASSWORD }}

# Matrix: run the same job on several versions
    strategy:
      matrix:
        node: [20, 22]

# Service containers (alternative to docker compose for test DBs)
    services:
      postgres:
        image: postgis/postgis:16-3.4
        env: { POSTGRES_PASSWORD: postgres }

# Environment with required reviewers = the manual "Delivery" gate
    environment: production
```

### 4.5 Pricing / limits (why "queued" happens)

- **Public repos:** GitHub-hosted runners are free.
- **Private repos:** a free monthly minutes quota, then paid.
- Jobs wait in **queued** state until a runner is free. During a GitHub outage (like the one you hit), they can sit there for a long time. It's not your fault. Check https://www.githubstatus.com.

---

## 5. Myth check: "When you `git push`, CI creates a Dockerfile"

**❌ Not quite.** Three different things get mixed up here:

```
  Dockerfile        ──docker build──►     Image          ──docker run──►    Container
  (a recipe you                           (the built,                       (a running
   WRITE by hand,                          packaged app,                     instance of
   committed to git)                       a versioned file)                 the image)
```

- **You** write the `Dockerfile` once and commit it. Yours is the multi-stage one in the repo root.
- **CI** can *use* that Dockerfile to **build an image** and **push it to a registry**. That's probably what people meant.
- **CD** then pulls that image onto a server or cluster and **runs containers** from it.

What a "build & push image" job looks like:

```yaml
  build-image:
    needs: test                              # only if tests passed
    if: github.ref == 'refs/heads/main'      # only for main, not every PR
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write                        # allow pushing to GHCR
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}   # automatic, no setup needed
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ghcr.io/markisaac1812/quickbite-core:${{ github.sha }}
```

Note: your **current** CI does *not* build your app's image. It uses the generic `node:22-bookworm-slim` image to run tests on your source code. Building and pushing the app image is the next stage (packaging for CD).

---

## 6. "Docker Compose isn't for production." Is that true?

**Mostly true. Here's the nuance.**

| Use | Is Compose a good fit? | Why |
|---|---|---|
| Local development | ✅ Perfect | One command starts the app + Postgres + Redis + RabbitMQ |
| CI test environments | ✅ Perfect | Exactly what your `docker-compose.test.yml` does |
| Small hobby/side project on one VPS | 🟡 Acceptable | `docker compose up -d` on one server works, many small apps do this |
| Real production with real users | ❌ Usually not | See below |

What Compose **can't** do well, and what production needs:

```
Compose (one machine)                     Production orchestrators
──────────────────────                    (Kubernetes, AWS ECS, Google Cloud Run, Fly.io, Render...)
• runs on ONE host                        • spread across MANY machines
• that host dies → everything dies        • a node dies → containers rescheduled elsewhere
• no zero-downtime rolling deploys        • rolling updates, instant rollback to previous image
• no autoscaling                          • scale 2 → 20 replicas under load
• secrets usually in env files            • proper secret managers
• DB as a container next to the app       • usually a MANAGED DB (AWS RDS, Cloud SQL)
                                            backups, replicas, failover handled for you
```

So in production you usually **don't run Postgres/Redis/RabbitMQ in your own containers at all**. You use managed services, and only **your app image** (built from your Dockerfile) runs on the orchestrator.

> 🧠 **Rule of thumb:** the **Dockerfile** goes to production. **docker-compose** stays on dev machines and in CI.

---

## 7. How it's used in a real team, day to day

### One-time setup (at project start)

1. Write `.github/workflows/ci.yml` (lint + build + tests).
2. In GitHub: **Settings → Branches → Add branch protection rule** for `main`:
   - ☑ Require a pull request before merging
   - ☑ Require status checks to pass → select **"Build and Test"**
   - ☑ Require branches to be up to date before merging
3. Now **nobody** (not even you) can push broken code straight to `main`.

### The daily loop for every feature

```
main ────●──────────────────────────────●────────────►
          \                            / merge (only allowed when CI ✅ + review ✅)
           \  feature/cart-total      /
            ●────●────●──── PR ──────●
                 │    │      │
               push  push   CI runs on every push to the PR
                 │    │      ├─ ❌ test fails → you fix, push again
                 ▼    ▼      └─ ✅ green → reviewer approves → merge
```

1. `git checkout -b feature/cart-total`
2. Code, commit, `git push -u origin feature/cart-total`
3. Open a PR into `main`. CI runs automatically, and the result shows at the bottom of the PR.
4. Red? Read the log in the Actions tab, fix locally, push again. CI re-runs.
5. Green + approved → merge.
6. The merge is a push to `main`, so CI runs again, and (if CD is set up) the image is built and deployed.

You pushed directly to `main` this time. That's fine for learning, but in a team, branch protection would block that.

---

## 8. A complete CI/CD example for QuickBite (for reference, not added yet)

```yaml
name: CI/CD

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  # ───────────── CI: runs on PRs and on main ─────────────
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker compose -f docker-compose.test.yml run --rm test
      - if: always()
        run: docker compose -f docker-compose.test.yml down -v

  # ───────────── Package: only on main, only if tests passed ─────────────
  build-image:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions: { contents: read, packages: write }
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          push: true
          tags: ghcr.io/markisaac1812/quickbite-core:${{ github.sha }}

  # ───────────── CD: staging is automatic ─────────────
  deploy-staging:
    needs: build-image
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - run: echo "deploy ghcr.io/markisaac1812/quickbite-core:${{ github.sha }} to staging"
      # real life: kubectl set image ..., or aws ecs update-service ..., or ssh + docker pull

  # ───────────── CD: production waits for a human (Continuous DELIVERY) ─────────────
  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production   # Settings → Environments → production → "Required reviewers"
    steps:                    # remove the required reviewers → Continuous DEPLOYMENT
      - run: echo "deploy the SAME image to production"
```

What you'd see in the Actions tab:

```
  test ──► build-image ──► deploy-staging ──► deploy-production
   ✅          ✅               ✅              ⏸ Waiting for review  [Approve and deploy]
```

The **only** difference between Delivery and Deployment is that one "Required reviewers" checkbox.

---

## 9. Good practices and common mistakes

**Do**
- Keep CI fast (aim for under 10 min). Run quick checks (lint, unit tests) before slow ones (integration).
- Make CI reproducible: pin image versions (`postgis/postgis:16-3.4`, not `latest`), use `npm ci`, not `npm install`.
- Treat CI config as code: it's reviewed in PRs like everything else.
- Tag images with the git SHA so you always know exactly which commit is running in prod.
- Roll back by redeploying the **previous image tag**, not by hot-fixing on the server.

**Don't**
- ❌ Rely on files that aren't committed (`.env`, `.env.test`). CI won't have them. Put test config in the workflow or compose file, and real secrets in **GitHub Secrets**.
- ❌ Commit real passwords or API keys to the repo.
- ❌ Ignore a red pipeline or "just merge it, it's flaky". A CI that people ignore is worthless.
- ❌ Build a different image for prod than the one you tested.

---

## 10. One-page summary

```
CI  = "Is this change safe to merge?"
      Trigger: push / PR
      Does:    clean machine → install → lint → build → test
      Output:  ✅/❌ on the PR (+ branch protection blocks ❌ merges)

CD  = "Get the safe change to users."
      Package: docker build (from YOUR Dockerfile) → push image to registry
      Deliver: deploy to staging → human approves → prod      (Continuous Delivery)
      Deploy:  deploy to staging → tests pass → prod, no human (Continuous Deployment)

GitHub Actions vocabulary
      workflow (.github/workflows/*.yml) → triggered by events (on:)
      → contains jobs (run on runners, in parallel unless `needs:`)
      → contain steps (`uses:` an action, or `run:` a command)

Docker roles
      Dockerfile      → written by you, goes to production (as an image)
      docker-compose  → local dev + CI test environments
      Production      → orchestrator (K8s/ECS/Cloud Run) + managed DB/Redis/queue
```
