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

function $blank$(_depth_0) {
  return {$: "Surface", ["depth"]: _depth_0, ["size"]: (_depth_0 >= 32n ? 0 : (1 << Number(_depth_0)) >>> 0), ["pixels"]: {$: "Pix", ["color"]: 0}};
}

function $pixels$(_surface_0) {
  const _depth_0 = _surface_0["depth"];
  const _size_0 = _surface_0["size"];
  const _pixels_0 = _surface_0["pixels"];
  return _pixels_0;
}

function $size$(_surface_0) {
  const _depth_0 = _surface_0["depth"];
  const _size_0 = _surface_0["size"];
  const _pixels_0 = _surface_0["pixels"];
  return _size_0;
}

function $from_planes$(_depth_0, _colors_0, _mask_0) {
  if (_depth_0 === 0n) {
    if (_colors_0.$ === "Pix") {
      const _color_0 = _colors_0["color"];
      if (_mask_0.$ === "Pix") {
        const _alpha_0 = _mask_0["color"];
        return {$: "Pix", ["color"]: run_loop($Premul$straight$(_color_0, run_loop($$$$Color$red$(_alpha_0))))};
      } else {
        return {$: "Pix", ["color"]: 0};
      }
    } else {
      return {$: "Pix", ["color"]: 0};
    }
  } else {
    const _rest_0 = (_depth_0 - 1n);
    if (_colors_0.$ === "Pix") {
      const _color_1 = _colors_0["color"];
      if (_mask_0.$ === "Pix") {
        const _alpha_1 = _mask_0["color"];
        return {$: "Pix", ["color"]: run_loop($Premul$straight$(_color_1, run_loop($$$$Color$red$(_alpha_1))))};
      } else {
        const _a_0 = run_loop($from_planes$(_rest_0, run_loop($$$$ImageOps$tl$({$: "Pix", ["color"]: _color_1})), run_loop($$$$ImageOps$tl$(_mask_0))));
        const _b_0 = run_loop($from_planes$(_rest_0, run_loop($$$$ImageOps$tr$({$: "Pix", ["color"]: _color_1})), run_loop($$$$ImageOps$tr$(_mask_0))));
        const _c_0 = run_loop($from_planes$(_rest_0, run_loop($$$$ImageOps$bl$({$: "Pix", ["color"]: _color_1})), run_loop($$$$ImageOps$bl$(_mask_0))));
        const _d_0 = run_loop($from_planes$(_rest_0, run_loop($$$$ImageOps$br$({$: "Pix", ["color"]: _color_1})), run_loop($$$$ImageOps$br$(_mask_0))));
        return run_jump($$$$ImageOps$quad$, [_a_0, _b_0, _c_0, _d_0]);
      }
    } else {
      const _a_1 = run_loop($from_planes$(_rest_0, run_loop($$$$ImageOps$tl$(_colors_0)), run_loop($$$$ImageOps$tl$(_mask_0))));
      const _b_1 = run_loop($from_planes$(_rest_0, run_loop($$$$ImageOps$tr$(_colors_0)), run_loop($$$$ImageOps$tr$(_mask_0))));
      const _c_1 = run_loop($from_planes$(_rest_0, run_loop($$$$ImageOps$bl$(_colors_0)), run_loop($$$$ImageOps$bl$(_mask_0))));
      const _d_1 = run_loop($from_planes$(_rest_0, run_loop($$$$ImageOps$br$(_colors_0)), run_loop($$$$ImageOps$br$(_mask_0))));
      return run_jump($$$$ImageOps$quad$, [_a_1, _b_1, _c_1, _d_1]);
    }
  }
}

function $from_texture$(_texture_0) {
  const _depth_0 = _texture_0["depth"];
  const _size_0 = _texture_0["size"];
  const _colors_0 = _texture_0["colors"];
  const _mask_0 = _texture_0["mask"];
  return {$: "Surface", ["depth"]: _depth_0, ["size"]: _size_0, ["pixels"]: run_loop($from_planes$(_depth_0, _colors_0, _mask_0))};
}

function $masked$(_depth_0, _size_0, _color_0, _mask_0) {
  return {$: "Surface", ["depth"]: _depth_0, ["size"]: _size_0, ["pixels"]: run_loop($from_planes$(_depth_0, {$: "Pix", ["color"]: _color_0}, _mask_0))};
}

