// Only independently reviewed, committed records can arm this consumer.
// CLI arguments and environment variables never supply approvals.
import { sourceFixture } from './contracts.mjs';
export const approvedSource = sourceFixture;
export const approvedKernel = null;
export const approvedLinuxRuntime = null;
