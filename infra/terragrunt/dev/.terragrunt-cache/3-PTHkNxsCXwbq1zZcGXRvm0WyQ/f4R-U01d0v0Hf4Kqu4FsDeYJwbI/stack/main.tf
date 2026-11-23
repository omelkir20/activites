module "storage" {
  source = "../storage"
  name   = "${var.project}-${var.env}-files"
}

module "messaging" {
  source = "../messaging"
  name   = "${var.project}-${var.env}-notifications"
}

module "database" {
  source = "../database"
  name   = "${var.project}-${var.env}-contacts"
}
