# Board-independent scalar orthographic projection. Callers own normalization,
# world origin, clipping and inverse preconditions (nonzero scale and pitch).
import Base

def radians(degrees: F32) -> F32:
  F32.mul(degrees, F32.div(F32.pi(), 180.0))

def project_x(cos_yaw: F32, sin_yaw: F32, scale: F32, center: F32, dx: F32, dy: F32) -> F32:
  +horizontal = F32.sub(F32.mul(cos_yaw, dx), F32.mul(sin_yaw, dy))
  F32.add(center, F32.mul(scale, horizontal))

def project_y(cos_yaw: F32, sin_yaw: F32, sin_pitch: F32, scale: F32, center: F32, dx: F32, dy: F32) -> F32:
  +vertical = F32.add(F32.mul(sin_yaw, dx), F32.mul(cos_yaw, dy))
  F32.add(center, F32.mul(F32.mul(scale, sin_pitch), vertical))

def inverse_x(cos_yaw: F32, sin_yaw: F32, dx: F32, dy: F32) -> F32:
  F32.add(F32.mul(cos_yaw, dx), F32.mul(sin_yaw, dy))

def inverse_y(cos_yaw: F32, sin_yaw: F32, dx: F32, dy: F32) -> F32:
  F32.add(F32.mul(F32.neg(sin_yaw), dx), F32.mul(cos_yaw, dy))

def pixel(value: F32) -> U32:
  F32.to_u32(F32.max(F32.round(value), 0.0))
