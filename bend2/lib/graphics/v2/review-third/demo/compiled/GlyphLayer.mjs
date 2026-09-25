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

function $PreparedSprite$join$(_a_0, _b_0, _c_0, _d_0) {
  const _ac_0 = _a_0["colors"];
  const _am_0 = _a_0["mask"];
  const _bc_0 = _b_0["colors"];
  const _bm_0 = _b_0["mask"];
  const _cc_0 = _c_0["colors"];
  const _cm_0 = _c_0["mask"];
  const _dc_0 = _d_0["colors"];
  const _dm_0 = _d_0["mask"];
  return {$: "Planes", ["colors"]: run_loop($$$$ImageOps$quad$(_ac_0, _bc_0, _cc_0, _dc_0)), ["mask"]: run_loop($$$$ImageOps$quad$(_am_0, _bm_0, _cm_0, _dm_0))};
}

function $PreparedSprite$leaf_case$(_empty_0, _colors_0, _x_0, _y_0, _alpha_0) {
  if (_empty_0) {
    return {$: "Planes", ["colors"]: {$: "Pix", ["color"]: 0}, ["mask"]: {$: "Pix", ["color"]: 0}};
  } else {
    return {$: "Planes", ["colors"]: {$: "Pix", ["color"]: run_loop($$$$ImageView$sample$(_colors_0, _x_0, _y_0))}, ["mask"]: {$: "Pix", ["color"]: (16n >= 32n ? 0 : (_alpha_0 << Number(16n)) >>> 0)}};
  }
}

function $PreparedSprite$leaf$(_x_0, _y_0, _colors_0, _mask_0) {
  const _alpha_0 = run_loop($$$$Color$red$(run_loop($$$$ImageView$sample$(_mask_0, _x_0, _y_0))));
  return run_jump($PreparedSprite$leaf_case$, [(_alpha_0 === 0), _colors_0, _x_0, _y_0, _alpha_0]);
}

function $PreparedSprite$focused$(_depth_0, _size_0, _x_0, _y_0, _work_0) {
  if (_depth_0 === 0n) {
    if (_work_0.$ === "Unchanged") {
      return {$: "Planes", ["colors"]: {$: "Pix", ["color"]: 0}, ["mask"]: {$: "Pix", ["color"]: 0}};
    } else if (_work_0.$ === "Aligned") {
      const _colors_0 = _work_0["colors"];
      const _mask_0 = _work_0["mask"];
      return {$: "Planes", ["colors"]: _colors_0, ["mask"]: _mask_0};
    } else {
      const _colors_1 = _work_0["colors"];
      const _mask_1 = _work_0["mask"];
      return run_jump($PreparedSprite$leaf$, [_x_0, _y_0, _colors_1, _mask_1]);
    }
  } else {
    const _rest_0 = (_depth_0 - 1n);
    if (_work_0.$ === "Unchanged") {
      return {$: "Planes", ["colors"]: {$: "Pix", ["color"]: 0}, ["mask"]: {$: "Pix", ["color"]: 0}};
    } else if (_work_0.$ === "Aligned") {
      const _colors_2 = _work_0["colors"];
      const _mask_2 = _work_0["mask"];
      return {$: "Planes", ["colors"]: _colors_2, ["mask"]: _mask_2};
    } else {
      const _colors_3 = _work_0["colors"];
      const _mask_3 = _work_0["mask"];
      const _h_0 = (2 === 0 ? 0 : (_size_0 / 2) >>> 0);
      const _xx_0 = ((_x_0 + _h_0) >>> 0);
      const _yy_0 = ((_y_0 + _h_0) >>> 0);
      const _a_0 = run_loop($PreparedSprite$focused$(_rest_0, _h_0, _x_0, _y_0, run_loop($$$$MaskedStampKernel$prepare$(_x_0, _y_0, _h_0, _colors_3, _mask_3))));
      const _b_0 = run_loop($PreparedSprite$focused$(_rest_0, _h_0, _xx_0, _y_0, run_loop($$$$MaskedStampKernel$prepare$(_xx_0, _y_0, _h_0, _colors_3, _mask_3))));
      const _c_0 = run_loop($PreparedSprite$focused$(_rest_0, _h_0, _x_0, _yy_0, run_loop($$$$MaskedStampKernel$prepare$(_x_0, _yy_0, _h_0, _colors_3, _mask_3))));
      const _d_0 = run_loop($PreparedSprite$focused$(_rest_0, _h_0, _xx_0, _yy_0, run_loop($$$$MaskedStampKernel$prepare$(_xx_0, _yy_0, _h_0, _colors_3, _mask_3))));
      return run_jump($PreparedSprite$join$, [_a_0, _b_0, _c_0, _d_0]);
    }
  }
}

function $PreparedSprite$region$(_depth_0, _size_0, _x_0, _y_0, _outside_0, _inside_0, _bounds_0, _colors_0, _mask_0) {
  if (_depth_0 === 0n) {
    if (_outside_0) {
      return {$: "Planes", ["colors"]: {$: "Pix", ["color"]: 0}, ["mask"]: {$: "Pix", ["color"]: 0}};
    } else {
      if (_inside_0) {
        return run_jump($PreparedSprite$focused$, [0n, _size_0, ((_x_0 + 4096) >>> 0), ((_y_0 + 4096) >>> 0), run_loop($$$$MaskedStampKernel$prepare$(((_x_0 + 4096) >>> 0), ((_y_0 + 4096) >>> 0), _size_0, _colors_0, _mask_0))]);
      } else {
        return run_jump($PreparedSprite$leaf$, [((_x_0 + 4096) >>> 0), ((_y_0 + 4096) >>> 0), _colors_0, _mask_0]);
      }
    }
  } else {
    const _rest_0 = (_depth_0 - 1n);
    if (_outside_0) {
      return {$: "Planes", ["colors"]: {$: "Pix", ["color"]: 0}, ["mask"]: {$: "Pix", ["color"]: 0}};
    } else {
      if (_inside_0) {
        return run_jump($PreparedSprite$focused$, [nat_chk(_rest_0 + 1n), _size_0, ((_x_0 + 4096) >>> 0), ((_y_0 + 4096) >>> 0), run_loop($$$$MaskedStampKernel$prepare$(((_x_0 + 4096) >>> 0), ((_y_0 + 4096) >>> 0), _size_0, _colors_0, _mask_0))]);
      } else {
        const _h_0 = (2 === 0 ? 0 : (_size_0 / 2) >>> 0);
        const _xx_0 = ((_x_0 + _h_0) >>> 0);
        const _yy_0 = ((_y_0 + _h_0) >>> 0);
        const _a_0 = run_loop($PreparedSprite$region$(_rest_0, _h_0, _x_0, _y_0, run_loop($Bool$not$(run_loop($$$$Rect$overlaps$(_bounds_0, run_loop($$$$Rect$cell$(_x_0, _y_0, _h_0)))))), run_loop($$$$Rect$contains$(_bounds_0, run_loop($$$$Rect$cell$(_x_0, _y_0, _h_0)))), _bounds_0, _colors_0, _mask_0));
        const _b_0 = run_loop($PreparedSprite$region$(_rest_0, _h_0, _xx_0, _y_0, run_loop($Bool$not$(run_loop($$$$Rect$overlaps$(_bounds_0, run_loop($$$$Rect$cell$(_xx_0, _y_0, _h_0)))))), run_loop($$$$Rect$contains$(_bounds_0, run_loop($$$$Rect$cell$(_xx_0, _y_0, _h_0)))), _bounds_0, _colors_0, _mask_0));
        const _c_0 = run_loop($PreparedSprite$region$(_rest_0, _h_0, _x_0, _yy_0, run_loop($Bool$not$(run_loop($$$$Rect$overlaps$(_bounds_0, run_loop($$$$Rect$cell$(_x_0, _yy_0, _h_0)))))), run_loop($$$$Rect$contains$(_bounds_0, run_loop($$$$Rect$cell$(_x_0, _yy_0, _h_0)))), _bounds_0, _colors_0, _mask_0));
        const _d_0 = run_loop($PreparedSprite$region$(_rest_0, _h_0, _xx_0, _yy_0, run_loop($Bool$not$(run_loop($$$$Rect$overlaps$(_bounds_0, run_loop($$$$Rect$cell$(_xx_0, _yy_0, _h_0)))))), run_loop($$$$Rect$contains$(_bounds_0, run_loop($$$$Rect$cell$(_xx_0, _yy_0, _h_0)))), _bounds_0, _colors_0, _mask_0));
        return run_jump($PreparedSprite$join$, [_a_0, _b_0, _c_0, _d_0]);
      }
    }
  }
}

