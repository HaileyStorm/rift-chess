function word_to_u32(w) {
  let x = 0;
  for (let i = 0; w.$ === "WCon"; i++) {
    x |= Number(w.head) << i;
    w = w.tail;
  }
  return x >>> 0;
}

function u32_to_word(x) {
  let w = {$: "WNil"};
  for (let i = 31; i >= 0; i--) {
    w = {$: "WCon", head: ((x >>> i) & 1) === 1, tail: w};
  }
  return w;
}

function cmp_new(a, b) {
  return {$: a < b ? "LT"
    : a === b ? "EQ" : "GT"};
}

function nat_divmod(a, b) {
  return b === 0n ? {$: "Tuple", fst: 0n, snd: a}
    : {$: "Tuple", fst: a / b, snd: a % b};
}

function nat_chk(n) {
  if (n > 281474976710655n) {
    throw "bend: a Nat past the largest immediate 2^48-1";
  }
  return n;
}

function f32_show(x) {
  if (x !== x) {
    return "nan";
  }
  if (!Number.isFinite(x) || Object.is(x, -0)) {
    return x < 0 ? "-inf"
      : x === 0 ? "-0" : "inf";
  }
  let s = "x";
  for (let p = 1; p <= 9 && Math.fround(Number(s)) !== x; p += 1) {
    s = String(Number(x.toExponential(p - 1)));
  }
  return s;
}

function f32_bits(x) {
  return new Uint32Array(new Float32Array([x]).buffer)[0];
}

function f32_from_bits(u) {
  return new Float32Array(new Uint32Array([u]).buffer)[0];
}

function f32_read(s) {
  const re = /^\s*[+-]?((\d+\.?\d*|\.\d+)(e[+-]?\d+)?|inf(inity)?|nan)$/i;
  const v = Number(s.replace(/inf\w*/i, "Infinity"));
  return re.test(s) ? {$: "Some", value: Math.fround(v)} : {$: "None"};
}

function char_new(code) {
  if (code > 0x10FFFF || (code >= 0xD800 && code <= 0xDFFF)) {
    throw "bend: " + code + " is not a Unicode scalar value";
  }
  return String.fromCodePoint(code);
}

// Array
// =====

function array_new(d, v) {
  if (d > 31n) {
    throw "bend: an array past the deepest block class 31";
  }
  return Array(2 ** Number(d)).fill(v);
}

// An unbalanced tree fails, as in C.
function array_node(a, b) {
  if (a.length !== b.length) {
    throw "bend: runtime fail-stop";
  }
  return a.concat(b);
}

function array_rmw(a, i, f) {
  const at = i % a.length;
  const old = a[at];
  a[at] = f(old);
  return {$: "Tuple", fst: a, snd: old};
}

// Run
// ===

function run_jump(f, x) {
  return {$: "$JMP", f: f, x: x};
}

function run_tail(f, x) {
  return {$: "$JMP", f: f.j?.f === f ? f.j : f, x: [x]};
}

function run_clo(j) {
  const f = (x) => run_loop(j(x));
  f.j = j;
  j.f = f;
  return f;
}

function run_loop(r) {
  while (r !== null && typeof r === "object" && r.$ === "$JMP") {
    r = r.f(...r.x);
  }
  return r;
}

function run_lib(f, n) {
  return (...a) => a.length < n ? run_lib((...b) => f(...a, ...b), n - a.length)
    : run_loop(f(...a));
}
// Program
// =======

function $Premul$alpha$(_pixel_0) {
  return (24n >= 32n ? 0 : (_pixel_0 >>> Number(24n)) >>> 0);
}

function $Premul$mul$(_a_0, _b_0) {
  const _x_0 = (Math.imul(_a_0, _b_0) >>> 0);
  const _x_1 = ((_x_0 + 127) >>> 0);
  return (255 === 0 ? 0 : (_x_1 / 255) >>> 0);
}

function $Premul$pack$(_r_0, _g_0, _b_0, _a_0) {
  const _aa_0 = run_loop($U32$min$(_a_0, 255));
  const _x_0 = (24n >= 32n ? 0 : (_aa_0 << Number(24n)) >>> 0);
  const _x_1 = run_loop($$$$Color$rgb$(run_loop($U32$min$(_r_0, _aa_0)), run_loop($U32$min$(_g_0, _aa_0)), run_loop($U32$min$(_b_0, _aa_0))));
  return ((_x_0 | _x_1) >>> 0);
}

function $Premul$straight$(_rgb_0, _opacity_0) {
  const _a_0 = run_loop($U32$min$(_opacity_0, 255));
  return run_jump($Premul$pack$, [run_loop($Premul$mul$(run_loop($$$$Color$red$(_rgb_0)), _a_0)), run_loop($Premul$mul$(run_loop($$$$Color$green$(_rgb_0)), _a_0)), run_loop($Premul$mul$(run_loop($$$$Color$blue$(_rgb_0)), _a_0)), _a_0]);
}

function $Premul$valid$(_pixel_0) {
  const _a_0 = run_loop($Premul$alpha$(_pixel_0));
  const _x_0 = run_loop($$$$Color$red$(_pixel_0));
  const _x_1 = run_loop($$$$Color$green$(_pixel_0));
  const _x_2 = run_loop($$$$Color$blue$(_pixel_0));
  return run_jump($Bool$and$, [run_loop($Bool$and$((_x_0 <= _a_0), (_x_1 <= _a_0))), (_x_2 <= _a_0)]);
}

function $Premul$scale$(_pixel_0, _opacity_0) {
  const _a_0 = run_loop($U32$min$(_opacity_0, 255));
  return run_jump($Premul$pack$, [run_loop($Premul$mul$(run_loop($$$$Color$red$(_pixel_0)), _a_0)), run_loop($Premul$mul$(run_loop($$$$Color$green$(_pixel_0)), _a_0)), run_loop($Premul$mul$(run_loop($$$$Color$blue$(_pixel_0)), _a_0)), run_loop($Premul$mul$(run_loop($Premul$alpha$(_pixel_0)), _a_0))]);
}

