# Native stable-sprite benchmark entrypoint; same pixels and round count.
import Base
import ./StableSprites.bend as Work

# Process-level timing includes startup, source and optional cache preparation.
def main() -> U32:
  Work.run(True{},0n)