function $PreparedSprite$finish$(_depth_0, _size_0, _bounds_0, _pair_0) {
  const _colors_0 = _pair_0["colors"];
  const _mask_0 = _pair_0["mask"];
  return {$: "Patch", ["depth"]: _depth_0, ["size"]: _size_0, ["bounds"]: _bounds_0, ["colors"]: _colors_0, ["mask"]: _mask_0};
}

function $PreparedSprite$prepare$(_depth_0, _size_0, _source_depth_0, _source_size_0, _left_0, _top_0, _colors_0, _mask_0, _clip_0) {
  const _bounds_0 = run_loop($$$$Rect$intersect$(run_loop($$$$Rect$sprite$(_size_0, _left_0, _top_0, _source_size_0)), _clip_0));
  return run_jump($PreparedSprite$finish$, [_depth_0, _size_0, _bounds_0, run_loop($PreparedSprite$region$(_depth_0, _size_0, 0, 0, run_loop($$$$Rect$is_empty$(_bounds_0)), run_loop($$$$Rect$contains$(_bounds_0, run_loop($$$$Rect$screen$(_size_0)))), _bounds_0, {$: "View", ["depth"]: _source_depth_0, ["size"]: _source_size_0, ["x"]: run_loop($$$$Shapes$biased$(_left_0)), ["y"]: run_loop($$$$Shapes$biased$(_top_0)), ["pixels"]: _colors_0}, {$: "View", ["depth"]: _source_depth_0, ["size"]: _source_size_0, ["x"]: run_loop($$$$Shapes$biased$(_left_0)), ["y"]: run_loop($$$$Shapes$biased$(_top_0)), ["pixels"]: _mask_0}))]);
}

function $PreparedSprite$draw_zero$(_zero_0, _patch_0, _opacity_0, _target_0) {
  if (_zero_0) {
    return _target_0;
  } else {
    const _depth_0 = _patch_0["depth"];
    const _size_0 = _patch_0["size"];
    const _bounds_0 = _patch_0["bounds"];
    const _colors_0 = _patch_0["colors"];
    const _mask_0 = _patch_0["mask"];
    return run_jump($$$$TileRaster$masked$, [_depth_0, _colors_0, _mask_0, _opacity_0, _target_0]);
  }
}

function $PreparedSprite$draw$(_patch_0, _opacity_0, _target_0) {
  return run_jump($PreparedSprite$draw_zero$, [(_opacity_0 === 0), _patch_0, _opacity_0, _target_0]);
}

function $PreparedSprite$command$(_patch_0, _opacity_0) {
  const _depth_0 = _patch_0["depth"];
  const _size_0 = _patch_0["size"];
  const _bounds_0 = _patch_0["bounds"];
  const _colors_0 = _patch_0["colors"];
  const _mask_0 = _patch_0["mask"];
  return {$: "Sprite", ["bounds"]: _bounds_0, ["colors"]: {$: "View", ["depth"]: _depth_0, ["size"]: _size_0, ["x"]: 4096, ["y"]: 4096, ["pixels"]: _colors_0}, ["mask"]: {$: "View", ["depth"]: _depth_0, ["size"]: _size_0, ["x"]: 4096, ["y"]: 4096, ["pixels"]: _mask_0}, ["opacity"]: _opacity_0};
}

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

function $Surface$blank$(_depth_0) {
  return {$: "Surface", ["depth"]: _depth_0, ["size"]: (_depth_0 >= 32n ? 0 : (1 << Number(_depth_0)) >>> 0), ["pixels"]: {$: "Pix", ["color"]: 0}};
}

function $Surface$pixels$(_surface_0) {
  const _depth_0 = _surface_0["depth"];
  const _size_0 = _surface_0["size"];
  const _pixels_0 = _surface_0["pixels"];
  return _pixels_0;
}

function $Surface$size$(_surface_0) {
  const _depth_0 = _surface_0["depth"];
  const _size_0 = _surface_0["size"];
  const _pixels_0 = _surface_0["pixels"];
  return _size_0;
}

function $Surface$from_planes$(_depth_0, _colors_0, _mask_0) {
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
        const _a_0 = run_loop($Surface$from_planes$(_rest_0, run_loop($$$$ImageOps$tl$({$: "Pix", ["color"]: _color_1})), run_loop($$$$ImageOps$tl$(_mask_0))));
        const _b_0 = run_loop($Surface$from_planes$(_rest_0, run_loop($$$$ImageOps$tr$({$: "Pix", ["color"]: _color_1})), run_loop($$$$ImageOps$tr$(_mask_0))));
        const _c_0 = run_loop($Surface$from_planes$(_rest_0, run_loop($$$$ImageOps$bl$({$: "Pix", ["color"]: _color_1})), run_loop($$$$ImageOps$bl$(_mask_0))));
        const _d_0 = run_loop($Surface$from_planes$(_rest_0, run_loop($$$$ImageOps$br$({$: "Pix", ["color"]: _color_1})), run_loop($$$$ImageOps$br$(_mask_0))));
        return run_jump($$$$ImageOps$quad$, [_a_0, _b_0, _c_0, _d_0]);
      }
    } else {
      const _a_1 = run_loop($Surface$from_planes$(_rest_0, run_loop($$$$ImageOps$tl$(_colors_0)), run_loop($$$$ImageOps$tl$(_mask_0))));
      const _b_1 = run_loop($Surface$from_planes$(_rest_0, run_loop($$$$ImageOps$tr$(_colors_0)), run_loop($$$$ImageOps$tr$(_mask_0))));
      const _c_1 = run_loop($Surface$from_planes$(_rest_0, run_loop($$$$ImageOps$bl$(_colors_0)), run_loop($$$$ImageOps$bl$(_mask_0))));
      const _d_1 = run_loop($Surface$from_planes$(_rest_0, run_loop($$$$ImageOps$br$(_colors_0)), run_loop($$$$ImageOps$br$(_mask_0))));
      return run_jump($$$$ImageOps$quad$, [_a_1, _b_1, _c_1, _d_1]);
    }
  }
}

function $Surface$from_texture$(_texture_0) {
  const _depth_0 = _texture_0["depth"];
  const _size_0 = _texture_0["size"];
  const _colors_0 = _texture_0["colors"];
  const _mask_0 = _texture_0["mask"];
  return {$: "Surface", ["depth"]: _depth_0, ["size"]: _size_0, ["pixels"]: run_loop($Surface$from_planes$(_depth_0, _colors_0, _mask_0))};
}

function $Surface$masked$(_depth_0, _size_0, _color_0, _mask_0) {
  return {$: "Surface", ["depth"]: _depth_0, ["size"]: _size_0, ["pixels"]: run_loop($Surface$from_planes$(_depth_0, {$: "Pix", ["color"]: _color_0}, _mask_0))};
}