function $Premul$unweight$(_zero_0, _pixel_0, _a_0) {
  if (_zero_0) {
    return 0;
  } else {
    const _x_0 = run_loop($$$$Color$red$(_pixel_0));
    const _x_1 = (Math.imul(_x_0, 255) >>> 0);
    const _x_2 = (2 === 0 ? 0 : (_a_0 / 2) >>> 0);
    const _x_3 = ((_x_1 + _x_2) >>> 0);
    const _x_4 = run_loop($$$$Color$green$(_pixel_0));
    const _x_5 = (Math.imul(_x_4, 255) >>> 0);
    const _x_6 = (2 === 0 ? 0 : (_a_0 / 2) >>> 0);
    const _x_7 = ((_x_5 + _x_6) >>> 0);
    const _x_8 = run_loop($$$$Color$blue$(_pixel_0));
    const _x_9 = (Math.imul(_x_8, 255) >>> 0);
    const _x_10 = (2 === 0 ? 0 : (_a_0 / 2) >>> 0);
    const _x_11 = ((_x_9 + _x_10) >>> 0);
    return run_jump($$$$Color$rgb$, [run_loop($U32$min$(255, (_a_0 === 0 ? 0 : (_x_3 / _a_0) >>> 0))), run_loop($U32$min$(255, (_a_0 === 0 ? 0 : (_x_7 / _a_0) >>> 0))), run_loop($U32$min$(255, (_a_0 === 0 ? 0 : (_x_11 / _a_0) >>> 0)))]);
  }
}

function $Premul$rgb$(_pixel_0) {
  const _x_0 = run_loop($Premul$alpha$(_pixel_0));
  return run_jump($Premul$unweight$, [(_x_0 === 0), _pixel_0, run_loop($Premul$alpha$(_pixel_0))]);
}

function $Premul$union$(_sa_0, _da_0) {
  const _x_0 = run_loop($Premul$mul$(_da_0, ((255 - _sa_0) >>> 0)));
  return ((_sa_0 + _x_0) >>> 0);
}

function $Premul$channel$(_mode_0, _s_0, _d_0, _sa_0, _da_0) {
  if (_mode_0.$ === "Over") {
    const _x_0 = run_loop($Premul$mul$(_d_0, ((255 - _sa_0) >>> 0)));
    return ((_s_0 + _x_0) >>> 0);
  } else if (_mode_0.$ === "Multiply") {
    const _x_1 = ((255 - _da_0) >>> 0);
    const _x_2 = ((255 - _sa_0) >>> 0);
    const _x_3 = (Math.imul(_s_0, _x_1) >>> 0);
    const _x_4 = (Math.imul(_d_0, _x_2) >>> 0);
    const _x_5 = (Math.imul(_s_0, _d_0) >>> 0);
    const _x_6 = ((_x_3 + _x_4) >>> 0);
    const _x_7 = ((_x_5 + _x_6) >>> 0);
    const _x_8 = ((_x_7 + 127) >>> 0);
    return (255 === 0 ? 0 : (_x_8 / 255) >>> 0);
  } else if (_mode_0.$ === "Screen") {
    const _x_9 = ((_s_0 + _d_0) >>> 0);
    const _x_10 = run_loop($Premul$mul$(_s_0, _d_0));
    return ((_x_9 - _x_10) >>> 0);
  } else if (_mode_0.$ === "Plus") {
    return run_jump($U32$min$, [255, ((_s_0 + _d_0) >>> 0)]);
  } else if (_mode_0.$ === "SourceIn") {
    return run_jump($Premul$mul$, [_s_0, _da_0]);
  } else if (_mode_0.$ === "SourceOut") {
    return run_jump($Premul$mul$, [_s_0, ((255 - _da_0) >>> 0)]);
  } else if (_mode_0.$ === "Atop") {
    const _x_11 = ((255 - _sa_0) >>> 0);
    const _x_12 = (Math.imul(_s_0, _da_0) >>> 0);
    const _x_13 = (Math.imul(_d_0, _x_11) >>> 0);
    const _x_14 = ((_x_12 + _x_13) >>> 0);
    const _x_15 = ((_x_14 + 127) >>> 0);
    return (255 === 0 ? 0 : (_x_15 / 255) >>> 0);
  } else {
    const _x_16 = ((255 - _da_0) >>> 0);
    const _x_17 = ((255 - _sa_0) >>> 0);
    const _x_18 = (Math.imul(_s_0, _x_16) >>> 0);
    const _x_19 = (Math.imul(_d_0, _x_17) >>> 0);
    const _x_20 = ((_x_18 + _x_19) >>> 0);
    const _x_21 = ((_x_20 + 127) >>> 0);
    return (255 === 0 ? 0 : (_x_21 / 255) >>> 0);
  }
}

function $Premul$result_alpha$(_mode_0, _sa_0, _da_0) {
  if (_mode_0.$ === "Over") {
    return run_jump($Premul$union$, [_sa_0, _da_0]);
  } else if (_mode_0.$ === "Multiply") {
    return run_jump($Premul$union$, [_sa_0, _da_0]);
  } else if (_mode_0.$ === "Screen") {
    return run_jump($Premul$union$, [_sa_0, _da_0]);
  } else if (_mode_0.$ === "Plus") {
    return run_jump($U32$min$, [255, ((_sa_0 + _da_0) >>> 0)]);
  } else if (_mode_0.$ === "SourceIn") {
    return run_jump($Premul$mul$, [_sa_0, _da_0]);
  } else if (_mode_0.$ === "SourceOut") {
    return run_jump($Premul$mul$, [_sa_0, ((255 - _da_0) >>> 0)]);
  } else if (_mode_0.$ === "Atop") {
    return _da_0;
  } else {
    const _x_0 = ((255 - _da_0) >>> 0);
    const _x_1 = ((255 - _sa_0) >>> 0);
    const _x_2 = (Math.imul(_sa_0, _x_0) >>> 0);
    const _x_3 = (Math.imul(_da_0, _x_1) >>> 0);
    const _x_4 = ((_x_2 + _x_3) >>> 0);
    const _x_5 = ((_x_4 + 127) >>> 0);
    return (255 === 0 ? 0 : (_x_5 / 255) >>> 0);
  }
}

