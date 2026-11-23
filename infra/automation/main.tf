module "stack" {
  source = "../modules/stack"
  env    = "prod"
}

variable "target_host" { default = "192.168.148.140" }
variable "ssh_user"    { default = "omelkhir" }

resource "local_file" "inventory" {
  filename = "${path.module}/../../inventory.generated.ini"
  content  = <<-EOT
    [servers]
    ubuntu-server ansible_host=${var.target_host} ansible_user=${var.ssh_user} ansible_ssh_private_key_file=~/.ssh/id_rsa
  EOT
}

resource "terraform_data" "ansible" {
  triggers_replace = [local_file.inventory.content, module.stack.queue_url]
  provisioner "local-exec" {
    working_dir = "${path.module}/../.."
    command     = "ansible-playbook -i inventory.generated.ini deploy_stack.yml -e sqs_queue_url=${module.stack.queue_url} -e s3_bucket=${module.stack.bucket}"
  }
}
