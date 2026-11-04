import Link from "next/link";

export default function Header() {
  return (
    <header className="header">
      <h1>Omelkhir Rebei</h1>
      <nav>
        <Link href="/#about">About</Link>
        <Link href="/#skills">Skills</Link>
        <Link href="/#projects">Projects</Link>
        <Link href="/#experience">Experience</Link>
        <Link href="/#contact">Contact</Link>
      </nav>
    </header>
  );
}