function $Surface$opacity_tree$(_depth_0, _image_0, _opacity_0) {
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
      const _aa_0 = run_loop($Surface$opacity_tree$(_rest_0, _a_1, _opacity_0));
      const _bb_0 = run_loop($Surface$opacity_tree$(_rest_0, _b_1, _opacity_0));
      const _cc_0 = run_loop($Surface$opacity_tree$(_rest_0, _c_1, _opacity_0));
      const _dd_0 = run_loop($Surface$opacity_tree$(_rest_0, _d_1, _opacity_0));
      return run_jump($$$$ImageOps$quad$, [_aa_0, _bb_0, _cc_0, _dd_0]);
    }
  }
}

function $Surface$opacity_case$(_zero_0, _full_0, _surface_0, _opacity_0) {
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
      return {$: "Surface", ["depth"]: _depth_1, ["size"]: _size_1, ["pixels"]: run_loop($Surface$opacity_tree$(_depth_1, _pixels_1, _opacity_0))};
    }
  }
}

function $Surface$opacity$(_surface_0, _value_0) {
  return run_jump($Surface$opacity_case$, [(_value_0 === 0), (_value_0 >= 255), _surface_0, _value_0]);
}

function $Surface$merge_tree$(_depth_0, _mode_0, _source_0, _destination_0) {
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
        const _a_2 = run_loop($Surface$merge_tree$(_rest_0, _mode_0, run_loop($$$$ImageOps$tl$({$: "Pix", ["color"]: _a_1})), run_loop($$$$ImageOps$tl$(_destination_0))));
        const _b_2 = run_loop($Surface$merge_tree$(_rest_0, _mode_0, run_loop($$$$ImageOps$tr$({$: "Pix", ["color"]: _a_1})), run_loop($$$$ImageOps$tr$(_destination_0))));
        const _c_0 = run_loop($Surface$merge_tree$(_rest_0, _mode_0, run_loop($$$$ImageOps$bl$({$: "Pix", ["color"]: _a_1})), run_loop($$$$ImageOps$bl$(_destination_0))));
        const _d_0 = run_loop($Surface$merge_tree$(_rest_0, _mode_0, run_loop($$$$ImageOps$br$({$: "Pix", ["color"]: _a_1})), run_loop($$$$ImageOps$br$(_destination_0))));
        return run_jump($$$$ImageOps$quad$, [_a_2, _b_2, _c_0, _d_0]);
      }
    } else {
      const _a_3 = run_loop($Surface$merge_tree$(_rest_0, _mode_0, run_loop($$$$ImageOps$tl$(_source_0)), run_loop($$$$ImageOps$tl$(_destination_0))));
      const _b_3 = run_loop($Surface$merge_tree$(_rest_0, _mode_0, run_loop($$$$ImageOps$tr$(_source_0)), run_loop($$$$ImageOps$tr$(_destination_0))));
      const _c_1 = run_loop($Surface$merge_tree$(_rest_0, _mode_0, run_loop($$$$ImageOps$bl$(_source_0)), run_loop($$$$ImageOps$bl$(_destination_0))));
      const _d_1 = run_loop($Surface$merge_tree$(_rest_0, _mode_0, run_loop($$$$ImageOps$br$(_source_0)), run_loop($$$$ImageOps$br$(_destination_0))));
      return run_jump($$$$ImageOps$quad$, [_a_3, _b_3, _c_1, _d_1]);
    }
  }
}

function $Surface$merge_case$(_valid_0, _mode_0, _source_0, _destination_0) {
  if (!_valid_0) {
    return {$: "None"};
  } else {
    const _depth_0 = _source_0["depth"];
    const _size_0 = _source_0["size"];
    const _source_1 = _source_0["pixels"];
    const _dd_0 = _destination_0["depth"];
    const _ds_0 = _destination_0["size"];
    const _dest_0 = _destination_0["pixels"];
    return {$: "Some", ["value"]: {$: "Surface", ["depth"]: _dd_0, ["size"]: _ds_0, ["pixels"]: run_loop($Surface$merge_tree$(_dd_0, _mode_0, _source_1, _dest_0))}};
  }
}

function $Surface$merge$(_mode_0, _source_0, _destination_0) {
  const _x_0 = run_loop($Surface$size$(_source_0));
  const _x_1 = run_loop($Surface$size$(_destination_0));
  return run_jump($Surface$merge_case$, [(_x_0 === _x_1), _mode_0, _source_0, _destination_0]);
}

function $Surface$plane$(_depth_0, _image_0, _mask_0) {
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
      const _aa_0 = run_loop($Surface$plane$(_rest_0, _a_1, _mask_0));
      const _bb_0 = run_loop($Surface$plane$(_rest_0, _b_1, _mask_0));
      const _cc_0 = run_loop($Surface$plane$(_rest_0, _c_1, _mask_0));
      const _dd_0 = run_loop($Surface$plane$(_rest_0, _d_1, _mask_0));
      return run_jump($$$$ImageOps$quad$, [_aa_0, _bb_0, _cc_0, _dd_0]);
    }
  }
}

function $Surface$texture$(_surface_0) {
  const _depth_0 = _surface_0["depth"];
  const _size_0 = _surface_0["size"];
  const _pixels_0 = _surface_0["pixels"];
  return {$: "Texture", ["depth"]: _depth_0, ["size"]: _size_0, ["colors"]: run_loop($Surface$plane$(_depth_0, _pixels_0, false)), ["mask"]: run_loop($Surface$plane$(_depth_0, _pixels_0, true))};
}

function $Surface$flatten_tree$(_depth_0, _source_0, _background_0) {
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
        const _a_0 = run_loop($Surface$flatten_tree$(_rest_0, run_loop($$$$ImageOps$tl$({$: "Pix", ["color"]: _source_2})), run_loop($$$$ImageOps$tl$(_background_0))));
        const _b_0 = run_loop($Surface$flatten_tree$(_rest_0, run_loop($$$$ImageOps$tr$({$: "Pix", ["color"]: _source_2})), run_loop($$$$ImageOps$tr$(_background_0))));
        const _c_0 = run_loop($Surface$flatten_tree$(_rest_0, run_loop($$$$ImageOps$bl$({$: "Pix", ["color"]: _source_2})), run_loop($$$$ImageOps$bl$(_background_0))));
        const _d_0 = run_loop($Surface$flatten_tree$(_rest_0, run_loop($$$$ImageOps$br$({$: "Pix", ["color"]: _source_2})), run_loop($$$$ImageOps$br$(_background_0))));
        return run_jump($$$$ImageOps$quad$, [_a_0, _b_0, _c_0, _d_0]);
      }
    } else {
      const _a_1 = run_loop($Surface$flatten_tree$(_rest_0, run_loop($$$$ImageOps$tl$(_source_0)), run_loop($$$$ImageOps$tl$(_background_0))));
      const _b_1 = run_loop($Surface$flatten_tree$(_rest_0, run_loop($$$$ImageOps$tr$(_source_0)), run_loop($$$$ImageOps$tr$(_background_0))));
      const _c_1 = run_loop($Surface$flatten_tree$(_rest_0, run_loop($$$$ImageOps$bl$(_source_0)), run_loop($$$$ImageOps$bl$(_background_0))));
      const _d_1 = run_loop($Surface$flatten_tree$(_rest_0, run_loop($$$$ImageOps$br$(_source_0)), run_loop($$$$ImageOps$br$(_background_0))));
      return run_jump($$$$ImageOps$quad$, [_a_1, _b_1, _c_1, _d_1]);
    }
  }
}

function $Surface$flatten$(_surface_0, _background_0) {
  const _depth_0 = _surface_0["depth"];
  const _size_0 = _surface_0["size"];
  const _pixels_0 = _surface_0["pixels"];
  return run_jump($Surface$flatten_tree$, [_depth_0, _pixels_0, _background_0]);
}

