import Nav from "./components/Nav";
import Hero from "./components/Hero";
import Services from "./components/Services";
import Work from "./components/Work";
import Projects from "./components/Projects";
import References from "./components/References";
import Contact from "./components/Contact";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Services />
        <Work />
        <Projects />
        <References />
        <Contact />
      </main>
    </>
  );
}
