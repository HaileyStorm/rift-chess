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

function $brush$() {
  return {$: "Linear", ["x"]: 0, ["y"]: 0, ["dx"]: 32, ["dy"]: 0, ["inverse"]: 0.0009765625, ["stops"]: {$: "Stops", ["values"]: {$: "Con", ["head"]: {$: "Stop", ["position"]: 0, ["pixel"]: run_loop($$$$$$$third$Premul$straight$(4615871, 217))}, ["tail"]: {$: "Con", ["head"]: {$: "Stop", ["position"]: 65535, ["pixel"]: run_loop($$$$$$$third$Premul$straight$(16737600, 153))}, ["tail"]: {$: "Nil"}}}}, ["spread"]: {$: "Pad"}};
}

function $edges$() {
  const _outer_0 = run_loop($$$$$$$third$PathFill$join$(run_loop($$$$$$$third$PathFill$edge$({$: "Point", ["x"]: 3, ["y"]: 3}, {$: "Point", ["x"]: 29, ["y"]: 3})), run_loop($$$$$$$third$PathFill$join$(run_loop($$$$$$$third$PathFill$edge$({$: "Point", ["x"]: 29, ["y"]: 3}, {$: "Point", ["x"]: 26, ["y"]: 29})), run_loop($$$$$$$third$PathFill$join$(run_loop($$$$$$$third$PathFill$edge$({$: "Point", ["x"]: 26, ["y"]: 29}, {$: "Point", ["x"]: 4, ["y"]: 27})), run_loop($$$$$$$third$PathFill$edge$({$: "Point", ["x"]: 4, ["y"]: 27}, {$: "Point", ["x"]: 3, ["y"]: 3}))))))));
  const _inner_0 = run_loop($$$$$$$third$PathFill$join$(run_loop($$$$$$$third$PathFill$edge$({$: "Point", ["x"]: 11, ["y"]: 10}, {$: "Point", ["x"]: 13, ["y"]: 22})), run_loop($$$$$$$third$PathFill$join$(run_loop($$$$$$$third$PathFill$edge$({$: "Point", ["x"]: 13, ["y"]: 22}, {$: "Point", ["x"]: 23, ["y"]: 19})), run_loop($$$$$$$third$PathFill$edge$({$: "Point", ["x"]: 23, ["y"]: 19}, {$: "Point", ["x"]: 11, ["y"]: 10}))))));
  return run_jump($$$$$$$third$PathFill$join$, [_outer_0, _inner_0]);
}

function $commands$() {
  return {$: "Con", ["head"]: run_loop($$$$$$$third$Raster$command$(run_loop($$$$$$$third$Shape$rounded$(1, 1, 30, 31, 5)), {$: "Solid", ["pixel"]: run_loop($$$$$$$third$Premul$straight$(1390931, 223))}, {$: "Four"}, run_loop($$$$$$$Rect$screen$(32)))), ["tail"]: {$: "Con", ["head"]: run_loop($$$$$$$third$Raster$command$(run_loop($$$$$$$third$Shape$closed$(run_loop($edges$()), {$: "NonZero"})), run_loop($brush$()), {$: "Sixteen"}, {$: "Box", ["left"]: 2, ["top"]: 1, ["right"]: 31, ["bottom"]: 30})), ["tail"]: {$: "Con", ["head"]: run_loop($$$$$$$third$Raster$command$(run_loop($$$$$$$third$Shape$ellipse$(23, 9, 7, 6)), {$: "Solid", ["pixel"]: run_loop($$$$$$$third$Premul$straight$(11397887, 149))}, {$: "Sixteen"}, run_loop($$$$$$$Rect$screen$(32)))), ["tail"]: {$: "Nil"}}}};
}

function $draw$(_offload_0, _forks_0) {
  if (!_offload_0) {
    return run_jump($$$$$$$third$Raster$render$, [run_loop($$$$$$$third$Surface$blank$(5n)), run_loop($commands$()), _forks_0]);
  } else {
    return run_jump($$$$$$$third$Raster$offload$, [run_loop($$$$$$$third$Surface$blank$(5n)), run_loop($commands$()), _forks_0]);
  }
}

function $composite$(_halo_0, _surface_0) {
  if (_halo_0.$ === "None") {
    return {$: "Pix", ["color"]: 0};
  } else {
    const _t_0 = _halo_0["value"];
    const _depth_0 = _t_0["depth"];
    const _size_0 = _t_0["size"];
    const _halo_pixels_0 = _t_0["pixels"];
    return run_jump($$$$$$$third$Surface$flatten_tree$, [5n, run_loop($$$$$$$third$Surface$merge_tree$(5n, {$: "Over"}, run_loop($$$$$$$third$Surface$pixels$(run_loop($$$$$$$third$Surface$opacity$(_surface_0, 181)))), _halo_pixels_0)), {$: "Pix", ["color"]: 920338}]);
  }
}

function $render$(_forks_0, _offload_0) {
  const _surface_0 = run_loop($draw$(_offload_0, _forks_0));
  return run_jump($composite$, [run_loop($$$$$$$third$Effects$halo$(_surface_0, 3658495, 2, 2n, 143, {$: "Pos", ["value"]: 1}, {$: "Pos", ["value"]: 2})), _surface_0]);
}

function $pixels$(_count_0, _index_0, _image_0) {
  if (_count_0 === 0n) {
    return {$: "Nil"};
  } else {
    const _rest_0 = (_count_0 - 1n);
    return {$: "Con", ["head"]: run_loop($$$$$$$$$$pixels$Pixel$sample_xy$(5n, (32 === 0 ? _index_0 : _index_0 % 32), (32 === 0 ? 0 : (_index_0 / 32) >>> 0), _image_0)), ["tail"]: run_loop($pixels$(_rest_0, ((_index_0 + 1) >>> 0), _image_0))};
  }
}

function $main$() {
  return run_jump($pixels$, [BigInt(1024), 0, run_loop($render$(0n, false))]);
}

function $$$$$$$third$Premul$straight$(_rgb_0, _opacity_0) {
  const _a_0 = run_loop($U32$min$(_opacity_0, 255));
  return run_jump($$$$$$$third$Premul$pack$, [run_loop($$$$$$$third$Premul$mul$(run_loop($$$$$$$Color$red$(_rgb_0)), _a_0)), run_loop($$$$$$$third$Premul$mul$(run_loop($$$$$$$Color$green$(_rgb_0)), _a_0)), run_loop($$$$$$$third$Premul$mul$(run_loop($$$$$$$Color$blue$(_rgb_0)), _a_0)), _a_0]);
}

function $$$$$$$third$PathFill$join$(_left_0, _right_0) {
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
      return {$: "Join", ["left"]: _left_0, ["right"]: _right_0, ["extent"]: run_loop($$$$$$$third$PathFill$union_extent$(run_loop($$$$$$$third$PathFill$extent$(_left_0)), run_loop($$$$$$$third$PathFill$extent$(_right_0))))};
    }
  }
}

function $$$$$$$third$PathFill$edge$(_a_0, _b_0) {
  const _ax_0 = _a_0["x"];
  const _ay_0 = _a_0["y"];
  const _bx_0 = _b_0["x"];
  const _by_0 = _b_0["y"];
  return run_jump($$$$$$$third$PathFill$edge_case$, [run_loop($Bool$and$(run_loop($Bool$and$(run_loop($$$$$$$third$Brush$point$({$: "Point", ["x"]: _ax_0, ["y"]: _ay_0})), run_loop($$$$$$$third$Brush$point$({$: "Point", ["x"]: _bx_0, ["y"]: _by_0})))), (_ay_0 !== _by_0))), {$: "Point", ["x"]: _ax_0, ["y"]: _ay_0}, {$: "Point", ["x"]: _bx_0, ["y"]: _by_0}]);
}

function $$$$$$$third$Raster$command$(_shape_0, _brush_0, _quality_0, _clip_0) {
  return {$: "Command", ["shape"]: _shape_0, ["brush"]: _brush_0, ["quality"]: _quality_0, ["bounds"]: run_loop($$$$$$$Rect$intersect$(run_loop($$$$$$$third$Shape$bounds$(_shape_0)), _clip_0))};
}

function $$$$$$$third$Shape$rounded$(_l_0, _t_0, _r_0, _b_0, _radius_0) {
  const _x_0 = Math.fround(_radius_0 * 2);
  const _x_1 = run_loop($F32$min$(Math.fround(_r_0 - _l_0), Math.fround(_b_0 - _t_0)));
  return run_jump($$$$$$$third$Shape$rounded_case$, [run_loop($Bool$and$(run_loop($Bool$and$(run_loop($Bool$and$(run_loop($$$$$$$third$Brush$finite$(_l_0)), run_loop($$$$$$$third$Brush$finite$(_t_0)))), run_loop($Bool$and$(run_loop($$$$$$$third$Brush$finite$(_r_0)), run_loop($$$$$$$third$Brush$finite$(_b_0)))))), run_loop($Bool$and$(run_loop($Bool$and$((_l_0 < _r_0), (_t_0 < _b_0))), run_loop($Bool$and$((_radius_0 >= 0), (_x_0 <= _x_1))))))), _l_0, _t_0, _r_0, _b_0, _radius_0]);
}

function $$$$$$$Rect$screen$(_size_0) {
  return {$: "Box", ["left"]: 0, ["top"]: 0, ["right"]: _size_0, ["bottom"]: _size_0};
}

function $$$$$$$third$Shape$closed$(_edges_0, _rule_0) {
  return {$: "Closed", ["edges"]: _edges_0, ["rule"]: _rule_0, ["bounds"]: run_loop($$$$$$$third$PathFill$bounds$(_edges_0))};
}

function $$$$$$$third$Shape$ellipse$(_cx_0, _cy_0, _rx_0, _ry_0) {
  return run_jump($$$$$$$third$Shape$ellipse_case$, [run_loop($Bool$and$(run_loop($Bool$and$(run_loop($$$$$$$third$Brush$finite$(_cx_0)), run_loop($$$$$$$third$Brush$finite$(_cy_0)))), run_loop($Bool$and$(run_loop($Bool$and$((_rx_0 >= 0.00390625), (_rx_0 <= 4096))), run_loop($Bool$and$((_ry_0 >= 0.00390625), (_ry_0 <= 4096))))))), _cx_0, _cy_0, _rx_0, _ry_0]);
}

function $$$$$$$third$Raster$render$(_surface_0, _commands_0, _forks_0) {
  const _depth_0 = _surface_0["depth"];
  const _size_0 = _surface_0["size"];
  const _pixels_0 = _surface_0["pixels"];
  return {$: "Surface", ["depth"]: _depth_0, ["size"]: _size_0, ["pixels"]: run_loop($$$$$$$third$Raster$pool$(_forks_0, _depth_0, _size_0, 0, 0, _commands_0, _pixels_0))};
}

function $$$$$$$third$Surface$blank$(_depth_0) {
  return {$: "Surface", ["depth"]: _depth_0, ["size"]: (_depth_0 >= 32n ? 0 : (1 << Number(_depth_0)) >>> 0), ["pixels"]: {$: "Pix", ["color"]: 0}};
}

function $$$$$$$third$Raster$offload$(_surface_0, _commands_0, _forks_0) {
  const _depth_0 = _surface_0["depth"];
  const _size_0 = _surface_0["size"];
  const _pixels_0 = _surface_0["pixels"];
  return {$: "Surface", ["depth"]: _depth_0, ["size"]: _size_0, ["pixels"]: run_loop($$$$$$$third$Raster$pool$(_forks_0, _depth_0, _size_0, 0, 0, _commands_0, _pixels_0))};
}

function $$$$$$$third$Surface$flatten_tree$(_depth_0, _source_0, _background_0) {
  if (_depth_0 === 0n) {
    if (_source_0.$ === "Pix") {
      const _source_1 = _source_0["color"];
      if (_background_0.$ === "Pix") {
        const _background_1 = _background_0["color"];
        const _x_0 = run_loop($$$$$$$third$Premul$blend$({$: "Over"}, _source_1, ((_background_1 | 4278190080) >>> 0)));
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
        const _x_1 = run_loop($$$$$$$third$Premul$blend$({$: "Over"}, _source_2, ((_background_2 | 4278190080) >>> 0)));
        return {$: "Pix", ["color"]: ((_x_1 & 16777215) >>> 0)};
      } else {
        const _a_0 = run_loop($$$$$$$third$Surface$flatten_tree$(_rest_0, run_loop($$$$$$$ImageOps$tl$({$: "Pix", ["color"]: _source_2})), run_loop($$$$$$$ImageOps$tl$(_background_0))));
        const _b_0 = run_loop($$$$$$$third$Surface$flatten_tree$(_rest_0, run_loop($$$$$$$ImageOps$tr$({$: "Pix", ["color"]: _source_2})), run_loop($$$$$$$ImageOps$tr$(_background_0))));
        const _c_0 = run_loop($$$$$$$third$Surface$flatten_tree$(_rest_0, run_loop($$$$$$$ImageOps$bl$({$: "Pix", ["color"]: _source_2})), run_loop($$$$$$$ImageOps$bl$(_background_0))));
        const _d_0 = run_loop($$$$$$$third$Surface$flatten_tree$(_rest_0, run_loop($$$$$$$ImageOps$br$({$: "Pix", ["color"]: _source_2})), run_loop($$$$$$$ImageOps$br$(_background_0))));
        return run_jump($$$$$$$ImageOps$quad$, [_a_0, _b_0, _c_0, _d_0]);
      }
    } else {
      const _a_1 = run_loop($$$$$$$third$Surface$flatten_tree$(_rest_0, run_loop($$$$$$$ImageOps$tl$(_source_0)), run_loop($$$$$$$ImageOps$tl$(_background_0))));
      const _b_1 = run_loop($$$$$$$third$Surface$flatten_tree$(_rest_0, run_loop($$$$$$$ImageOps$tr$(_source_0)), run_loop($$$$$$$ImageOps$tr$(_background_0))));
      const _c_1 = run_loop($$$$$$$third$Surface$flatten_tree$(_rest_0, run_loop($$$$$$$ImageOps$bl$(_source_0)), run_loop($$$$$$$ImageOps$bl$(_background_0))));
      const _d_1 = run_loop($$$$$$$third$Surface$flatten_tree$(_rest_0, run_loop($$$$$$$ImageOps$br$(_source_0)), run_loop($$$$$$$ImageOps$br$(_background_0))));
      return run_jump($$$$$$$ImageOps$quad$, [_a_1, _b_1, _c_1, _d_1]);
    }
  }
}

