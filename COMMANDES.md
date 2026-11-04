# Commandes pour exécuter l'activité 4 (du début à la fin)

> Machine hôte : celle qui exécute VMware (Workstation) — exemples pour Ubuntu/Debian.
> Si l'hôte est Windows : installez Vagrant (MSI), le plugin et le *Vagrant VMware Utility* de la même façon ;
> Ansible n'est pas nécessaire sur l'hôte (le Vagrantfile bascule automatiquement sur `ansible_local`).

## 0. Décompresser le projet
```bash
unzip activite4.zip && cd activite3
```

## 1. Prérequis sur l'hôte (une seule fois)
```bash
sudo apt update && sudo apt install -y ansible git curl unzip rsync

# Vagrant (dépôt HashiCorp)
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install -y vagrant

# Provider VMware : plugin + utilitaire (téléchargement du paquet depuis
# https://developer.hashicorp.com/vagrant/install/vmware )
vagrant plugin install vagrant-vmware-desktop
sudo dpkg -i vagrant-vmware-utility_*.deb          # le service démarre normalement tout seul
sudo systemctl enable --now vagrant-vmware-utility  # si besoin
vagrant --version && ansible --version
```

## 2. Tâche 43 — Playbook sur la VM existante (`ubuntu-server`, 192.168.148.100)
```bash
ansible -i inventory.ini all -m ping                         # test de connexion
ansible-playbook -i inventory.ini deploy_portfolio.yml --ask-become-pass
# Si Docker n'a pas encore de dépôt pour votre release Ubuntu (ex. 26.04) :
# ansible-playbook -i inventory.ini deploy_portfolio.yml --ask-become-pass -e docker_apt_codename=noble
```
Ouvrir `http://192.168.148.100:3000` → 📸 capture (`docs/screenshots/43-portfolio.png`).

## 3. Tâche 44 — Vagrant + Ansible automatique
```bash
vagrant plugin list                       # vagrant-vmware-desktop doit apparaître
vagrant up --provider vmware_desktop      # VM -> Ansible -> Docker -> Portfolio
vagrant ssh -c "docker compose -f /opt/devsecops-portfolio/docker-compose.yml ps"
curl -I http://localhost:3000
```
📸 capture de tout le `vagrant up` (`44-vagrant-up.png`).
Autre box (ex. Ubuntu 26.04 si disponible) : `VAGRANT_BOX=bento/ubuntu-26.04 vagrant up`
Forcer Ansible dans la VM : `ANSIBLE_MODE=local vagrant up`
Rejouer seulement le déploiement : `vagrant provision`

## 4. Tâche 45 — Destruction / recréation
```bash
vagrant destroy -f
vagrant up
curl -I http://localhost:3000             # HTTP/1.1 200 OK
```
📸 capture (`45-destroy-up.png`) + durée dans le README.

## 5. Stack Docker Compose (sur la VM ou en local)
```bash
cp .env.example .env && nano .env         # changer POSTGRES_PASSWORD (et DATABASE_URL en conséquence)
docker compose up -d --build
docker compose ps                          # 📸 53-compose-ps.png
docker compose exec api npx prisma migrate deploy      # migrations (déjà lancées au démarrage de l'API)
docker compose exec db psql -U portfolio -d portfolio -c "SELECT * FROM contact_messages;"   # 📸 54-table.png
```
Ouvrir `http://<IP>:3000`, remplir le formulaire de contact → 📸 `47-contact-ok.png`.

## 6. Démos API pour le README (tâches 46, 48-51)
```bash
./scripts/demo-api.sh http://localhost:4000      # succès, refus Zod, erreur JSON, curl -I (Helmet), 429
# (attendre 1 minute entre deux exécutions : la limite est de 5 requêtes/minute)
```

## 7. Tests (tâches 57-60) — Node 22 requis
```bash
sudo apt install -y nodejs npm || true            # ou : curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
./scripts/test-all.sh                              # front + API + intégration frontend->API->PostgreSQL
```
(commandes séparées dans le README, sections 57-60) → 📸 `58-tests.png`, `60-integration.png`.

## 8. Jenkins (tâches 61-69)
```bash
# Docker pour Jenkins (une fois)
sudo usermod -aG docker jenkins && sudo systemctl restart jenkins

# Pousser le projet dans le dépôt Git surveillé par Jenkins (le projet doit être à la RACINE du dépôt)
git init -b main 2>/dev/null; git add -A && git commit -m "activite4: devsecops pipeline"
git remote add origin <URL_DU_DEPOT>      # si pas déjà fait
git push -u origin main
```
Dans Jenkins : *Nouveau item → Pipeline* → *Pipeline script from SCM* → Git → URL + branche `main` →
*Script Path* = `Jenkinsfile` → Sauvegarder → *Build with Parameters* (clé NVD facultative) → 📸 stages (61, 62, 63, 69).

Échecs volontaires (tâche 69) :
```bash
./scripts/demo-fail.sh secret && git add -A && git commit -m "demo secret" && git push   # puis build -> rouge
./scripts/demo-fail.sh restore && git add -A && git commit -m "restore" && git push
./scripts/demo-fail.sh vuln   && git add -A && git commit -m "demo vuln"   && git push   # puis build -> rouge
./scripts/demo-fail.sh restore && git add -A && git commit -m "restore" && git push
```
Images générées avec le Git SHA : `docker images | grep devsecops` → 📸 `63-images-sha.png`.

## 9. Dépannage rapide
| Problème | Solution |
|----------|----------|
| `vagrant up` : provider introuvable | `vagrant plugin install vagrant-vmware-desktop` + installer *Vagrant VMware Utility* |
| Dossier `/vagrant` vide dans la VM (mode `ansible_local`) | `vagrant ssh -c "sudo apt install -y open-vm-tools"` puis `vagrant reload --provision` |
| Erreur dépôt Docker (`resolute`/`Release file`) | ajouter `-e docker_apt_codename=noble` (Ansible) |
| `permission denied` Docker dans Jenkins | `sudo usermod -aG docker jenkins && sudo systemctl restart jenkins` |
| Jenkins lui-même dans un conteneur | le Jenkinsfile monte `$PWD` dans des conteneurs frères : installer Jenkins sur l'hôte/VM ou monter le même chemin |
| Port 3000 déjà utilisé | `docker compose down` ou changer le port dans `docker-compose.yml` |
