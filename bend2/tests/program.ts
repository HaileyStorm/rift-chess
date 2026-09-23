// The controller is split across ui/State, Records, Commands, Actions and
// Program; suites address it as one namespace of top-level defs. Program's
// compiled module already carries its imports under their module names, so
// one compilation serves the whole namespace.
// @ts-ignore Compiled by the pinned Bend loader.
import Program from '../ui/Program.bend';

const P: Record<string, any> = {};
for (const module of ['State', 'Records', 'Commands', 'Actions']) {
  const prefix = `${module}.`;
  for (const [key, value] of Object.entries(Program)) if (key.startsWith(prefix)) P[key.slice(prefix.length)] = value;
}
for (const [key, value] of Object.entries(Program)) if (!/^[A-Z]/.test(key)) P[key] = value;
export default P;
