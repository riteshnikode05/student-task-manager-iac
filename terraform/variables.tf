# ------------------------------------------------------------------
# variables.tf
# All configurable values are declared here so the Terraform
# configuration is reusable without modifying hard-coded strings.
# ------------------------------------------------------------------

variable "cloudflare_api_token" {
  description = "Cloudflare API token with Workers and KV permissions"
  type        = string
  sensitive   = true
  # Value is supplied through the environment variable
  # TF_VAR_cloudflare_api_token or via terraform.tfvars (not committed)
}

variable "cloudflare_account_id" {
  description = "Cloudflare Account ID"
  type        = string
}

variable "worker_name" {
  description = "Name of the Cloudflare Worker"
  type        = string
  default     = "student-task-manager"
}

variable "kv_namespace_name" {
  description = "Name of the Workers KV namespace used for task storage"
  type        = string
  default     = "student_tasks"
}

variable "environment" {
  description = "Deployment environment (dev | test | production)"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["dev", "test", "production"], var.environment)
    error_message = "environment must be one of: dev, test, production."
  }
}
