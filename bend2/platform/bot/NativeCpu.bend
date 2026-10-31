# Optional native CPU transport. Build-selected model bytes remain outside Git.
# The C owner retains every pointer; Bend receives generation-checked U32 tokens.
import Base

# Prepare: 0 disabled, 1 ready, other values fatal startup errors.
def native_prepare() -> IO(U32 & String):
  import "./NativeCpu.c"
  import "./NativeCpu.js"

# Submit: status 0 accepts bounded work. Other statuses do not mutate the match.
def native_submit(context: String, model: String, epoch: U32,
  revision: U32, request: U32) -> IO(U32 & U32):
  import "./NativeCpu.c"
  import "./NativeCpu.js"

# Poll: API status, then worker status and action_id+1 (zero means no action).
def native_poll(token: U32, model: String, epoch: U32,
  revision: U32, request: U32) -> IO(U32 & (U32 & U32)):
  import "./NativeCpu.c"
  import "./NativeCpu.js"

# Retirement requests are idempotent until physical reclamation. Poll rejects
# retired tokens immediately; successful close establishes actual thread joins.
def native_cancel(token: U32) -> IO(U32):
  import "./NativeCpu.c"
  import "./NativeCpu.js"

def native_release(token: U32) -> IO(U32):
  import "./NativeCpu.c"
  import "./NativeCpu.js"

# Close is polled after the application loop: 2 means owned work remains live.
def native_close() -> IO(U32):
  import "./NativeCpu.c"
  import "./NativeCpu.js"
