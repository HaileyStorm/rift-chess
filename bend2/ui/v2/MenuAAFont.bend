# Rift-specific type scale. FontPack masks are decoded once from the packaged
# source-bound 8-bit asset, then cached as immutable Bend data. All label ink
# is opaque, so direct 8-bit MaskedStamp avoids an isolated PMA group per word.
# No text raster depends on browser fonts or low-resolution magnification.
import Base
import ../../lib/graphics/v2/Glyph.bend as Glyph
import ../../lib/graphics/v2/Shapes.bend as Shapes
import ./fonts/FontPack.bend as FontPack

def run(text: String,+fonts: FontPack.Book,+tier: U32,
  +x: Shapes.Coord,+y: Shapes.Coord) -> List<&2,Glyph.Placed>:
  match text:
    case SNil{}: []
    case SCon{Chr{code},tail}:
      +g = FontPack.glyph(fonts,tier,code)
      Glyph.Placed{x,y,g} <> run(tail,fonts,tier,
        Glyph.shift(x,Glyph.advance(g)),y)

def paint(+depth: Nat,+size: U32,text: String,+x: U32,+baseline: U32,
  color: U32,+fonts: FontPack.Book,+tier: U32,target: Image) -> Image:
  Glyph.draw_run(run(text,fonts,tier,Shapes.Pos{x},Shapes.Pos{baseline}),
    depth,size,color,255,target)

def body_case(large: Bool,+depth: Nat,+size: U32,text: String,
  +x: U32,+top: U32,color: U32,+fonts: FontPack.Book,target: Image) -> Image:
  match large:
    case True{}: paint(depth,size,text,x,U32.add(top,40),color,fonts,2,target)
    case False{}: paint(depth,size,text,x,U32.add(top,20),color,fonts,0,target)

def body(+depth: Nat,+size: U32,text: String,+x: U32,+top: U32,
  color: U32,+fonts: FontPack.Book,target: Image) -> Image:
  body_case(U32.is_ge(size,2048),depth,size,text,x,top,color,fonts,target)

def heading_case(large: Bool,+depth: Nat,+size: U32,text: String,
  +x: U32,+top: U32,color: U32,+fonts: FontPack.Book,target: Image) -> Image:
  match large:
    case True{}: paint(depth,size,text,x,U32.add(top,60),color,fonts,3,target)
    case False{}: paint(depth,size,text,x,U32.add(top,30),color,fonts,1,target)

def heading(+depth: Nat,+size: U32,text: String,+x: U32,+top: U32,
  color: U32,+fonts: FontPack.Book,target: Image) -> Image:
  heading_case(U32.is_ge(size,2048),depth,size,text,x,top,color,fonts,target)

def width_go(text: String,+fonts: FontPack.Book,+tier: U32) -> U32:
  match text:
    case SNil{}: 0
    case SCon{Chr{code},tail}:
      U32.add(Glyph.advance(FontPack.glyph(fonts,tier,code)),
        width_go(tail,fonts,tier))

def body_width_case(large: Bool,text: String,fonts: FontPack.Book) -> U32:
  match large:
    case True{}: width_go(text,fonts,2)
    case False{}: width_go(text,fonts,0)

def body_width(+size: U32,text: String,fonts: FontPack.Book) -> U32:
  body_width_case(U32.is_ge(size,2048),text,fonts)
