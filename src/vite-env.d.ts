/// <reference types="vite/client" />

// Importing CSS with the `?inline` suffix returns the stylesheet text as a
// string instead of injecting it. We use this to inject styles into the panel's
// shadow root.
declare module "*.css?inline" {
  const css: string;
  export default css;
}
