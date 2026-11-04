import About from "./components/About";
import Skills from "./components/Skills";
import Projects from "./components/Projects";
import Experience from "./components/Experience";
import Contact from "./components/Contact";

export default function Home() {
  return (
    <main>
      <About />
      <Skills />
      <Projects />
      <Experience />
      <Contact />
    </main>
  );
}