function $Premul$blend$(_mode_0, _source_0, _destination_0) {
  const _sa_0 = run_loop($Premul$alpha$(_source_0));
  const _da_0 = run_loop($Premul$alpha$(_destination_0));
  return run_jump($Premul$pack$, [run_loop($Premul$channel$(_mode_0, run_loop($$$$Color$red$(_source_0)), run_loop($$$$Color$red$(_destination_0)), _sa_0, _da_0)), run_loop($Premul$channel$(_mode_0, run_loop($$$$Color$green$(_source_0)), run_loop($$$$Color$green$(_destination_0)), _sa_0, _da_0)), run_loop($Premul$channel$(_mode_0, run_loop($$$$Color$blue$(_source_0)), run_loop($$$$Color$blue$(_destination_0)), _sa_0, _da_0)), run_loop($Premul$result_alpha$(_mode_0, _sa_0, _da_0))]);
}

function $Premul$tint$(_pixel_0, _color_0) {
  return run_jump($Premul$pack$, [run_loop($Premul$mul$(run_loop($$$$Color$red$(_pixel_0)), run_loop($$$$Color$red$(_color_0)))), run_loop($Premul$mul$(run_loop($$$$Color$green$(_pixel_0)), run_loop($$$$Color$green$(_color_0)))), run_loop($Premul$mul$(run_loop($$$$Color$blue$(_pixel_0)), run_loop($$$$Color$blue$(_color_0)))), run_loop($Premul$alpha$(_pixel_0))]);
}

function $Brush$valid$(_fuel_0, _values_0, _previous_0) {
  if (_fuel_0 === 0n) {
    if (_values_0.$ === "Nil") {
      return true;
    } else {
      const _head_0 = _values_0["head"];
      const _tail_0 = _values_0["tail"];
      return false;
    }
  } else {
    const _rest_0 = (_fuel_0 - 1n);
    if (_values_0.$ === "Nil") {
      return true;
    } else {
      const _t_0 = _values_0["head"];
      const _position_0 = _t_0["position"];
      const _pixel_0 = _t_0["pixel"];
      const _tail_1 = _values_0["tail"];
      return run_jump($Bool$and$, [run_loop($Bool$and$((_position_0 >= _previous_0), (_position_0 <= 65535))), run_loop($Bool$and$(run_loop($Premul$valid$(_pixel_0)), run_loop($Brush$valid$(_rest_0, _tail_1, _position_0))))]);
    }
  }
}

function $Brush$stops_case$(_ok_0, _values_0) {
  if (!_ok_0) {
    return {$: "None"};
  } else {
    if (_values_0.$ === "Nil") {
      return {$: "None"};
    } else {
      const _head_0 = _values_0["head"];
      const _tail_0 = _values_0["tail"];
      return {$: "Some", ["value"]: {$: "Stops", ["values"]: {$: "Con", ["head"]: _head_0, ["tail"]: _tail_0}}};
    }
  }
}

function $Brush$stops$(_values_0) {
  return run_jump($Brush$stops_case$, [run_loop($Brush$valid$(32n, _values_0, 0)), _values_0]);
}

function $Brush$interpolate$(_a_0, _b_0, _delta_0, _span_0) {
  return run_jump($Premul$pack$, [run_loop($$$$Ramp$channel$(run_loop($$$$Color$red$(_a_0)), run_loop($$$$Color$red$(_b_0)), _delta_0, _span_0)), run_loop($$$$Ramp$channel$(run_loop($$$$Color$green$(_a_0)), run_loop($$$$Color$green$(_b_0)), _delta_0, _span_0)), run_loop($$$$Ramp$channel$(run_loop($$$$Color$blue$(_a_0)), run_loop($$$$Color$blue$(_b_0)), _delta_0, _span_0)), run_loop($$$$Ramp$channel$(run_loop($Premul$alpha$(_a_0)), run_loop($Premul$alpha$(_b_0)), _delta_0, _span_0))]);
}

function $Brush$advance$(_before_0, _q_0, _old_0, _a_0, _next_0, _b_0) {
  if (_before_0) {
    return {$: "Cursor", ["position"]: _old_0, ["pixel"]: run_loop($Brush$interpolate$(_a_0, _b_0, ((_q_0 - _old_0) >>> 0), ((_next_0 - _old_0) >>> 0))), ["done"]: true};
  } else {
    return {$: "Cursor", ["position"]: _next_0, ["pixel"]: _b_0, ["done"]: false};
  }
}

function $Brush$walk$(_values_0, _q_0, _cursor_0) {
  if (_values_0.$ === "Nil") {
    const _position_0 = _cursor_0["position"];
    const _pixel_0 = _cursor_0["pixel"];
    const _done_0 = _cursor_0["done"];
    return _pixel_0;
  } else {
    const _t_0 = _values_0["head"];
    const _position_1 = _t_0["position"];
    const _pixel_1 = _t_0["pixel"];
    const _tail_0 = _values_0["tail"];
    const _position_2 = _cursor_0["position"];
    const _pixel_2 = _cursor_0["pixel"];
    const _t_1 = _cursor_0["done"];
    if (_t_1) {
      return _pixel_2;
    } else {
      return run_jump($Brush$walk$, [_tail_0, _q_0, run_loop($Brush$advance$((_q_0 < _position_1), _q_0, _position_2, _pixel_2, _position_1, _pixel_1))]);
    }
  }
}

function $Brush$ramp$(_stops_0, _position_0) {
  const _t_0 = _stops_0["values"];
  if (_t_0.$ === "Nil") {
    return 0;
  } else {
    const _t_1 = _t_0["head"];
    const _start_0 = _t_1["position"];
    const _pixel_0 = _t_1["pixel"];
    const _tail_0 = _t_0["tail"];
    const _q_0 = run_loop($U32$min$(_position_0, 65535));
    return run_jump($Brush$walk$, [_tail_0, _q_0, {$: "Cursor", ["position"]: _start_0, ["pixel"]: _pixel_0, ["done"]: (_q_0 < _start_0)}]);
  }
}

