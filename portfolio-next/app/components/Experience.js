export default function Experience() {
  const experiences = [
    {
      title: "Projets DevOps & Cloud",
      period: "2026",
      description:
        "Déploiement d'applications avec Docker et Kubernetes (k3s), gestion des conteneurs et orchestration.",
      technologies: ["Docker", "Kubernetes", "Linux"],
    },
    {
      title: "Automatisation CI/CD",
      period: "2026",
      description:
        "Découverte des pipelines CI/CD et des outils d'automatisation pour améliorer le déploiement des applications.",
      technologies: ["Git", "Jenkins", "Ansible"],
    },
  ];

  return (
    <section id="experience" className="section">
      <h2>Experience</h2>
      <div className="experience-list">
        {experiences.map((experience, index) => (
          <article className="experience-card" key={index}>
            <h3>{experience.title}</h3>
            <p>{experience.period}</p>
            <p>{experience.description}</p>
            <div className="tags">
              {experience.technologies.map((tech) => (
                <span className="tag" key={tech}>
                  {tech}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
