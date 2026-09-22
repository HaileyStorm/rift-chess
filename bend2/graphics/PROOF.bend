# Closed proofs for the small immutable graphics contract.
import Base
import ./Pixel.bend as G
import ./LAWS.bend as Laws

def Laws.pix_empty(color):
  {==}

def Laws.pix_nw(path, color):
  {==}

def Laws.pix_ne(path, color):
  {==}

def Laws.pix_sw(path, color):
  {==}

def Laws.pix_se(path, color):
  {==}

def Laws.nw_head(path, tl, tr, bl, br):
  {==}

def Laws.ne_head(path, tl, tr, bl, br):
  {==}

def Laws.sw_head(path, tl, tr, bl, br):
  {==}

def Laws.se_head(path, tl, tr, bl, br):
  {==}

def outside_case(+rect: G.Rect, +color: U32, +image: Image, empty: Bool) ->
  {G.fill_rect.root(rect, color, image, empty, True{}) == image : Image}:
  match empty:
    case True{}:
      {==}
    case False{}:
      {==}

def empty_case(+rect: G.Rect, +color: U32, +image: Image, outside: Bool) ->
  {G.fill_rect.root(rect, color, image, True{}, outside) == image : Image}:
  match outside:
    case True{}:
      {==}
    case False{}:
      {==}

def Laws.outside_root_unchanged(rect, color, image, outside):
  %outside : {G.fill_rect.root(rect, color, image, G.rect_empty(rect), _)
    == image : Image}
  outside_case(rect, color, image, G.rect_empty(rect))

def Laws.empty_rect_unchanged(rect, color, image, empty):
  %empty : {G.fill_rect.root(rect, color, image, _, G.rect_outside_root(rect))
    == image : Image}
  empty_case(rect, color, image, G.rect_outside_root(rect))