function $Brush$spread$(_mode_0, _value_0) {
  if (_mode_0.$ === "Pad") {
    return run_jump($F32$clamp$, [_value_0, 0, 1]);
  } else if (_mode_0.$ === "Repeat") {
    const _x_0 = Math.fround(Math.floor(_value_0));
    return Math.fround(_value_0 - _x_0);
  } else {
    const _x_1 = Math.fround(_value_0 / 2);
    const _x_2 = Math.fround(Math.floor(_x_1));
    const _x_3 = Math.fround(_x_2 * 2);
    const _q_0 = Math.fround(_value_0 - _x_3);
    const _x_4 = Math.fround(_q_0 - 1);
    const _x_5 = Math.fround(Math.abs(_x_4));
    return Math.fround(1 - _x_5);
  }
}

function $Brush$position$(_stops_0, _mode_0, _value_0) {
  const _x_0 = run_loop($Brush$spread$(_mode_0, _value_0));
  const _x_1 = Math.fround(_x_0 * 65535);
  return run_jump($Brush$ramp$, [_stops_0, (_x_1 >= 1 && _x_1 < 4294967296 ? Math.floor(_x_1) : 0)]);
}

function $Brush$finite$(_value_0) {
  const _x_0 = Math.fround(0 - 4096);
  return run_jump($Bool$and$, [(_value_0 >= _x_0), (_value_0 <= 4096)]);
}

function $Brush$point$(_p_0) {
  const _x_0 = _p_0["x"];
  const _y_0 = _p_0["y"];
  return run_jump($Bool$and$, [run_loop($Brush$finite$(_x_0)), run_loop($Brush$finite$(_y_0))]);
}

function $Brush$linear_case$(_ok_0, _a_0, _b_0, _stops_0, _spread_0) {
  if (!_ok_0) {
    return {$: "None"};
  } else {
    const _x_0 = _a_0["x"];
    const _y_0 = _a_0["y"];
    const _xx_0 = _b_0["x"];
    const _yy_0 = _b_0["y"];
    const _dx_0 = Math.fround(_xx_0 - _x_0);
    const _dy_0 = Math.fround(_yy_0 - _y_0);
    const _x_1 = Math.fround(_dx_0 * _dx_0);
    const _x_2 = Math.fround(_dy_0 * _dy_0);
    const _x_3 = Math.fround(_x_1 + _x_2);
    return {$: "Some", ["value"]: {$: "Linear", ["x"]: _x_0, ["y"]: _y_0, ["dx"]: _dx_0, ["dy"]: _dy_0, ["inverse"]: Math.fround(1 / _x_3), ["stops"]: _stops_0, ["spread"]: _spread_0}};
  }
}

function $Brush$linear$(_a_0, _b_0, _stops_0, _spread_0) {
  const _x_0 = _a_0["x"];
  const _y_0 = _a_0["y"];
  const _xx_0 = _b_0["x"];
  const _yy_0 = _b_0["y"];
  const _x_1 = Math.fround(_xx_0 - _x_0);
  const _x_2 = Math.fround(_xx_0 - _x_0);
  const _x_3 = Math.fround(_yy_0 - _y_0);
  const _x_4 = Math.fround(_yy_0 - _y_0);
  const _x_5 = Math.fround(_x_1 * _x_2);
  const _x_6 = Math.fround(_x_3 * _x_4);
  const _x_7 = Math.fround(_x_5 + _x_6);
  return run_jump($Brush$linear_case$, [run_loop($Bool$and$(run_loop($Bool$and$(run_loop($Brush$point$({$: "Point", ["x"]: _x_0, ["y"]: _y_0})), run_loop($Brush$point$({$: "Point", ["x"]: _xx_0, ["y"]: _yy_0})))), (_x_7 >= 0.0000152587890625))), {$: "Point", ["x"]: _x_0, ["y"]: _y_0}, {$: "Point", ["x"]: _xx_0, ["y"]: _yy_0}, _stops_0, _spread_0]);
}

function $Brush$radial_case$(_ok_0, _x_0, _y_0, _rx_0, _ry_0, _stops_0, _spread_0) {
  if (!_ok_0) {
    return {$: "None"};
  } else {
    return {$: "Some", ["value"]: {$: "Radial", ["x"]: _x_0, ["y"]: _y_0, ["ix"]: Math.fround(1 / _rx_0), ["iy"]: Math.fround(1 / _ry_0), ["stops"]: _stops_0, ["spread"]: _spread_0}};
  }
}

function $Brush$radial$(_x_0, _y_0, _rx_0, _ry_0, _stops_0, _spread_0) {
  return run_jump($Brush$radial_case$, [run_loop($Bool$and$(run_loop($Bool$and$(run_loop($Brush$finite$(_x_0)), run_loop($Brush$finite$(_y_0)))), run_loop($Bool$and$(run_loop($Bool$and$((_rx_0 >= 0.00390625), (_rx_0 <= 4096))), run_loop($Bool$and$((_ry_0 >= 0.00390625), (_ry_0 <= 4096))))))), _x_0, _y_0, _rx_0, _ry_0, _stops_0, _spread_0]);
}

function $Brush$sample$(_brush_0, _x_0, _y_0) {
  if (_brush_0.$ === "Solid") {
    const _pixel_0 = _brush_0["pixel"];
    return _pixel_0;
  } else if (_brush_0.$ === "Linear") {
    const _xx_0 = _brush_0["x"];
    const _yy_0 = _brush_0["y"];
    const _dx_0 = _brush_0["dx"];
    const _dy_0 = _brush_0["dy"];
    const _inverse_0 = _brush_0["inverse"];
    const _stops_0 = _brush_0["stops"];
    const _spread_0 = _brush_0["spread"];
    const _x_1 = Math.fround(_x_0 - _xx_0);
    const _x_2 = Math.fround(_y_0 - _yy_0);
    const _x_3 = Math.fround(_x_1 * _dx_0);
    const _x_4 = Math.fround(_x_2 * _dy_0);
    const _x_5 = Math.fround(_x_3 + _x_4);
    return run_jump($Brush$position$, [_stops_0, _spread_0, Math.fround(_x_5 * _inverse_0)]);
  } else {
    const _xx_1 = _brush_0["x"];
    const _yy_1 = _brush_0["y"];
    const _ix_0 = _brush_0["ix"];
    const _iy_0 = _brush_0["iy"];
    const _stops_1 = _brush_0["stops"];
    const _spread_1 = _brush_0["spread"];
    const _x_6 = Math.fround(_x_0 - _xx_1);
    const _dx_1 = Math.fround(_x_6 * _ix_0);
    const _x_7 = Math.fround(_y_0 - _yy_1);
    const _dy_1 = Math.fround(_x_7 * _iy_0);
    const _x_8 = Math.fround(_dx_1 * _dx_1);
    const _x_9 = Math.fround(_dy_1 * _dy_1);
    const _x_10 = Math.fround(_x_8 + _x_9);
    return run_jump($Brush$position$, [_stops_1, _spread_1, Math.fround(Math.sqrt(_x_10))]);
  }
}

