import { Title } from "@solidjs/meta";
import Counter from "~/components/Counter";
import { ConfettiExplosion } from "../../../src/index";

export default function Home() {
  return (
    <main
      style={{
        display: "flex",
        "flex-direction": "column",
        position: "fixed",
        height: "100vh",
        width: "100vw",
        "justify-content": "center",
        "text-align": "center",
        "align-items": "center"
      }}
    >
      <Title>Hello World</Title>
      <h1>Hello world!</h1>
      <Counter />
      <p>
        Visit{" "}
        <a href="https://start.solidjs.com" target="_blank">
          start.solidjs.com
        </a>{" "}
        to learn how to build SolidStart apps.
        <ConfettiExplosion particleSize={20} particlesShape="circles" particleCount={150} />
      </p>
    </main>
  );
}
