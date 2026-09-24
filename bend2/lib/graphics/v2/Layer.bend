# Full-image blend operators. Uniform/uniform and opaque cases avoid descent.
# Quad branches are immutable and balanced; the host writes pixels only after join.
import Base
import ./Color.bend as Color

def over_tree(+depth: Nat, +src: Image, +opacity: U32, dest: Image) -> Image:
  match depth src dest:
    case 0n Pix{source} Pix{background}:
      Pix{Color.over(source, background, opacity)}
    case 0n Pix{source} Qua{tl, tr, bl, br}:
      Pix{source}
    case 0n Qua{tl, tr, bl, br} Pix{background}:
      Pix{background}
    case 0n Qua{tl, tr, bl, br} Qua{a, b, c, d}:
      Pix{0}
    case 1n+rest Pix{source} Pix{background}:
      Pix{Color.over(source, background, opacity)}
    case 1n+rest Pix{+source} Qua{tl, tr, bl, br}:
      a b c d = over_tree(rest, Pix{source}, opacity, tl)
        over_tree(rest, Pix{source}, opacity, tr)
        over_tree(rest, Pix{source}, opacity, bl)
        over_tree(rest, Pix{source}, opacity, br)
      Qua{a, b, c, d}
    case 1n+rest Qua{tl, tr, bl, br} Pix{+background}:
      a b c d = over_tree(rest, tl, opacity, Pix{background})
        over_tree(rest, tr, opacity, Pix{background})
        over_tree(rest, bl, opacity, Pix{background})
        over_tree(rest, br, opacity, Pix{background})
      Qua{a, b, c, d}
    case 1n+rest Qua{tl, tr, bl, br} Qua{aa, bb, cc, dd}:
      a b c d = over_tree(rest, tl, opacity, aa)
        over_tree(rest, tr, opacity, bb)
        over_tree(rest, bl, opacity, cc)
        over_tree(rest, br, opacity, dd)
      Qua{a, b, c, d}

def over_case(empty: Bool, full: Bool, +depth: Nat, +src: Image,
  +opacity: U32, +dest: Image) -> Image:
  match empty full:
    case True{} _: dest
    case False{} True{}: src
    case False{} False{}: over_tree(depth, src, opacity, dest)

def over(depth: Nat, src: Image, +opacity: U32, dest: Image) -> Image:
  over_case(U32.is_zero(opacity), U32.is_ge(opacity, 255), depth,
    src, opacity, dest)

def add_tree(+depth: Nat, +src: Image, dest: Image) -> Image:
  match depth src dest:
    case 0n Pix{source} Pix{background}: Pix{Color.add(source, background)}
    case 0n Pix{source} Qua{tl, tr, bl, br}: Pix{source}
    case 0n Qua{tl, tr, bl, br} Pix{background}: Pix{background}
    case 0n Qua{tl, tr, bl, br} Qua{a, b, c, d}: Pix{0}
    case 1n+rest Pix{source} Pix{background}: Pix{Color.add(source, background)}
    case 1n+rest Pix{+source} Qua{tl, tr, bl, br}:
      a b c d = add_tree(rest, Pix{source}, tl)
        add_tree(rest, Pix{source}, tr)
        add_tree(rest, Pix{source}, bl)
        add_tree(rest, Pix{source}, br)
      Qua{a, b, c, d}
    case 1n+rest Qua{tl, tr, bl, br} Pix{+background}:
      a b c d = add_tree(rest, tl, Pix{background})
        add_tree(rest, tr, Pix{background})
        add_tree(rest, bl, Pix{background})
        add_tree(rest, br, Pix{background})
      Qua{a, b, c, d}
    case 1n+rest Qua{tl, tr, bl, br} Qua{aa, bb, cc, dd}:
      a b c d = add_tree(rest, tl, aa)
        add_tree(rest, tr, bb)
        add_tree(rest, bl, cc)
        add_tree(rest, br, dd)
      Qua{a, b, c, d}