function $extent$(_edges_0) {
  if (_edges_0.$ === "Empty") {
    return {$: "Extent", ["left"]: 0, ["top"]: 0, ["right"]: 0, ["bottom"]: 0};
  } else if (_edges_0.$ === "Edge") {
    const _ax_0 = _edges_0["ax"];
    const _ay_0 = _edges_0["ay"];
    const _dx_0 = _edges_0["dx"];
    const _dy_0 = _edges_0["dy"];
    const _up_0 = _edges_0["up"];
    const _extent_0 = _edges_0["extent"];
    return _extent_0;
  } else {
    const _left_0 = _edges_0["left"];
    const _right_0 = _edges_0["right"];
    const _extent_1 = _edges_0["extent"];
    return _extent_1;
  }
}

function $union_extent$(_a_0, _b_0) {
  const _al_0 = _a_0["left"];
  const _at_0 = _a_0["top"];
  const _ar_0 = _a_0["right"];
  const _ab_0 = _a_0["bottom"];
  const _bl_0 = _b_0["left"];
  const _bt_0 = _b_0["top"];
  const _br_0 = _b_0["right"];
  const _bb_0 = _b_0["bottom"];
  return {$: "Extent", ["left"]: run_loop($F32$min$(_al_0, _bl_0)), ["top"]: run_loop($F32$min$(_at_0, _bt_0)), ["right"]: run_loop($F32$max$(_ar_0, _br_0)), ["bottom"]: run_loop($F32$max$(_ab_0, _bb_0))};
}

function $join$(_left_0, _right_0) {
  if (_left_0.$ === "Empty") {
    if (_right_0.$ === "Empty") {
      return {$: "Empty"};
    } else {
      return _right_0;
    }
  } else {
    if (_right_0.$ === "Empty") {
      return _left_0;
    } else {
      return {$: "Join", ["left"]: _left_0, ["right"]: _right_0, ["extent"]: run_loop($union_extent$(run_loop($extent$(_left_0)), run_loop($extent$(_right_0))))};
    }
  }
}

function $ordered$(_up_0, _ax_0, _ay_0, _bx_0, _by_0) {
  if (_up_0) {
    return {$: "Edge", ["ax"]: _ax_0, ["ay"]: _ay_0, ["dx"]: Math.fround(_bx_0 - _ax_0), ["dy"]: Math.fround(_by_0 - _ay_0), ["up"]: true, ["extent"]: {$: "Extent", ["left"]: run_loop($F32$min$(_ax_0, _bx_0)), ["top"]: _ay_0, ["right"]: run_loop($F32$max$(_ax_0, _bx_0)), ["bottom"]: _by_0}};
  } else {
    return {$: "Edge", ["ax"]: _bx_0, ["ay"]: _by_0, ["dx"]: Math.fround(_ax_0 - _bx_0), ["dy"]: Math.fround(_ay_0 - _by_0), ["up"]: false, ["extent"]: {$: "Extent", ["left"]: run_loop($F32$min$(_ax_0, _bx_0)), ["top"]: _by_0, ["right"]: run_loop($F32$max$(_ax_0, _bx_0)), ["bottom"]: _ay_0}};
  }
}

function $edge_case$(_valid_0, _a_0, _b_0) {
  if (!_valid_0) {
    return {$: "Empty"};
  } else {
    const _ax_0 = _a_0["x"];
    const _ay_0 = _a_0["y"];
    const _bx_0 = _b_0["x"];
    const _by_0 = _b_0["y"];
    return run_jump($ordered$, [(_ay_0 < _by_0), _ax_0, _ay_0, _bx_0, _by_0]);
  }
}

function $edge$(_a_0, _b_0) {
  const _ax_0 = _a_0["x"];
  const _ay_0 = _a_0["y"];
  const _bx_0 = _b_0["x"];
  const _by_0 = _b_0["y"];
  return run_jump($edge_case$, [run_loop($Bool$and$(run_loop($Bool$and$(run_loop($Brush$point$({$: "Point", ["x"]: _ax_0, ["y"]: _ay_0})), run_loop($Brush$point$({$: "Point", ["x"]: _bx_0, ["y"]: _by_0})))), (_ay_0 !== _by_0))), {$: "Point", ["x"]: _ax_0, ["y"]: _ay_0}, {$: "Point", ["x"]: _bx_0, ["y"]: _by_0}]);
}

function $contour$(_points_0, _first_0, _last_0, _edges_0) {
  if (_points_0.$ === "Nil") {
    return run_jump($join$, [_edges_0, run_loop($edge$(_last_0, _first_0))]);
  } else {
    const _head_0 = _points_0["head"];
    const _tail_0 = _points_0["tail"];
    return run_jump($contour$, [_tail_0, _first_0, _head_0, run_loop($join$(_edges_0, run_loop($edge$(_last_0, _head_0))))]);
  }
}

function $push$(_forest_0, _tree_0) {
  if (_forest_0.$ === "End") {
    return {$: "Occupied", ["tree"]: _tree_0, ["tail"]: {$: "End"}};
  } else if (_forest_0.$ === "Vacant") {
    const _tail_0 = _forest_0["tail"];
    return {$: "Occupied", ["tree"]: _tree_0, ["tail"]: _tail_0};
  } else {
    const _previous_0 = _forest_0["tree"];
    const _tail_1 = _forest_0["tail"];
    return {$: "Vacant", ["tail"]: run_loop($push$(_tail_1, run_loop($join$(_previous_0, _tree_0))))};
  }
}

