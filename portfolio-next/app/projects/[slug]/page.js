import Link from "next/link";
import { notFound } from "next/navigation";
import { projects } from "../../data/projects";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export default async function ProjectDetail({ params }) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  if (!project) notFound();

  return (
    <main>
      <h1>{project.title}</h1>
      <p>{project.description}</p>
      <p>{project.details}</p>
      <p>Technologies : {project.tech.join(", ")}</p>
      <Link href="/projects">← Retour aux projets</Link>
    </main>
  );
}
