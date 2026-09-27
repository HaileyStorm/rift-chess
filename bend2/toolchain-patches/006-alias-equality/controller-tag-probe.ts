// Local ABI diagnostic for a host-authored input into a separately emitted
// ApplicationControl book. It does not mutate a session or project source.
import Controller from '../../ApplicationControl.bend';

const tagPrefix = process.env.BEND_DIAGNOSTIC_INPUT_PREFIX || '';
const boot = Controller.boot_reads('', '', true, true, 1280, 800);
const input = { $: `${tagPrefix}Activate`, id: 56 };
const events = { $: 'Con', head: input, tail: { $: 'Nil' } };
const next = Controller.dispatch_at_web(events, boot.presentation, boot.session);
console.log(JSON.stringify({ tagPrefix, before: boot.presentation.menu,
  after: next.presentation.menu, revisionBefore: boot.presentation.revision,
  revisionAfter: next.presentation.revision,
  eventTag: input.$ }));
