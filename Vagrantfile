# -*- mode: ruby -*-
# Vagrant + Libvirt (KVM) -> création VM -> Ansible
# -> installation Docker -> déploiement Portfolio
#
# Prérequis :
# - Vagrant
# - Plugin vagrant-libvirt
# - QEMU/KVM
# - Libvirt
#
# Variables d'environnement optionnelles :
# VAGRANT_BOX  : box à utiliser
# ANSIBLE_MODE : "local" force Ansible dans la VM

def which(cmd)
  exts = ENV["PATHEXT"] ? ENV["PATHEXT"].split(";") : [""]

  ENV["PATH"].split(File::PATH_SEPARATOR).each do |path|
    exts.each do |ext|
      exe = File.join(path, "#{cmd}#{ext}")
      return exe if File.executable?(exe) && !File.directory?(exe)
    end
  end

  nil
end

use_local_ansible =
  ENV["ANSIBLE_MODE"] == "local" ||
  which("ansible-playbook").nil?

Vagrant.configure("2") do |config|

  # Ubuntu Box
  config.vm.box = ENV.fetch(
    "VAGRANT_BOX",
    "bento/ubuntu-24.04"
  )

  config.vm.hostname = "devsecops-vm"
  config.vm.boot_timeout = 600

  # Réseau : accès Portfolio et API
  config.vm.network "forwarded_port",
    guest: 3000,
    host: 3000,
    id: "portfolio"

  config.vm.network "forwarded_port",
    guest: 4000,
    host: 4000,
    id: "api"

  # Provider Libvirt / KVM
  config.vm.provider "libvirt" do |v|
    v.memory = 4096
    v.cpus = 2
  end

  # Provisioning Ansible
  if use_local_ansible

    config.vm.provision "ansible_local" do |ansible|
      ansible.playbook = "deploy_portfolio.yml"
      ansible.compatibility_mode = "2.0"
      ansible.verbose = false
    end

  else

    config.vm.provision "ansible" do |ansible|
      ansible.playbook = "deploy_portfolio.yml"
      ansible.compatibility_mode = "2.0"
      ansible.verbose = false
    end

  end

end