function $opacity_tree$(_depth_0, _image_0, _opacity_0) {
  if (_depth_0 === 0n) {
    if (_image_0.$ === "Pix") {
      const _pixel_0 = _image_0["color"];
      return {$: "Pix", ["color"]: run_loop($Premul$scale$(_pixel_0, _opacity_0))};
    } else {
      const _a_0 = _image_0["tl"];
      const _b_0 = _image_0["tr"];
      const _c_0 = _image_0["bl"];
      const _d_0 = _image_0["br"];
      return {$: "Pix", ["color"]: 0};
    }
  } else {
    const _rest_0 = (_depth_0 - 1n);
    if (_image_0.$ === "Pix") {
      const _pixel_1 = _image_0["color"];
      return {$: "Pix", ["color"]: run_loop($Premul$scale$(_pixel_1, _opacity_0))};
    } else {
      const _a_1 = _image_0["tl"];
      const _b_1 = _image_0["tr"];
      const _c_1 = _image_0["bl"];
      const _d_1 = _image_0["br"];
      const _aa_0 = run_loop($opacity_tree$(_rest_0, _a_1, _opacity_0));
      const _bb_0 = run_loop($opacity_tree$(_rest_0, _b_1, _opacity_0));
      const _cc_0 = run_loop($opacity_tree$(_rest_0, _c_1, _opacity_0));
      const _dd_0 = run_loop($opacity_tree$(_rest_0, _d_1, _opacity_0));
      return run_jump($$$$ImageOps$quad$, [_aa_0, _bb_0, _cc_0, _dd_0]);
    }
  }
}

function $opacity_case$(_zero_0, _full_0, _surface_0, _opacity_0) {
  if (_zero_0) {
    const _depth_0 = _surface_0["depth"];
    const _size_0 = _surface_0["size"];
    const _pixels_0 = _surface_0["pixels"];
    return {$: "Surface", ["depth"]: _depth_0, ["size"]: _size_0, ["pixels"]: {$: "Pix", ["color"]: 0}};
  } else {
    if (_full_0) {
      return _surface_0;
    } else {
      const _depth_1 = _surface_0["depth"];
      const _size_1 = _surface_0["size"];
      const _pixels_1 = _surface_0["pixels"];
      return {$: "Surface", ["depth"]: _depth_1, ["size"]: _size_1, ["pixels"]: run_loop($opacity_tree$(_depth_1, _pixels_1, _opacity_0))};
    }
  }
}

function $opacity$(_surface_0, _value_0) {
  return run_jump($opacity_case$, [(_value_0 === 0), (_value_0 >= 255), _surface_0, _value_0]);
}

function $merge_tree$(_depth_0, _mode_0, _source_0, _destination_0) {
  if (_depth_0 === 0n) {
    if (_source_0.$ === "Pix") {
      const _a_0 = _source_0["color"];
      if (_destination_0.$ === "Pix") {
        const _b_0 = _destination_0["color"];
        return {$: "Pix", ["color"]: run_loop($Premul$blend$(_mode_0, _a_0, _b_0))};
      } else {
        return _destination_0;
      }
    } else {
      return _destination_0;
    }
  } else {
    const _rest_0 = (_depth_0 - 1n);
    if (_source_0.$ === "Pix") {
      const _a_1 = _source_0["color"];
      if (_destination_0.$ === "Pix") {
        const _b_1 = _destination_0["color"];
        return {$: "Pix", ["color"]: run_loop($Premul$blend$(_mode_0, _a_1, _b_1))};
      } else {
        const _a_2 = run_loop($merge_tree$(_rest_0, _mode_0, run_loop($$$$ImageOps$tl$({$: "Pix", ["color"]: _a_1})), run_loop($$$$ImageOps$tl$(_destination_0))));
        const _b_2 = run_loop($merge_tree$(_rest_0, _mode_0, run_loop($$$$ImageOps$tr$({$: "Pix", ["color"]: _a_1})), run_loop($$$$ImageOps$tr$(_destination_0))));
        const _c_0 = run_loop($merge_tree$(_rest_0, _mode_0, run_loop($$$$ImageOps$bl$({$: "Pix", ["color"]: _a_1})), run_loop($$$$ImageOps$bl$(_destination_0))));
        const _d_0 = run_loop($merge_tree$(_rest_0, _mode_0, run_loop($$$$ImageOps$br$({$: "Pix", ["color"]: _a_1})), run_loop($$$$ImageOps$br$(_destination_0))));
        return run_jump($$$$ImageOps$quad$, [_a_2, _b_2, _c_0, _d_0]);
      }
    } else {
      const _a_3 = run_loop($merge_tree$(_rest_0, _mode_0, run_loop($$$$ImageOps$tl$(_source_0)), run_loop($$$$ImageOps$tl$(_destination_0))));
      const _b_3 = run_loop($merge_tree$(_rest_0, _mode_0, run_loop($$$$ImageOps$tr$(_source_0)), run_loop($$$$ImageOps$tr$(_destination_0))));
      const _c_1 = run_loop($merge_tree$(_rest_0, _mode_0, run_loop($$$$ImageOps$bl$(_source_0)), run_loop($$$$ImageOps$bl$(_destination_0))));
      const _d_1 = run_loop($merge_tree$(_rest_0, _mode_0, run_loop($$$$ImageOps$br$(_source_0)), run_loop($$$$ImageOps$br$(_destination_0))));
      return run_jump($$$$ImageOps$quad$, [_a_3, _b_3, _c_1, _d_1]);
    }
  }
}

