// Build entry for the Vercel serverless function.
// esbuild bundles this (and all dependencies) into a single self-contained
// CommonJS file at api/index.js — see the "build" script in package.json.
import app from "./app";

export default app;
