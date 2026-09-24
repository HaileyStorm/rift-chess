# Candidate witnesses only: the pinned checker is absent in this review.
# Do not count these as 12 checked proofs. No unsafe/foreign proof repair.
import Base
import ./LAWS.bend as Laws
import ../../MaskedLayer.bend as MaskedLayer

def full_case(+depth: Nat, +colors: Image, +image: Image)
  -> {MaskedLayer.over(depth, colors, Pix{16711680}, 255, image) == colors : Image}:
  match depth:
    case 0n: {==}
    case 1n+rest: {==}

def Laws.mask_zero_depth(color):
  {==}

def Laws.masked_layer_zero(depth, colors, mask, image):
  {==}

def Laws.masked_layer_full(depth, colors, image):
  full_case(depth, colors, image)

def Laws.mip_level_zero(depth, size, colors, mask):
  {==}

def Laws.mip_half_zero(colors, mask):
  {==}

def Laws.mip_hidden_blue():
  {==}

def Laws.glyph_zero(depth, size, x, y, glyph, ink, image):
  {==}

def Laws.glyph_empty(depth, size, ink, opacity, image):
  {==}

def Laws.rgba_empty():
  {==}

def Laws.rgba_hidden_rgb():
  {==}

def Laws.rgba_non_byte():
  {==}

def Laws.rgba_trailing():
  {==}
