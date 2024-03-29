import { Component } from "solid-js";
import { A } from "solid-start";

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
    <A href="/explode">Explode me</A>
  </div>
);

export default App;