function $finish$(_forest_0, _edges_0) {
  if (_forest_0.$ === "End") {
    return _edges_0;
  } else if (_forest_0.$ === "Vacant") {
    const _tail_0 = _forest_0["tail"];
    return run_jump($finish$, [_tail_0, _edges_0]);
  } else {
    const _tree_0 = _forest_0["tree"];
    const _tail_1 = _forest_0["tail"];
    return run_jump($finish$, [_tail_1, run_loop($join$(_tree_0, _edges_0))]);
  }
}

function $balanced$(_points_0, _first_0, _last_0, _forest_0) {
  if (_points_0.$ === "Nil") {
    return run_jump($finish$, [run_loop($push$(_forest_0, run_loop($edge$(_last_0, _first_0)))), {$: "Empty"}]);
  } else {
    const _head_0 = _points_0["head"];
    const _tail_0 = _points_0["tail"];
    return run_jump($balanced$, [_tail_0, _first_0, _head_0, run_loop($push$(_forest_0, run_loop($edge$(_last_0, _head_0))))]);
  }
}

function $valid$(_fuel_0, _points_0) {
  if (_fuel_0 === 0n) {
    if (_points_0.$ === "Nil") {
      return true;
    } else {
      const _head_0 = _points_0["head"];
      const _tail_0 = _points_0["tail"];
      return false;
    }
  } else {
    const _rest_0 = (_fuel_0 - 1n);
    if (_points_0.$ === "Nil") {
      return true;
    } else {
      const _head_1 = _points_0["head"];
      const _tail_1 = _points_0["tail"];
      return run_jump($Bool$and$, [run_loop($Brush$point$(_head_1)), run_loop($valid$(_rest_0, _tail_1))]);
    }
  }
}

function $polygon_case$(_ok_0, _points_0) {
  if (!_ok_0) {
    return {$: "None"};
  } else {
    if (_points_0.$ === "Nil") {
      return {$: "Some", ["value"]: {$: "Empty"}};
    } else {
      const _first_0 = _points_0["head"];
      const _tail_0 = _points_0["tail"];
      return {$: "Some", ["value"]: run_loop($balanced$(_tail_0, _first_0, _first_0, {$: "End"}))};
    }
  }
}

function $polygon$(_points_0) {
  return run_jump($polygon_case$, [run_loop($valid$(BigInt(1024), _points_0)), _points_0]);
}

function $quadratic$(_levels_0, _a_0, _control_0, _b_0) {
  if (_levels_0 === 0n) {
    return run_jump($edge$, [_a_0, _b_0]);
  } else {
    const _rest_0 = (_levels_0 - 1n);
    const _ac_0 = run_loop($$$$Stroke$middle$(_a_0, _control_0));
    const _cb_0 = run_loop($$$$Stroke$middle$(_control_0, _b_0));
    const _mid_0 = run_loop($$$$Stroke$middle$(_ac_0, _cb_0));
    return run_jump($join$, [run_loop($quadratic$(_rest_0, _a_0, _ac_0, _mid_0)), run_loop($quadratic$(_rest_0, _mid_0, _cb_0, _b_0))]);
  }
}

function $cubic$(_levels_0, _a_0, _c1_0, _c2_0, _b_0) {
  if (_levels_0 === 0n) {
    return run_jump($edge$, [_a_0, _b_0]);
  } else {
    const _rest_0 = (_levels_0 - 1n);
    const _ab_0 = run_loop($$$$Stroke$middle$(_a_0, _c1_0));
    const _bc_0 = run_loop($$$$Stroke$middle$(_c1_0, _c2_0));
    const _cd_0 = run_loop($$$$Stroke$middle$(_c2_0, _b_0));
    const _abc_0 = run_loop($$$$Stroke$middle$(_ab_0, _bc_0));
    const _bcd_0 = run_loop($$$$Stroke$middle$(_bc_0, _cd_0));
    const _mid_0 = run_loop($$$$Stroke$middle$(_abc_0, _bcd_0));
    return run_jump($join$, [run_loop($cubic$(_rest_0, _a_0, _ab_0, _abc_0, _mid_0)), run_loop($cubic$(_rest_0, _mid_0, _bcd_0, _cd_0, _b_0))]);
  }
}

function $excluded$(_extent_0, _x_0, _y_0) {
  const _left_0 = _extent_0["left"];
  const _top_0 = _extent_0["top"];
  const _right_0 = _extent_0["right"];
  const _bottom_0 = _extent_0["bottom"];
  const _x_1 = (_y_0 < _top_0);
  const _x_2 = (_y_0 >= _bottom_0);
  const _x_3 = (_x_1 || _x_2);
  const _x_4 = (_x_0 >= _right_0);
  return (_x_3 || _x_4);
}

function $add$(_a_0, _b_0) {
  const _au_0 = _a_0["up"];
  const _ad_0 = _a_0["down"];
  const _bu_0 = _b_0["up"];
  const _bd_0 = _b_0["down"];
  return {$: "Count", ["up"]: ((_au_0 + _bu_0) >>> 0), ["down"]: ((_ad_0 + _bd_0) >>> 0)};
}

function $crossing$(_hit_0, _up_0) {
  if (!_hit_0) {
    return {$: "Count", ["up"]: 0, ["down"]: 0};
  } else {
    if (_up_0) {
      return {$: "Count", ["up"]: 1, ["down"]: 0};
    } else {
      return {$: "Count", ["up"]: 0, ["down"]: 1};
    }
  }
}

