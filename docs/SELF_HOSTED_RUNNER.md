# AstroAI EC2 self-hosted GitHub Actions runner

This runbook creates the runner without relying on a working GitHub Actions workflow. CloudFormation provisions the host; a short-lived registration token from GitHub connects it to this repository.

## What the stack creates

- Dedicated Ubuntu 24.04 LTS `t3.small` EC2 instance
- 30 GiB encrypted gp3 volume and 2 GiB swap
- Dedicated VPC, public subnet, internet gateway and route
- Egress-only security group with no inbound rules and no SSH key
- Systems Manager instance role and profile
- Docker, Git, AWS CLI, `curl`, `jq`, archive utilities and an unprivileged `actions` user

The host role deliberately has no deployment permissions. The workflow continues to assume `astroai-github-deploy` using GitHub OIDC.

## 1. Create the CloudFormation stack

In AWS Console, select `us-east-1`, then open **CloudFormation → Stacks → Create stack → With new resources**.

1. Choose **Upload a template file**.
2. Upload `infra/runner/cloudformation.yaml`.
3. Use stack name `astroai-github-runner`.
4. Keep `t3.small` and 30 GiB unless intentionally changing them.
5. At the final page, acknowledge that the template creates IAM resources with custom names.
6. Choose **Submit** and wait for `CREATE_COMPLETE`.

The equivalent AWS CLI command is:

```bash
aws cloudformation deploy \
  --region us-east-1 \
  --stack-name astroai-github-runner \
  --template-file infra/runner/cloudformation.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides InstanceType=t3.small RootVolumeSize=30
```

## 2. Wait for bootstrap

Open **Systems Manager → Fleet Manager → Managed nodes**. Wait for `astroai-github-runner` to appear online. This normally takes several minutes while Ubuntu installs Docker and the AWS CLI.

Select the node, choose **Node actions → Start terminal session**, and verify:

```bash
sudo test -f /var/lib/astroai-runner-bootstrap-complete
sudo docker version
aws --version
```

If the marker is missing, inspect:

```bash
sudo tail -n 200 /var/log/astroai-runner-bootstrap.log
```

## 3. Obtain GitHub's registration command

Open the private AstroAI repository in GitHub:

**Settings → Actions → Runners → New self-hosted runner**

Choose:

- Runner image: Linux
- Architecture: x64

GitHub displays commands containing the currently supported runner version, download checksum and a registration token. The token expires after one hour. Do not save it in CloudFormation, Git, Parameter Store or Terraform state.

## 4. Install and register the runner

In the Systems Manager terminal:

```bash
sudo -iu actions
cd /opt/actions-runner
```

Run the GitHub-provided `curl`, checksum and `tar` commands. Do not run its `mkdir actions-runner` command because the stack already created `/opt/actions-runner`.

Register the runner using the URL and token shown by GitHub:

```bash
./config.sh \
  --url https://github.com/choudhary-nonit4/astroai \
  --token REPLACE_WITH_GITHUB_TOKEN \
  --name astroai-ec2-runner \
  --labels astroai-runner \
  --work _work \
  --unattended
```

Exit the `actions` shell and install the generated service:

```bash
exit
cd /opt/actions-runner
sudo ./svc.sh install actions
sudo ./svc.sh start
sudo ./svc.sh status
```

GitHub should now show `astroai-ec2-runner` as **Idle** with the `astroai-runner` label.

## 5. Point the deployment workflow at the runner

Change the `deploy` job in `.github/workflows/deploy.yml`:

```yaml
jobs:
  deploy:
    runs-on: [self-hosted, linux, x64, astroai-runner]
```

Commit and push that change. The queued job will be routed only to this EC2 runner. Keep CI pull-request jobs on `ubuntu-latest` until the runner is proven stable.

## 6. Verify the first workflow

Watch the runner directly if needed:

```bash
sudo journalctl -u 'actions.runner.*' -f
```

The workflow still uses `aws-actions/configure-aws-credentials` and GitHub OIDC. Do not add AWS access keys to the instance or GitHub.

After a build, inspect disk usage:

```bash
df -h
docker system df
```

When needed, and only while no job is running:

```bash
docker system prune -af
```

## Start, stop and cost control

Stopping the instance stops compute charges, but EBS storage charges continue. A stopped runner appears offline and matching jobs remain queued.

Start or stop from the EC2 console, or use:

```bash
aws ec2 stop-instances --region us-east-1 --instance-ids INSTANCE_ID
aws ec2 start-instances --region us-east-1 --instance-ids INSTANCE_ID
```

The GitHub runner service starts automatically when EC2 starts.

## Removal

First remove the runner in **GitHub → Settings → Actions → Runners**. Then delete the CloudFormation stack:

```bash
aws cloudformation delete-stack \
  --region us-east-1 \
  --stack-name astroai-github-runner
```

The root EBS volume, VPC, instance profile and instance are deleted with the stack.

## Security boundaries

- Use this runner only for this private repository.
- Do not run untrusted fork pull requests on it.
- Do not add inbound SSH or expose the Docker socket over TCP.
- Keep GitHub OIDC trust limited to the repository and `dev` environment.
- Apply operating-system updates periodically and monitor free disk space.
