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

function $tree$(_depth_0, _span_0, _x_0, _y_0, _outside_0, _aligned_0, _view_0) {
  if (_depth_0 === 0n) {
    if (_outside_0) {
      return {$: "Pix", ["color"]: 0};
    } else {
      if (_aligned_0) {
        return run_jump($$$$ImageView$pixels$, [_view_0]);
      } else {
        return {$: "Pix", ["color"]: run_loop($$$$ImageView$sample$(_view_0, _x_0, _y_0))};
      }
    }
  } else {
    const _rest_0 = (_depth_0 - 1n);
    if (_outside_0) {
      return {$: "Pix", ["color"]: 0};
    } else {
      if (_aligned_0) {
        return run_jump($$$$ImageView$pixels$, [_view_0]);
      } else {
        const _h_0 = (2 === 0 ? 0 : (_span_0 / 2) >>> 0);
        const _xx_0 = ((_x_0 + _h_0) >>> 0);
        const _yy_0 = ((_y_0 + _h_0) >>> 0);
        const _va_0 = run_loop($$$$ImageView$narrow$(_view_0, _x_0, _y_0, _h_0));
        const _vb_0 = run_loop($$$$ImageView$narrow$(_view_0, _xx_0, _y_0, _h_0));
        const _vc_0 = run_loop($$$$ImageView$narrow$(_view_0, _x_0, _yy_0, _h_0));
        const _vd_0 = run_loop($$$$ImageView$narrow$(_view_0, _xx_0, _yy_0, _h_0));
        const _a_0 = run_loop($tree$(_rest_0, _h_0, _x_0, _y_0, run_loop($$$$ImageView$outside$(_va_0, _x_0, _y_0, _h_0)), run_loop($$$$ImageView$matches$(_va_0, _x_0, _y_0, _h_0)), _va_0));
        const _b_0 = run_loop($tree$(_rest_0, _h_0, _xx_0, _y_0, run_loop($$$$ImageView$outside$(_vb_0, _xx_0, _y_0, _h_0)), run_loop($$$$ImageView$matches$(_vb_0, _xx_0, _y_0, _h_0)), _vb_0));
        const _c_0 = run_loop($tree$(_rest_0, _h_0, _x_0, _yy_0, run_loop($$$$ImageView$outside$(_vc_0, _x_0, _yy_0, _h_0)), run_loop($$$$ImageView$matches$(_vc_0, _x_0, _yy_0, _h_0)), _vc_0));
        const _d_0 = run_loop($tree$(_rest_0, _h_0, _xx_0, _yy_0, run_loop($$$$ImageView$outside$(_vd_0, _xx_0, _yy_0, _h_0)), run_loop($$$$ImageView$matches$(_vd_0, _xx_0, _yy_0, _h_0)), _vd_0));
        return run_jump($$$$ImageOps$quad$, [_a_0, _b_0, _c_0, _d_0]);
      }
    }
  }
}

function $start$(_valid_0, _depth_0, _size_0, _view_0) {
  if (!_valid_0) {
    return {$: "Pix", ["color"]: 0};
  } else {
    const _v_0 = run_loop($$$$ImageView$narrow$(_view_0, 4096, 4096, _size_0));
    return run_jump($tree$, [_depth_0, _size_0, 4096, 4096, run_loop($$$$ImageView$outside$(_v_0, 4096, 4096, _size_0)), run_loop($$$$ImageView$matches$(_v_0, 4096, 4096, _size_0)), _v_0]);
  }
}

function $shift$(_depth_0, _size_0, _image_0, _left_0, _top_0) {
  return run_jump($start$, [run_loop($Bool$and$(run_loop($$$$Shapes$valid_coord$(_left_0)), run_loop($$$$Shapes$valid_coord$(_top_0)))), _depth_0, _size_0, {$: "View", ["depth"]: _depth_0, ["size"]: _size_0, ["x"]: run_loop($$$$Shapes$biased$(_left_0)), ["y"]: run_loop($$$$Shapes$biased$(_top_0)), ["pixels"]: _image_0}]);
}

function $$$$ImageView$pixels$(_view_0) {
  const _depth_0 = _view_0["depth"];
  const _size_0 = _view_0["size"];
  const _x_0 = _view_0["x"];
  const _y_0 = _view_0["y"];
  const _pixels_0 = _view_0["pixels"];
  return _pixels_0;
}

function $$$$ImageView$sample$(_view_0, _x_0, _y_0) {
  const _depth_0 = _view_0["depth"];
  const _size_0 = _view_0["size"];
  const _sx_0 = _view_0["x"];
  const _sy_0 = _view_0["y"];
  const _pixels_0 = _view_0["pixels"];
  return run_jump($$$$$$$pixels$Pixel$sample_xy$, [_depth_0, ((_x_0 - _sx_0) >>> 0), ((_y_0 - _sy_0) >>> 0), _pixels_0]);
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

function $$$$ImageView$matches$(_view_0, _x_0, _y_0, _size_0) {
  const _depth_0 = _view_0["depth"];
  const _span_0 = _view_0["size"];
  const _sx_0 = _view_0["x"];
  const _sy_0 = _view_0["y"];
  const _pixels_0 = _view_0["pixels"];
  return run_jump($Bool$and$, [run_loop($$$$ImageView$contains$(_x_0, _y_0, _size_0, _sx_0, _sy_0, _span_0)), run_loop($$$$ImageView$shape_matches$(_sx_0, _sy_0, _span_0, _x_0, _y_0, _size_0, _pixels_0))]);
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

function $Bool$and$(_a_0, _b_0) {
  if (!_a_0) {
    return false;
  } else {
    return _b_0;
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

function $$$$Shapes$biased$(_c_0) {
  if (_c_0.$ === "Pos") {
    const _value_0 = _c_0["value"];
    return ((4096 + _value_0) >>> 0);
  } else {
    const _magnitude_0 = _c_0["magnitude"];
    return ((4096 - _magnitude_0) >>> 0);
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

function $$$$ImageOps$quad_case$(_same_0, _a_0, _b_0, _c_0, _d_0) {
  if (_same_0) {
    return {$: "Pix", ["color"]: _a_0};
  } else {
    return {$: "Qua", ["tl"]: {$: "Pix", ["color"]: _a_0}, ["tr"]: {$: "Pix", ["color"]: _b_0}, ["bl"]: {$: "Pix", ["color"]: _c_0}, ["br"]: {$: "Pix", ["color"]: _d_0}};
  }
}

function $Bool$pick$(_c_0, _a_0, _b_0) {
  if (!_c_0) {
    return _b_0;
  } else {
    return _a_0;
  }
}

function $$$$ImageView$choose$(_sx_0, _sy_0, _span_0, _x_0, _y_0, _size_0) {
  const _half_0 = (2 === 0 ? 0 : (_span_0 / 2) >>> 0);
  return run_jump($$$$ImageView$choose_axes$, [run_loop($$$$ImageView$axis$(_sx_0, _half_0, _x_0, _size_0)), run_loop($$$$ImageView$axis$(_sy_0, _half_0, _y_0, _size_0))]);
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
export default {
  "tree": run_lib($tree$, 7),
  "start": run_lib($start$, 4),
  "shift": run_lib($shift$, 5),
};