function $merge_case$(_valid_0, _mode_0, _source_0, _destination_0) {
  if (!_valid_0) {
    return {$: "None"};
  } else {
    const _depth_0 = _source_0["depth"];
    const _size_0 = _source_0["size"];
    const _source_1 = _source_0["pixels"];
    const _dd_0 = _destination_0["depth"];
    const _ds_0 = _destination_0["size"];
    const _dest_0 = _destination_0["pixels"];
    return {$: "Some", ["value"]: {$: "Surface", ["depth"]: _dd_0, ["size"]: _ds_0, ["pixels"]: run_loop($merge_tree$(_dd_0, _mode_0, _source_1, _dest_0))}};
  }
}

function $merge$(_mode_0, _source_0, _destination_0) {
  const _x_0 = run_loop($size$(_source_0));
  const _x_1 = run_loop($size$(_destination_0));
  return run_jump($merge_case$, [(_x_0 === _x_1), _mode_0, _source_0, _destination_0]);
}

function $plane$(_depth_0, _image_0, _mask_0) {
  if (_depth_0 === 0n) {
    if (_image_0.$ === "Pix") {
      const _pixel_0 = _image_0["color"];
      if (_mask_0) {
        const _x_0 = run_loop($Premul$alpha$(_pixel_0));
        return {$: "Pix", ["color"]: (16n >= 32n ? 0 : (_x_0 << Number(16n)) >>> 0)};
      } else {
        return {$: "Pix", ["color"]: run_loop($Premul$rgb$(_pixel_0))};
      }
    } else {
      const _a_0 = _image_0["tl"];
      const _b_0 = _image_0["tr"];
      const _c_0 = _image_0["bl"];
      const _d_0 = _image_0["br"];
      return {$: "Pix", ["color"]: 0};
    }
  } else {
    const _rest_0 = (_depth_0 - 1n);
    if (_image_0.$ === "Pix") {
      const _pixel_1 = _image_0["color"];
      if (_mask_0) {
        const _x_1 = run_loop($Premul$alpha$(_pixel_1));
        return {$: "Pix", ["color"]: (16n >= 32n ? 0 : (_x_1 << Number(16n)) >>> 0)};
      } else {
        return {$: "Pix", ["color"]: run_loop($Premul$rgb$(_pixel_1))};
      }
    } else {
      const _a_1 = _image_0["tl"];
      const _b_1 = _image_0["tr"];
      const _c_1 = _image_0["bl"];
      const _d_1 = _image_0["br"];
      const _aa_0 = run_loop($plane$(_rest_0, _a_1, _mask_0));
      const _bb_0 = run_loop($plane$(_rest_0, _b_1, _mask_0));
      const _cc_0 = run_loop($plane$(_rest_0, _c_1, _mask_0));
      const _dd_0 = run_loop($plane$(_rest_0, _d_1, _mask_0));
      return run_jump($$$$ImageOps$quad$, [_aa_0, _bb_0, _cc_0, _dd_0]);
    }
  }
}

