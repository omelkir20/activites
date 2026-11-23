include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "../../modules//terragrunt-stack"
}

inputs = {
  env = "dev"
}
