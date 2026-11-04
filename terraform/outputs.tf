# ------------------------------------------------------------------
# outputs.tf
# Returns useful information after a successful terraform apply.
# ------------------------------------------------------------------

output "worker_name" {
  description = "Name of the deployed Cloudflare Worker"
  value       = cloudflare_workers_script.task_manager.name
}

output "kv_namespace_id" {
  description = "ID of the Workers KV namespace (student_tasks)"
  value       = cloudflare_workers_kv_namespace.student_tasks.id
}

output "application_url" {
  description = "Public URL of the deployed Student Task Manager"
  value       = "https://${cloudflare_workers_script.task_manager.name}.noisy-leaf-d17b.workers.dev"
}

output "environment" {
  description = "Active deployment environment"
  value       = var.environment
}
