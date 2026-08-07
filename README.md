# AstroAI MVP

AstroAI is an interview-ready full-stack reference application for generating a Vedic birth-chart report. The MVP deliberately separates deterministic calculations from narrative interpretation: the Python service owns chart data, while the core API orchestrates reports and the web app presents them.

> Planetary positions use the offline Swiss Ephemeris Moshier engine with a Lahiri sidereal zodiac. Interpretations apply a documented initial set of traditional Jyotish rules; they are not scientifically validated predictions or professional advice.

## Architecture

```text
Next.js web (:3000)
       │ POST /reports
       ▼
NestJS core API (:3001) ─── report persistence + traceable rule interpretation
       │ POST /calculate
       ▼
FastAPI calculation service (:8000) ─── Swiss Ephemeris sidereal D1 engine
```

The service boundary keeps astronomical calculation separate from traditional interpretation. The calculator returns placements and calculation metadata; the API turns those facts into evidence-backed rule results and remains the future orchestration boundary for Bedrock and asynchronous AWS workflows.

## Run with Docker

Requirements: Docker Desktop with Compose.

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). Health checks are available at [http://localhost:3001/health](http://localhost:3001/health) and [http://localhost:8000/health](http://localhost:8000/health).

## Deploy to AWS

The repository includes an EC2-based AWS deployment using Terraform and GitHub Actions. It provisions one small instance, private ECR repositories, DynamoDB, private S3 report storage, Systems Manager access, and GitHub OIDC authentication without stored AWS keys or SSH credentials.

Follow [`docs/AWS_DEPLOYMENT.md`](docs/AWS_DEPLOYMENT.md) for the one-time bootstrap and deployment procedure.

If GitHub-hosted runners are unavailable, provision the standalone EC2 runner with `infra/runner/cloudformation.yaml` and follow [`docs/SELF_HOSTED_RUNNER.md`](docs/SELF_HOSTED_RUNNER.md).

## Run locally

Requirements: Node.js 22, npm, and Python 3.13.

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
  -d '{"name":"Aanya Sharma","birthDate":"1994-10-12","birthTime":"08:45","birthPlace":"Jaipur, India","latitude":26.9124,"longitude":75.7873,"timeZone":"Asia/Kolkata","language":"English","focusArea":"Overview"}'
```

- `GET /reports/:id` returns a generated report while this API process is alive.
- `GET /reports/:id/html` returns an A4 print-styled document. Use the browser’s **Print / Save as PDF** action for the MVP.
- FastAPI’s interactive contract is available at `http://localhost:8000/docs`.

## Production extension points

- **AWS Step Functions:** replace the synchronous `ReportsService.create` orchestration with geocoding → calculation → chart rendering → Bedrock interpretation → PDF stages.
- **S3:** store immutable chart images and final PDF/HTML artifacts; return short-lived signed download URLs.
- **DynamoDB:** evolve the current report table to use `userId` as partition key and `createdAt#reportId` as sort key after authentication is added.
- **Cognito:** validate JWTs in a NestJS guard and scope all report access to the authenticated subject.
- **Bedrock:** interpret only the validated calculation response. Never ask an LLM to calculate planetary positions.
- **Terraform:** create modules for networking, ECS/Lambda workloads, API Gateway, state machines, tables, buckets, alarms, and least-privilege IAM.
- **GitHub Actions:** add lint/test/build, container scanning, image publishing, Terraform plan, and environment-gated deployment jobs.
- **PDF renderer:** move HTML-to-PDF conversion into an isolated Playwright-based worker and store the output in S3.

## MVP trade-offs

- Local reports are in memory; the AWS deployment stores report metadata in DynamoDB and HTML in S3.
- Place names are not geocoded, so users provide latitude, longitude and an IANA timezone explicitly.
- The current calculation scope is the sidereal D1 chart, true lunar nodes, nakshatra/pada and whole-sign houses. Divisional charts, dashas, lordships, aspects, dignities and yogas remain future phases.
- Interpretations are deterministic and traceable but cover only the documented initial rule set. No paid AI service is called.
- Swiss Ephemeris is dual-licensed. Review and comply with its AGPL or professional-license terms before distributing a closed-source commercial product.

## Project structure

```text
apps/web/                 Next.js UI and chart renderer
apps/api/                 NestJS report API and printable report
services/astrology/       FastAPI deterministic calculation boundary
infra/bootstrap/          One-time state bucket and GitHub OIDC role
infra/application/        Terraform-managed EC2 application resources
.github/workflows/        Pull-request validation and main-branch deployment
docker-compose.yml        Local three-service environment
.env.example              Local configuration and future AWS keys
```
