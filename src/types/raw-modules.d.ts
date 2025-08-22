// Let TS accept vite's `?raw` imports for TOML files.
declare module "*.toml?raw" {
  const content: string;
  export default content;
}
