import { Component } from "solid-js";
import ConfettiExplosion from "../../../src/index";

const App: Component = () => (
  <div
    style={{
      display: "flex",
      position: "fixed",
      height: "100vh",
      width: "100vw",
      "justify-content": "center",
      "text-align": "center",
      "align-items": "center"
    }}
  >
    <ConfettiExplosion particleSize={20} particlesShape="circles" particleCount={300} />
  </div>
);

export default App;
