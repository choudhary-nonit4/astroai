# AstroAI MVP

AstroAI is an interview-ready full-stack reference application for generating a Vedic birth-chart report. The MVP deliberately separates deterministic calculations from narrative interpretation: the Python service owns chart data, while the core API orchestrates reports and the web app presents them.

> The current calculation engine is a stable mock, not a production astrology engine. The same birth input produces the same output. Do not use the results as factual astronomical data or professional advice.

## Architecture

```text
Next.js web (:3000)
       │ POST /reports
       ▼
NestJS core API (:3001) ─── in-memory report repository
       │ POST /calculate
       ▼
FastAPI calculation service (:8000) ─── deterministic mock engine
```

The service boundary is intentional. A future Swiss Ephemeris implementation can replace `calculate()` without changing the UI or report contract. The core API is the future orchestration boundary for asynchronous AWS workflows.

## Run with Docker

Requirements: Docker Desktop with Compose.

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). Health checks are available at [http://localhost:3001/health](http://localhost:3001/health) and [http://localhost:8000/health](http://localhost:8000/health).

## Deploy to AWS

The repository includes a serverless AWS deployment using Terraform and GitHub Actions. It provisions CloudFront, private S3 buckets, API Gateway, two Lambda functions, DynamoDB, CloudWatch logs, and GitHub OIDC authentication without stored AWS keys.

Follow [`docs/AWS_DEPLOYMENT.md`](docs/AWS_DEPLOYMENT.md) for the one-time bootstrap and deployment procedure.

## Run locally

Requirements: Node.js 20+, npm, and Python 3.11+.

```bash
cp .env.example .env
npm install
python3 -m venv services/astrology/.venv
source services/astrology/.venv/bin/activate
pip install -r services/astrology/requirements.txt
```

Start these in separate terminals:

```bash
uvicorn app.main:app --app-dir services/astrology --reload --port 8000
npm run dev:api
npm run dev:web
```

## API

Create a report:

```bash
curl -X POST http://localhost:3001/reports \
  -H 'content-type: application/json' \
  -d '{"name":"Aanya Sharma","birthDate":"1994-10-12","birthTime":"08:45","birthPlace":"Jaipur, India","language":"English","focusArea":"Overview"}'
```

- `GET /reports/:id` returns a generated report while this API process is alive.
- `GET /reports/:id/html` returns an A4 print-styled document. Use the browser’s **Print / Save as PDF** action for the MVP.
- FastAPI’s interactive contract is available at `http://localhost:8000/docs`.

## Production extension points

- **AWS Step Functions:** replace the synchronous `ReportsService.create` orchestration with geocoding → calculation → chart rendering → Bedrock interpretation → PDF stages.
- **S3:** store immutable chart images and final PDF/HTML artifacts; return short-lived signed download URLs.
- **DynamoDB:** replace the in-memory `Map` behind a report repository interface; use `userId` as partition key and `createdAt#reportId` as sort key.
- **Cognito:** validate JWTs in a NestJS guard and scope all report access to the authenticated subject.
- **Bedrock:** interpret only the validated calculation response. Never ask an LLM to calculate planetary positions.
- **Terraform:** create modules for networking, ECS/Lambda workloads, API Gateway, state machines, tables, buckets, alarms, and least-privilege IAM.
- **GitHub Actions:** add lint/test/build, container scanning, image publishing, Terraform plan, and environment-gated deployment jobs.
- **PDF renderer:** move HTML-to-PDF conversion into an isolated Playwright-based worker and store the output in S3.

## MVP trade-offs

- Reports are in memory and disappear when the API restarts.
- Place names are not geocoded; timezone and coordinates are intentionally deferred.
- The chart is rendered in the browser and the printable report currently emphasizes the structured positions table.
- The interpretation is a labeled template. No paid AI or cloud service is called.

## Project structure

```text
apps/web/                 Next.js UI and chart renderer
apps/api/                 NestJS report API and printable report
services/astrology/       FastAPI deterministic calculation boundary
infra/bootstrap/          One-time state bucket and GitHub OIDC role
infra/application/        Terraform-managed AWS application resources
.github/workflows/        Pull-request validation and main-branch deployment
docker-compose.yml        Local three-service environment
.env.example              Local configuration and future AWS keys
```
