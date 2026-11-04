import Link from "next/link";
import { projects } from "../data/projects";

export default function ProjectsPage() {
  return (
    <main>
      <h1>Tous les projets</h1>
      <ul>
        {projects.map((p) => (
          <li key={p.slug}>
            <Link href={`/projects/${p.slug}`}>{p.title}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
