# Automated Deployment of a Serverless Student Task Management Application Using Terraform

> **Mini Project — Infrastructure as Code (IaC)**  
> Cloud Platform: **Cloudflare Workers** · IaC Tool: **Terraform** · CI/CD: **GitHub Actions**

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Project Structure](#3-project-structure)
4. [Technologies Used](#4-technologies-used)
5. [Quick Start](#5-quick-start)
6. [Terraform Configuration](#6-terraform-configuration)
7. [Application API Reference](#7-application-api-reference)
8. [CI/CD Pipeline](#8-cicd-pipeline)
9. [IaC Lifecycle Commands](#9-iac-lifecycle-commands)
10. [Security & Secrets Management](#10-security--secrets-management)
11. [Submission Deliverables](#11-submission-deliverables)

---

## 1. Project Overview

This project demonstrates the full **Infrastructure as Code (IaC)** lifecycle using Terraform to provision and manage a serverless Student Task Management Application on Cloudflare.

**Key principle:** Every cloud resource (Worker, KV namespace, binding) is created, modified, and destroyed exclusively through Terraform code — never manually through the Cloudflare dashboard.

### Functional Requirements Implemented

| # | Requirement | Status |
|---|-------------|--------|
| FR1 | Add Task | ✅ |
| FR2 | View Tasks | ✅ |
| FR3 | Update Task Status | ✅ |
| FR4 | Delete Task | ✅ |
| FR5 | Persistent Storage (Workers KV) | ✅ |

---

## 2. Architecture

```
Developer / Student
        |
     git push
        |
        v
 GitHub Repository
        |
        v
  GitHub Actions
        |
        v
    Terraform
        |
  Cloudflare Provider
        |
   +----+----+
   |         |
   v         v
Cloudflare  Workers KV
 Worker     (student_tasks)
   |              |
   +------+-------+
          |
          v
  Student Task Manager
   (HTML + REST API)
          |
          v
       End User
```

---

## 3. Project Structure

```
student-task-manager-iac/
│
├── terraform/
│   ├── providers.tf          # Cloudflare provider configuration
│   ├── main.tf               # Resources: Worker, KV namespace, binding
│   ├── variables.tf          # Input variables (account_id, names, env)
│   ├── outputs.tf            # Output: Worker name, KV ID, URL
│   └── terraform.tfvars.example  # Template — copy to terraform.tfvars
│
├── application/
│   ├── worker.js             # Cloudflare Worker (backend + frontend SPA)
│   └── wrangler.toml         # Local dev config (not used in production)
│
├── .github/
│   └── workflows/
│       └── deploy.yml        # GitHub Actions CI/CD pipeline
│
├── screenshots/              # Place evidence screenshots here
│
├── .gitignore
└── README.md
```

---

## 4. Technologies Used

| Component | Technology |
|-----------|-----------|
| Infrastructure as Code | Terraform ≥ 1.0 |
| Cloud Platform | Cloudflare |
| Compute | Cloudflare Workers |
| Data Storage | Cloudflare Workers KV |
| Application | HTML, CSS, JavaScript (embedded in Worker) |
| API | REST API (JavaScript / Cloudflare Worker) |
| Version Control | Git |
| Repository | GitHub |
| CI/CD | GitHub Actions |

---

## 5. Quick Start

### Prerequisites

- [Terraform ≥ 1.0](https://developer.hashicorp.com/terraform/install)
- [Git](https://git-scm.com/)
- [Cloudflare account (Free plan)](https://dash.cloudflare.com/sign-up)
- Cloudflare API Token with **Workers Scripts:Edit** and **Workers KV Storage:Edit** permissions

### Step-by-step

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/student-task-manager-iac.git
cd student-task-manager-iac/terraform

# 2. Create terraform.tfvars from the example
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your Cloudflare account ID

# 3. Set API token via environment variable (never hard-code it)
# Linux/macOS:
export TF_VAR_cloudflare_api_token="YOUR_TOKEN"
# Windows PowerShell:
$env:TF_VAR_cloudflare_api_token = "YOUR_TOKEN"

# 4. Initialize Terraform (downloads Cloudflare provider)
terraform init

# 5. Format code
terraform fmt

# 6. Validate configuration
terraform validate

# 7. Preview changes
terraform plan

# 8. Deploy infrastructure
terraform apply

# 9. Open the printed application_url in your browser
```

---

## 6. Terraform Configuration

### Resources Provisioned

| Resource | Terraform Block | Description |
|----------|----------------|-------------|
| Workers KV Namespace | `cloudflare_workers_kv_namespace.student_tasks` | Key-value store for task data |
| Worker Script | `cloudflare_worker_script.task_manager` | Serverless compute + API |
| KV Binding | `kv_namespace_binding` (inside worker script) | Connects Worker to KV as `TASKS_KV` |

### Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `cloudflare_api_token` | *(required, sensitive)* | Cloudflare API token |
| `cloudflare_account_id` | *(required)* | Your Cloudflare account ID |
| `worker_name` | `student-task-manager` | Worker script name |
| `kv_namespace_name` | `student_tasks` | KV namespace title |
| `environment` | `production` | Deployment environment |

---

## 7. Application API Reference

Base URL: `https://<worker-name>.<account-id>.workers.dev`

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| `POST` | `/api/tasks` | Create a task | `{ title, priority, status }` |
| `GET` | `/api/tasks` | List all tasks | — |
| `GET` | `/api/tasks/:id` | Get a task by ID | — |
| `PUT` | `/api/tasks/:id` | Update a task | `{ title?, priority?, status? }` |
| `DELETE` | `/api/tasks/:id` | Delete a task | — |

### Example – Create Task

```bash
curl -X POST https://your-worker.workers.dev/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Submit Cloud Computing Assignment","priority":"High","status":"Pending"}'
```

### Example Response

```json
{
  "message": "Task created successfully",
  "task": {
    "id": "T1042",
    "title": "Submit Cloud Computing Assignment",
    "priority": "High",
    "status": "Pending",
    "createdAt": "2026-11-04T06:00:00.000Z"
  }
}
```

---

## 8. CI/CD Pipeline

The pipeline defined in `.github/workflows/deploy.yml` runs automatically:

| Event | Jobs Run |
|-------|----------|
| Pull Request to `main` | `validate` → `fmt check` → `plan` |
| Push to `main` | `init` → `validate` → `plan` → `apply` |

### Required GitHub Secrets

Go to **Repository → Settings → Secrets and variables → Actions** and add:

| Secret Name | Value |
|-------------|-------|
| `CLOUDFLARE_API_TOKEN` | Your Cloudflare API token |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |

---

## 9. IaC Lifecycle Commands

```bash
# Initialize
terraform init

# Format
terraform fmt

# Validate
terraform validate

# Plan (preview)
terraform plan

# Apply (provision / update)
terraform apply

# Inspect state
terraform show

# Destroy (remove all resources)
terraform plan -destroy
terraform destroy

# Recreate after destroy
terraform apply
```

---

## 10. Security & Secrets Management

> ⚠️ **Never commit secrets to Git.**

The following are excluded via `.gitignore`:
- `terraform.tfvars` (contains account ID)
- `terraform.tfstate` / `terraform.tfstate.backup`
- `.terraform/` directory
- `.env` files

The API token is passed exclusively through:
- Local: environment variable `TF_VAR_cloudflare_api_token`
- CI/CD: GitHub Secret `CLOUDFLARE_API_TOKEN`

---

## 11. Submission Deliverables

- [x] Complete Terraform configuration (`providers.tf`, `main.tf`, `variables.tf`, `outputs.tf`)
- [x] Worker application code (`worker.js`)
- [x] GitHub Actions CI/CD workflow (`deploy.yml`)
- [x] `.gitignore` protecting sensitive files
- [ ] Screenshots (place in `screenshots/` folder)
- [ ] Mini Project Report (10 chapters)
- [ ] GitHub repository with meaningful commit history

---

*Submission title: "Automated Deployment of a Serverless Student Task Management Application Using Terraform-Based Infrastructure as Code"*