function $composite$(_patch_0, _depth_0, _target_0) {
  const _patch_depth_0 = _patch_0["depth"];
  const _size_0 = _patch_0["size"];
  const _bounds_0 = _patch_0["bounds"];
  const _colors_0 = _patch_0["colors"];
  const _mask_0 = _patch_0["mask"];
  return run_jump($Surface$merge_tree$, [_depth_0, {$: "Over"}, run_loop($Surface$from_planes$(_depth_0, _colors_0, _mask_0)), _target_0]);
}

function $glyph$(_placed_0, _depth_0, _size_0, _color_0, _clip_0, _target_0) {
  const _x_0 = _placed_0["x"];
  const _y_0 = _placed_0["y"];
  const _t_0 = _placed_0["glyph"];
  const _advance_0 = _t_0["advance"];
  const _left_0 = _t_0["left"];
  const _top_0 = _t_0["top"];
  const _source_depth_0 = _t_0["depth"];
  const _source_size_0 = _t_0["size"];
  const _coverage_0 = _t_0["coverage"];
  return run_jump($composite$, [run_loop($PreparedSprite$prepare$(_depth_0, _size_0, _source_depth_0, _source_size_0, run_loop($$$$Glyph$translate$(_x_0, _left_0)), run_loop($$$$Glyph$translate$(_y_0, _top_0)), {$: "Pix", ["color"]: _color_0}, _coverage_0, _clip_0)), _depth_0, _target_0]);
}

function $run$(_glyphs_0, _depth_0, _size_0, _color_0, _clip_0, _target_0) {
  if (_glyphs_0.$ === "Nil") {
    return _target_0;
  } else {
    const _head_0 = _glyphs_0["head"];
    const _tail_0 = _glyphs_0["tail"];
    return run_jump($run$, [_tail_0, _depth_0, _size_0, _color_0, _clip_0, run_loop($glyph$(_head_0, _depth_0, _size_0, _color_0, _clip_0, _target_0))]);
  }
}

