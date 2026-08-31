/**
 * Re-exported so tooling can resolve the config programmatically.
 * The canonical source is /.prettierrc.json at the repo root.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** @type {import('prettier').Config} */
export default require('../../../.prettierrc.json');
