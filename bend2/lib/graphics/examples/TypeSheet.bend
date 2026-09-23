# Pure portable library example: the returned 512-square image needs only a blitter.
import Base
import ../Canvas.bend as Canvas
import ../Font.bend as Font

def screen() -> Image:
  +base = Canvas.rect_at(9n, 8, 8, 496, 496, 1055520, Pix{395280})
  +title = Font.draw_at(9n, "BEND PIXEL TYPE", 24, 24, 4, 16769720, base)
  +upper = Font.draw_at(9n, "ABCDEFGHIJKLM\nNOPQRSTUVWXYZ", 24, 92, 4, 16183519, title)
  +lower = Font.draw_at(9n, "abcdefghijklm\nnopqrstuvwxyz", 24, 172, 4, 7530467, upper)
  +digits = Font.draw_at(9n, "0123456789", 24, 252, 4, 16769720, lower)
  +marks = Font.draw_at(9n, "!\"#$%&'()*+,-./\n:;<=>?@[\\]^_`{|}~", 24, 304, 4, 16183519, digits)
  Font.draw_at(9n, "Small text. Clear at 2x.\n0123456789 - + = /", 24, 408, 2, 10926015, marks)
