# Packed RGB (0xRRGGBB). Opacity is an integer in [0, 255].
# Each channel is rounded independently; all intermediates fit in U32.
import Base

def red(c: U32) -> U32:
  U32.and(U32.shrn(c, 16n), 255)

def green(c: U32) -> U32:
  U32.and(U32.shrn(c, 8n), 255)

def blue(c: U32) -> U32:
  U32.and(c, 255)

def rgb(r: U32, g: U32, b: U32) -> U32:
  U32.or(U32.or(U32.shln(U32.and(r, 255), 16n),
    U32.shln(U32.and(g, 255), 8n)), U32.and(b, 255))

def channel(+source: U32, +dest: U32, +alpha: U32) -> U32:
  U32.div(U32.add(U32.add(U32.mul(source, alpha),
    U32.mul(dest, U32.sub(255, alpha))), 127), 255)

def over_partial(+src: U32, +dest: U32, opacity: U32) -> U32:
  +alpha = U32.min(opacity, 255)
  rgb(channel(red(src), red(dest), alpha),
    channel(green(src), green(dest), alpha),
    channel(blue(src), blue(dest), alpha))

def over_case(empty: Bool, full: Bool, src: U32, dest: U32, opacity: U32) -> U32:
  match empty full:
    case True{} _: dest
    case False{} True{}: src
    case False{} False{}: over_partial(src, dest, opacity)

def over(src: U32, dest: U32, +opacity: U32) -> U32:
  over_case(U32.is_zero(opacity), U32.is_ge(opacity, 255), src, dest, opacity)

def add_channel(a: U32, b: U32) -> U32:
  U32.min(U32.add(a, b), 255)

def add(+a: U32, +b: U32) -> U32:
  rgb(add_channel(red(a), red(b)), add_channel(green(a), green(b)),
    add_channel(blue(a), blue(b)))

def scale(+a: U32, +strength: U32) -> U32:
  rgb(channel(red(a), 0, U32.min(strength, 255)),
    channel(green(a), 0, U32.min(strength, 255)),
    channel(blue(a), 0, U32.min(strength, 255)))
