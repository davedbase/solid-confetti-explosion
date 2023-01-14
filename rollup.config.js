import withSolid from "rollup-preset-solid";

export default withSolid([
  {
    printInstructions: true,
    input: "src/index.tsx",
    targets: ["esm", "cjs"]
  }
]);
