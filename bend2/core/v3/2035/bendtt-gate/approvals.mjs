// Only independently reviewed, committed records can arm this consumer.
// CLI arguments and environment variables never supply approvals.
export const approvedSource = {
  "schema": "rift-bendtt-source-approval-2035/2",
  "receipt": {
    "path": ".artifacts/bend2/2035-preview/stationary-motion-20261006/prepared-source-2035/combined-ICkDXA/receipt.json",
    "sha256": "a5ccbfdb0a009501525785ffb94640d573593517b02942ad470c6c977c04f698"
  },
  "native": {
    "terminal": {
      "path": ".artifacts/bend2/2035-preview/stationary-motion-20261006/prepared-source-supervisor-r4/terminal.json",
      "sha256": "0c4e764b061e1dda168bd4249d6ac5291b85f2ac978a5461b24e82291242a002"
    },
    "settlement": {
      "path": ".artifacts/bend2/2035-preview/stationary-motion-20261006/prepared-source-supervisor-r4/native-settlement.json",
      "sha256": "6cfb9e3254ddceff6d8207c7a97399522129e53cde75d8ea61bc76ace77bd9a1"
    },
    "supervisor": {
      "path": ".artifacts/bend2/2035-preview/stationary-motion-20261006/run-prepared-source-r4.py",
      "sha256": "aaae6a3d94992184e57724384d7db0f9103ce45f265e5ab124431ed1e5c16906"
    },
    "capture": {
      "path": ".artifacts/bend2/2035-preview/stationary-motion-20261006/prepared-source-supervisor-r4/capture.stdout",
      "sha256": "abd18906c8cb1aac22d9120fb5e1be99c6affc5edc7b214778e673a7a9eb1628"
    },
    "start": {
      "path": ".artifacts/bend2/2035-preview/stationary-motion-20261006/prepared-source-supervisor-r4/start.json",
      "sha256": "1f252233ac0e8c39b06bcd49610755834495516ffff0bb4b7228ba956261d22f"
    }
  },
  "review": {
    "disposition": "accepted",
    "path": ".artifacts/bend2/2035-preview/stationary-motion-20261006/prepared-proof-accepted-review-r4.md",
    "sha256": "d9e2d34c410f2d54f8ff47317bc6efd8f1b7eb595f7d301dc70649c27ac0be22"
  }
};
export const approvedKernel = null;
export const approvedLinuxRuntime = null;