function $prepare$(_glyphs_0, _depth_0, _color_0, _clip_0) {
  const _size_0 = (_depth_0 >= 32n ? 0 : (1 << Number(_depth_0)) >>> 0);
  return {$: "Surface", ["depth"]: _depth_0, ["size"]: _size_0, ["pixels"]: run_loop($run$(_glyphs_0, _depth_0, _size_0, _color_0, _clip_0, {$: "Pix", ["color"]: 0}))};
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

function $$$$ImageView$sample$(_view_0, _x_0, _y_0) {
  const _depth_0 = _view_0["depth"];
  const _size_0 = _view_0["size"];
  const _sx_0 = _view_0["x"];
  const _sy_0 = _view_0["y"];
  const _pixels_0 = _view_0["pixels"];
  return run_jump($$$$$$$pixels$Pixel$sample_xy$, [_depth_0, ((_x_0 - _sx_0) >>> 0), ((_y_0 - _sy_0) >>> 0), _pixels_0]);
}

function $$$$Color$red$(_c_0) {
  const _x_0 = (16n >= 32n ? 0 : (_c_0 >>> Number(16n)) >>> 0);
  return ((_x_0 & 255) >>> 0);
}

function $$$$MaskedStampKernel$prepare$(_x_0, _y_0, _size_0, _colors_0, _mask_0) {
  return run_jump($$$$MaskedStampKernel$outside_case$, [run_loop($$$$ImageView$outside$(_mask_0, _x_0, _y_0, _size_0)), _x_0, _y_0, _size_0, _colors_0, _mask_0]);
}

function $Bool$not$(_b_0) {
  if (!_b_0) {
    return true;
  } else {
    return false;
  }
}

function $$$$Rect$overlaps$(_a_0, _b_0) {
  return run_jump($Bool$not$, [run_loop($$$$Rect$is_empty$(run_loop($$$$Rect$intersect$(_a_0, _b_0))))]);
}

function $$$$Rect$cell$(_x_0, _y_0, _size_0) {
  return {$: "Box", ["left"]: _x_0, ["top"]: _y_0, ["right"]: ((_x_0 + _size_0) >>> 0), ["bottom"]: ((_y_0 + _size_0) >>> 0)};
}

function $$$$Rect$contains$(_a_0, _b_0) {
  const _x_0 = run_loop($$$$Rect$is_empty$(_b_0));
  const _x_1 = run_loop($Bool$and$(run_loop($Bool$not$(run_loop($$$$Rect$is_empty$(_a_0)))), run_loop($$$$Rect$contains_parts$(_a_0, _b_0))));
  return (_x_0 || _x_1);
}

function $$$$Rect$intersect$(_a_0, _b_0) {
  const _al_0 = _a_0["left"];
  const _at_0 = _a_0["top"];
  const _ar_0 = _a_0["right"];
  const _ab_0 = _a_0["bottom"];
  const _bl_0 = _b_0["left"];
  const _bt_0 = _b_0["top"];
  const _br_0 = _b_0["right"];
  const _bb_0 = _b_0["bottom"];
  return {$: "Box", ["left"]: run_loop($U32$max$(_al_0, _bl_0)), ["top"]: run_loop($U32$max$(_at_0, _bt_0)), ["right"]: run_loop($U32$min$(_ar_0, _br_0)), ["bottom"]: run_loop($U32$min$(_ab_0, _bb_0))};
}

function $$$$Rect$sprite$(_size_0, _left_0, _top_0, _span_0) {
  return run_jump($$$$Rect$sprite_valid$, [run_loop($Bool$and$(run_loop($Bool$and$(run_loop($$$$Shapes$valid_coord$(_left_0)), run_loop($$$$Shapes$valid_coord$(_top_0)))), run_loop($Bool$and$((_size_0 <= 4096), (_span_0 <= 4096))))), _size_0, run_loop($$$$Shapes$biased$(_left_0)), run_loop($$$$Shapes$biased$(_top_0)), _span_0]);
}

function $$$$Rect$is_empty$(_box_0) {
  const _left_0 = _box_0["left"];
  const _top_0 = _box_0["top"];
  const _right_0 = _box_0["right"];
  const _bottom_0 = _box_0["bottom"];
  const _x_0 = (_left_0 >= _right_0);
  const _x_1 = (_top_0 >= _bottom_0);
  return (_x_0 || _x_1);
}

function $$$$Rect$screen$(_size_0) {
  return {$: "Box", ["left"]: 0, ["top"]: 0, ["right"]: _size_0, ["bottom"]: _size_0};
}

function $$$$Shapes$biased$(_c_0) {
  if (_c_0.$ === "Pos") {
    const _value_0 = _c_0["value"];
    return ((4096 + _value_0) >>> 0);
  } else {
    const _magnitude_0 = _c_0["magnitude"];
    return ((4096 - _magnitude_0) >>> 0);
  }
}

function $$$$TileRaster$masked$(_depth_0, _source_0, _mask_0, _opacity_0, _target_0) {
  if (_depth_0 === 0n) {
    if (_mask_0.$ === "Pix") {
      const _coverage_0 = _mask_0["color"];
      return run_jump($$$$TileRaster$over$, [0n, _source_0, run_loop($$$$MaskedLayer$effective$(run_loop($$$$Color$red$(_coverage_0)), _opacity_0)), _target_0]);
    } else {
      const _a_0 = _mask_0["tl"];
      const _b_0 = _mask_0["tr"];
      const _c_0 = _mask_0["bl"];
      const _d_0 = _mask_0["br"];
      return _target_0;
    }
  } else {
    const _rest_0 = (_depth_0 - 1n);
    if (_mask_0.$ === "Pix") {
      const _coverage_1 = _mask_0["color"];
      return run_jump($$$$TileRaster$over$, [nat_chk(_rest_0 + 1n), _source_0, run_loop($$$$MaskedLayer$effective$(run_loop($$$$Color$red$(_coverage_1)), _opacity_0)), _target_0]);
    } else {
      const _aa_0 = _mask_0["tl"];
      const _bb_0 = _mask_0["tr"];
      const _cc_0 = _mask_0["bl"];
      const _dd_0 = _mask_0["br"];
      const _a_1 = run_loop($$$$TileRaster$masked$(_rest_0, run_loop($$$$ImageOps$tl$(_source_0)), _aa_0, _opacity_0, run_loop($$$$ImageOps$tl$(_target_0))));
      const _b_1 = run_loop($$$$TileRaster$masked$(_rest_0, run_loop($$$$ImageOps$tr$(_source_0)), _bb_0, _opacity_0, run_loop($$$$ImageOps$tr$(_target_0))));
      const _c_1 = run_loop($$$$TileRaster$masked$(_rest_0, run_loop($$$$ImageOps$bl$(_source_0)), _cc_0, _opacity_0, run_loop($$$$ImageOps$bl$(_target_0))));
      const _d_1 = run_loop($$$$TileRaster$masked$(_rest_0, run_loop($$$$ImageOps$br$(_source_0)), _dd_0, _opacity_0, run_loop($$$$ImageOps$br$(_target_0))));
      return {$: "Qua", ["tl"]: _a_1, ["tr"]: _b_1, ["bl"]: _c_1, ["br"]: _d_1};
    }
  }
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

function $$$$Glyph$translate$(_origin_0, _offset_0) {
  return run_jump($$$$Glyph$offset_valid$, [run_loop($Bool$and$(run_loop($$$$Shapes$valid_coord$(_origin_0)), run_loop($$$$Shapes$valid_coord$(_offset_0)))), _origin_0, _offset_0]);
}

function $$$$ImageOps$quad_case$(_same_0, _a_0, _b_0, _c_0, _d_0) {
  if (_same_0) {
    return {$: "Pix", ["color"]: _a_0};
  } else {
    return {$: "Qua", ["tl"]: {$: "Pix", ["color"]: _a_0}, ["tr"]: {$: "Pix", ["color"]: _b_0}, ["bl"]: {$: "Pix", ["color"]: _c_0}, ["br"]: {$: "Pix", ["color"]: _d_0}};
  }
}

function $$$$$$$pixels$Pixel$sample_xy$(_depth_0, _x_0, _y_0, _image_0) {
  if (_depth_0 === 0n) {
    if (_image_0.$ === "Pix") {
      const _color_0 = _image_0["color"];
      return _color_0;
    } else {
      const _tl_0 = _image_0["tl"];
      const _tr_0 = _image_0["tr"];
      const _bl_0 = _image_0["bl"];
      const _br_0 = _image_0["br"];
      return 0;
    }
  } else {
    const _rest_0 = (_depth_0 - 1n);
    if (_image_0.$ === "Pix") {
      const _color_1 = _image_0["color"];
      return _color_1;
    } else {
      const _tl_1 = _image_0["tl"];
      const _tr_1 = _image_0["tr"];
      const _bl_1 = _image_0["bl"];
      const _br_1 = _image_0["br"];
      const _half_0 = (_rest_0 >= 32n ? 0 : (1 << Number(_rest_0)) >>> 0);
      const _horizontal_0 = (_x_0 >= _half_0);
      const _vertical_0 = (_y_0 >= _half_0);
      const _top_0 = run_loop($Bool$pick$(_horizontal_0, _tr_1, _tl_1));
      const _bottom_0 = run_loop($Bool$pick$(_horizontal_0, _br_1, _bl_1));
      const _child_0 = run_loop($Bool$pick$(_vertical_0, _bottom_0, _top_0));
      const _next_x_0 = run_loop($Bool$pick$(_horizontal_0, ((_x_0 - _half_0) >>> 0), _x_0));
      const _next_y_0 = run_loop($Bool$pick$(_vertical_0, ((_y_0 - _half_0) >>> 0), _y_0));
      return run_jump($$$$$$$pixels$Pixel$sample_xy$, [_rest_0, _next_x_0, _next_y_0, _child_0]);
    }
  }
}

function $$$$MaskedStampKernel$outside_case$(_excluded_0, _x_0, _y_0, _size_0, _colors_0, _mask_0) {
  if (_excluded_0) {
    return {$: "Unchanged"};
  } else {
    return run_jump($$$$MaskedStampKernel$mask_focused$, [_x_0, _y_0, _size_0, _colors_0, run_loop($$$$ImageView$narrow$(_mask_0, _x_0, _y_0, _size_0))]);
  }
}

function $$$$ImageView$outside$(_view_0, _x_0, _y_0, _size_0) {
  const _depth_0 = _view_0["depth"];
  const _span_0 = _view_0["size"];
  const _sx_0 = _view_0["x"];
  const _sy_0 = _view_0["y"];
  const _pixels_0 = _view_0["pixels"];
  const _x_1 = ((_sx_0 + _span_0) >>> 0);
  const _x_2 = ((_x_0 + _size_0) >>> 0);
  const _x_3 = (_x_0 >= _x_1);
  const _x_4 = (_x_2 <= _sx_0);
  const _x_5 = ((_sy_0 + _span_0) >>> 0);
  const _x_6 = ((_y_0 + _size_0) >>> 0);
  const _x_7 = (_y_0 >= _x_5);
  const _x_8 = (_x_6 <= _sy_0);
  const _x_9 = (_x_3 || _x_4);
  const _x_10 = (_x_7 || _x_8);
  return (_x_9 || _x_10);
}

function $$$$Rect$contains_parts$(_a_0, _b_0) {
  const _al_0 = _a_0["left"];
  const _at_0 = _a_0["top"];
  const _ar_0 = _a_0["right"];
  const _ab_0 = _a_0["bottom"];
  const _bl_0 = _b_0["left"];
  const _bt_0 = _b_0["top"];
  const _br_0 = _b_0["right"];
  const _bb_0 = _b_0["bottom"];
  return run_jump($Bool$and$, [run_loop($Bool$and$((_al_0 <= _bl_0), (_at_0 <= _bt_0))), run_loop($Bool$and$((_ar_0 >= _br_0), (_ab_0 >= _bb_0)))]);
}

function $U32$max$(_a_0, _b_0) {
  return run_jump($Bool$pick$, [(_a_0 < _b_0), _b_0, _a_0]);
}

function $$$$Rect$sprite_valid$(_valid_0, _size_0, _sx_0, _sy_0, _span_0) {
  if (!_valid_0) {
    return run_jump($$$$Rect$empty$, []);
  } else {
    const _x_0 = run_loop($U32$max$(_sx_0, 4096));
    const _x_1 = run_loop($U32$max$(_sy_0, 4096));
    const _x_2 = run_loop($U32$max$(((_sx_0 + _span_0) >>> 0), 4096));
    const _x_3 = run_loop($U32$max$(((_sy_0 + _span_0) >>> 0), 4096));
    return run_jump($$$$Rect$intersect$, [run_loop($$$$Rect$screen$(_size_0)), {$: "Box", ["left"]: ((_x_0 - 4096) >>> 0), ["top"]: ((_x_1 - 4096) >>> 0), ["right"]: ((_x_2 - 4096) >>> 0), ["bottom"]: ((_x_3 - 4096) >>> 0)}]);
  }
}

function $$$$Shapes$valid_coord$(_c_0) {
  if (_c_0.$ === "Pos") {
    const _value_0 = _c_0["value"];
    return (_value_0 <= 4096);
  } else {
    const _magnitude_0 = _c_0["magnitude"];
    return (_magnitude_0 <= 4096);
  }
}

function $$$$TileRaster$over$(_depth_0, _source_0, _alpha_0, _target_0) {
  return run_jump($$$$TileRaster$over_case$, [(_alpha_0 === 0), (_alpha_0 >= 255), _depth_0, _source_0, _alpha_0, _target_0]);
}

function $$$$MaskedLayer$effective$(_alpha_0, _opacity_0) {
  const _x_0 = run_loop($U32$min$(_opacity_0, 255));
  const _x_1 = (Math.imul(_alpha_0, _x_0) >>> 0);
  const _x_2 = ((_x_1 + 127) >>> 0);
  return (255 === 0 ? 0 : (_x_2 / 255) >>> 0);
}

function $Bool$pick$(_c_0, _a_0, _b_0) {
  if (!_c_0) {
    return _b_0;
  } else {
    return _a_0;
  }
}

function $$$$Glyph$offset_valid$(_valid_0, _origin_0, _offset_0) {
  if (!_valid_0) {
    return {$: "Pos", ["value"]: 4097};
  } else {
    const _x_0 = run_loop($$$$Shapes$biased$(_origin_0));
    const _x_1 = run_loop($$$$Shapes$biased$(_offset_0));
    const _sum_0 = ((_x_0 + _x_1) >>> 0);
    return run_jump($$$$Glyph$offset_sum$, [run_loop($Bool$and$((_sum_0 >= 4096), (_sum_0 <= 12288))), _sum_0]);
  }
}

function $$$$MaskedStampKernel$mask_focused$(_x_0, _y_0, _size_0, _colors_0, _mask_0) {
  return run_jump($$$$MaskedStampKernel$mask_case$, [run_loop($$$$MaskedLayer$transparent$(run_loop($$$$ImageView$pixels$(_mask_0)))), _x_0, _y_0, _size_0, _colors_0, _mask_0]);
}

function $$$$ImageView$narrow$(_view_0, _x_0, _y_0, _size_0) {
  const _depth_0 = _view_0["depth"];
  const _span_0 = _view_0["size"];
  const _sx_0 = _view_0["x"];
  const _sy_0 = _view_0["y"];
  const _t_0 = _view_0["pixels"];
  if (_t_0.$ === "Pix") {
    const _color_0 = _t_0["color"];
    return {$: "View", ["depth"]: _depth_0, ["size"]: _span_0, ["x"]: _sx_0, ["y"]: _sy_0, ["pixels"]: {$: "Pix", ["color"]: _color_0}};
  } else {
    return run_jump($$$$ImageView$focus$, [_depth_0, _span_0, _sx_0, _sy_0, _x_0, _y_0, _size_0, _t_0, run_loop($$$$ImageView$child_choice$(_depth_0, _sx_0, _sy_0, _span_0, _x_0, _y_0, _size_0, _t_0))]);
  }
}

function $$$$Rect$empty$() {
  return {$: "Box", ["left"]: 0, ["top"]: 0, ["right"]: 0, ["bottom"]: 0};
}

function $$$$TileRaster$over_case$(_empty_0, _full_0, _depth_0, _source_0, _alpha_0, _target_0) {
  if (_empty_0) {
    return _target_0;
  } else {
    if (_full_0) {
      return _source_0;
    } else {
      return run_jump($$$$TileRaster$blend$, [_depth_0, _source_0, _alpha_0, _target_0]);
    }
  }
}

function $$$$Glyph$offset_sum$(_valid_0, _sum_0) {
  if (!_valid_0) {
    return {$: "Pos", ["value"]: 4097};
  } else {
    return run_jump($$$$Glyph$from_biased$, [((_sum_0 - 4096) >>> 0)]);
  }
}

function $$$$MaskedStampKernel$mask_case$(_empty_0, _x_0, _y_0, _size_0, _colors_0, _mask_0) {
  if (_empty_0) {
    return {$: "Unchanged"};
  } else {
    return run_jump($$$$MaskedStampKernel$pair$, [_x_0, _y_0, _size_0, run_loop($$$$ImageView$narrow$(_colors_0, _x_0, _y_0, _size_0)), _mask_0]);
  }
}

function $$$$MaskedLayer$transparent$(_mask_0) {
  if (_mask_0.$ === "Pix") {
    const _color_0 = _mask_0["color"];
    const _x_0 = run_loop($$$$Color$red$(_color_0));
    return (_x_0 === 0);
  } else {
    const _tl_0 = _mask_0["tl"];
    const _tr_0 = _mask_0["tr"];
    const _bl_0 = _mask_0["bl"];
    const _br_0 = _mask_0["br"];
    return false;
  }
}

function $$$$ImageView$pixels$(_view_0) {
  const _depth_0 = _view_0["depth"];
  const _size_0 = _view_0["size"];
  const _x_0 = _view_0["x"];
  const _y_0 = _view_0["y"];
  const _pixels_0 = _view_0["pixels"];
  return _pixels_0;
}

function $$$$ImageView$focus$(_depth_0, _span_0, _sx_0, _sy_0, _x_0, _y_0, _size_0, _pixels_0, _choice_0) {
  if (_depth_0 === 0n) {
    return {$: "View", ["depth"]: 0n, ["size"]: _span_0, ["x"]: _sx_0, ["y"]: _sy_0, ["pixels"]: _pixels_0};
  } else {
    const _rest_0 = (_depth_0 - 1n);
    if (_pixels_0.$ === "Pix") {
      const _color_0 = _pixels_0["color"];
      return {$: "View", ["depth"]: nat_chk(_rest_0 + 1n), ["size"]: _span_0, ["x"]: _sx_0, ["y"]: _sy_0, ["pixels"]: {$: "Pix", ["color"]: _color_0}};
    } else {
      const _tl_0 = _pixels_0["tl"];
      const _tr_0 = _pixels_0["tr"];
      const _bl_0 = _pixels_0["bl"];
      const _br_0 = _pixels_0["br"];
      if (_choice_0.$ === "Stay") {
        return {$: "View", ["depth"]: nat_chk(_rest_0 + 1n), ["size"]: _span_0, ["x"]: _sx_0, ["y"]: _sy_0, ["pixels"]: {$: "Qua", ["tl"]: _tl_0, ["tr"]: _tr_0, ["bl"]: _bl_0, ["br"]: _br_0}};
      } else if (_choice_0.$ === "TL") {
        const _half_0 = (2 === 0 ? 0 : (_span_0 / 2) >>> 0);
        const _xx_0 = _sx_0;
        const _yy_0 = _sy_0;
        return run_jump($$$$ImageView$focus$, [_rest_0, _half_0, _xx_0, _yy_0, _x_0, _y_0, _size_0, _tl_0, run_loop($$$$ImageView$child_choice$(_rest_0, _xx_0, _yy_0, _half_0, _x_0, _y_0, _size_0, _tl_0))]);
      } else if (_choice_0.$ === "TR") {
        const _half_1 = (2 === 0 ? 0 : (_span_0 / 2) >>> 0);
        const _xx_1 = ((_sx_0 + _half_1) >>> 0);
        const _yy_1 = _sy_0;
        return run_jump($$$$ImageView$focus$, [_rest_0, _half_1, _xx_1, _yy_1, _x_0, _y_0, _size_0, _tr_0, run_loop($$$$ImageView$child_choice$(_rest_0, _xx_1, _yy_1, _half_1, _x_0, _y_0, _size_0, _tr_0))]);
      } else if (_choice_0.$ === "BL") {
        const _half_2 = (2 === 0 ? 0 : (_span_0 / 2) >>> 0);
        const _xx_2 = _sx_0;
        const _yy_2 = ((_sy_0 + _half_2) >>> 0);
        return run_jump($$$$ImageView$focus$, [_rest_0, _half_2, _xx_2, _yy_2, _x_0, _y_0, _size_0, _bl_0, run_loop($$$$ImageView$child_choice$(_rest_0, _xx_2, _yy_2, _half_2, _x_0, _y_0, _size_0, _bl_0))]);
      } else {
        const _half_3 = (2 === 0 ? 0 : (_span_0 / 2) >>> 0);
        const _xx_3 = ((_sx_0 + _half_3) >>> 0);
        const _yy_3 = ((_sy_0 + _half_3) >>> 0);
        return run_jump($$$$ImageView$focus$, [_rest_0, _half_3, _xx_3, _yy_3, _x_0, _y_0, _size_0, _br_0, run_loop($$$$ImageView$child_choice$(_rest_0, _xx_3, _yy_3, _half_3, _x_0, _y_0, _size_0, _br_0))]);
      }
    }
  }
}

function $$$$ImageView$child_choice$(_depth_0, _sx_0, _sy_0, _span_0, _x_0, _y_0, _size_0, _pixels_0) {
  if (_depth_0 === 0n) {
    return {$: "Stay"};
  } else {
    const _rest_0 = (_depth_0 - 1n);
    if (_pixels_0.$ === "Pix") {
      const _color_0 = _pixels_0["color"];
      return {$: "Stay"};
    } else {
      const _tl_0 = _pixels_0["tl"];
      const _tr_0 = _pixels_0["tr"];
      const _bl_0 = _pixels_0["bl"];
      const _br_0 = _pixels_0["br"];
      return run_jump($$$$ImageView$choose$, [_sx_0, _sy_0, _span_0, _x_0, _y_0, _size_0]);
    }
  }
}

function $$$$TileRaster$blend$(_depth_0, _source_0, _alpha_0, _target_0) {
  if (_depth_0 === 0n) {
    if (_source_0.$ === "Pix") {
      const _ink_0 = _source_0["color"];
      if (_target_0.$ === "Pix") {
        const _background_0 = _target_0["color"];
        return {$: "Pix", ["color"]: run_loop($$$$Color$over$(_ink_0, _background_0, _alpha_0))};
      } else {
        return _target_0;
      }
    } else {
      return _target_0;
    }
  } else {
    const _rest_0 = (_depth_0 - 1n);
    if (_source_0.$ === "Pix") {
      const _ink_1 = _source_0["color"];
      if (_target_0.$ === "Pix") {
        const _background_1 = _target_0["color"];
        return {$: "Pix", ["color"]: run_loop($$$$Color$over$(_ink_1, _background_1, _alpha_0))};
      } else {
        const _a_0 = run_loop($$$$TileRaster$blend$(_rest_0, run_loop($$$$ImageOps$tl$({$: "Pix", ["color"]: _ink_1})), _alpha_0, run_loop($$$$ImageOps$tl$(_target_0))));
        const _b_0 = run_loop($$$$TileRaster$blend$(_rest_0, run_loop($$$$ImageOps$tr$({$: "Pix", ["color"]: _ink_1})), _alpha_0, run_loop($$$$ImageOps$tr$(_target_0))));
        const _c_0 = run_loop($$$$TileRaster$blend$(_rest_0, run_loop($$$$ImageOps$bl$({$: "Pix", ["color"]: _ink_1})), _alpha_0, run_loop($$$$ImageOps$bl$(_target_0))));
        const _d_0 = run_loop($$$$TileRaster$blend$(_rest_0, run_loop($$$$ImageOps$br$({$: "Pix", ["color"]: _ink_1})), _alpha_0, run_loop($$$$ImageOps$br$(_target_0))));
        return {$: "Qua", ["tl"]: _a_0, ["tr"]: _b_0, ["bl"]: _c_0, ["br"]: _d_0};
      }
    } else {
      const _a_1 = run_loop($$$$TileRaster$blend$(_rest_0, run_loop($$$$ImageOps$tl$(_source_0)), _alpha_0, run_loop($$$$ImageOps$tl$(_target_0))));
      const _b_1 = run_loop($$$$TileRaster$blend$(_rest_0, run_loop($$$$ImageOps$tr$(_source_0)), _alpha_0, run_loop($$$$ImageOps$tr$(_target_0))));
      const _c_1 = run_loop($$$$TileRaster$blend$(_rest_0, run_loop($$$$ImageOps$bl$(_source_0)), _alpha_0, run_loop($$$$ImageOps$bl$(_target_0))));
      const _d_1 = run_loop($$$$TileRaster$blend$(_rest_0, run_loop($$$$ImageOps$br$(_source_0)), _alpha_0, run_loop($$$$ImageOps$br$(_target_0))));
      return {$: "Qua", ["tl"]: _a_1, ["tr"]: _b_1, ["bl"]: _c_1, ["br"]: _d_1};
    }
  }
}

function $$$$Glyph$from_biased$(_value_0) {
  return run_jump($$$$Glyph$bounded_case$, [(_value_0 <= 8192), _value_0]);
}

function $$$$MaskedStampKernel$pair$(_x_0, _y_0, _size_0, _colors_0, _mask_0) {
  return run_jump($$$$MaskedStampKernel$pair_case$, [run_loop($Bool$and$(run_loop($$$$ImageView$matches$(_colors_0, _x_0, _y_0, _size_0)), run_loop($$$$ImageView$matches$(_mask_0, _x_0, _y_0, _size_0)))), _colors_0, _mask_0]);
}

function $$$$ImageView$choose$(_sx_0, _sy_0, _span_0, _x_0, _y_0, _size_0) {
  const _half_0 = (2 === 0 ? 0 : (_span_0 / 2) >>> 0);
  return run_jump($$$$ImageView$choose_axes$, [run_loop($$$$ImageView$axis$(_sx_0, _half_0, _x_0, _size_0)), run_loop($$$$ImageView$axis$(_sy_0, _half_0, _y_0, _size_0))]);
}

function $$$$Color$over$(_src_0, _dest_0, _opacity_0) {
  return run_jump($$$$Color$over_case$, [(_opacity_0 === 0), (_opacity_0 >= 255), _src_0, _dest_0, _opacity_0]);
}

function $$$$Glyph$bounded_case$(_valid_0, _value_0) {
  if (!_valid_0) {
    return {$: "Pos", ["value"]: 4097};
  } else {
    return run_jump($$$$Glyph$biased_case$, [(_value_0 < 4096), _value_0]);
  }
}

function $$$$MaskedStampKernel$pair_case$(_aligned_0, _colors_0, _mask_0) {
  if (_aligned_0) {
    return {$: "Aligned", ["colors"]: run_loop($$$$ImageView$pixels$(_colors_0)), ["mask"]: run_loop($$$$ImageView$pixels$(_mask_0))};
  } else {
    return {$: "Split", ["colors"]: _colors_0, ["mask"]: _mask_0};
  }
}

function $$$$ImageView$matches$(_view_0, _x_0, _y_0, _size_0) {
  const _depth_0 = _view_0["depth"];
  const _span_0 = _view_0["size"];
  const _sx_0 = _view_0["x"];
  const _sy_0 = _view_0["y"];
  const _pixels_0 = _view_0["pixels"];
  return run_jump($Bool$and$, [run_loop($$$$ImageView$contains$(_x_0, _y_0, _size_0, _sx_0, _sy_0, _span_0)), run_loop($$$$ImageView$shape_matches$(_sx_0, _sy_0, _span_0, _x_0, _y_0, _size_0, _pixels_0))]);
}

function $$$$ImageView$choose_axes$(_horizontal_0, _vertical_0) {
  if (_horizontal_0 == 1) {
    if (_vertical_0 == 1) {
      return {$: "TL"};
    } else if ((_vertical_0 & 1) == 1) {
      const _77_0 = u32_to_word(_vertical_0)["tail"]["head"];
      const _78_0 = u32_to_word(_vertical_0)["tail"]["tail"];
      return {$: "Stay"};
    } else if (_vertical_0 == 2) {
      return {$: "BL"};
    } else {
      const _139_0 = u32_to_word(_vertical_0)["tail"]["head"];
      const _140_0 = u32_to_word(_vertical_0)["tail"]["tail"];
      return {$: "Stay"};
    }
  } else if ((_horizontal_0 & 1) == 1) {
    const _12_0 = u32_to_word(_horizontal_0)["tail"]["head"];
    const _13_0 = u32_to_word(_horizontal_0)["tail"]["tail"];
    return {$: "Stay"};
  } else if (_horizontal_0 == 2) {
    if (_vertical_0 == 1) {
      return {$: "TR"};
    } else if ((_vertical_0 & 1) == 1) {
      const _266_0 = u32_to_word(_vertical_0)["tail"]["head"];
      const _267_0 = u32_to_word(_vertical_0)["tail"]["tail"];
      return {$: "Stay"};
    } else if (_vertical_0 == 2) {
      return {$: "BR"};
    } else {
      const _328_0 = u32_to_word(_vertical_0)["tail"]["head"];
      const _329_0 = u32_to_word(_vertical_0)["tail"]["tail"];
      return {$: "Stay"};
    }
  } else {
    const _201_0 = u32_to_word(_horizontal_0)["tail"]["head"];
    const _202_0 = u32_to_word(_horizontal_0)["tail"]["tail"];
    return {$: "Stay"};
  }
}

function $$$$ImageView$axis$(_source_0, _half_0, _start_0, _size_0) {
  const _end_0 = ((_start_0 + _size_0) >>> 0);
  const _middle_0 = ((_source_0 + _half_0) >>> 0);
  const _x_0 = ((_middle_0 + _half_0) >>> 0);
  return run_jump($$$$ImageView$axis_case$, [run_loop($Bool$and$((_start_0 >= _source_0), (_end_0 <= _x_0))), (_end_0 <= _middle_0), (_start_0 >= _middle_0)]);
}

function $$$$Color$over_case$(_empty_0, _full_0, _src_0, _dest_0, _opacity_0) {
  if (_empty_0) {
    return _dest_0;
  } else {
    if (_full_0) {
      return _src_0;
    } else {
      return run_jump($$$$Color$over_partial$, [_src_0, _dest_0, _opacity_0]);
    }
  }
}

function $$$$Glyph$biased_case$(_negative_0, _value_0) {
  if (_negative_0) {
    return {$: "Neg", ["magnitude"]: ((4096 - _value_0) >>> 0)};
  } else {
    return {$: "Pos", ["value"]: ((_value_0 - 4096) >>> 0)};
  }
}

function $$$$ImageView$contains$(_x_0, _y_0, _size_0, _sx_0, _sy_0, _span_0) {
  const _x_1 = ((_x_0 + _size_0) >>> 0);
  const _x_2 = ((_sx_0 + _span_0) >>> 0);
  const _x_3 = ((_y_0 + _size_0) >>> 0);
  const _x_4 = ((_sy_0 + _span_0) >>> 0);
  return run_jump($Bool$and$, [run_loop($Bool$and$((_x_0 >= _sx_0), (_y_0 >= _sy_0))), run_loop($Bool$and$((_x_1 <= _x_2), (_x_3 <= _x_4)))]);
}

function $$$$ImageView$shape_matches$(_sx_0, _sy_0, _span_0, _x_0, _y_0, _size_0, _pixels_0) {
  if (_pixels_0.$ === "Pix") {
    const _color_0 = _pixels_0["color"];
    return true;
  } else {
    const _tl_0 = _pixels_0["tl"];
    const _tr_0 = _pixels_0["tr"];
    const _bl_0 = _pixels_0["bl"];
    const _br_0 = _pixels_0["br"];
    return run_jump($Bool$and$, [run_loop($Bool$and$((_sx_0 === _x_0), (_sy_0 === _y_0))), (_span_0 === _size_0)]);
  }
}

function $$$$ImageView$axis_case$(_valid_0, _low_0, _high_0) {
  if (!_valid_0) {
    return 0;
  } else {
    if (_low_0) {
      return 1;
    } else {
      if (_high_0) {
        return 2;
      } else {
        return 0;
      }
    }
  }
}

function $$$$Color$over_partial$(_src_0, _dest_0, _opacity_0) {
  const _alpha_0 = run_loop($U32$min$(_opacity_0, 255));
  return run_jump($$$$Color$rgb$, [run_loop($$$$Color$channel$(run_loop($$$$Color$red$(_src_0)), run_loop($$$$Color$red$(_dest_0)), _alpha_0)), run_loop($$$$Color$channel$(run_loop($$$$Color$green$(_src_0)), run_loop($$$$Color$green$(_dest_0)), _alpha_0)), run_loop($$$$Color$channel$(run_loop($$$$Color$blue$(_src_0)), run_loop($$$$Color$blue$(_dest_0)), _alpha_0))]);
}

function $$$$Color$channel$(_source_0, _dest_0, _alpha_0) {
  const _x_0 = ((255 - _alpha_0) >>> 0);
  const _x_1 = (Math.imul(_source_0, _alpha_0) >>> 0);
  const _x_2 = (Math.imul(_dest_0, _x_0) >>> 0);
  const _x_3 = ((_x_1 + _x_2) >>> 0);
  const _x_4 = ((_x_3 + 127) >>> 0);
  return (255 === 0 ? 0 : (_x_4 / 255) >>> 0);
}
export default {
  "PreparedSprite.join": run_lib($PreparedSprite$join$, 4),
  "PreparedSprite.leaf_case": run_lib($PreparedSprite$leaf_case$, 5),
  "PreparedSprite.leaf": run_lib($PreparedSprite$leaf$, 4),
  "PreparedSprite.focused": run_lib($PreparedSprite$focused$, 5),
  "PreparedSprite.region": run_lib($PreparedSprite$region$, 9),
  "PreparedSprite.finish": run_lib($PreparedSprite$finish$, 4),
  "PreparedSprite.prepare": run_lib($PreparedSprite$prepare$, 9),
  "PreparedSprite.draw_zero": run_lib($PreparedSprite$draw_zero$, 4),
  "PreparedSprite.draw": run_lib($PreparedSprite$draw$, 3),
  "PreparedSprite.command": run_lib($PreparedSprite$command$, 2),
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
  "Surface.blank": run_lib($Surface$blank$, 1),
  "Surface.pixels": run_lib($Surface$pixels$, 1),
  "Surface.size": run_lib($Surface$size$, 1),
  "Surface.from_planes": run_lib($Surface$from_planes$, 3),
  "Surface.from_texture": run_lib($Surface$from_texture$, 1),
  "Surface.masked": run_lib($Surface$masked$, 4),
  "Surface.opacity_tree": run_lib($Surface$opacity_tree$, 3),
  "Surface.opacity_case": run_lib($Surface$opacity_case$, 4),
  "Surface.opacity": run_lib($Surface$opacity$, 2),
  "Surface.merge_tree": run_lib($Surface$merge_tree$, 4),
  "Surface.merge_case": run_lib($Surface$merge_case$, 4),
  "Surface.merge": run_lib($Surface$merge$, 3),
  "Surface.plane": run_lib($Surface$plane$, 3),
  "Surface.texture": run_lib($Surface$texture$, 1),
  "Surface.flatten_tree": run_lib($Surface$flatten_tree$, 3),
  "Surface.flatten": run_lib($Surface$flatten$, 2),
  "composite": run_lib($composite$, 3),
  "glyph": run_lib($glyph$, 6),
  "run": run_lib($run$, 6),
  "prepare": run_lib($prepare$, 4),
};
