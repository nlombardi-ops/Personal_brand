import Nav from "./components/Nav";
import Hero from "./components/Hero";
import Work from "./components/Work";
import Services from "./components/Services";
import Projects from "./components/Projects";
import References from "./components/References";
import Contact from "./components/Contact";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Work />
        <Services />
        <Projects />
        <References />
        <Contact />
      </main>
    </>
  );
}
