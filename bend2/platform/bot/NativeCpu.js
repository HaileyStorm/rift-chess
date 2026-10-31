// JS has no native backend. The unchanged heuristic route remains available.
function native_prepare() { return io_tup(0, ""); }
function native_submit() { return io_tup(1, 0); }
function native_poll() { return io_tup(1, io_tup(0, 0)); }
function native_cancel() { return 1; }
function native_release() { return 1; }
function native_close() { return 0; }

// Current35 registers effects explicitly; pinned 2.0.27 discovers these names.
if (typeof io_eff === "function") {
  io_eff(CID(native_prepare), native_prepare);
  io_eff(CID(native_submit), native_submit);
  io_eff(CID(native_poll), native_poll);
  io_eff(CID(native_cancel), native_cancel);
  io_eff(CID(native_release), native_release);
  io_eff(CID(native_close), native_close);
}
