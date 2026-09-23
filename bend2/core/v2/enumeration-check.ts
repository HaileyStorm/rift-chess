import K from './RuleKernel.bend';
import {initialPosition,legalActions} from '../../../src/engine/position.ts';
import {positionToBend,functionFrom,assertIds} from '../../tests/interop.ts';
const legal=functionFrom([['K',K]],['legal_ids']);
const p=initialPosition('B');const t=performance.now();const ids=legal(positionToBend(p));
assertIds(legalActions(p).map(x=>x.id),ids,'v2.initial_B');
console.log(JSON.stringify({ok:true,scope:'Initial B finite complete legal-ID comparison only',elapsedMs:performance.now()-t}));