function $$$$$$$third$Surface$merge_tree$(_depth_0, _mode_0, _source_0, _destination_0) {
  if (_depth_0 === 0n) {
    if (_source_0.$ === "Pix") {
      const _a_0 = _source_0["color"];
      if (_destination_0.$ === "Pix") {
        const _b_0 = _destination_0["color"];
        return {$: "Pix", ["color"]: run_loop($$$$$$$third$Premul$blend$(_mode_0, _a_0, _b_0))};
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
        return {$: "Pix", ["color"]: run_loop($$$$$$$third$Premul$blend$(_mode_0, _a_1, _b_1))};
      } else {
        const _a_2 = run_loop($$$$$$$third$Surface$merge_tree$(_rest_0, _mode_0, run_loop($$$$$$$ImageOps$tl$({$: "Pix", ["color"]: _a_1})), run_loop($$$$$$$ImageOps$tl$(_destination_0))));
        const _b_2 = run_loop($$$$$$$third$Surface$merge_tree$(_rest_0, _mode_0, run_loop($$$$$$$ImageOps$tr$({$: "Pix", ["color"]: _a_1})), run_loop($$$$$$$ImageOps$tr$(_destination_0))));
        const _c_0 = run_loop($$$$$$$third$Surface$merge_tree$(_rest_0, _mode_0, run_loop($$$$$$$ImageOps$bl$({$: "Pix", ["color"]: _a_1})), run_loop($$$$$$$ImageOps$bl$(_destination_0))));
        const _d_0 = run_loop($$$$$$$third$Surface$merge_tree$(_rest_0, _mode_0, run_loop($$$$$$$ImageOps$br$({$: "Pix", ["color"]: _a_1})), run_loop($$$$$$$ImageOps$br$(_destination_0))));
        return run_jump($$$$$$$ImageOps$quad$, [_a_2, _b_2, _c_0, _d_0]);
      }
    } else {
      const _a_3 = run_loop($$$$$$$third$Surface$merge_tree$(_rest_0, _mode_0, run_loop($$$$$$$ImageOps$tl$(_source_0)), run_loop($$$$$$$ImageOps$tl$(_destination_0))));
      const _b_3 = run_loop($$$$$$$third$Surface$merge_tree$(_rest_0, _mode_0, run_loop($$$$$$$ImageOps$tr$(_source_0)), run_loop($$$$$$$ImageOps$tr$(_destination_0))));
      const _c_1 = run_loop($$$$$$$third$Surface$merge_tree$(_rest_0, _mode_0, run_loop($$$$$$$ImageOps$bl$(_source_0)), run_loop($$$$$$$ImageOps$bl$(_destination_0))));
      const _d_1 = run_loop($$$$$$$third$Surface$merge_tree$(_rest_0, _mode_0, run_loop($$$$$$$ImageOps$br$(_source_0)), run_loop($$$$$$$ImageOps$br$(_destination_0))));
      return run_jump($$$$$$$ImageOps$quad$, [_a_3, _b_3, _c_1, _d_1]);
    }
  }
}

function $$$$$$$third$Surface$pixels$(_surface_0) {
  const _depth_0 = _surface_0["depth"];
  const _size_0 = _surface_0["size"];
  const _pixels_0 = _surface_0["pixels"];
  return _pixels_0;
}

function $$$$$$$third$Surface$opacity$(_surface_0, _value_0) {
  return run_jump($$$$$$$third$Surface$opacity_case$, [(_value_0 === 0), (_value_0 >= 255), _surface_0, _value_0]);
}

function $$$$$$$third$Effects$halo$(_surface_0, _color_0, _radius_0, _passes_0, _strength_0, _left_0, _top_0) {
  return run_jump($$$$$$$third$Effects$halo_finish$, [run_loop($$$$$$$third$Effects$soften$(run_loop($$$$$$$third$Effects$recolor$(_surface_0, {$: "Silhouette", ["color"]: _color_0})), _passes_0, _radius_0, {$: "Transparent"})), _strength_0, _left_0, _top_0]);
}

function $$$$$$$$$$pixels$Pixel$sample_xy$(_depth_0, _x_0, _y_0, _image_0) {
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
      return run_jump($$$$$$$$$$pixels$Pixel$sample_xy$, [_rest_0, _next_x_0, _next_y_0, _child_0]);
    }
  }
}

function $U32$min$(_a_0, _b_0) {
  return run_jump($Bool$pick$, [(_a_0 < _b_0), _a_0, _b_0]);
}

function $$$$$$$third$Premul$pack$(_r_0, _g_0, _b_0, _a_0) {
  const _aa_0 = run_loop($U32$min$(_a_0, 255));
  const _x_0 = (24n >= 32n ? 0 : (_aa_0 << Number(24n)) >>> 0);
  const _x_1 = run_loop($$$$$$$Color$rgb$(run_loop($U32$min$(_r_0, _aa_0)), run_loop($U32$min$(_g_0, _aa_0)), run_loop($U32$min$(_b_0, _aa_0))));
  return ((_x_0 | _x_1) >>> 0);
}

function $$$$$$$third$Premul$mul$(_a_0, _b_0) {
  const _x_0 = (Math.imul(_a_0, _b_0) >>> 0);
  const _x_1 = ((_x_0 + 127) >>> 0);
  return (255 === 0 ? 0 : (_x_1 / 255) >>> 0);
}

function $$$$$$$Color$red$(_c_0) {
  const _x_0 = (16n >= 32n ? 0 : (_c_0 >>> Number(16n)) >>> 0);
  return ((_x_0 & 255) >>> 0);
}

function $$$$$$$Color$green$(_c_0) {
  const _x_0 = (8n >= 32n ? 0 : (_c_0 >>> Number(8n)) >>> 0);
  return ((_x_0 & 255) >>> 0);
}

function $$$$$$$Color$blue$(_c_0) {
  return ((_c_0 & 255) >>> 0);
}