function $texture$(_surface_0) {
  const _depth_0 = _surface_0["depth"];
  const _size_0 = _surface_0["size"];
  const _pixels_0 = _surface_0["pixels"];
  return {$: "Texture", ["depth"]: _depth_0, ["size"]: _size_0, ["colors"]: run_loop($plane$(_depth_0, _pixels_0, false)), ["mask"]: run_loop($plane$(_depth_0, _pixels_0, true))};
}

function $flatten_tree$(_depth_0, _source_0, _background_0) {
  if (_depth_0 === 0n) {
    if (_source_0.$ === "Pix") {
      const _source_1 = _source_0["color"];
      if (_background_0.$ === "Pix") {
        const _background_1 = _background_0["color"];
        const _x_0 = run_loop($Premul$blend$({$: "Over"}, _source_1, ((_background_1 | 4278190080) >>> 0)));
        return {$: "Pix", ["color"]: ((_x_0 & 16777215) >>> 0)};
      } else {
        return _background_0;
      }
    } else {
      return _background_0;
    }
  } else {
    const _rest_0 = (_depth_0 - 1n);
    if (_source_0.$ === "Pix") {
      const _source_2 = _source_0["color"];
      if (_background_0.$ === "Pix") {
        const _background_2 = _background_0["color"];
        const _x_1 = run_loop($Premul$blend$({$: "Over"}, _source_2, ((_background_2 | 4278190080) >>> 0)));
        return {$: "Pix", ["color"]: ((_x_1 & 16777215) >>> 0)};
      } else {
        const _a_0 = run_loop($flatten_tree$(_rest_0, run_loop($$$$ImageOps$tl$({$: "Pix", ["color"]: _source_2})), run_loop($$$$ImageOps$tl$(_background_0))));
        const _b_0 = run_loop($flatten_tree$(_rest_0, run_loop($$$$ImageOps$tr$({$: "Pix", ["color"]: _source_2})), run_loop($$$$ImageOps$tr$(_background_0))));
        const _c_0 = run_loop($flatten_tree$(_rest_0, run_loop($$$$ImageOps$bl$({$: "Pix", ["color"]: _source_2})), run_loop($$$$ImageOps$bl$(_background_0))));
        const _d_0 = run_loop($flatten_tree$(_rest_0, run_loop($$$$ImageOps$br$({$: "Pix", ["color"]: _source_2})), run_loop($$$$ImageOps$br$(_background_0))));
        return run_jump($$$$ImageOps$quad$, [_a_0, _b_0, _c_0, _d_0]);
      }
    } else {
      const _a_1 = run_loop($flatten_tree$(_rest_0, run_loop($$$$ImageOps$tl$(_source_0)), run_loop($$$$ImageOps$tl$(_background_0))));
      const _b_1 = run_loop($flatten_tree$(_rest_0, run_loop($$$$ImageOps$tr$(_source_0)), run_loop($$$$ImageOps$tr$(_background_0))));
      const _c_1 = run_loop($flatten_tree$(_rest_0, run_loop($$$$ImageOps$bl$(_source_0)), run_loop($$$$ImageOps$bl$(_background_0))));
      const _d_1 = run_loop($flatten_tree$(_rest_0, run_loop($$$$ImageOps$br$(_source_0)), run_loop($$$$ImageOps$br$(_background_0))));
      return run_jump($$$$ImageOps$quad$, [_a_1, _b_1, _c_1, _d_1]);
    }
  }
}

