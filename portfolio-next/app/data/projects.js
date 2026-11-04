export const projects = [
  {
    slug: "vagrant-infra",
    title: "Infrastructure Vagrant",
    description: "Création automatisée d'une VM Ubuntu avec Vagrant.",
    details: "Vagrantfile configurant nom, IP privée, RAM et CPU.",
    tech: ["Vagrant", "Ubuntu", "libvirt"],
  },
  {
    slug: "docker-portfolio",
    title: "Portfolio Dockerisé",
    description: "Déploiement du portfolio avec Nginx et Docker Compose.",
    details: "Image cv-docker servie par Nginx sur le port 8081.",
    tech: ["Docker", "Nginx", "Compose"],
  },
  {
    slug: "jenkins-pipeline",
    title: "Pipeline Jenkins",
    description: "CI/CD du portfolio Next.js.",
    details: "Checkout, installation des dépendances et build automatiques.",
    tech: ["Jenkins", "Next.js", "Git"],
  },
];
