import Base

type Four is Data:
  Four{a: U32, b: U32, c: U32, d: U32}

type Huge is Data:
  Huge{f00: Four, f01: Four, f02: Four, f03: Four, f04: Four, f05: Four, f06: Four, f07: Four, f08: Four, f09: Four, f10: Four, f11: Four, f12: Four, f13: Four, f14: Four, f15: Four, f16: Four, f17: Four, f18: Four, f19: Four, f20: Four, f21: Four, f22: Four, f23: Four, f24: Four, f25: Four, f26: Four, f27: Four, f28: Four, f29: Four, f30: Four, f31: Four, f32: Four, f33: Four, f34: Four, f35: Four, f36: Four, f37: Four, f38: Four, f39: Four, f40: Four, f41: Four, f42: Four, f43: Four, f44: Four, f45: Four, f46: Four, f47: Four, f48: Four, f49: Four, f50: Four, f51: Four, f52: Four, f53: Four, f54: Four, f55: Four, f56: Four, f57: Four, f58: Four, f59: Four, f60: Four, f61: Four, f62: Four, f63: Four, f64: Four}

def keep(x: Huge) -> Huge:
  x
