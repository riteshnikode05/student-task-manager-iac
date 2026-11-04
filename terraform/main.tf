# ------------------------------------------------------------------
# main.tf
# Provisions:
#   1. Workers KV namespace  (student_tasks)
#   2. Cloudflare Worker     (student-task-manager)
#   3. Worker ↔ KV binding   (TASKS_KV)
# ------------------------------------------------------------------

# ── 1. Workers KV Namespace ──────────────────────────────────────
resource "cloudflare_workers_kv_namespace" "student_tasks" {
  account_id = var.cloudflare_account_id
  title      = "${var.kv_namespace_name}_${var.environment}"
}

# ── 2. Cloudflare Worker Script ──────────────────────────────────
# Uses the current (non-deprecated) cloudflare_workers_script resource
# Service Worker format (addEventListener) — compatible with provider v4
resource "cloudflare_workers_script" "task_manager" {
  account_id         = var.cloudflare_account_id
  name               = "${var.worker_name}-${var.environment}"
  content            = file("${path.module}/../application/worker.js")
  compatibility_date = "2024-01-01"

  # ── 3. KV Binding ─────────────────────────────────────────────
  kv_namespace_binding {
    name         = "TASKS_KV"
    namespace_id = cloudflare_workers_kv_namespace.student_tasks.id
  }

  # Pass the environment name to the Worker as a plain-text binding
  plain_text_binding {
    name = "ENVIRONMENT"
    text = var.environment
  }
}

# ── 4. Enable workers.dev public URL ─────────────────────────────
resource "cloudflare_worker_script_subdomain" "task_manager_subdomain" {
  account_id  = var.cloudflare_account_id
  script_name = cloudflare_workers_script.task_manager.name
  enabled     = true
}
