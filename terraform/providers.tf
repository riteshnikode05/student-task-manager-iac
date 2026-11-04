terraform {
  required_version = ">= 1.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

# ------------------------------------------------------------------
# Cloudflare Provider
# Credentials are supplied via environment variables:
#   CLOUDFLARE_API_TOKEN
# to avoid storing sensitive values inside source code.
# ------------------------------------------------------------------
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