function $$$$$$$third$PathFill$union_extent$(_a_0, _b_0) {
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

function $$$$$$$third$PathFill$extent$(_edges_0) {
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

function $$$$$$$third$PathFill$edge_case$(_valid_0, _a_0, _b_0) {
  if (!_valid_0) {
    return {$: "Empty"};
  } else {
    const _ax_0 = _a_0["x"];
    const _ay_0 = _a_0["y"];
    const _bx_0 = _b_0["x"];
    const _by_0 = _b_0["y"];
    return run_jump($$$$$$$third$PathFill$ordered$, [(_ay_0 < _by_0), _ax_0, _ay_0, _bx_0, _by_0]);
  }
}

function $Bool$and$(_a_0, _b_0) {
  if (!_a_0) {
    return false;
  } else {
    return _b_0;
  }
}

function $$$$$$$third$Brush$point$(_p_0) {
  const _x_0 = _p_0["x"];
  const _y_0 = _p_0["y"];
  return run_jump($Bool$and$, [run_loop($$$$$$$third$Brush$finite$(_x_0)), run_loop($$$$$$$third$Brush$finite$(_y_0))]);
}

function $$$$$$$Rect$intersect$(_a_0, _b_0) {
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

function $$$$$$$third$Shape$bounds$(_shape_0) {
  if (_shape_0.$ === "Empty") {
    return run_jump($$$$$$$Rect$empty$, []);
  } else if (_shape_0.$ === "Rectangle") {
    const _left_0 = _shape_0["left"];
    const _top_0 = _shape_0["top"];
    const _right_0 = _shape_0["right"];
    const _bottom_0 = _shape_0["bottom"];
    const _radius_0 = _shape_0["radius"];
    const _bounds_0 = _shape_0["bounds"];
    return _bounds_0;
  } else if (_shape_0.$ === "Ellipse") {
    const _cx_0 = _shape_0["cx"];
    const _cy_0 = _shape_0["cy"];
    const _ix_0 = _shape_0["ix"];
    const _iy_0 = _shape_0["iy"];
    const _bounds_1 = _shape_0["bounds"];
    return _bounds_1;
  } else if (_shape_0.$ === "Closed") {
    const _edges_0 = _shape_0["edges"];
    const _rule_0 = _shape_0["rule"];
    const _bounds_2 = _shape_0["bounds"];
    return _bounds_2;
  } else if (_shape_0.$ === "Stroked") {
    const _path_0 = _shape_0["path"];
    const _bounds_3 = _shape_0["bounds"];
    return _bounds_3;
  } else if (_shape_0.$ === "Union") {
    const _left_1 = _shape_0["left"];
    const _right_1 = _shape_0["right"];
    const _bounds_4 = _shape_0["bounds"];
    return _bounds_4;
  } else if (_shape_0.$ === "Intersection") {
    const _left_2 = _shape_0["left"];
    const _right_2 = _shape_0["right"];
    const _bounds_5 = _shape_0["bounds"];
    return _bounds_5;
  } else {
    const _left_3 = _shape_0["left"];
    const _right_3 = _shape_0["right"];
    const _bounds_6 = _shape_0["bounds"];
    return _bounds_6;
  }
}

function $$$$$$$third$Shape$rounded_case$(_valid_0, _l_0, _t_0, _r_0, _b_0, _radius_0) {
  if (!_valid_0) {
    return {$: "Empty"};
  } else {
    return {$: "Rectangle", ["left"]: _l_0, ["top"]: _t_0, ["right"]: _r_0, ["bottom"]: _b_0, ["radius"]: _radius_0, ["bounds"]: {$: "Box", ["left"]: run_loop($$$$$$$RgbaAffine$floor_bound$(_l_0)), ["top"]: run_loop($$$$$$$RgbaAffine$floor_bound$(_t_0)), ["right"]: run_loop($$$$$$$RgbaAffine$ceil_bound$(_r_0)), ["bottom"]: run_loop($$$$$$$RgbaAffine$ceil_bound$(_b_0))}};
  }
}

function $$$$$$$third$Brush$finite$(_value_0) {
  const _x_0 = Math.fround(0 - 4096);
  return run_jump($Bool$and$, [(_value_0 >= _x_0), (_value_0 <= 4096)]);
}

function $F32$min$(_a_0, _b_0) {
  return run_jump($Bool$pick$, [(_a_0 < _b_0), _a_0, _b_0]);
}

function $$$$$$$third$PathFill$bounds$(_edges_0) {
  return run_jump($$$$$$$third$PathFill$screen_extent$, [run_loop($$$$$$$third$PathFill$extent$(_edges_0))]);
}

function $$$$$$$third$Shape$ellipse_case$(_valid_0, _cx_0, _cy_0, _rx_0, _ry_0) {
  if (!_valid_0) {
    return {$: "Empty"};
  } else {
    return {$: "Ellipse", ["cx"]: _cx_0, ["cy"]: _cy_0, ["ix"]: Math.fround(1 / _rx_0), ["iy"]: Math.fround(1 / _ry_0), ["bounds"]: {$: "Box", ["left"]: run_loop($$$$$$$RgbaAffine$floor_bound$(Math.fround(_cx_0 - _rx_0))), ["top"]: run_loop($$$$$$$RgbaAffine$floor_bound$(Math.fround(_cy_0 - _ry_0))), ["right"]: run_loop($$$$$$$RgbaAffine$ceil_bound$(Math.fround(_cx_0 + _rx_0))), ["bottom"]: run_loop($$$$$$$RgbaAffine$ceil_bound$(Math.fround(_cy_0 + _ry_0)))}};
  }
}

function $$$$$$$third$Raster$pool$(_forks_0, _depth_0, _span_0, _x_0, _y_0, _commands_0, _target_0) {
  if (_forks_0 === 0n) {
    if (_commands_0.$ === "Nil") {
      return _target_0;
    } else {
      return run_jump($$$$$$$third$Raster$serial$, [_commands_0, _depth_0, _span_0, _x_0, _y_0, _target_0]);
    }
  } else {
    const _rest_0 = (_forks_0 - 1n);
    if (_depth_0 === 0n) {
      if (_commands_0.$ === "Nil") {
        return _target_0;
      } else {
        return run_jump($$$$$$$third$Raster$serial$, [_commands_0, 0n, _span_0, _x_0, _y_0, _target_0]);
      }
    } else {
      const _lower_0 = (_depth_0 - 1n);
      if (_commands_0.$ === "Nil") {
        return _target_0;
      } else {
        const _h_0 = (2 === 0 ? 0 : (_span_0 / 2) >>> 0);
        const _xx_0 = ((_x_0 + _h_0) >>> 0);
        const _yy_0 = ((_y_0 + _h_0) >>> 0);
        const _a_0 = run_loop($$$$$$$third$Raster$pool$(_rest_0, _lower_0, _h_0, _x_0, _y_0, run_loop($$$$$$$third$Raster$select$(_commands_0, run_loop($$$$$$$Rect$cell$(_x_0, _y_0, _h_0)))), run_loop($$$$$$$ImageOps$tl$(_target_0))));
        const _b_0 = run_loop($$$$$$$third$Raster$pool$(_rest_0, _lower_0, _h_0, _xx_0, _y_0, run_loop($$$$$$$third$Raster$select$(_commands_0, run_loop($$$$$$$Rect$cell$(_xx_0, _y_0, _h_0)))), run_loop($$$$$$$ImageOps$tr$(_target_0))));
        const _c_0 = run_loop($$$$$$$third$Raster$pool$(_rest_0, _lower_0, _h_0, _x_0, _yy_0, run_loop($$$$$$$third$Raster$select$(_commands_0, run_loop($$$$$$$Rect$cell$(_x_0, _yy_0, _h_0)))), run_loop($$$$$$$ImageOps$bl$(_target_0))));
        const _d_0 = run_loop($$$$$$$third$Raster$pool$(_rest_0, _lower_0, _h_0, _xx_0, _yy_0, run_loop($$$$$$$third$Raster$select$(_commands_0, run_loop($$$$$$$Rect$cell$(_xx_0, _yy_0, _h_0)))), run_loop($$$$$$$ImageOps$br$(_target_0))));
        return run_jump($$$$$$$ImageOps$quad$, [_a_0, _b_0, _c_0, _d_0]);
      }
    }
  }
}

function $$$$$$$third$Premul$blend$(_mode_0, _source_0, _destination_0) {
  const _sa_0 = run_loop($$$$$$$third$Premul$alpha$(_source_0));
  const _da_0 = run_loop($$$$$$$third$Premul$alpha$(_destination_0));
  return run_jump($$$$$$$third$Premul$pack$, [run_loop($$$$$$$third$Premul$channel$(_mode_0, run_loop($$$$$$$Color$red$(_source_0)), run_loop($$$$$$$Color$red$(_destination_0)), _sa_0, _da_0)), run_loop($$$$$$$third$Premul$channel$(_mode_0, run_loop($$$$$$$Color$green$(_source_0)), run_loop($$$$$$$Color$green$(_destination_0)), _sa_0, _da_0)), run_loop($$$$$$$third$Premul$channel$(_mode_0, run_loop($$$$$$$Color$blue$(_source_0)), run_loop($$$$$$$Color$blue$(_destination_0)), _sa_0, _da_0)), run_loop($$$$$$$third$Premul$result_alpha$(_mode_0, _sa_0, _da_0))]);
}

function $$$$$$$ImageOps$tl$(_image_0) {
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

function $$$$$$$ImageOps$tr$(_image_0) {
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

function $$$$$$$ImageOps$bl$(_image_0) {
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

function $$$$$$$ImageOps$br$(_image_0) {
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

function $$$$$$$ImageOps$quad$(_tl_0, _tr_0, _bl_0, _br_0) {
  if (_tl_0.$ === "Pix") {
    const _a_0 = _tl_0["color"];
    if (_tr_0.$ === "Pix") {
      const _b_0 = _tr_0["color"];
      if (_bl_0.$ === "Pix") {
        const _c_0 = _bl_0["color"];
        if (_br_0.$ === "Pix") {
          const _d_0 = _br_0["color"];
          return run_jump($$$$$$$ImageOps$quad_case$, [run_loop($Bool$and$(run_loop($Bool$and$((_a_0 === _b_0), (_a_0 === _c_0))), (_a_0 === _d_0))), _a_0, _b_0, _c_0, _d_0]);
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

function $$$$$$$third$Surface$opacity_case$(_zero_0, _full_0, _surface_0, _opacity_0) {
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
      return {$: "Surface", ["depth"]: _depth_1, ["size"]: _size_1, ["pixels"]: run_loop($$$$$$$third$Surface$opacity_tree$(_depth_1, _pixels_1, _opacity_0))};
    }
  }
}

function $$$$$$$third$Effects$halo_finish$(_result_0, _strength_0, _left_0, _top_0) {
  if (_result_0.$ === "None") {
    return {$: "None"};
  } else {
    const _surface_0 = _result_0["value"];
    return {$: "Some", ["value"]: run_loop($$$$$$$third$Effects$translate$(run_loop($$$$$$$third$Surface$opacity$(_surface_0, _strength_0)), _left_0, _top_0))};
  }
}

function $$$$$$$third$Effects$soften$(_surface_0, _passes_0, _radius_0, _border_0) {
  return run_jump($$$$$$$third$Effects$soften_case$, [run_loop($Bool$and$(run_loop($Nat$is_le$(_passes_0, 3n)), (_radius_0 <= 128))), _surface_0, _passes_0, _radius_0, _border_0]);
}

function $$$$$$$third$Effects$recolor$(_surface_0, _effect_0) {
  const _depth_0 = _surface_0["depth"];
  const _size_0 = _surface_0["size"];
  const _pixels_0 = _surface_0["pixels"];
  return {$: "Surface", ["depth"]: _depth_0, ["size"]: _size_0, ["pixels"]: run_loop($$$$$$$third$Effects$map$(_depth_0, _pixels_0, _effect_0))};
}

function $Bool$pick$(_c_0, _a_0, _b_0) {
  if (!_c_0) {
    return _b_0;
  } else {
    return _a_0;
  }
}

function $$$$$$$Color$rgb$(_r_0, _g_0, _b_0) {
  const _x_0 = ((_r_0 & 255) >>> 0);
  const _x_1 = ((_g_0 & 255) >>> 0);
  const _x_2 = (16n >= 32n ? 0 : (_x_0 << Number(16n)) >>> 0);
  const _x_3 = (8n >= 32n ? 0 : (_x_1 << Number(8n)) >>> 0);
  const _x_4 = ((_x_2 | _x_3) >>> 0);
  const _x_5 = ((_b_0 & 255) >>> 0);
  return ((_x_4 | _x_5) >>> 0);
}

function $F32$max$(_a_0, _b_0) {
  return run_jump($Bool$pick$, [(_a_0 < _b_0), _b_0, _a_0]);
}

function $$$$$$$third$PathFill$ordered$(_up_0, _ax_0, _ay_0, _bx_0, _by_0) {
  if (_up_0) {
    return {$: "Edge", ["ax"]: _ax_0, ["ay"]: _ay_0, ["dx"]: Math.fround(_bx_0 - _ax_0), ["dy"]: Math.fround(_by_0 - _ay_0), ["up"]: true, ["extent"]: {$: "Extent", ["left"]: run_loop($F32$min$(_ax_0, _bx_0)), ["top"]: _ay_0, ["right"]: run_loop($F32$max$(_ax_0, _bx_0)), ["bottom"]: _by_0}};
  } else {
    return {$: "Edge", ["ax"]: _bx_0, ["ay"]: _by_0, ["dx"]: Math.fround(_ax_0 - _bx_0), ["dy"]: Math.fround(_ay_0 - _by_0), ["up"]: false, ["extent"]: {$: "Extent", ["left"]: run_loop($F32$min$(_ax_0, _bx_0)), ["top"]: _by_0, ["right"]: run_loop($F32$max$(_ax_0, _bx_0)), ["bottom"]: _ay_0}};
  }
}

function $U32$max$(_a_0, _b_0) {
  return run_jump($Bool$pick$, [(_a_0 < _b_0), _b_0, _a_0]);
}

function $$$$$$$Rect$empty$() {
  return {$: "Box", ["left"]: 0, ["top"]: 0, ["right"]: 0, ["bottom"]: 0};
}

function $$$$$$$RgbaAffine$floor_bound$(_value_0) {
  const _x_0 = run_loop($F32$clamp$(_value_0, 0, 4096));
  const _x_1 = Math.fround(Math.floor(_x_0));
  return (_x_1 >= 1 && _x_1 < 4294967296 ? Math.floor(_x_1) : 0);
}

function $$$$$$$RgbaAffine$ceil_bound$(_value_0) {
  const _x_0 = run_loop($F32$clamp$(_value_0, 0, 4096));
  const _x_1 = Math.fround(Math.ceil(_x_0));
  return (_x_1 >= 1 && _x_1 < 4294967296 ? Math.floor(_x_1) : 0);
}

function $$$$$$$third$PathFill$screen_extent$(_extent_0) {
  const _left_0 = _extent_0["left"];
  const _top_0 = _extent_0["top"];
  const _right_0 = _extent_0["right"];
  const _bottom_0 = _extent_0["bottom"];
  return {$: "Box", ["left"]: run_loop($$$$$$$RgbaAffine$floor_bound$(_left_0)), ["top"]: run_loop($$$$$$$RgbaAffine$floor_bound$(_top_0)), ["right"]: run_loop($$$$$$$RgbaAffine$ceil_bound$(_right_0)), ["bottom"]: run_loop($$$$$$$RgbaAffine$ceil_bound$(_bottom_0))};
}

function $$$$$$$third$Raster$serial$(_commands_0, _depth_0, _span_0, _x_0, _y_0, _target_0) {
  if (_commands_0.$ === "Nil") {
    return _target_0;
  } else {
    const _head_0 = _commands_0["head"];
    const _tail_0 = _commands_0["tail"];
    return run_jump($$$$$$$third$Raster$serial$, [_tail_0, _depth_0, _span_0, _x_0, _y_0, run_loop($$$$$$$third$Raster$one$(_head_0, _depth_0, _span_0, _x_0, _y_0, _target_0))]);
  }
}

function $$$$$$$third$Raster$select$(_commands_0, _region_0) {
  if (_commands_0.$ === "Nil") {
    return {$: "Nil"};
  } else {
    const _head_0 = _commands_0["head"];
    const _tail_0 = _commands_0["tail"];
    return run_jump($$$$$$$third$Raster$keep$, [run_loop($$$$$$$Rect$overlaps$(run_loop($$$$$$$third$Raster$bounds$(_head_0)), _region_0)), _head_0, run_loop($$$$$$$third$Raster$select$(_tail_0, _region_0))]);
  }
}

function $$$$$$$Rect$cell$(_x_0, _y_0, _size_0) {
  return {$: "Box", ["left"]: _x_0, ["top"]: _y_0, ["right"]: ((_x_0 + _size_0) >>> 0), ["bottom"]: ((_y_0 + _size_0) >>> 0)};
}

function $$$$$$$third$Premul$alpha$(_pixel_0) {
  return (24n >= 32n ? 0 : (_pixel_0 >>> Number(24n)) >>> 0);
}

function $$$$$$$third$Premul$channel$(_mode_0, _s_0, _d_0, _sa_0, _da_0) {
  if (_mode_0.$ === "Over") {
    const _x_0 = run_loop($$$$$$$third$Premul$mul$(_d_0, ((255 - _sa_0) >>> 0)));
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
    const _x_10 = run_loop($$$$$$$third$Premul$mul$(_s_0, _d_0));
    return ((_x_9 - _x_10) >>> 0);
  } else if (_mode_0.$ === "Plus") {
    return run_jump($U32$min$, [255, ((_s_0 + _d_0) >>> 0)]);
  } else if (_mode_0.$ === "SourceIn") {
    return run_jump($$$$$$$third$Premul$mul$, [_s_0, _da_0]);
  } else if (_mode_0.$ === "SourceOut") {
    return run_jump($$$$$$$third$Premul$mul$, [_s_0, ((255 - _da_0) >>> 0)]);
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

function $$$$$$$third$Premul$result_alpha$(_mode_0, _sa_0, _da_0) {
  if (_mode_0.$ === "Over") {
    return run_jump($$$$$$$third$Premul$union$, [_sa_0, _da_0]);
  } else if (_mode_0.$ === "Multiply") {
    return run_jump($$$$$$$third$Premul$union$, [_sa_0, _da_0]);
  } else if (_mode_0.$ === "Screen") {
    return run_jump($$$$$$$third$Premul$union$, [_sa_0, _da_0]);
  } else if (_mode_0.$ === "Plus") {
    return run_jump($U32$min$, [255, ((_sa_0 + _da_0) >>> 0)]);
  } else if (_mode_0.$ === "SourceIn") {
    return run_jump($$$$$$$third$Premul$mul$, [_sa_0, _da_0]);
  } else if (_mode_0.$ === "SourceOut") {
    return run_jump($$$$$$$third$Premul$mul$, [_sa_0, ((255 - _da_0) >>> 0)]);
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

function $$$$$$$ImageOps$quad_case$(_same_0, _a_0, _b_0, _c_0, _d_0) {
  if (_same_0) {
    return {$: "Pix", ["color"]: _a_0};
  } else {
    return {$: "Qua", ["tl"]: {$: "Pix", ["color"]: _a_0}, ["tr"]: {$: "Pix", ["color"]: _b_0}, ["bl"]: {$: "Pix", ["color"]: _c_0}, ["br"]: {$: "Pix", ["color"]: _d_0}};
  }
}

function $$$$$$$third$Surface$opacity_tree$(_depth_0, _image_0, _opacity_0) {
  if (_depth_0 === 0n) {
    if (_image_0.$ === "Pix") {
      const _pixel_0 = _image_0["color"];
      return {$: "Pix", ["color"]: run_loop($$$$$$$third$Premul$scale$(_pixel_0, _opacity_0))};
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
      return {$: "Pix", ["color"]: run_loop($$$$$$$third$Premul$scale$(_pixel_1, _opacity_0))};
    } else {
      const _a_1 = _image_0["tl"];
      const _b_1 = _image_0["tr"];
      const _c_1 = _image_0["bl"];
      const _d_1 = _image_0["br"];
      const _aa_0 = run_loop($$$$$$$third$Surface$opacity_tree$(_rest_0, _a_1, _opacity_0));
      const _bb_0 = run_loop($$$$$$$third$Surface$opacity_tree$(_rest_0, _b_1, _opacity_0));
      const _cc_0 = run_loop($$$$$$$third$Surface$opacity_tree$(_rest_0, _c_1, _opacity_0));
      const _dd_0 = run_loop($$$$$$$third$Surface$opacity_tree$(_rest_0, _d_1, _opacity_0));
      return run_jump($$$$$$$ImageOps$quad$, [_aa_0, _bb_0, _cc_0, _dd_0]);
    }
  }
}

function $$$$$$$third$Effects$translate$(_surface_0, _left_0, _top_0) {
  const _depth_0 = _surface_0["depth"];
  const _size_0 = _surface_0["size"];
  const _pixels_0 = _surface_0["pixels"];
  return {$: "Surface", ["depth"]: _depth_0, ["size"]: _size_0, ["pixels"]: run_loop($$$$$$$third$ImageShift$shift$(_depth_0, _size_0, _pixels_0, _left_0, _top_0))};
}

function $$$$$$$third$Effects$soften_case$(_ok_0, _surface_0, _passes_0, _radius_0, _border_0) {
  if (!_ok_0) {
    return {$: "None"};
  } else {
    return run_jump($$$$$$$third$Effects$repeat$, [_passes_0, {$: "Some", ["value"]: _surface_0}, _radius_0, _border_0]);
  }
}

function $Nat$is_le$(_a_0, _b_0) {
  return run_jump($Cmp$is_le$, [cmp_new(_a_0, _b_0)]);
}

function $$$$$$$third$Effects$map$(_depth_0, _image_0, _effect_0) {
  if (_depth_0 === 0n) {
    if (_image_0.$ === "Pix") {
      const _value_0 = _image_0["color"];
      return {$: "Pix", ["color"]: run_loop($$$$$$$third$Effects$pixel$(_effect_0, _value_0))};
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
      const _value_1 = _image_0["color"];
      return {$: "Pix", ["color"]: run_loop($$$$$$$third$Effects$pixel$(_effect_0, _value_1))};
    } else {
      const _a_1 = _image_0["tl"];
      const _b_1 = _image_0["tr"];
      const _c_1 = _image_0["bl"];
      const _d_1 = _image_0["br"];
      const _aa_0 = run_loop($$$$$$$third$Effects$map$(_rest_0, _a_1, _effect_0));
      const _bb_0 = run_loop($$$$$$$third$Effects$map$(_rest_0, _b_1, _effect_0));
      const _cc_0 = run_loop($$$$$$$third$Effects$map$(_rest_0, _c_1, _effect_0));
      const _dd_0 = run_loop($$$$$$$third$Effects$map$(_rest_0, _d_1, _effect_0));
      return run_jump($$$$$$$ImageOps$quad$, [_aa_0, _bb_0, _cc_0, _dd_0]);
    }
  }
}

function $F32$clamp$(_x_0, _lo_0, _hi_0) {
  return run_jump($F32$min$, [run_loop($F32$max$(_x_0, _lo_0)), _hi_0]);
}

function $$$$$$$third$Raster$one$(_command_0, _depth_0, _span_0, _x_0, _y_0, _target_0) {
  const _shape_0 = _command_0["shape"];
  const _brush_0 = _command_0["brush"];
  const _quality_0 = _command_0["quality"];
  const _bounds_0 = _command_0["bounds"];
  return run_jump($$$$$$$third$Paint$region$, [_depth_0, _span_0, _x_0, _y_0, run_loop($Bool$not$(run_loop($$$$$$$Rect$overlaps$(_bounds_0, run_loop($$$$$$$Rect$cell$(_x_0, _y_0, _span_0)))))), _shape_0, _brush_0, _quality_0, _bounds_0, _target_0]);
}

function $$$$$$$third$Raster$keep$(_visible_0, _command_0, _tail_0) {
  if (!_visible_0) {
    return _tail_0;
  } else {
    return {$: "Con", ["head"]: _command_0, ["tail"]: _tail_0};
  }
}

function $$$$$$$Rect$overlaps$(_a_0, _b_0) {
  return run_jump($Bool$not$, [run_loop($$$$$$$Rect$is_empty$(run_loop($$$$$$$Rect$intersect$(_a_0, _b_0))))]);
}

function $$$$$$$third$Raster$bounds$(_command_0) {
  const _shape_0 = _command_0["shape"];
  const _brush_0 = _command_0["brush"];
  const _quality_0 = _command_0["quality"];
  const _bounds_0 = _command_0["bounds"];
  return _bounds_0;
}

function $$$$$$$third$Premul$union$(_sa_0, _da_0) {
  const _x_0 = run_loop($$$$$$$third$Premul$mul$(_da_0, ((255 - _sa_0) >>> 0)));
  return ((_sa_0 + _x_0) >>> 0);
}

function $$$$$$$third$Premul$scale$(_pixel_0, _opacity_0) {
  const _a_0 = run_loop($U32$min$(_opacity_0, 255));
  return run_jump($$$$$$$third$Premul$pack$, [run_loop($$$$$$$third$Premul$mul$(run_loop($$$$$$$Color$red$(_pixel_0)), _a_0)), run_loop($$$$$$$third$Premul$mul$(run_loop($$$$$$$Color$green$(_pixel_0)), _a_0)), run_loop($$$$$$$third$Premul$mul$(run_loop($$$$$$$Color$blue$(_pixel_0)), _a_0)), run_loop($$$$$$$third$Premul$mul$(run_loop($$$$$$$third$Premul$alpha$(_pixel_0)), _a_0))]);
}

function $$$$$$$third$ImageShift$shift$(_depth_0, _size_0, _image_0, _left_0, _top_0) {
  return run_jump($$$$$$$third$ImageShift$start$, [run_loop($Bool$and$(run_loop($$$$$$$Shapes$valid_coord$(_left_0)), run_loop($$$$$$$Shapes$valid_coord$(_top_0)))), _depth_0, _size_0, {$: "View", ["depth"]: _depth_0, ["size"]: _size_0, ["x"]: run_loop($$$$$$$Shapes$biased$(_left_0)), ["y"]: run_loop($$$$$$$Shapes$biased$(_top_0)), ["pixels"]: _image_0}]);
}

function $$$$$$$third$Effects$repeat$(_passes_0, _current_0, _radius_0, _border_0) {
  if (_passes_0 === 0n) {
    if (_current_0.$ === "None") {
      return {$: "None"};
    } else {
      const _surface_0 = _current_0["value"];
      return {$: "Some", ["value"]: _surface_0};
    }
  } else {
    const _rest_0 = (_passes_0 - 1n);
    if (_current_0.$ === "None") {
      return {$: "None"};
    } else {
      const _surface_1 = _current_0["value"];
      return run_jump($$$$$$$third$Effects$repeat$, [_rest_0, run_loop($$$$$$$third$Blur$box$(_surface_1, _radius_0, _border_0)), _radius_0, _border_0]);
    }
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

function $$$$$$$third$Effects$pixel$(_effect_0, _pixel_0) {
  if (_effect_0.$ === "Silhouette") {
    const _color_0 = _effect_0["color"];
    return run_jump($$$$$$$third$Premul$straight$, [_color_0, run_loop($$$$$$$third$Premul$alpha$(_pixel_0))]);
  } else {
    const _color_1 = _effect_0["color"];
    return run_jump($$$$$$$third$Premul$tint$, [_pixel_0, _color_1]);
  }
}

function $$$$$$$third$Paint$region$(_depth_0, _span_0, _x_0, _y_0, _outside_0, _shape_0, _brush_0, _quality_0, _clip_0, _target_0) {
  if (_depth_0 === 0n) {
    if (_outside_0) {
      return _target_0;
    } else {
      const _coverage_0 = run_loop($$$$$$$third$Shape$coverage$(_shape_0, _quality_0, _x_0, _y_0));
      return run_jump($$$$$$$third$Paint$pixel$, [(_coverage_0 === 0), _coverage_0, _brush_0, _x_0, _y_0, _target_0]);
    }
  } else {
    const _rest_0 = (_depth_0 - 1n);
    if (_outside_0) {
      return _target_0;
    } else {
      const _h_0 = (2 === 0 ? 0 : (_span_0 / 2) >>> 0);
      const _xx_0 = ((_x_0 + _h_0) >>> 0);
      const _yy_0 = ((_y_0 + _h_0) >>> 0);
      const _a_0 = run_loop($$$$$$$third$Paint$region$(_rest_0, _h_0, _x_0, _y_0, run_loop($Bool$not$(run_loop($$$$$$$Rect$overlaps$(_clip_0, run_loop($$$$$$$Rect$cell$(_x_0, _y_0, _h_0)))))), _shape_0, _brush_0, _quality_0, _clip_0, run_loop($$$$$$$ImageOps$tl$(_target_0))));
      const _b_0 = run_loop($$$$$$$third$Paint$region$(_rest_0, _h_0, _xx_0, _y_0, run_loop($Bool$not$(run_loop($$$$$$$Rect$overlaps$(_clip_0, run_loop($$$$$$$Rect$cell$(_xx_0, _y_0, _h_0)))))), _shape_0, _brush_0, _quality_0, _clip_0, run_loop($$$$$$$ImageOps$tr$(_target_0))));
      const _c_0 = run_loop($$$$$$$third$Paint$region$(_rest_0, _h_0, _x_0, _yy_0, run_loop($Bool$not$(run_loop($$$$$$$Rect$overlaps$(_clip_0, run_loop($$$$$$$Rect$cell$(_x_0, _yy_0, _h_0)))))), _shape_0, _brush_0, _quality_0, _clip_0, run_loop($$$$$$$ImageOps$bl$(_target_0))));
      const _d_0 = run_loop($$$$$$$third$Paint$region$(_rest_0, _h_0, _xx_0, _yy_0, run_loop($Bool$not$(run_loop($$$$$$$Rect$overlaps$(_clip_0, run_loop($$$$$$$Rect$cell$(_xx_0, _yy_0, _h_0)))))), _shape_0, _brush_0, _quality_0, _clip_0, run_loop($$$$$$$ImageOps$br$(_target_0))));
      return run_jump($$$$$$$ImageOps$quad$, [_a_0, _b_0, _c_0, _d_0]);
    }
  }
}

function $Bool$not$(_b_0) {
  if (!_b_0) {
    return true;
  } else {
    return false;
  }
}

function $$$$$$$Rect$is_empty$(_box_0) {
  const _left_0 = _box_0["left"];
  const _top_0 = _box_0["top"];
  const _right_0 = _box_0["right"];
  const _bottom_0 = _box_0["bottom"];
  const _x_0 = (_left_0 >= _right_0);
  const _x_1 = (_top_0 >= _bottom_0);
  return (_x_0 || _x_1);
}

function $$$$$$$third$ImageShift$start$(_valid_0, _depth_0, _size_0, _view_0) {
  if (!_valid_0) {
    return {$: "Pix", ["color"]: 0};
  } else {
    const _v_0 = run_loop($$$$$$$ImageView$narrow$(_view_0, 4096, 4096, _size_0));
    return run_jump($$$$$$$third$ImageShift$tree$, [_depth_0, _size_0, 4096, 4096, run_loop($$$$$$$ImageView$outside$(_v_0, 4096, 4096, _size_0)), run_loop($$$$$$$ImageView$matches$(_v_0, 4096, 4096, _size_0)), _v_0]);
  }
}

function $$$$$$$Shapes$valid_coord$(_c_0) {
  if (_c_0.$ === "Pos") {
    const _value_0 = _c_0["value"];
    return (_value_0 <= 4096);
  } else {
    const _magnitude_0 = _c_0["magnitude"];
    return (_magnitude_0 <= 4096);
  }
}

function $$$$$$$Shapes$biased$(_c_0) {
  if (_c_0.$ === "Pos") {
    const _value_0 = _c_0["value"];
    return ((4096 + _value_0) >>> 0);
  } else {
    const _magnitude_0 = _c_0["magnitude"];
    return ((4096 - _magnitude_0) >>> 0);
  }
}

function $$$$$$$third$Blur$box$(_surface_0, _radius_0, _border_0) {
  return run_jump($$$$$$$third$Blur$box_case$, [(_radius_0 <= 128), (_radius_0 === 0), _surface_0, _radius_0, _border_0]);
}

function $$$$$$$third$Premul$tint$(_pixel_0, _color_0) {
  return run_jump($$$$$$$third$Premul$pack$, [run_loop($$$$$$$third$Premul$mul$(run_loop($$$$$$$Color$red$(_pixel_0)), run_loop($$$$$$$Color$red$(_color_0)))), run_loop($$$$$$$third$Premul$mul$(run_loop($$$$$$$Color$green$(_pixel_0)), run_loop($$$$$$$Color$green$(_color_0)))), run_loop($$$$$$$third$Premul$mul$(run_loop($$$$$$$Color$blue$(_pixel_0)), run_loop($$$$$$$Color$blue$(_color_0)))), run_loop($$$$$$$third$Premul$alpha$(_pixel_0))]);
}

function $$$$$$$third$Shape$coverage$(_shape_0, _quality_0, _x_0, _y_0) {
  const _n_0 = run_loop($$$$$$$third$Shape$grid$(_quality_0));
  const _count_0 = (Math.imul(_n_0, _n_0) >>> 0);
  const _x_1 = run_loop($$$$$$$third$Shape$samples$(BigInt(_count_0), _shape_0, Math.fround(_x_0), Math.fround(_y_0), _n_0, 0, 0));
  const _x_2 = (Math.imul(_x_1, 255) >>> 0);
  return (_count_0 === 0 ? 0 : (_x_2 / _count_0) >>> 0);
}

function $$$$$$$third$Paint$pixel$(_zero_0, _coverage_0, _brush_0, _x_0, _y_0, _target_0) {
  if (_zero_0) {
    return _target_0;
  } else {
    if (_target_0.$ === "Pix") {
      const _background_0 = _target_0["color"];
      const _x_1 = Math.fround(_x_0);
      const _x_2 = Math.fround(_y_0);
      return {$: "Pix", ["color"]: run_loop($$$$$$$third$Premul$blend$({$: "Over"}, run_loop($$$$$$$third$Premul$scale$(run_loop($$$$$$$third$Brush$sample$(_brush_0, Math.fround(_x_1 + 0.5), Math.fround(_x_2 + 0.5))), _coverage_0)), _background_0))};
    } else {
      const _a_0 = _target_0["tl"];
      const _b_0 = _target_0["tr"];
      const _c_0 = _target_0["bl"];
      const _d_0 = _target_0["br"];
      return {$: "Qua", ["tl"]: _a_0, ["tr"]: _b_0, ["bl"]: _c_0, ["br"]: _d_0};
    }
  }
}

function $$$$$$$ImageView$narrow$(_view_0, _x_0, _y_0, _size_0) {
  const _depth_0 = _view_0["depth"];
  const _span_0 = _view_0["size"];
  const _sx_0 = _view_0["x"];
  const _sy_0 = _view_0["y"];
  const _t_0 = _view_0["pixels"];
  if (_t_0.$ === "Pix") {
    const _color_0 = _t_0["color"];
    return {$: "View", ["depth"]: _depth_0, ["size"]: _span_0, ["x"]: _sx_0, ["y"]: _sy_0, ["pixels"]: {$: "Pix", ["color"]: _color_0}};
  } else {
    return run_jump($$$$$$$ImageView$focus$, [_depth_0, _span_0, _sx_0, _sy_0, _x_0, _y_0, _size_0, _t_0, run_loop($$$$$$$ImageView$child_choice$(_depth_0, _sx_0, _sy_0, _span_0, _x_0, _y_0, _size_0, _t_0))]);
  }
}

function $$$$$$$third$ImageShift$tree$(_depth_0, _span_0, _x_0, _y_0, _outside_0, _aligned_0, _view_0) {
  if (_depth_0 === 0n) {
    if (_outside_0) {
      return {$: "Pix", ["color"]: 0};
    } else {
      if (_aligned_0) {
        return run_jump($$$$$$$ImageView$pixels$, [_view_0]);
      } else {
        return {$: "Pix", ["color"]: run_loop($$$$$$$ImageView$sample$(_view_0, _x_0, _y_0))};
      }
    }
  } else {
    const _rest_0 = (_depth_0 - 1n);
    if (_outside_0) {
      return {$: "Pix", ["color"]: 0};
    } else {
      if (_aligned_0) {
        return run_jump($$$$$$$ImageView$pixels$, [_view_0]);
      } else {
        const _h_0 = (2 === 0 ? 0 : (_span_0 / 2) >>> 0);
        const _xx_0 = ((_x_0 + _h_0) >>> 0);
        const _yy_0 = ((_y_0 + _h_0) >>> 0);
        const _va_0 = run_loop($$$$$$$ImageView$narrow$(_view_0, _x_0, _y_0, _h_0));
        const _vb_0 = run_loop($$$$$$$ImageView$narrow$(_view_0, _xx_0, _y_0, _h_0));
        const _vc_0 = run_loop($$$$$$$ImageView$narrow$(_view_0, _x_0, _yy_0, _h_0));
        const _vd_0 = run_loop($$$$$$$ImageView$narrow$(_view_0, _xx_0, _yy_0, _h_0));
        const _a_0 = run_loop($$$$$$$third$ImageShift$tree$(_rest_0, _h_0, _x_0, _y_0, run_loop($$$$$$$ImageView$outside$(_va_0, _x_0, _y_0, _h_0)), run_loop($$$$$$$ImageView$matches$(_va_0, _x_0, _y_0, _h_0)), _va_0));
        const _b_0 = run_loop($$$$$$$third$ImageShift$tree$(_rest_0, _h_0, _xx_0, _y_0, run_loop($$$$$$$ImageView$outside$(_vb_0, _xx_0, _y_0, _h_0)), run_loop($$$$$$$ImageView$matches$(_vb_0, _xx_0, _y_0, _h_0)), _vb_0));
        const _c_0 = run_loop($$$$$$$third$ImageShift$tree$(_rest_0, _h_0, _x_0, _yy_0, run_loop($$$$$$$ImageView$outside$(_vc_0, _x_0, _yy_0, _h_0)), run_loop($$$$$$$ImageView$matches$(_vc_0, _x_0, _yy_0, _h_0)), _vc_0));
        const _d_0 = run_loop($$$$$$$third$ImageShift$tree$(_rest_0, _h_0, _xx_0, _yy_0, run_loop($$$$$$$ImageView$outside$(_vd_0, _xx_0, _yy_0, _h_0)), run_loop($$$$$$$ImageView$matches$(_vd_0, _xx_0, _yy_0, _h_0)), _vd_0));
        return run_jump($$$$$$$ImageOps$quad$, [_a_0, _b_0, _c_0, _d_0]);
      }
    }
  }
}

function $$$$$$$ImageView$outside$(_view_0, _x_0, _y_0, _size_0) {
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

function $$$$$$$ImageView$matches$(_view_0, _x_0, _y_0, _size_0) {
  const _depth_0 = _view_0["depth"];
  const _span_0 = _view_0["size"];
  const _sx_0 = _view_0["x"];
  const _sy_0 = _view_0["y"];
  const _pixels_0 = _view_0["pixels"];
  return run_jump($Bool$and$, [run_loop($$$$$$$ImageView$contains$(_x_0, _y_0, _size_0, _sx_0, _sy_0, _span_0)), run_loop($$$$$$$ImageView$shape_matches$(_sx_0, _sy_0, _span_0, _x_0, _y_0, _size_0, _pixels_0))]);
}

function $$$$$$$third$Blur$box_case$(_valid_0, _zero_0, _surface_0, _radius_0, _border_0) {
  if (!_valid_0) {
    return {$: "None"};
  } else {
    if (_zero_0) {
      return {$: "Some", ["value"]: _surface_0};
    } else {
      const _depth_0 = _surface_0["depth"];
      const _size_0 = _surface_0["size"];
      const _pixels_0 = _surface_0["pixels"];
      const _source_0 = run_loop($$$$$$$third$PixelBuffer$from_image$(_depth_0, _pixels_0));
      const _horizontal_0 = run_loop($$$$$$$third$Blur$axis$(_depth_0, _size_0, {$: "Horizontal"}, _radius_0, _border_0, _source_0));
      const _vertical_0 = run_loop($$$$$$$third$Blur$axis$(_depth_0, _size_0, {$: "Vertical"}, _radius_0, _border_0, _horizontal_0));
      return {$: "Some", ["value"]: {$: "Surface", ["depth"]: _depth_0, ["size"]: _size_0, ["pixels"]: run_loop($$$$$$$third$PixelBuffer$image$(_depth_0, _vertical_0))}};
    }
  }
}

function $$$$$$$third$Shape$grid$(_quality_0) {
  if (_quality_0.$ === "Center") {
    return 1;
  } else if (_quality_0.$ === "Four") {
    return 2;
  } else {
    return 4;
  }
}

function $$$$$$$third$Shape$samples$(_fuel_0, _shape_0, _x_0, _y_0, _grid_0, _index_0, _total_0) {
  if (_fuel_0 === 0n) {
    return _total_0;
  } else {
    const _rest_0 = (_fuel_0 - 1n);
    const _x_1 = (_grid_0 === 0 ? _index_0 : _index_0 % _grid_0);
    const _x_2 = Math.fround(_x_1);
    const _x_3 = Math.fround(_x_2 + 0.5);
    const _x_4 = Math.fround(_grid_0);
    const _x_5 = Math.fround(_x_3 / _x_4);
    const _xx_0 = Math.fround(_x_0 + _x_5);
    const _x_6 = (_grid_0 === 0 ? 0 : (_index_0 / _grid_0) >>> 0);
    const _x_7 = Math.fround(_x_6);
    const _x_8 = Math.fround(_x_7 + 0.5);
    const _x_9 = Math.fround(_grid_0);
    const _x_10 = Math.fround(_x_8 / _x_9);
    const _yy_0 = Math.fround(_y_0 + _x_10);
    const _x_11 = run_loop($$$$$$$Shapes$bit$(run_loop($$$$$$$third$Shape$hit$(_shape_0, _xx_0, _yy_0))));
    return run_jump($$$$$$$third$Shape$samples$, [_rest_0, _shape_0, _x_0, _y_0, _grid_0, ((_index_0 + 1) >>> 0), ((_total_0 + _x_11) >>> 0)]);
  }
}

function $$$$$$$third$Brush$sample$(_brush_0, _x_0, _y_0) {
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
    return run_jump($$$$$$$third$Brush$position$, [_stops_0, _spread_0, Math.fround(_x_5 * _inverse_0)]);
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
    return run_jump($$$$$$$third$Brush$position$, [_stops_1, _spread_1, Math.fround(Math.sqrt(_x_10))]);
  }
}

function $$$$$$$ImageView$focus$(_depth_0, _span_0, _sx_0, _sy_0, _x_0, _y_0, _size_0, _pixels_0, _choice_0) {
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
        return run_jump($$$$$$$ImageView$focus$, [_rest_0, _half_0, _xx_0, _yy_0, _x_0, _y_0, _size_0, _tl_0, run_loop($$$$$$$ImageView$child_choice$(_rest_0, _xx_0, _yy_0, _half_0, _x_0, _y_0, _size_0, _tl_0))]);
      } else if (_choice_0.$ === "TR") {
        const _half_1 = (2 === 0 ? 0 : (_span_0 / 2) >>> 0);
        const _xx_1 = ((_sx_0 + _half_1) >>> 0);
        const _yy_1 = _sy_0;
        return run_jump($$$$$$$ImageView$focus$, [_rest_0, _half_1, _xx_1, _yy_1, _x_0, _y_0, _size_0, _tr_0, run_loop($$$$$$$ImageView$child_choice$(_rest_0, _xx_1, _yy_1, _half_1, _x_0, _y_0, _size_0, _tr_0))]);
      } else if (_choice_0.$ === "BL") {
        const _half_2 = (2 === 0 ? 0 : (_span_0 / 2) >>> 0);
        const _xx_2 = _sx_0;
        const _yy_2 = ((_sy_0 + _half_2) >>> 0);
        return run_jump($$$$$$$ImageView$focus$, [_rest_0, _half_2, _xx_2, _yy_2, _x_0, _y_0, _size_0, _bl_0, run_loop($$$$$$$ImageView$child_choice$(_rest_0, _xx_2, _yy_2, _half_2, _x_0, _y_0, _size_0, _bl_0))]);
      } else {
        const _half_3 = (2 === 0 ? 0 : (_span_0 / 2) >>> 0);
        const _xx_3 = ((_sx_0 + _half_3) >>> 0);
        const _yy_3 = ((_sy_0 + _half_3) >>> 0);
        return run_jump($$$$$$$ImageView$focus$, [_rest_0, _half_3, _xx_3, _yy_3, _x_0, _y_0, _size_0, _br_0, run_loop($$$$$$$ImageView$child_choice$(_rest_0, _xx_3, _yy_3, _half_3, _x_0, _y_0, _size_0, _br_0))]);
      }
    }
  }
}

function $$$$$$$ImageView$child_choice$(_depth_0, _sx_0, _sy_0, _span_0, _x_0, _y_0, _size_0, _pixels_0) {
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
      return run_jump($$$$$$$ImageView$choose$, [_sx_0, _sy_0, _span_0, _x_0, _y_0, _size_0]);
    }
  }
}

function $$$$$$$ImageView$pixels$(_view_0) {
  const _depth_0 = _view_0["depth"];
  const _size_0 = _view_0["size"];
  const _x_0 = _view_0["x"];
  const _y_0 = _view_0["y"];
  const _pixels_0 = _view_0["pixels"];
  return _pixels_0;
}

function $$$$$$$ImageView$sample$(_view_0, _x_0, _y_0) {
  const _depth_0 = _view_0["depth"];
  const _size_0 = _view_0["size"];
  const _sx_0 = _view_0["x"];
  const _sy_0 = _view_0["y"];
  const _pixels_0 = _view_0["pixels"];
  return run_jump($$$$$$$$$$pixels$Pixel$sample_xy$, [_depth_0, ((_x_0 - _sx_0) >>> 0), ((_y_0 - _sy_0) >>> 0), _pixels_0]);
}

function $$$$$$$ImageView$contains$(_x_0, _y_0, _size_0, _sx_0, _sy_0, _span_0) {
  const _x_1 = ((_x_0 + _size_0) >>> 0);
  const _x_2 = ((_sx_0 + _span_0) >>> 0);
  const _x_3 = ((_y_0 + _size_0) >>> 0);
  const _x_4 = ((_sy_0 + _span_0) >>> 0);
  return run_jump($Bool$and$, [run_loop($Bool$and$((_x_0 >= _sx_0), (_y_0 >= _sy_0))), run_loop($Bool$and$((_x_1 <= _x_2), (_x_3 <= _x_4)))]);
}

function $$$$$$$ImageView$shape_matches$(_sx_0, _sy_0, _span_0, _x_0, _y_0, _size_0, _pixels_0) {
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

function $$$$$$$third$PixelBuffer$from_image$(_depth_0, _image_0) {
  if (_depth_0 === 0n) {
    if (_image_0.$ === "Pix") {
      const _pixel_0 = _image_0["color"];
      const _x_0 = nat_chk(0n + 0n);
      return array_new(_x_0, _pixel_0);
    } else {
      const _a_0 = _image_0["tl"];
      const _b_0 = _image_0["tr"];
      const _c_0 = _image_0["bl"];
      const _d_0 = _image_0["br"];
      return array_new(0n, 0);
    }
  } else {
    const _rest_0 = (_depth_0 - 1n);
    if (_image_0.$ === "Pix") {
      const _pixel_1 = _image_0["color"];
      const _x_1 = nat_chk(_rest_0 + 1n);
      const _x_2 = nat_chk(_rest_0 + 1n);
      const _x_3 = nat_chk(_x_1 + _x_2);
      return array_new(_x_3, _pixel_1);
    } else {
      const _a_1 = _image_0["tl"];
      const _b_1 = _image_0["tr"];
      const _c_1 = _image_0["bl"];
      const _d_1 = _image_0["br"];
      const _aa_0 = run_loop($$$$$$$third$PixelBuffer$from_image$(_rest_0, _a_1));
      const _bb_0 = run_loop($$$$$$$third$PixelBuffer$from_image$(_rest_0, _b_1));
      const _cc_0 = run_loop($$$$$$$third$PixelBuffer$from_image$(_rest_0, _c_1));
      const _dd_0 = run_loop($$$$$$$third$PixelBuffer$from_image$(_rest_0, _d_1));
      return array_node(array_node(_aa_0, _bb_0), array_node(_cc_0, _dd_0));
    }
  }
}

function $$$$$$$third$Blur$axis$(_depth_0, _size_0, _axis_0, _radius_0, _border_0, _source_0) {
  const _x_0 = nat_chk(_depth_0 + _depth_0);
  return run_jump($Pair$snd$, [run_loop($$$$$$$third$Blur$lines$(BigInt(_size_0), {$: "Tuple", ["fst"]: _source_0, ["snd"]: array_new(_x_0, 0)}, _size_0, _axis_0, 0, _radius_0, _border_0))]);
}

function $$$$$$$third$PixelBuffer$image$(_depth_0, _buffer_0) {
  if (_depth_0 === 0n) {
    if (_buffer_0.length === 1) {
      const _pixel_0 = _buffer_0[0];
      return {$: "Pix", ["color"]: _pixel_0};
    } else {
      return {$: "Pix", ["color"]: 0};
    }
  } else {
    const _rest_0 = (_depth_0 - 1n);
    if (_buffer_0.length !== 1) {
      const _t_0 = _buffer_0.slice(0, _buffer_0.length >> 1);
      if (_t_0.length !== 1) {
        const _a_0 = _t_0.slice(0, _t_0.length >> 1);
        const _b_0 = _t_0.slice(_t_0.length >> 1);
        const _t_1 = _buffer_0.slice(_buffer_0.length >> 1);
        if (_t_1.length !== 1) {
          const _c_0 = _t_1.slice(0, _t_1.length >> 1);
          const _d_0 = _t_1.slice(_t_1.length >> 1);
          const _aa_0 = run_loop($$$$$$$third$PixelBuffer$image$(_rest_0, _a_0));
          const _bb_0 = run_loop($$$$$$$third$PixelBuffer$image$(_rest_0, _b_0));
          const _cc_0 = run_loop($$$$$$$third$PixelBuffer$image$(_rest_0, _c_0));
          const _dd_0 = run_loop($$$$$$$third$PixelBuffer$image$(_rest_0, _d_0));
          return run_jump($$$$$$$ImageOps$quad$, [_aa_0, _bb_0, _cc_0, _dd_0]);
        } else {
          return {$: "Pix", ["color"]: 0};
        }
      } else {
        const _35_0 = _buffer_0.slice(_buffer_0.length >> 1);
        return {$: "Pix", ["color"]: 0};
      }
    } else {
      return {$: "Pix", ["color"]: 0};
    }
  }
}

function $$$$$$$Shapes$bit$(_inside_0) {
  if (!_inside_0) {
    return 0;
  } else {
    return 1;
  }
}

function $$$$$$$third$Shape$hit$(_shape_0, _x_0, _y_0) {
  return run_jump($$$$$$$third$Shape$test$, [_shape_0, run_loop($Bool$not$(run_loop($$$$$$$Rect$point$(run_loop($$$$$$$third$Shape$bounds$(_shape_0)), (_x_0 >= 1 && _x_0 < 4294967296 ? Math.floor(_x_0) : 0), (_y_0 >= 1 && _y_0 < 4294967296 ? Math.floor(_y_0) : 0))))), _x_0, _y_0]);
}

function $$$$$$$third$Brush$position$(_stops_0, _mode_0, _value_0) {
  const _x_0 = run_loop($$$$$$$third$Brush$spread$(_mode_0, _value_0));
  const _x_1 = Math.fround(_x_0 * 65535);
  return run_jump($$$$$$$third$Brush$ramp$, [_stops_0, (_x_1 >= 1 && _x_1 < 4294967296 ? Math.floor(_x_1) : 0)]);
}

function $$$$$$$ImageView$choose$(_sx_0, _sy_0, _span_0, _x_0, _y_0, _size_0) {
  const _half_0 = (2 === 0 ? 0 : (_span_0 / 2) >>> 0);
  return run_jump($$$$$$$ImageView$choose_axes$, [run_loop($$$$$$$ImageView$axis$(_sx_0, _half_0, _x_0, _size_0)), run_loop($$$$$$$ImageView$axis$(_sy_0, _half_0, _y_0, _size_0))]);
}

function $Pair$snd$(_p_0) {
  const _a_0 = _p_0["fst"];
  const _b_0 = _p_0["snd"];
  return _b_0;
}

function $$$$$$$third$Blur$lines$(_fuel_0, _state_0, _size_0, _axis_0, _line_0, _radius_0, _border_0) {
  if (_fuel_0 === 0n) {
    return _state_0;
  } else {
    const _rest_0 = (_fuel_0 - 1n);
    const _source_0 = _state_0["fst"];
    const _output_0 = _state_0["snd"];
    const _position_0 = ((4096 - _radius_0) >>> 0);
    const _x_0 = (Math.imul(_radius_0, 2) >>> 0);
    const _x_1 = ((_x_0 + 1) >>> 0);
    const _next_0 = run_loop($$$$$$$third$Blur$start$(run_loop($$$$$$$third$Blur$initial$(BigInt(_x_1), run_loop($$$$$$$third$Blur$tap$(_source_0, _size_0, _axis_0, _line_0, _position_0, _border_0)), _size_0, _axis_0, _line_0, _position_0, _border_0, {$: "Totals", ["r"]: 0, ["g"]: 0, ["b"]: 0, ["a"]: 0})), _output_0, _size_0, _axis_0, _line_0, _radius_0, _border_0));
    return run_jump($$$$$$$third$Blur$lines$, [_rest_0, _next_0, _size_0, _axis_0, ((_line_0 + 1) >>> 0), _radius_0, _border_0]);
  }
}

function $$$$$$$third$Shape$test$(_shape_0, _outside_0, _x_0, _y_0) {
  if (_shape_0.$ === "Empty") {
    if (_outside_0) {
      return false;
    } else {
      return false;
    }
  } else if (_shape_0.$ === "Rectangle") {
    const _l_0 = _shape_0["left"];
    const _t_0 = _shape_0["top"];
    const _r_0 = _shape_0["right"];
    const _b_0 = _shape_0["bottom"];
    const _radius_0 = _shape_0["radius"];
    const _bounds_0 = _shape_0["bounds"];
    if (_outside_0) {
      return false;
    } else {
      return run_jump($$$$$$$third$Shape$rounded_hit$, [_l_0, _t_0, _r_0, _b_0, _radius_0, _x_0, _y_0]);
    }
  } else if (_shape_0.$ === "Ellipse") {
    const _cx_0 = _shape_0["cx"];
    const _cy_0 = _shape_0["cy"];
    const _ix_0 = _shape_0["ix"];
    const _iy_0 = _shape_0["iy"];
    const _bounds_1 = _shape_0["bounds"];
    if (_outside_0) {
      return false;
    } else {
      const _x_1 = Math.fround(_x_0 - _cx_0);
      const _dx_0 = Math.fround(_x_1 * _ix_0);
      const _x_2 = Math.fround(_y_0 - _cy_0);
      const _dy_0 = Math.fround(_x_2 * _iy_0);
      const _x_3 = Math.fround(_dx_0 * _dx_0);
      const _x_4 = Math.fround(_dy_0 * _dy_0);
      const _x_5 = Math.fround(_x_3 + _x_4);
      return (_x_5 <= 1);
    }
  } else if (_shape_0.$ === "Closed") {
    const _edges_0 = _shape_0["edges"];
    const _rule_0 = _shape_0["rule"];
    const _bounds_2 = _shape_0["bounds"];
    if (_outside_0) {
      return false;
    } else {
      return run_jump($$$$$$$third$PathFill$hit$, [_edges_0, _rule_0, _x_0, _y_0]);
    }
  } else if (_shape_0.$ === "Stroked") {
    const _path_0 = _shape_0["path"];
    const _bounds_3 = _shape_0["bounds"];
    if (_outside_0) {
      return false;
    } else {
      return run_jump($$$$$$$Stroke$hit$, [_path_0, _x_0, _y_0]);
    }
  } else if (_shape_0.$ === "Union") {
    const _left_0 = _shape_0["left"];
    const _right_0 = _shape_0["right"];
    const _cached_0 = _shape_0["bounds"];
    if (_outside_0) {
      return false;
    } else {
      const _x_6 = run_loop($$$$$$$third$Shape$test$(_left_0, run_loop($Bool$not$(run_loop($$$$$$$Rect$point$(run_loop($$$$$$$third$Shape$bounds$(_left_0)), (_x_0 >= 1 && _x_0 < 4294967296 ? Math.floor(_x_0) : 0), (_y_0 >= 1 && _y_0 < 4294967296 ? Math.floor(_y_0) : 0))))), _x_0, _y_0));
      const _x_7 = run_loop($$$$$$$third$Shape$test$(_right_0, run_loop($Bool$not$(run_loop($$$$$$$Rect$point$(run_loop($$$$$$$third$Shape$bounds$(_right_0)), (_x_0 >= 1 && _x_0 < 4294967296 ? Math.floor(_x_0) : 0), (_y_0 >= 1 && _y_0 < 4294967296 ? Math.floor(_y_0) : 0))))), _x_0, _y_0));
      return (_x_6 || _x_7);
    }
  } else if (_shape_0.$ === "Intersection") {
    const _left_1 = _shape_0["left"];
    const _right_1 = _shape_0["right"];
    const _cached_1 = _shape_0["bounds"];
    if (_outside_0) {
      return false;
    } else {
      return run_jump($Bool$and$, [run_loop($$$$$$$third$Shape$test$(_left_1, run_loop($Bool$not$(run_loop($$$$$$$Rect$point$(run_loop($$$$$$$third$Shape$bounds$(_left_1)), (_x_0 >= 1 && _x_0 < 4294967296 ? Math.floor(_x_0) : 0), (_y_0 >= 1 && _y_0 < 4294967296 ? Math.floor(_y_0) : 0))))), _x_0, _y_0)), run_loop($$$$$$$third$Shape$test$(_right_1, run_loop($Bool$not$(run_loop($$$$$$$Rect$point$(run_loop($$$$$$$third$Shape$bounds$(_right_1)), (_x_0 >= 1 && _x_0 < 4294967296 ? Math.floor(_x_0) : 0), (_y_0 >= 1 && _y_0 < 4294967296 ? Math.floor(_y_0) : 0))))), _x_0, _y_0))]);
    }
  } else {
    const _left_2 = _shape_0["left"];
    const _right_2 = _shape_0["right"];
    const _cached_2 = _shape_0["bounds"];
    if (_outside_0) {
      return false;
    } else {
      return run_jump($Bool$and$, [run_loop($$$$$$$third$Shape$test$(_left_2, run_loop($Bool$not$(run_loop($$$$$$$Rect$point$(run_loop($$$$$$$third$Shape$bounds$(_left_2)), (_x_0 >= 1 && _x_0 < 4294967296 ? Math.floor(_x_0) : 0), (_y_0 >= 1 && _y_0 < 4294967296 ? Math.floor(_y_0) : 0))))), _x_0, _y_0)), run_loop($Bool$not$(run_loop($$$$$$$third$Shape$test$(_right_2, run_loop($Bool$not$(run_loop($$$$$$$Rect$point$(run_loop($$$$$$$third$Shape$bounds$(_right_2)), (_x_0 >= 1 && _x_0 < 4294967296 ? Math.floor(_x_0) : 0), (_y_0 >= 1 && _y_0 < 4294967296 ? Math.floor(_y_0) : 0))))), _x_0, _y_0))))]);
    }
  }
}

function $$$$$$$Rect$point$(_box_0, _x_0, _y_0) {
  const _left_0 = _box_0["left"];
  const _top_0 = _box_0["top"];
  const _right_0 = _box_0["right"];
  const _bottom_0 = _box_0["bottom"];
  return run_jump($Bool$and$, [run_loop($Bool$and$((_x_0 >= _left_0), (_x_0 < _right_0))), run_loop($Bool$and$((_y_0 >= _top_0), (_y_0 < _bottom_0)))]);
}

function $$$$$$$third$Brush$ramp$(_stops_0, _position_0) {
  const _t_0 = _stops_0["values"];
  if (_t_0.$ === "Nil") {
    return 0;
  } else {
    const _t_1 = _t_0["head"];
    const _start_0 = _t_1["position"];
    const _pixel_0 = _t_1["pixel"];
    const _tail_0 = _t_0["tail"];
    const _q_0 = run_loop($U32$min$(_position_0, 65535));
    return run_jump($$$$$$$third$Brush$walk$, [_tail_0, _q_0, {$: "Cursor", ["position"]: _start_0, ["pixel"]: _pixel_0, ["done"]: (_q_0 < _start_0)}]);
  }
}

function $$$$$$$third$Brush$spread$(_mode_0, _value_0) {
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

function $$$$$$$ImageView$choose_axes$(_horizontal_0, _vertical_0) {
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

function $$$$$$$ImageView$axis$(_source_0, _half_0, _start_0, _size_0) {
  const _end_0 = ((_start_0 + _size_0) >>> 0);
  const _middle_0 = ((_source_0 + _half_0) >>> 0);
  const _x_0 = ((_middle_0 + _half_0) >>> 0);
  return run_jump($$$$$$$ImageView$axis_case$, [run_loop($Bool$and$((_start_0 >= _source_0), (_end_0 <= _x_0))), (_end_0 <= _middle_0), (_start_0 >= _middle_0)]);
}

function $$$$$$$third$Blur$start$(_initial_0, _output_0, _size_0, _axis_0, _line_0, _radius_0, _border_0) {
  const _source_0 = _initial_0["source"];
  const _total_0 = _initial_0["total"];
  return run_jump($$$$$$$third$Blur$scan$, [BigInt(_size_0), run_loop($$$$$$$third$Blur$samples$(_source_0, _size_0, _axis_0, _line_0, 0, _radius_0, _border_0)), _output_0, _size_0, _axis_0, _line_0, 0, _radius_0, _border_0, _total_0]);
}

function $$$$$$$third$Blur$initial$(_fuel_0, _result_0, _size_0, _axis_0, _line_0, _position_0, _border_0, _total_0) {
  if (_fuel_0 === 0n) {
    const _source_0 = _result_0["fst"];
    const _pixel_0 = _result_0["snd"];
    return {$: "Initial", ["source"]: _source_0, ["total"]: _total_0};
  } else {
    const _rest_0 = (_fuel_0 - 1n);
    const _source_1 = _result_0["fst"];
    const _pixel_1 = _result_0["snd"];
    return run_jump($$$$$$$third$Blur$initial$, [_rest_0, run_loop($$$$$$$third$Blur$tap$(_source_1, _size_0, _axis_0, _line_0, ((_position_0 + 1) >>> 0), _border_0)), _size_0, _axis_0, _line_0, ((_position_0 + 1) >>> 0), _border_0, run_loop($$$$$$$third$Blur$plus$(_total_0, _pixel_1))]);
  }
}

function $$$$$$$third$Blur$tap$(_source_0, _size_0, _axis_0, _line_0, _position_0, _border_0) {
  const _x_0 = ((4096 + _size_0) >>> 0);
  const _x_1 = run_loop($U32$max$(_position_0, 4096));
  return run_jump($$$$$$$third$Blur$read$, [run_loop($$$$$$$third$Blur$active$(_border_0, run_loop($Bool$and$((_position_0 >= 4096), (_position_0 < _x_0))))), _source_0, run_loop($$$$$$$third$Blur$index$(_axis_0, run_loop($U32$min$(((_size_0 - 1) >>> 0), ((_x_1 - 4096) >>> 0))), _line_0))]);
}

function $$$$$$$third$Shape$rounded_hit$(_l_0, _t_0, _r_0, _b_0, _radius_0, _x_0, _y_0) {
  const _x_1 = run_loop($F32$clamp$(_x_0, Math.fround(_l_0 + _radius_0), Math.fround(_r_0 - _radius_0)));
  const _dx_0 = Math.fround(_x_0 - _x_1);
  const _x_2 = run_loop($F32$clamp$(_y_0, Math.fround(_t_0 + _radius_0), Math.fround(_b_0 - _radius_0)));
  const _dy_0 = Math.fround(_y_0 - _x_2);
  const _x_3 = Math.fround(_dx_0 * _dx_0);
  const _x_4 = Math.fround(_dy_0 * _dy_0);
  const _x_5 = Math.fround(_x_3 + _x_4);
  const _x_6 = Math.fround(_radius_0 * _radius_0);
  return run_jump($Bool$and$, [run_loop($Bool$and$(run_loop($Bool$and$((_x_0 >= _l_0), (_x_0 < _r_0))), run_loop($Bool$and$((_y_0 >= _t_0), (_y_0 < _b_0))))), (_x_5 <= _x_6)]);
}

function $$$$$$$third$PathFill$hit$(_edges_0, _rule_0, _x_0, _y_0) {
  return run_jump($$$$$$$third$PathFill$decide$, [_rule_0, run_loop($$$$$$$third$PathFill$count$(_edges_0, run_loop($$$$$$$third$PathFill$excluded$(run_loop($$$$$$$third$PathFill$extent$(_edges_0)), _x_0, _y_0)), _x_0, _y_0))]);
}

function $$$$$$$Stroke$hit$(_path_0, _x_0, _y_0) {
  return run_jump($$$$$$$Stroke$hit_case$, [_path_0, run_loop($Bool$not$(run_loop($$$$$$$Rect$point$(run_loop($$$$$$$Stroke$bounds$(_path_0)), (_x_0 >= 1 && _x_0 < 4294967296 ? Math.floor(_x_0) : 0), (_y_0 >= 1 && _y_0 < 4294967296 ? Math.floor(_y_0) : 0))))), _x_0, _y_0]);
}

function $$$$$$$third$Brush$walk$(_values_0, _q_0, _cursor_0) {
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
      return run_jump($$$$$$$third$Brush$walk$, [_tail_0, _q_0, run_loop($$$$$$$third$Brush$advance$((_q_0 < _position_1), _q_0, _position_2, _pixel_2, _position_1, _pixel_1))]);
    }
  }
}

function $$$$$$$ImageView$axis_case$(_valid_0, _low_0, _high_0) {
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

function $$$$$$$third$Blur$scan$(_fuel_0, _step_0, _output_0, _size_0, _axis_0, _line_0, _x_0, _radius_0, _border_0, _total_0) {
  if (_fuel_0 === 0n) {
    const _source_0 = _step_0["source"];
    const _remove_0 = _step_0["remove"];
    const _add_0 = _step_0["add"];
    return {$: "Tuple", ["fst"]: _source_0, ["snd"]: _output_0};
  } else {
    const _rest_0 = (_fuel_0 - 1n);
    const _source_1 = _step_0["source"];
    const _remove_1 = _step_0["remove"];
    const _add_1 = _step_0["add"];
    const _x_1 = (Math.imul(_radius_0, 2) >>> 0);
    const _x_2 = run_loop($$$$$$$third$Blur$index$(_axis_0, _x_0, _line_0));
    const _x_3 = run_loop($$$$$$$third$Blur$average$(_total_0, ((_x_1 + 1) >>> 0)));
    return run_jump($$$$$$$third$Blur$scan$, [_rest_0, run_loop($$$$$$$third$Blur$samples$(_source_1, _size_0, _axis_0, _line_0, ((_x_0 + 1) >>> 0), _radius_0, _border_0)), (_output_0[_x_2 % _output_0.length] = _x_3, _output_0), _size_0, _axis_0, _line_0, ((_x_0 + 1) >>> 0), _radius_0, _border_0, run_loop($$$$$$$third$Blur$plus$(run_loop($$$$$$$third$Blur$minus$(_total_0, _remove_1)), _add_1))]);
  }
}

function $$$$$$$third$Blur$samples$(_source_0, _size_0, _axis_0, _line_0, _x_0, _radius_0, _border_0) {
  const _x_1 = ((_x_0 + 4096) >>> 0);
  const _x_2 = ((_x_0 + 4096) >>> 0);
  const _x_3 = ((_x_2 + _radius_0) >>> 0);
  return run_jump($$$$$$$third$Blur$first$, [run_loop($$$$$$$third$Blur$tap$(_source_0, _size_0, _axis_0, _line_0, ((_x_1 - _radius_0) >>> 0), _border_0)), _size_0, _axis_0, _line_0, ((_x_3 + 1) >>> 0), _border_0]);
}

function $$$$$$$third$Blur$plus$(_total_0, _pixel_0) {
  const _r_0 = _total_0["r"];
  const _g_0 = _total_0["g"];
  const _b_0 = _total_0["b"];
  const _a_0 = _total_0["a"];
  const _x_0 = run_loop($$$$$$$Color$red$(_pixel_0));
  const _x_1 = run_loop($$$$$$$Color$green$(_pixel_0));
  const _x_2 = run_loop($$$$$$$Color$blue$(_pixel_0));
  const _x_3 = run_loop($$$$$$$third$Premul$alpha$(_pixel_0));
  return {$: "Totals", ["r"]: ((_r_0 + _x_0) >>> 0), ["g"]: ((_g_0 + _x_1) >>> 0), ["b"]: ((_b_0 + _x_2) >>> 0), ["a"]: ((_a_0 + _x_3) >>> 0)};
}

function $$$$$$$third$Blur$read$(_active_0, _source_0, _index_0) {
  if (!_active_0) {
    return {$: "Tuple", ["fst"]: _source_0, ["snd"]: 0};
  } else {
    return {$: "Tuple", fst: _source_0, snd: _source_0[_index_0 % _source_0.length]};
  }
}

function $$$$$$$third$Blur$active$(_border_0, _inside_0) {
  if (_border_0.$ === "Transparent") {
    return _inside_0;
  } else {
    return true;
  }
}

function $$$$$$$third$Blur$index$(_axis_0, _position_0, _line_0) {
  if (_axis_0.$ === "Horizontal") {
    return run_jump($$$$$$$third$PixelBuffer$index$, [_position_0, _line_0]);
  } else {
    return run_jump($$$$$$$third$PixelBuffer$index$, [_line_0, _position_0]);
  }
}

function $$$$$$$third$PathFill$decide$(_rule_0, _value_0) {
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

function $$$$$$$third$PathFill$count$(_edges_0, _outside_0, _x_0, _y_0) {
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
      return run_jump($$$$$$$third$PathFill$crossing$, [(_x_5 > 0), _up_0]);
    }
  } else {
    const _left_0 = _edges_0["left"];
    const _right_0 = _edges_0["right"];
    const _cached_0 = _edges_0["extent"];
    if (_outside_0) {
      return {$: "Count", ["up"]: 0, ["down"]: 0};
    } else {
      return run_jump($$$$$$$third$PathFill$add$, [run_loop($$$$$$$third$PathFill$count$(_left_0, run_loop($$$$$$$third$PathFill$excluded$(run_loop($$$$$$$third$PathFill$extent$(_left_0)), _x_0, _y_0)), _x_0, _y_0)), run_loop($$$$$$$third$PathFill$count$(_right_0, run_loop($$$$$$$third$PathFill$excluded$(run_loop($$$$$$$third$PathFill$extent$(_right_0)), _x_0, _y_0)), _x_0, _y_0))]);
    }
  }
}

function $$$$$$$third$PathFill$excluded$(_extent_0, _x_0, _y_0) {
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

function $$$$$$$Stroke$hit_case$(_path_0, _excluded_0, _x_0, _y_0) {
  if (_path_0.$ === "Empty") {
    if (_excluded_0) {
      return false;
    } else {
      return false;
    }
  } else if (_path_0.$ === "Capsule") {
    const _ax_0 = _path_0["ax"];
    const _ay_0 = _path_0["ay"];
    const _bx_0 = _path_0["bx"];
    const _by_0 = _path_0["by"];
    const _radius2_0 = _path_0["radius2"];
    const _bounds_0 = _path_0["bounds"];
    if (_excluded_0) {
      return false;
    } else {
      return run_jump($$$$$$$Stroke$capsule$, [_ax_0, _ay_0, _bx_0, _by_0, _radius2_0, _x_0, _y_0]);
    }
  } else {
    const _left_0 = _path_0["left"];
    const _right_0 = _path_0["right"];
    const _box_0 = _path_0["bounds"];
    if (_excluded_0) {
      return false;
    } else {
      const _x_1 = run_loop($$$$$$$Stroke$hit_case$(_left_0, run_loop($Bool$not$(run_loop($$$$$$$Rect$point$(run_loop($$$$$$$Stroke$bounds$(_left_0)), (_x_0 >= 1 && _x_0 < 4294967296 ? Math.floor(_x_0) : 0), (_y_0 >= 1 && _y_0 < 4294967296 ? Math.floor(_y_0) : 0))))), _x_0, _y_0));
      const _x_2 = run_loop($$$$$$$Stroke$hit_case$(_right_0, run_loop($Bool$not$(run_loop($$$$$$$Rect$point$(run_loop($$$$$$$Stroke$bounds$(_right_0)), (_x_0 >= 1 && _x_0 < 4294967296 ? Math.floor(_x_0) : 0), (_y_0 >= 1 && _y_0 < 4294967296 ? Math.floor(_y_0) : 0))))), _x_0, _y_0));
      return (_x_1 || _x_2);
    }
  }
}

function $$$$$$$Stroke$bounds$(_path_0) {
  if (_path_0.$ === "Empty") {
    return run_jump($$$$$$$Rect$empty$, []);
  } else if (_path_0.$ === "Capsule") {
    const _ax_0 = _path_0["ax"];
    const _ay_0 = _path_0["ay"];
    const _bx_0 = _path_0["bx"];
    const _by_0 = _path_0["by"];
    const _radius2_0 = _path_0["radius2"];
    const _bounds_0 = _path_0["bounds"];
    return _bounds_0;
  } else {
    const _left_0 = _path_0["left"];
    const _right_0 = _path_0["right"];
    const _bounds_1 = _path_0["bounds"];
    return _bounds_1;
  }
}

function $$$$$$$third$Brush$advance$(_before_0, _q_0, _old_0, _a_0, _next_0, _b_0) {
  if (_before_0) {
    return {$: "Cursor", ["position"]: _old_0, ["pixel"]: run_loop($$$$$$$third$Brush$interpolate$(_a_0, _b_0, ((_q_0 - _old_0) >>> 0), ((_next_0 - _old_0) >>> 0))), ["done"]: true};
  } else {
    return {$: "Cursor", ["position"]: _next_0, ["pixel"]: _b_0, ["done"]: false};
  }
}

function $$$$$$$third$Blur$average$(_total_0, _width_0) {
  const _r_0 = _total_0["r"];
  const _g_0 = _total_0["g"];
  const _b_0 = _total_0["b"];
  const _a_0 = _total_0["a"];
  const _half_0 = (2 === 0 ? 0 : (_width_0 / 2) >>> 0);
  const _x_0 = ((_r_0 + _half_0) >>> 0);
  const _x_1 = ((_g_0 + _half_0) >>> 0);
  const _x_2 = ((_b_0 + _half_0) >>> 0);
  const _x_3 = ((_a_0 + _half_0) >>> 0);
  return run_jump($$$$$$$third$Premul$pack$, [(_width_0 === 0 ? 0 : (_x_0 / _width_0) >>> 0), (_width_0 === 0 ? 0 : (_x_1 / _width_0) >>> 0), (_width_0 === 0 ? 0 : (_x_2 / _width_0) >>> 0), (_width_0 === 0 ? 0 : (_x_3 / _width_0) >>> 0)]);
}

function $$$$$$$third$Blur$minus$(_total_0, _pixel_0) {
  const _r_0 = _total_0["r"];
  const _g_0 = _total_0["g"];
  const _b_0 = _total_0["b"];
  const _a_0 = _total_0["a"];
  const _x_0 = run_loop($$$$$$$Color$red$(_pixel_0));
  const _x_1 = run_loop($$$$$$$Color$green$(_pixel_0));
  const _x_2 = run_loop($$$$$$$Color$blue$(_pixel_0));
  const _x_3 = run_loop($$$$$$$third$Premul$alpha$(_pixel_0));
  return {$: "Totals", ["r"]: ((_r_0 - _x_0) >>> 0), ["g"]: ((_g_0 - _x_1) >>> 0), ["b"]: ((_b_0 - _x_2) >>> 0), ["a"]: ((_a_0 - _x_3) >>> 0)};
}

function $$$$$$$third$Blur$first$(_result_0, _size_0, _axis_0, _line_0, _position_0, _border_0) {
  const _source_0 = _result_0["fst"];
  const _remove_0 = _result_0["snd"];
  return run_jump($$$$$$$third$Blur$second$, [run_loop($$$$$$$third$Blur$tap$(_source_0, _size_0, _axis_0, _line_0, _position_0, _border_0)), _remove_0]);
}

function $$$$$$$third$PixelBuffer$index$(_x_0, _y_0) {
  const _x_1 = run_loop($$$$$$$third$PixelBuffer$spread$(_y_0));
  const _x_2 = run_loop($$$$$$$third$PixelBuffer$spread$(_x_0));
  const _x_3 = (1n >= 32n ? 0 : (_x_1 << Number(1n)) >>> 0);
  return ((_x_2 | _x_3) >>> 0);
}

function $$$$$$$third$PathFill$crossing$(_hit_0, _up_0) {
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

function $$$$$$$third$PathFill$add$(_a_0, _b_0) {
  const _au_0 = _a_0["up"];
  const _ad_0 = _a_0["down"];
  const _bu_0 = _b_0["up"];
  const _bd_0 = _b_0["down"];
  return {$: "Count", ["up"]: ((_au_0 + _bu_0) >>> 0), ["down"]: ((_ad_0 + _bd_0) >>> 0)};
}

function $$$$$$$Stroke$capsule$(_ax_0, _ay_0, _bx_0, _by_0, _radius2_0, _x_0, _y_0) {
  const _dx_0 = Math.fround(_bx_0 - _ax_0);
  const _dy_0 = Math.fround(_by_0 - _ay_0);
  const _x_1 = Math.fround(_dx_0 * _dx_0);
  const _x_2 = Math.fround(_dy_0 * _dy_0);
  const _denom_0 = Math.fround(_x_1 + _x_2);
  const _x_3 = Math.fround(_x_0 - _ax_0);
  const _x_4 = Math.fround(_y_0 - _ay_0);
  const _x_5 = Math.fround(_x_3 * _dx_0);
  const _x_6 = Math.fround(_x_4 * _dy_0);
  const _t_0 = run_loop($$$$$$$Stroke$projection$((_denom_0 === 0), Math.fround(_x_5 + _x_6), _denom_0));
  const _x_7 = Math.fround(_dx_0 * _t_0);
  const _x_8 = Math.fround(_ax_0 + _x_7);
  const _ex_0 = Math.fround(_x_0 - _x_8);
  const _x_9 = Math.fround(_dy_0 * _t_0);
  const _x_10 = Math.fround(_ay_0 + _x_9);
  const _ey_0 = Math.fround(_y_0 - _x_10);
  const _x_11 = Math.fround(_ex_0 * _ex_0);
  const _x_12 = Math.fround(_ey_0 * _ey_0);
  const _x_13 = Math.fround(_x_11 + _x_12);
  return (_x_13 <= _radius2_0);
}

function $$$$$$$third$Brush$interpolate$(_a_0, _b_0, _delta_0, _span_0) {
  return run_jump($$$$$$$third$Premul$pack$, [run_loop($$$$$$$Ramp$channel$(run_loop($$$$$$$Color$red$(_a_0)), run_loop($$$$$$$Color$red$(_b_0)), _delta_0, _span_0)), run_loop($$$$$$$Ramp$channel$(run_loop($$$$$$$Color$green$(_a_0)), run_loop($$$$$$$Color$green$(_b_0)), _delta_0, _span_0)), run_loop($$$$$$$Ramp$channel$(run_loop($$$$$$$Color$blue$(_a_0)), run_loop($$$$$$$Color$blue$(_b_0)), _delta_0, _span_0)), run_loop($$$$$$$Ramp$channel$(run_loop($$$$$$$third$Premul$alpha$(_a_0)), run_loop($$$$$$$third$Premul$alpha$(_b_0)), _delta_0, _span_0))]);
}

function $$$$$$$third$Blur$second$(_result_0, _remove_0) {
  const _source_0 = _result_0["fst"];
  const _add_0 = _result_0["snd"];
  return {$: "Step", ["source"]: _source_0, ["remove"]: _remove_0, ["add"]: _add_0};
}

function $$$$$$$third$PixelBuffer$spread$(_value_0) {
  const _a_0 = ((_value_0 & 65535) >>> 0);
  const _x_0 = (8n >= 32n ? 0 : (_a_0 << Number(8n)) >>> 0);
  const _x_1 = ((_a_0 | _x_0) >>> 0);
  const _b_0 = ((_x_1 & 16711935) >>> 0);
  const _x_2 = (4n >= 32n ? 0 : (_b_0 << Number(4n)) >>> 0);
  const _x_3 = ((_b_0 | _x_2) >>> 0);
  const _c_0 = ((_x_3 & 252645135) >>> 0);
  const _x_4 = (2n >= 32n ? 0 : (_c_0 << Number(2n)) >>> 0);
  const _x_5 = ((_c_0 | _x_4) >>> 0);
  const _d_0 = ((_x_5 & 858993459) >>> 0);
  const _x_6 = (1n >= 32n ? 0 : (_d_0 << Number(1n)) >>> 0);
  const _x_7 = ((_d_0 | _x_6) >>> 0);
  return ((_x_7 & 1431655765) >>> 0);
}

function $$$$$$$Stroke$projection$(_zero_0, _numerator_0, _denominator_0) {
  if (_zero_0) {
    return 0;
  } else {
    return run_jump($F32$clamp$, [Math.fround(_numerator_0 / _denominator_0), 0, 1]);
  }
}

function $$$$$$$Ramp$channel$(_a_0, _b_0, _delta_0, _span_0) {
  const _x_0 = ((_span_0 - _delta_0) >>> 0);
  const _x_1 = (Math.imul(_a_0, _x_0) >>> 0);
  const _x_2 = (Math.imul(_b_0, _delta_0) >>> 0);
  const _x_3 = ((_x_1 + _x_2) >>> 0);
  const _x_4 = (2 === 0 ? 0 : (_span_0 / 2) >>> 0);
  const _x_5 = ((_x_3 + _x_4) >>> 0);
  return (_span_0 === 0 ? 0 : (_x_5 / _span_0) >>> 0);
}
export default {
  "brush": run_lib($brush$, 0),
  "edges": run_lib($edges$, 0),
  "commands": run_lib($commands$, 0),
  "draw": run_lib($draw$, 2),
  "composite": run_lib($composite$, 2),
  "render": run_lib($render$, 2),
  "pixels": run_lib($pixels$, 3),
  "main": run_lib($main$, 0),
};
