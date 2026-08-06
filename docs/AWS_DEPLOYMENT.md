# AstroAI AWS deployment runbook

This runbook deploys AstroAI using GitHub Actions and Terraform. It intentionally avoids always-on compute, load balancers, NAT gateways, RDS, and paid AI services.

## What Terraform creates

### One-time bootstrap

- A private, encrypted, versioned S3 bucket for Terraform state
- The AWS GitHub Actions OIDC provider, unless LinkLens already created it
- `astroai-github-deploy`, trusted only by this repository's `dev` GitHub environment

### Application environment

- Private S3 frontend bucket
- CloudFront distribution with Origin Access Control
- API Gateway HTTP API with throttling
- NestJS API Lambda
- Private Python calculation Lambda
- DynamoDB reports table with TTL
- Private S3 report-artifact bucket with eight-day lifecycle expiration
- Least-privilege Lambda execution roles
- CloudWatch log groups with seven-day retention

No AWS access key is stored in GitHub. GitHub receives a short-lived AWS session through OIDC.

## Deployment flow

```text
Pull request
  └─ build + tests + Lambda packaging + Terraform validation

Merge to main
  ├─ GitHub OIDC → temporary AWS credentials
  ├─ build and test
  ├─ package NestJS and Python Lambdas
  ├─ Terraform plan and apply
  ├─ build Next.js with the new API URL
  ├─ upload static output to S3
  ├─ invalidate CloudFront
  └─ smoke-test /health
```

At runtime:

```text
CloudFront → private S3 frontend
Browser → API Gateway → NestJS Lambda
NestJS Lambda → private calculator Lambda
NestJS Lambda → DynamoDB + private report S3 bucket
```

## Prerequisites

Install locally:

- AWS CLI v2
- Terraform 1.10 or newer
- Node.js 22
- Python 3.13
- Git and GitHub CLI, or use the GitHub website

Confirm that your terminal is authenticated to the intended AWS account:

```bash
aws sts get-caller-identity
```

Use `ap-south-1` consistently unless you intentionally choose another region.

## Step 1: Create the GitHub repository

Create an empty repository named `astroai`, commit this project, and push it. The repository can be private or public.

The bootstrap input must use the exact, case-sensitive `OWNER/REPOSITORY` value.

## Step 2: Check for an existing GitHub OIDC provider

LinkLens may already have created the account-level GitHub provider:

```bash
aws iam list-open-id-connect-providers
```

If the output contains:

```text
oidc-provider/token.actions.githubusercontent.com
```

copy its ARN. AWS permits only one provider for that issuer in an account.

## Step 3: Bootstrap Terraform once

```bash
cd infra/bootstrap
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:

```hcl
aws_region        = "ap-south-1"
github_repository = "YOUR_GITHUB_USER/astroai"
github_oidc_subject = "repo:YOUR_GITHUB_USER@OWNER_ID/astroai@REPOSITORY_ID:environment:dev"
```

If the provider already exists, also set:

```hcl
create_github_oidc_provider       = false
existing_github_oidc_provider_arn = "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
```

Apply the bootstrap:

```bash
terraform init
terraform fmt -check
terraform plan
terraform apply
```

Record the outputs:

```bash
terraform output -raw state_bucket
terraform output -raw github_deploy_role_arn
```

The bootstrap state remains local. Store its state file securely; it controls only the state bucket and GitHub deployment identity.

## Step 4: Configure the GitHub environment

In GitHub, open **Settings → Environments → New environment** and create `dev`.

Add these environment variables under `dev`:

| Variable | Value |
|---|---|
| `AWS_REGION` | `ap-south-1` |
| `AWS_DEPLOY_ROLE_ARN` | Bootstrap output `github_deploy_role_arn` |
| `TF_STATE_BUCKET` | Bootstrap output `state_bucket` |

These are identifiers, not secrets. No AWS access key or secret access key is required.

Optionally configure an environment reviewer before deployment. Do this after the first test if you are the repository's only contributor and GitHub's plan restrictions prevent self-approval.

## Step 5: Validate with a pull request

Push the deployment changes to a branch and open a pull request. The `Validate AstroAI` workflow must pass:

- Node build
- Python deterministic calculation test
- Lambda packaging
- Terraform formatting and validation

The pull-request workflow has no AWS permissions and cannot change cloud resources.

## Step 6: Deploy

Merge the pull request to `main`. The `Deploy AstroAI to AWS` workflow will request a short-lived AWS session and deploy the `dev` environment.

The first run can take several minutes because CloudFront must be created. The workflow summary shows the final website and API URLs.

You can also start the workflow from **Actions → Deploy AstroAI to AWS → Run workflow**.

## Step 7: Verify

Open the website URL from the workflow summary and generate a report. Then verify:

```bash
curl "API_URL/health"
```

In AWS, inspect:

- DynamoDB → `astroai-dev-reports`
- S3 → `astroai-dev-reports-ACCOUNT_ID/reports/`
- CloudWatch → `/aws/lambda/astroai-dev-api`
- CloudWatch → `/aws/lambda/astroai-dev-calculator`

The generated DynamoDB record and S3 HTML report expire automatically after the demo retention period.

## Subsequent deployments

Every merge to `main` follows the same process. Terraform changes infrastructure; Lambda hashes update code; the frontend is rebuilt using Terraform's API URL and synchronized to S3.

Do not edit Terraform-managed resources manually in the AWS console. Make the change in `infra/application`, review the plan, and merge it.

## Destroy the application

To stop and remove the application resources, authenticate locally and initialize the same remote state:

```bash
cd infra/application
terraform init \
  -backend-config="bucket=YOUR_STATE_BUCKET" \
  -backend-config="key=astroai/dev/terraform.tfstate" \
  -backend-config="region=ap-south-1" \
  -backend-config="encrypt=true" \
  -backend-config="use_lockfile=true"
terraform destroy -var="aws_region=ap-south-1"
```

Emptying S3 buckets might be necessary before destruction if they contain objects. The bootstrap state bucket is protected from Terraform destruction intentionally.

## Planned extensions

After this deployment is stable:

1. Add Cognito and API Gateway JWT authorization.
2. Replace the calculator mock with Swiss Ephemeris and geocoding.
3. Add Step Functions when report generation becomes asynchronous.
4. Add Bedrock only for interpretations.
5. Add a custom domain using Route 53 and ACM.
6. Add a PDF worker that writes final PDFs to the report bucket.