function $flatten$(_surface_0, _background_0) {
  const _depth_0 = _surface_0["depth"];
  const _size_0 = _surface_0["size"];
  const _pixels_0 = _surface_0["pixels"];
  return run_jump($flatten_tree$, [_depth_0, _pixels_0, _background_0]);
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

function $$$$ImageOps$tl$(_image_0) {
  if (_image_0.$ === "Pix") {
    const _color_0 = _image_0["color"];
    return {$: "Pix", ["color"]: _color_0};
  } else {
    const _tl_0 = _image_0["tl"];
    const _tr_0 = _image_0["tr"];
    const _bl_0 = _image_0["bl"];
    const _br_0 = _image_0["br"];
    return _tl_0;
  }
}

function $$$$ImageOps$tr$(_image_0) {
  if (_image_0.$ === "Pix") {
    const _color_0 = _image_0["color"];
    return {$: "Pix", ["color"]: _color_0};
  } else {
    const _tl_0 = _image_0["tl"];
    const _tr_0 = _image_0["tr"];
    const _bl_0 = _image_0["bl"];
    const _br_0 = _image_0["br"];
    return _tr_0;
  }
}

function $$$$ImageOps$bl$(_image_0) {
  if (_image_0.$ === "Pix") {
    const _color_0 = _image_0["color"];
    return {$: "Pix", ["color"]: _color_0};
  } else {
    const _tl_0 = _image_0["tl"];
    const _tr_0 = _image_0["tr"];
    const _bl_0 = _image_0["bl"];
    const _br_0 = _image_0["br"];
    return _bl_0;
  }
}

function $$$$ImageOps$br$(_image_0) {
  if (_image_0.$ === "Pix") {
    const _color_0 = _image_0["color"];
    return {$: "Pix", ["color"]: _color_0};
  } else {
    const _tl_0 = _image_0["tl"];
    const _tr_0 = _image_0["tr"];
    const _bl_0 = _image_0["bl"];
    const _br_0 = _image_0["br"];
    return _br_0;
  }
}

function $$$$ImageOps$quad$(_tl_0, _tr_0, _bl_0, _br_0) {
  if (_tl_0.$ === "Pix") {
    const _a_0 = _tl_0["color"];
    if (_tr_0.$ === "Pix") {
      const _b_0 = _tr_0["color"];
      if (_bl_0.$ === "Pix") {
        const _c_0 = _bl_0["color"];
        if (_br_0.$ === "Pix") {
          const _d_0 = _br_0["color"];
          return run_jump($$$$ImageOps$quad_case$, [run_loop($Bool$and$(run_loop($Bool$and$((_a_0 === _b_0), (_a_0 === _c_0))), (_a_0 === _d_0))), _a_0, _b_0, _c_0, _d_0]);
        } else {
          return {$: "Qua", ["tl"]: {$: "Pix", ["color"]: _a_0}, ["tr"]: {$: "Pix", ["color"]: _b_0}, ["bl"]: {$: "Pix", ["color"]: _c_0}, ["br"]: _br_0};
        }
      } else {
        return {$: "Qua", ["tl"]: {$: "Pix", ["color"]: _a_0}, ["tr"]: {$: "Pix", ["color"]: _b_0}, ["bl"]: _bl_0, ["br"]: _br_0};
      }
    } else {
      return {$: "Qua", ["tl"]: {$: "Pix", ["color"]: _a_0}, ["tr"]: _tr_0, ["bl"]: _bl_0, ["br"]: _br_0};
    }
  } else {
    return {$: "Qua", ["tl"]: _tl_0, ["tr"]: _tr_0, ["bl"]: _bl_0, ["br"]: _br_0};
  }
}

function $Bool$pick$(_c_0, _a_0, _b_0) {
  if (!_c_0) {
    return _b_0;
  } else {
    return _a_0;
  }
}

function $$$$ImageOps$quad_case$(_same_0, _a_0, _b_0, _c_0, _d_0) {
  if (_same_0) {
    return {$: "Pix", ["color"]: _a_0};
  } else {
    return {$: "Qua", ["tl"]: {$: "Pix", ["color"]: _a_0}, ["tr"]: {$: "Pix", ["color"]: _b_0}, ["bl"]: {$: "Pix", ["color"]: _c_0}, ["br"]: {$: "Pix", ["color"]: _d_0}};
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
  "blank": run_lib($blank$, 1),
  "pixels": run_lib($pixels$, 1),
  "size": run_lib($size$, 1),
  "from_planes": run_lib($from_planes$, 3),
  "from_texture": run_lib($from_texture$, 1),
  "masked": run_lib($masked$, 4),
  "opacity_tree": run_lib($opacity_tree$, 3),
  "opacity_case": run_lib($opacity_case$, 4),
  "opacity": run_lib($opacity$, 2),
  "merge_tree": run_lib($merge_tree$, 4),
  "merge_case": run_lib($merge_case$, 4),
  "merge": run_lib($merge$, 3),
  "plane": run_lib($plane$, 3),
  "texture": run_lib($texture$, 1),
  "flatten_tree": run_lib($flatten_tree$, 3),
  "flatten": run_lib($flatten$, 2),
};