function $count$(_edges_0, _outside_0, _x_0, _y_0) {
  if (_edges_0.$ === "Empty") {
    if (_outside_0) {
      return {$: "Count", ["up"]: 0, ["down"]: 0};
    } else {
      return {$: "Count", ["up"]: 0, ["down"]: 0};
    }
  } else if (_edges_0.$ === "Edge") {
    const _ax_0 = _edges_0["ax"];
    const _ay_0 = _edges_0["ay"];
    const _dx_0 = _edges_0["dx"];
    const _dy_0 = _edges_0["dy"];
    const _up_0 = _edges_0["up"];
    const _extent_0 = _edges_0["extent"];
    if (_outside_0) {
      return {$: "Count", ["up"]: 0, ["down"]: 0};
    } else {
      const _x_1 = Math.fround(_y_0 - _ay_0);
      const _x_2 = Math.fround(_x_0 - _ax_0);
      const _x_3 = Math.fround(_dx_0 * _x_1);
      const _x_4 = Math.fround(_x_2 * _dy_0);
      const _x_5 = Math.fround(_x_3 - _x_4);
      return run_jump($crossing$, [(_x_5 > 0), _up_0]);
    }
  } else {
    const _left_0 = _edges_0["left"];
    const _right_0 = _edges_0["right"];
    const _cached_0 = _edges_0["extent"];
    if (_outside_0) {
      return {$: "Count", ["up"]: 0, ["down"]: 0};
    } else {
      return run_jump($add$, [run_loop($count$(_left_0, run_loop($excluded$(run_loop($extent$(_left_0)), _x_0, _y_0)), _x_0, _y_0)), run_loop($count$(_right_0, run_loop($excluded$(run_loop($extent$(_right_0)), _x_0, _y_0)), _x_0, _y_0))]);
    }
  }
}

function $decide$(_rule_0, _value_0) {
  if (_rule_0.$ === "EvenOdd") {
    const _up_0 = _value_0["up"];
    const _down_0 = _value_0["down"];
    const _x_0 = ((_up_0 + _down_0) >>> 0);
    const _x_1 = (2 === 0 ? _x_0 : _x_0 % 2);
    return (_x_1 !== 0);
  } else {
    const _up_1 = _value_0["up"];
    const _down_1 = _value_0["down"];
    return (_up_1 !== _down_1);
  }
}

function $hit$(_edges_0, _rule_0, _x_0, _y_0) {
  return run_jump($decide$, [_rule_0, run_loop($count$(_edges_0, run_loop($excluded$(run_loop($extent$(_edges_0)), _x_0, _y_0)), _x_0, _y_0))]);
}

function $screen_extent$(_extent_0) {
  const _left_0 = _extent_0["left"];
  const _top_0 = _extent_0["top"];
  const _right_0 = _extent_0["right"];
  const _bottom_0 = _extent_0["bottom"];
  return {$: "Box", ["left"]: run_loop($$$$RgbaAffine$floor_bound$(_left_0)), ["top"]: run_loop($$$$RgbaAffine$floor_bound$(_top_0)), ["right"]: run_loop($$$$RgbaAffine$ceil_bound$(_right_0)), ["bottom"]: run_loop($$$$RgbaAffine$ceil_bound$(_bottom_0))};
}

function $bounds$(_edges_0) {
  return run_jump($screen_extent$, [run_loop($extent$(_edges_0))]);
}

function $checked_quadratic_case$(_ok_0, _levels_0, _a_0, _c_0, _b_0) {
  if (!_ok_0) {
    return {$: "None"};
  } else {
    return {$: "Some", ["value"]: run_loop($quadratic$(_levels_0, _a_0, _c_0, _b_0))};
  }
}

function $checked_quadratic$(_levels_0, _a_0, _c_0, _b_0) {
  return run_jump($checked_quadratic_case$, [run_loop($Bool$and$(run_loop($Nat$is_le$(_levels_0, 8n)), run_loop($Bool$and$(run_loop($Brush$point$(_a_0)), run_loop($Bool$and$(run_loop($Brush$point$(_c_0)), run_loop($Brush$point$(_b_0)))))))), _levels_0, _a_0, _c_0, _b_0]);
}

function $checked_cubic_case$(_ok_0, _levels_0, _a_0, _c1_0, _c2_0, _b_0) {
  if (!_ok_0) {
    return {$: "None"};
  } else {
    return {$: "Some", ["value"]: run_loop($cubic$(_levels_0, _a_0, _c1_0, _c2_0, _b_0))};
  }
}

function $checked_cubic$(_levels_0, _a_0, _c1_0, _c2_0, _b_0) {
  return run_jump($checked_cubic_case$, [run_loop($Bool$and$(run_loop($Nat$is_le$(_levels_0, 8n)), run_loop($Bool$and$(run_loop($Bool$and$(run_loop($Brush$point$(_a_0)), run_loop($Brush$point$(_c1_0)))), run_loop($Bool$and$(run_loop($Brush$point$(_c2_0)), run_loop($Brush$point$(_b_0)))))))), _levels_0, _a_0, _c1_0, _c2_0, _b_0]);
}

function $U32$min$(_a_0, _b_0) {
  return run_jump($Bool$pick$, [(_a_0 < _b_0), _a_0, _b_0]);
}

function $$$$Color$rgb$(_r_0, _g_0, _b_0) {
  const _x_0 = ((_r_0 & 255) >>> 0);
  const _x_1 = ((_g_0 & 255) >>> 0);
  const _x_2 = (16n >= 32n ? 0 : (_x_0 << Number(16n)) >>> 0);
  const _x_3 = (8n >= 32n ? 0 : (_x_1 << Number(8n)) >>> 0);
  const _x_4 = ((_x_2 | _x_3) >>> 0);
  const _x_5 = ((_b_0 & 255) >>> 0);
  return ((_x_4 | _x_5) >>> 0);
}

function $$$$Color$red$(_c_0) {
  const _x_0 = (16n >= 32n ? 0 : (_c_0 >>> Number(16n)) >>> 0);
  return ((_x_0 & 255) >>> 0);
}

function $$$$Color$green$(_c_0) {
  const _x_0 = (8n >= 32n ? 0 : (_c_0 >>> Number(8n)) >>> 0);
  return ((_x_0 & 255) >>> 0);
}

function $$$$Color$blue$(_c_0) {
  return ((_c_0 & 255) >>> 0);
}

function $Bool$and$(_a_0, _b_0) {
  if (!_a_0) {
    return false;
  } else {
    return _b_0;
  }
}

