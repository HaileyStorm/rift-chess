# Current selected package: controlled Chrome offline acceptance

The canonical `bend2/tests/browser-ground-first-offline.mjs` passed one local
real-Chrome install, cache, offline reload and e2–e4 check after the reboot.
The application was checked at repository revision
`cf9cdf78286fc37d920176862930b33a48c9c60d`; all selected application source bindings
and package files matched their recorded hashes without rebuilding.

The retained package version is `0a243cde7a8352d34b7e`, with build manifest SHA256
`578e5c11651c3bd5223d4209a0a3cf512da663184869176d8ee0f171cb28cbf6`.
Its original creation revision remains
`0d24ef276997142d2330826b5aecdf48dcc032f6` (`sourceDirty:true`, `draft:true`).
The 2.0.35 candidate remains unadopted.

- The service-worker cache contained exactly 7,347,974 bytes of prepared ground,
  SHA256 `7acd8b71c26095d7aa359ceed71073b0924d4ec6290603231c3972af3d485eb9`.
- Online and offline initial canvas PNGs were identical, SHA256
  `972761bdadb58f7e0a65a35979e2882df7926711d867deaabfe7579df48fc145`.
- Offline prepared-ground hit was 1; the legal e2–e4 move completed offline.
  No browser errors were reported.
- The original Popen exited 0, its membership and handle closure were verified,
  both streams reached EOF, and the native Job became self-only and closed.
  All 314 before/after fences matched; no closure remained unknown.

The immutable local terminal is
`.artifacts/bend2/2035-preview/stationary-motion-20261006/offline-current-supervisor-20261010-r2/terminal.json`,
SHA256 `87499f5ba5a24f50369cf8555180a6d873534f287903201b3e584d6cc6f0898f`.
Job peak commit was 845,606,912 bytes. Admission observed 2,714,140,672 bytes
available commit at `2026-10-10T07:07:51.132038Z`; the required headroom was
1,266,604,032 bytes, with no hard memory limit.

The separate R1 sandbox attempt failed with `EPERM` at checkout `realpath`
before server or browser creation. Its original process and Job closed, and all
311 fences matched. Its failed terminal remains intact, SHA256
`061c2d595d7332b4d6076ec2d517db82e97f8e8934d6ea3db4824de25ec46a74`.
R2 used the same application bytes through the reviewed elevated execution path.

This is one controlled 1280×800 local Chrome offline observation. It does not
establish hosted reliability, quota guarantees, stable responsiveness, physical
device performance, graphics owner acceptance, native parity or compiler adoption.
Historical samples and outstanding Linux, native, GPU and recovery requirements
retain their original dispositions.
