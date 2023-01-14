import withSolid from "rollup-preset-solid";
import copy from 'rollup-plugin-copy'
import css from "rollup-plugin-import-css";

export default withSolid([
  {
    input: "src/index.tsx",
    printInstructions: true,
    targets: ["esm", "cjs"],
    plugins: [
      css(),
      copy({
        targets: [
          { src: 'src/styles.css', dest: 'dist/index' }
        ]
      })
    ]
  }
]);
