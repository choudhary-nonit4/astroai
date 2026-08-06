# AstroAI AWS deployment runbook — EC2 MVP

AstroAI deploys to one on-demand EC2 instance using Terraform and GitHub Actions. This path avoids CloudFront while retaining infrastructure as code, short-lived GitHub OIDC credentials, private container images, and secure server administration through AWS Systems Manager.

## Architecture

```text
Internet → Elastic IP → EC2 port 80
                         └─ Docker network
                            ├─ Nginx + static Next.js
                            ├─ NestJS API
                            └─ FastAPI calculator

NestJS → DynamoDB report metadata
NestJS → private S3 report artifacts
GitHub Actions → ECR → Systems Manager → EC2
```

There is no load balancer, NAT gateway, SSH key, public database, or paid AI service.

## Terraform resources

The one-time `infra/bootstrap` stack owns:

- Encrypted, versioned Terraform state bucket
- GitHub OIDC deployment role
- Scoped IAM permissions allowing Terraform to manage AstroAI resources

The remote-state `infra/application` stack owns:

- VPC, public subnet, route table and internet gateway
- Security group allowing only public TCP port 80
- `t3.micro` Amazon Linux 2023 instance
- 16 GiB encrypted gp3 root volume and 2 GiB swap file
- Elastic IP
- Systems Manager-enabled EC2 instance role
- Three private ECR repositories with immutable tags and five-image retention
- DynamoDB reports table with TTL
- Private encrypted S3 report bucket with lifecycle expiration

## Deployment flow

```text
Pull request:
  npm build → Python tests → Terraform validation

Merge to main:
  GitHub OIDC authentication
  → tests
  → Terraform plan/apply
  → build amd64 Docker images
  → push images to ECR
  → wait for EC2 in Systems Manager
  → deploy containers with Run Command
  → HTTP smoke tests
```

GitHub never stores AWS access keys. EC2 has no inbound SSH rule.

## One-time bootstrap

The existing GitHub OIDC provider is reused. Configure `infra/bootstrap/terraform.tfvars`:

```hcl
aws_region        = "us-east-1"
github_repository = "choudhary-nonit4/astroai"
github_oidc_subject = "repo:choudhary-nonit4@86682058/astroai@1325328398:environment:dev"

create_github_oidc_provider       = false
existing_github_oidc_provider_arn = "arn:aws:iam::638614235431:oidc-provider/token.actions.githubusercontent.com"
```

Apply whenever the bootstrap IAM policy changes:

```bash
cd infra/bootstrap
terraform init
terraform plan
terraform apply
```

Keep `terraform.tfvars` and bootstrap state local; both are ignored by Git.

## GitHub environment

Create a GitHub Environment named exactly `dev` and add Environment variables:

```text
AWS_REGION = us-east-1
AWS_DEPLOY_ROLE_ARN = arn:aws:iam::638614235431:role/astroai-github-deploy
TF_STATE_BUCKET = astroai-tfstate-638614235431
```

These values are identifiers rather than credentials.

## First EC2 deployment

1. Pull the latest `main` locally.
2. Apply `infra/bootstrap` to grant the deployment role EC2 instance-profile management permissions.
3. Push or merge the EC2 infrastructure commit to `main`.
4. Open **Actions → Deploy AstroAI to EC2**.
5. Follow the Terraform plan in the logs. It removes the partial CloudFront/Lambda resources and creates the EC2 resources.
6. Wait for all image builds and the Systems Manager deployment.
7. Open the HTTP website URL in the workflow summary.

The first run takes longer because the instance installs Docker and registers with Systems Manager.

## Runtime containers

The workflow runs:

```text
astroai-web         96 MiB limit, host port 80
astroai-api        384 MiB limit, internal port 3001
astroai-calculator 192 MiB limit, internal port 8000
```

The web container proxies `/api/*` to the API container. Only the web container publishes a host port.

## Verification

From the workflow summary or terminal:

```bash
curl http://ELASTIC_IP/
curl http://ELASTIC_IP/api/health
```

Generate a report and inspect:

- DynamoDB table `astroai-dev-reports`
- S3 bucket `astroai-dev-reports-638614235431/reports/`
- Systems Manager → Fleet Manager → managed nodes
- ECR repositories prefixed `astroai-dev-`

## Operations

Use Systems Manager rather than SSH. For example, select the instance in Systems Manager Run Command and run:

```bash
docker ps
docker logs --tail 100 astroai-api
```

Do not include secrets in Run Command parameters because command history is auditable. AstroAI currently has no application secrets.

## Cost controls

- Keep `instance_type = "t3.micro"`.
- Keep T3 CPU credits in `standard` mode.
- Do not add a NAT gateway or load balancer.
- ECR keeps only five images per repository.
- Report objects expire after eight days.
- Stop the instance when the demo is unused for an extended period; EBS and Elastic IP-related costs may continue.
- Review Cost Explorer and the existing budget alerts.

## Destroy

Initialize the remote state and review the destruction plan:

```bash
cd infra/application
terraform init -reconfigure \
  -backend-config="bucket=astroai-tfstate-638614235431" \
  -backend-config="key=astroai/dev/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="encrypt=true" \
  -backend-config="use_lockfile=true"
terraform plan -destroy -var="aws_region=us-east-1"
terraform destroy -var="aws_region=us-east-1"
```

ECR repositories and S3 buckets must be empty before Terraform can delete them. The bootstrap state bucket is intentionally protected from destruction.

## Later migration

After AWS verifies CloudFront, the frontend can move back to private S3 plus CloudFront while the API remains temporarily on EC2. A later phase can restore Lambda/API Gateway and add Cognito, Bedrock interpretation, Step Functions, a custom domain and HTTPS.
