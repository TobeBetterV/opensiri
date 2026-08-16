import type { Plugin } from "vite";

// React 19 dropped `_debugSource` from fibers, and the RSC runtime registers
// itself with React DevTools as `react-server-dom-webpack`, which the LocatorJS
// extension reports as unsupported. Both fallbacks are gone, so LocatorJS can
// only resolve components from the `data-locatorjs-id` attributes emitted by
// `@locator/babel-jsx`.
//
// `@vitejs/plugin-react` v6 transforms JSX with oxc and no longer accepts Babel
// plugins, so the transform runs here instead: `enforce: "pre"` keeps it ahead
// of the JSX transform, and only the syntax plugins are enabled so Babel prints
// TSX back out and leaves the actual downleveling to Vite.
const JSX_FILE = /\.[jt]sx$/;

export function locatorJs(): Plugin {
  let cwd = process.cwd();

  return {
    name: "locatorjs",
    apply: "serve",
    enforce: "pre",
    configResolved(config) {
      cwd = config.root;
    },
    async transform(code, id) {
      const file = id.split("?")[0];
      if (!JSX_FILE.test(file) || file.includes("/node_modules/")) {
        return null;
      }

      const { transformAsync } = await import("@babel/core");
      const result = await transformAsync(code, {
        cwd,
        filename: file,
        babelrc: false,
        configFile: false,
        sourceMaps: true,
        plugins: [
          ["@babel/plugin-syntax-typescript", { isTSX: true }],
          "@babel/plugin-syntax-jsx",
          "@locator/babel-jsx/dist",
        ],
      });

      if (!result?.code) {
        return null;
      }
      return { code: result.code, map: result.map };
    },
  };
}
