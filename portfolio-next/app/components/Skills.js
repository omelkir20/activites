"use client";

import { useEffect, useState } from 'react';

export default function Skills() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

    fetch(`${apiUrl}/api/skills`)
      .then((res) => {
        if (!res.ok) throw new Error('Erreur lors de la récupération des compétences');
        return res.json();
      })
      .then((data) => {
        setSkills(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Chargement des compétences...</p>;
  if (error) return <p>Erreur : {error}</p>;

  return (
    <section id="skills">
      <h2>Mes Compétences</h2>
      <ul>
        {skills.map((skill) => (
          <li key={skill.id}>
            <strong>{skill.name}</strong> - {skill.level}
          </li>
        ))}
      </ul>
    </section>
  );
}