function $$$$Ramp$channel$(_a_0, _b_0, _delta_0, _span_0) {
  const _x_0 = ((_span_0 - _delta_0) >>> 0);
  const _x_1 = (Math.imul(_a_0, _x_0) >>> 0);
  const _x_2 = (Math.imul(_b_0, _delta_0) >>> 0);
  const _x_3 = ((_x_1 + _x_2) >>> 0);
  const _x_4 = (2 === 0 ? 0 : (_span_0 / 2) >>> 0);
  const _x_5 = ((_x_3 + _x_4) >>> 0);
  return (_span_0 === 0 ? 0 : (_x_5 / _span_0) >>> 0);
}

function $F32$clamp$(_x_0, _lo_0, _hi_0) {
  return run_jump($F32$min$, [run_loop($F32$max$(_x_0, _lo_0)), _hi_0]);
}

function $F32$min$(_a_0, _b_0) {
  return run_jump($Bool$pick$, [(_a_0 < _b_0), _a_0, _b_0]);
}

function $F32$max$(_a_0, _b_0) {
  return run_jump($Bool$pick$, [(_a_0 < _b_0), _b_0, _a_0]);
}

function $$$$Stroke$middle$(_a_0, _b_0) {
  const _ax_0 = _a_0["x"];
  const _ay_0 = _a_0["y"];
  const _bx_0 = _b_0["x"];
  const _by_0 = _b_0["y"];
  const _x_0 = Math.fround(_ax_0 + _bx_0);
  const _x_1 = Math.fround(_ay_0 + _by_0);
  return {$: "Point", ["x"]: Math.fround(_x_0 * 0.5), ["y"]: Math.fround(_x_1 * 0.5)};
}

function $$$$RgbaAffine$floor_bound$(_value_0) {
  const _x_0 = run_loop($F32$clamp$(_value_0, 0, 4096));
  const _x_1 = Math.fround(Math.floor(_x_0));
  return (_x_1 >= 1 && _x_1 < 4294967296 ? Math.floor(_x_1) : 0);
}

function $$$$RgbaAffine$ceil_bound$(_value_0) {
  const _x_0 = run_loop($F32$clamp$(_value_0, 0, 4096));
  const _x_1 = Math.fround(Math.ceil(_x_0));
  return (_x_1 >= 1 && _x_1 < 4294967296 ? Math.floor(_x_1) : 0);
}

function $Nat$is_le$(_a_0, _b_0) {
  return run_jump($Cmp$is_le$, [cmp_new(_a_0, _b_0)]);
}

function $Bool$pick$(_c_0, _a_0, _b_0) {
  if (!_c_0) {
    return _b_0;
  } else {
    return _a_0;
  }
}

function $Cmp$is_le$(_c_0) {
  if (_c_0.$ === "LT") {
    return true;
  } else if (_c_0.$ === "EQ") {
    return true;
  } else {
    return false;
  }
}
export default {
  "Premul.alpha": run_lib($Premul$alpha$, 1),
  "Premul.mul": run_lib($Premul$mul$, 2),
  "Premul.pack": run_lib($Premul$pack$, 4),
  "Premul.straight": run_lib($Premul$straight$, 2),
  "Premul.valid": run_lib($Premul$valid$, 1),
  "Premul.scale": run_lib($Premul$scale$, 2),
  "Premul.unweight": run_lib($Premul$unweight$, 3),
  "Premul.rgb": run_lib($Premul$rgb$, 1),
  "Premul.union": run_lib($Premul$union$, 2),
  "Premul.channel": run_lib($Premul$channel$, 5),
  "Premul.result_alpha": run_lib($Premul$result_alpha$, 3),
  "Premul.blend": run_lib($Premul$blend$, 3),
  "Premul.tint": run_lib($Premul$tint$, 2),
  "Brush.valid": run_lib($Brush$valid$, 3),
  "Brush.stops_case": run_lib($Brush$stops_case$, 2),
  "Brush.stops": run_lib($Brush$stops$, 1),
  "Brush.interpolate": run_lib($Brush$interpolate$, 4),
  "Brush.advance": run_lib($Brush$advance$, 6),
  "Brush.walk": run_lib($Brush$walk$, 3),
  "Brush.ramp": run_lib($Brush$ramp$, 2),
  "Brush.spread": run_lib($Brush$spread$, 2),
  "Brush.position": run_lib($Brush$position$, 3),
  "Brush.finite": run_lib($Brush$finite$, 1),
  "Brush.point": run_lib($Brush$point$, 1),
  "Brush.linear_case": run_lib($Brush$linear_case$, 5),
  "Brush.linear": run_lib($Brush$linear$, 4),
  "Brush.radial_case": run_lib($Brush$radial_case$, 7),
  "Brush.radial": run_lib($Brush$radial$, 6),
  "Brush.sample": run_lib($Brush$sample$, 3),
  "extent": run_lib($extent$, 1),
  "union_extent": run_lib($union_extent$, 2),
  "join": run_lib($join$, 2),
  "ordered": run_lib($ordered$, 5),
  "edge_case": run_lib($edge_case$, 3),
  "edge": run_lib($edge$, 2),
  "contour": run_lib($contour$, 4),
  "push": run_lib($push$, 2),
  "finish": run_lib($finish$, 2),
  "balanced": run_lib($balanced$, 4),
  "valid": run_lib($valid$, 2),
  "polygon_case": run_lib($polygon_case$, 2),
  "polygon": run_lib($polygon$, 1),
  "quadratic": run_lib($quadratic$, 4),
  "cubic": run_lib($cubic$, 5),
  "excluded": run_lib($excluded$, 3),
  "add": run_lib($add$, 2),
  "crossing": run_lib($crossing$, 2),
  "count": run_lib($count$, 4),
  "decide": run_lib($decide$, 2),
  "hit": run_lib($hit$, 4),
  "screen_extent": run_lib($screen_extent$, 1),
  "bounds": run_lib($bounds$, 1),
  "checked_quadratic_case": run_lib($checked_quadratic_case$, 5),
  "checked_quadratic": run_lib($checked_quadratic$, 4),
  "checked_cubic_case": run_lib($checked_cubic_case$, 6),
  "checked_cubic": run_lib($checked_cubic$, 5),
};
