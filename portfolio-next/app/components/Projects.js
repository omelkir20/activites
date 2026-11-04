"use client";

import { useEffect, useState } from 'react';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

    fetch(`${apiUrl}/api/projects`)
      .then((res) => {
        if (!res.ok) throw new Error('Erreur lors de la récupération des projets');
        return res.json();
      })
      .then((data) => {
        setProjects(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Chargement des projets...</p>;
  if (error) return <p>Erreur : {error}</p>;

  return (
    <section id="projects">
      <h2>Mes Projets</h2>
      <div className="grid">
        {projects.map((project) => (
          <div key={project.id} className="card">
            <h3>{project.name}</h3>
            <p>{project.description}</p>
            {project.tech && <p>{project.tech.join(', ')}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
