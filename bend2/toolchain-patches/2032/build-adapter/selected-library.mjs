import { selectedModule } from '../../004-web-workers/rebase-2032/selected-module.mjs';

export function emitSelectedLibrary2032(bend, compiler, book, roots) {
  if (!Array.isArray(roots) || roots.length === 0 || roots.some((root) => typeof root !== 'string')) {
    throw new TypeError('2.0.32 selected browser emission requires explicit export roots');
  }
  return selectedModule(bend, compiler, book, roots);
}
