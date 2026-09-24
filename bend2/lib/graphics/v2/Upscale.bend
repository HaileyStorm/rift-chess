# Nearest-neighbor enlargement is a change of the Image's logical extent.
# Every immutable leaf covers twice as many output pixels along each axis;
# no second image tree, pixel copy, or host-side scene transform is needed.
# Valid source size is 2^depth in [1,2048] for `twice`, or [1,1024] for
# `four`, so target size remains within the library's 4096-pixel domain.
import Base

type Frame is Data:
  Frame{depth: Nat, size: U32, pixels: Image}

def twice(frame: Frame) -> Frame:
  match frame:
    case Frame{depth, size, pixels}:
      Frame{1n+depth, U32.mul(size, 2), pixels}

def four(frame: Frame) -> Frame:
  twice(twice(frame))
