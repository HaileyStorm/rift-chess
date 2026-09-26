import Base
import ./Data.bend as D

def image(p: D.Packet) -> Image:
  match p:
    case D.Packet{image, score, label}: image

def roundtrip(p: D.Packet) -> D.Packet:
  p

def pixel(image: Image) -> U32:
  match image:
    case Pix{color}: color
    case Qua{nw, ne, sw, se}: pixel(nw)

def sample(p: D.Packet) -> U32:
  match p:
    case D.Packet{image, score, label}: pixel(image)
