# Finite endpoint proofs for the RGA1 decoder contract.
# These do not establish the general pixel semantics.
import Base
import ./LAWS.bend as Laws

def Laws.decode_depth_zero_single_pixel():
  {==}

def Laws.decode_row_major_2x2():
  {==}

def Laws.decode_bad_magic_fails():
  {==}

def Laws.decode_trailing_byte_fails():
  {==}

def Laws.decode_invalid_depth_fails():
  {==}

def Laws.decode_non_byte_payload_fails():
  {==}
