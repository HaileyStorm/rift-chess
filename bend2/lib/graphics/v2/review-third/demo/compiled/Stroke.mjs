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

function $Color$red$(_c_0) {
  const _x_0 = (16n >= 32n ? 0 : (_c_0 >>> Number(16n)) >>> 0);
  return ((_x_0 & 255) >>> 0);
}

function $Color$green$(_c_0) {
  const _x_0 = (8n >= 32n ? 0 : (_c_0 >>> Number(8n)) >>> 0);
  return ((_x_0 & 255) >>> 0);
}

function $Color$blue$(_c_0) {
  return ((_c_0 & 255) >>> 0);
}

function $Color$rgb$(_r_0, _g_0, _b_0) {
  const _x_0 = ((_r_0 & 255) >>> 0);
  const _x_1 = ((_g_0 & 255) >>> 0);
  const _x_2 = (16n >= 32n ? 0 : (_x_0 << Number(16n)) >>> 0);
  const _x_3 = (8n >= 32n ? 0 : (_x_1 << Number(8n)) >>> 0);
  const _x_4 = ((_x_2 | _x_3) >>> 0);
  const _x_5 = ((_b_0 & 255) >>> 0);
  return ((_x_4 | _x_5) >>> 0);
}

function $Color$channel$(_source_0, _dest_0, _alpha_0) {
  const _x_0 = ((255 - _alpha_0) >>> 0);
  const _x_1 = (Math.imul(_source_0, _alpha_0) >>> 0);
  const _x_2 = (Math.imul(_dest_0, _x_0) >>> 0);
  const _x_3 = ((_x_1 + _x_2) >>> 0);
  const _x_4 = ((_x_3 + 127) >>> 0);
  return (255 === 0 ? 0 : (_x_4 / 255) >>> 0);
}

function $Color$over_partial$(_src_0, _dest_0, _opacity_0) {
  const _alpha_0 = run_loop($U32$min$(_opacity_0, 255));
  return run_jump($Color$rgb$, [run_loop($Color$channel$(run_loop($Color$red$(_src_0)), run_loop($Color$red$(_dest_0)), _alpha_0)), run_loop($Color$channel$(run_loop($Color$green$(_src_0)), run_loop($Color$green$(_dest_0)), _alpha_0)), run_loop($Color$channel$(run_loop($Color$blue$(_src_0)), run_loop($Color$blue$(_dest_0)), _alpha_0))]);
}

function $Color$over_case$(_empty_0, _full_0, _src_0, _dest_0, _opacity_0) {
  if (_empty_0) {
    return _dest_0;
  } else {
    if (_full_0) {
      return _src_0;
    } else {
      return run_jump($Color$over_partial$, [_src_0, _dest_0, _opacity_0]);
    }
  }
}

function $Color$over$(_src_0, _dest_0, _opacity_0) {
  return run_jump($Color$over_case$, [(_opacity_0 === 0), (_opacity_0 >= 255), _src_0, _dest_0, _opacity_0]);
}

function $Color$add_channel$(_a_0, _b_0) {
  return run_jump($U32$min$, [((_a_0 + _b_0) >>> 0), 255]);
}

function $Color$add$(_a_0, _b_0) {
  return run_jump($Color$rgb$, [run_loop($Color$add_channel$(run_loop($Color$red$(_a_0)), run_loop($Color$red$(_b_0)))), run_loop($Color$add_channel$(run_loop($Color$green$(_a_0)), run_loop($Color$green$(_b_0)))), run_loop($Color$add_channel$(run_loop($Color$blue$(_a_0)), run_loop($Color$blue$(_b_0))))]);
}

function $Color$scale$(_a_0, _strength_0) {
  return run_jump($Color$rgb$, [run_loop($Color$channel$(run_loop($Color$red$(_a_0)), 0, run_loop($U32$min$(_strength_0, 255)))), run_loop($Color$channel$(run_loop($Color$green$(_a_0)), 0, run_loop($U32$min$(_strength_0, 255)))), run_loop($Color$channel$(run_loop($Color$blue$(_a_0)), 0, run_loop($U32$min$(_strength_0, 255))))]);
}

function $Shapes$valid_coord$(_c_0) {
  if (_c_0.$ === "Pos") {
    const _value_0 = _c_0["value"];
    return (_value_0 <= 4096);
  } else {
    const _magnitude_0 = _c_0["magnitude"];
    return (_magnitude_0 <= 4096);
  }
}

function $Shapes$biased$(_c_0) {
  if (_c_0.$ === "Pos") {
    const _value_0 = _c_0["value"];
    return ((4096 + _value_0) >>> 0);
  } else {
    const _magnitude_0 = _c_0["magnitude"];
    return ((4096 - _magnitude_0) >>> 0);
  }
}

function $Shapes$diff$(_a_0, _b_0) {
  const _x_0 = run_loop($U32$max$(_a_0, _b_0));
  const _x_1 = run_loop($U32$min$(_a_0, _b_0));
  return ((_x_0 - _x_1) >>> 0);
}

function $Shapes$square$(_a_0) {
  return (Math.imul(_a_0, _a_0) >>> 0);
}

function $Shapes$near_case$(_low_0, _high_0, _lo_0, _hi_0, _center_0) {
  if (_low_0) {
    return ((_lo_0 - _center_0) >>> 0);
  } else {
    if (_high_0) {
      return ((_center_0 - _hi_0) >>> 0);
    } else {
      return 0;
    }
  }
}

function $Shapes$near$(_lo_0, _hi_0, _center_0) {
  return run_jump($Shapes$near_case$, [(_center_0 < _lo_0), (_center_0 > _hi_0), _lo_0, _hi_0, _center_0]);
}

function $Shapes$far$(_lo_0, _hi_0, _center_0) {
  return run_jump($U32$max$, [run_loop($Shapes$diff$(_lo_0, _center_0)), run_loop($Shapes$diff$(_hi_0, _center_0))]);
}

function $Shapes$outside_disk$(_x_0, _y_0, _size_0, _cx_0, _cy_0, _radius_0) {
  const _x_1 = (Math.imul(_x_0, 4) >>> 0);
  const _lx_0 = ((_x_1 + 1) >>> 0);
  const _x_2 = (Math.imul(_y_0, 4) >>> 0);
  const _ly_0 = ((_x_2 + 1) >>> 0);
  const _x_3 = ((_x_0 + _size_0) >>> 0);
  const _x_4 = ((_x_3 - 1) >>> 0);
  const _x_5 = (Math.imul(_x_4, 4) >>> 0);
  const _hx_0 = ((_x_5 + 3) >>> 0);
  const _x_6 = ((_y_0 + _size_0) >>> 0);
  const _x_7 = ((_x_6 - 1) >>> 0);
  const _x_8 = (Math.imul(_x_7, 4) >>> 0);
  const _hy_0 = ((_x_8 + 3) >>> 0);
  const _dx_0 = run_loop($Shapes$near$(_lx_0, _hx_0, (Math.imul(_cx_0, 4) >>> 0)));
  const _dy_0 = run_loop($Shapes$near$(_ly_0, _hy_0, (Math.imul(_cy_0, 4) >>> 0)));
  const _x_9 = run_loop($Shapes$square$(_dx_0));
  const _x_10 = run_loop($Shapes$square$(_dy_0));
  const _x_11 = ((_x_9 + _x_10) >>> 0);
  const _x_12 = run_loop($Shapes$square$((Math.imul(_radius_0, 4) >>> 0)));
  return (_x_11 > _x_12);
}

function $Shapes$inside_disk$(_x_0, _y_0, _size_0, _cx_0, _cy_0, _radius_0) {
  const _x_1 = (Math.imul(_x_0, 4) >>> 0);
  const _lx_0 = ((_x_1 + 1) >>> 0);
  const _x_2 = (Math.imul(_y_0, 4) >>> 0);
  const _ly_0 = ((_x_2 + 1) >>> 0);
  const _x_3 = ((_x_0 + _size_0) >>> 0);
  const _x_4 = ((_x_3 - 1) >>> 0);
  const _x_5 = (Math.imul(_x_4, 4) >>> 0);
  const _hx_0 = ((_x_5 + 3) >>> 0);
  const _x_6 = ((_y_0 + _size_0) >>> 0);
  const _x_7 = ((_x_6 - 1) >>> 0);
  const _x_8 = (Math.imul(_x_7, 4) >>> 0);
  const _hy_0 = ((_x_8 + 3) >>> 0);
  const _dx_0 = run_loop($Shapes$far$(_lx_0, _hx_0, (Math.imul(_cx_0, 4) >>> 0)));
  const _dy_0 = run_loop($Shapes$far$(_ly_0, _hy_0, (Math.imul(_cy_0, 4) >>> 0)));
  const _x_9 = run_loop($Shapes$square$(_dx_0));
  const _x_10 = run_loop($Shapes$square$(_dy_0));
  const _x_11 = ((_x_9 + _x_10) >>> 0);
  const _x_12 = run_loop($Shapes$square$((Math.imul(_radius_0, 4) >>> 0)));
  return (_x_11 <= _x_12);
}

function $Shapes$bit$(_inside_0) {
  if (!_inside_0) {
    return 0;
  } else {
    return 1;
  }
}

function $Shapes$disk_point$(_xx_0, _yy_0, _cx_0, _cy_0, _radius_0) {
  const _dx_0 = run_loop($Shapes$diff$(_xx_0, (Math.imul(_cx_0, 4) >>> 0)));
  const _dy_0 = run_loop($Shapes$diff$(_yy_0, (Math.imul(_cy_0, 4) >>> 0)));
  const _x_0 = run_loop($Shapes$square$(_dx_0));
  const _x_1 = run_loop($Shapes$square$(_dy_0));
  const _x_2 = ((_x_0 + _x_1) >>> 0);
  const _x_3 = run_loop($Shapes$square$((Math.imul(_radius_0, 4) >>> 0)));
  return (_x_2 <= _x_3);
}

function $Shapes$disk_coverage$(_x_0, _y_0, _cx_0, _cy_0, _radius_0) {
  const _xx_0 = (Math.imul(_x_0, 4) >>> 0);
  const _yy_0 = (Math.imul(_y_0, 4) >>> 0);
  const _x_1 = run_loop($Shapes$bit$(run_loop($Shapes$disk_point$(((_xx_0 + 1) >>> 0), ((_yy_0 + 1) >>> 0), _cx_0, _cy_0, _radius_0))));
  const _x_2 = run_loop($Shapes$bit$(run_loop($Shapes$disk_point$(((_xx_0 + 3) >>> 0), ((_yy_0 + 1) >>> 0), _cx_0, _cy_0, _radius_0))));
  const _x_3 = run_loop($Shapes$bit$(run_loop($Shapes$disk_point$(((_xx_0 + 1) >>> 0), ((_yy_0 + 3) >>> 0), _cx_0, _cy_0, _radius_0))));
  const _x_4 = run_loop($Shapes$bit$(run_loop($Shapes$disk_point$(((_xx_0 + 3) >>> 0), ((_yy_0 + 3) >>> 0), _cx_0, _cy_0, _radius_0))));
  const _x_5 = ((_x_1 + _x_2) >>> 0);
  const _x_6 = ((_x_3 + _x_4) >>> 0);
  return ((_x_5 + _x_6) >>> 0);
}

function $Shapes$paint_leaf$(_count_0, _opacity_0, _color_0, _image_0) {
  if (_image_0.$ === "Pix") {
    const _background_0 = _image_0["color"];
    const _x_0 = run_loop($U32$min$(_opacity_0, 255));
    const _x_1 = (Math.imul(_x_0, _count_0) >>> 0);
    return {$: "Pix", ["color"]: run_loop($Color$over$(_color_0, _background_0, (4 === 0 ? 0 : (_x_1 / 4) >>> 0)))};
  } else {
    const _tl_0 = _image_0["tl"];
    const _tr_0 = _image_0["tr"];
    const _bl_0 = _image_0["bl"];
    const _br_0 = _image_0["br"];
    return {$: "Pix", ["color"]: 0};
  }
}

function $Shapes$full_blend$(_depth_0, _color_0, _opacity_0, _image_0) {
  if (_depth_0 === 0n) {
    if (_image_0.$ === "Pix") {
      const _background_0 = _image_0["color"];
      return {$: "Pix", ["color"]: run_loop($Color$over$(_color_0, _background_0, _opacity_0))};
    } else {
      const _tl_0 = _image_0["tl"];
      const _tr_0 = _image_0["tr"];
      const _bl_0 = _image_0["bl"];
      const _br_0 = _image_0["br"];
      return {$: "Pix", ["color"]: 0};
    }
  } else {
    const _rest_0 = (_depth_0 - 1n);
    if (_image_0.$ === "Pix") {
      const _background_1 = _image_0["color"];
      return {$: "Pix", ["color"]: run_loop($Color$over$(_color_0, _background_1, _opacity_0))};
    } else {
      const _tl_1 = _image_0["tl"];
      const _tr_1 = _image_0["tr"];
      const _bl_1 = _image_0["bl"];
      const _br_1 = _image_0["br"];
      const _a_0 = run_loop($Shapes$full_blend$(_rest_0, _color_0, _opacity_0, _tl_1));
      const _b_0 = run_loop($Shapes$full_blend$(_rest_0, _color_0, _opacity_0, _tr_1));
      const _c_0 = run_loop($Shapes$full_blend$(_rest_0, _color_0, _opacity_0, _bl_1));
      const _d_0 = run_loop($Shapes$full_blend$(_rest_0, _color_0, _opacity_0, _br_1));
      return {$: "Qua", ["tl"]: _a_0, ["tr"]: _b_0, ["bl"]: _c_0, ["br"]: _d_0};
    }
  }
}

function $Shapes$full_case$(_full_0, _depth_0, _opacity_0, _color_0, _image_0) {
  if (_full_0) {
    return {$: "Pix", ["color"]: _color_0};
  } else {
    return run_jump($Shapes$full_blend$, [_depth_0, _color_0, _opacity_0, _image_0]);
  }
}

function $Shapes$full_disk$(_depth_0, _opacity_0, _color_0, _image_0) {
  return run_jump($Shapes$full_case$, [(_opacity_0 >= 255), _depth_0, _opacity_0, _color_0, _image_0]);
}

function $Shapes$disk_tree$(_depth_0, _size_0, _outside_0, _inside_0, _x_0, _y_0, _cx_0, _cy_0, _radius_0, _color_0, _opacity_0, _image_0) {
  if (_depth_0 === 0n) {
    if (_outside_0) {
      return _image_0;
    } else {
      return run_jump($Shapes$paint_leaf$, [run_loop($Shapes$disk_coverage$(_x_0, _y_0, _cx_0, _cy_0, _radius_0)), _opacity_0, _color_0, _image_0]);
    }
  } else {
    const _rest_0 = (_depth_0 - 1n);
    if (_outside_0) {
      return _image_0;
    } else {
      if (_inside_0) {
        return run_jump($Shapes$full_disk$, [nat_chk(_rest_0 + 1n), _opacity_0, _color_0, _image_0]);
      } else {
        if (_image_0.$ === "Pix") {
          const _background_0 = _image_0["color"];
          const _half_0 = (2 === 0 ? 0 : (_size_0 / 2) >>> 0);
          const _xx_0 = ((_x_0 + _half_0) >>> 0);
          const _yy_0 = ((_y_0 + _half_0) >>> 0);
          const _a_0 = run_loop($Shapes$disk_tree$(_rest_0, _half_0, run_loop($Shapes$outside_disk$(_x_0, _y_0, _half_0, _cx_0, _cy_0, _radius_0)), run_loop($Shapes$inside_disk$(_x_0, _y_0, _half_0, _cx_0, _cy_0, _radius_0)), _x_0, _y_0, _cx_0, _cy_0, _radius_0, _color_0, _opacity_0, {$: "Pix", ["color"]: _background_0}));
          const _b_0 = run_loop($Shapes$disk_tree$(_rest_0, _half_0, run_loop($Shapes$outside_disk$(_xx_0, _y_0, _half_0, _cx_0, _cy_0, _radius_0)), run_loop($Shapes$inside_disk$(_xx_0, _y_0, _half_0, _cx_0, _cy_0, _radius_0)), _xx_0, _y_0, _cx_0, _cy_0, _radius_0, _color_0, _opacity_0, {$: "Pix", ["color"]: _background_0}));
          const _c_0 = run_loop($Shapes$disk_tree$(_rest_0, _half_0, run_loop($Shapes$outside_disk$(_x_0, _yy_0, _half_0, _cx_0, _cy_0, _radius_0)), run_loop($Shapes$inside_disk$(_x_0, _yy_0, _half_0, _cx_0, _cy_0, _radius_0)), _x_0, _yy_0, _cx_0, _cy_0, _radius_0, _color_0, _opacity_0, {$: "Pix", ["color"]: _background_0}));
          const _d_0 = run_loop($Shapes$disk_tree$(_rest_0, _half_0, run_loop($Shapes$outside_disk$(_xx_0, _yy_0, _half_0, _cx_0, _cy_0, _radius_0)), run_loop($Shapes$inside_disk$(_xx_0, _yy_0, _half_0, _cx_0, _cy_0, _radius_0)), _xx_0, _yy_0, _cx_0, _cy_0, _radius_0, _color_0, _opacity_0, {$: "Pix", ["color"]: _background_0}));
          return {$: "Qua", ["tl"]: _a_0, ["tr"]: _b_0, ["bl"]: _c_0, ["br"]: _d_0};
        } else {
          const _tl_0 = _image_0["tl"];
          const _tr_0 = _image_0["tr"];
          const _bl_0 = _image_0["bl"];
          const _br_0 = _image_0["br"];
          const _half_1 = (2 === 0 ? 0 : (_size_0 / 2) >>> 0);
          const _xx_1 = ((_x_0 + _half_1) >>> 0);
          const _yy_1 = ((_y_0 + _half_1) >>> 0);
          const _a_1 = run_loop($Shapes$disk_tree$(_rest_0, _half_1, run_loop($Shapes$outside_disk$(_x_0, _y_0, _half_1, _cx_0, _cy_0, _radius_0)), run_loop($Shapes$inside_disk$(_x_0, _y_0, _half_1, _cx_0, _cy_0, _radius_0)), _x_0, _y_0, _cx_0, _cy_0, _radius_0, _color_0, _opacity_0, _tl_0));
          const _b_1 = run_loop($Shapes$disk_tree$(_rest_0, _half_1, run_loop($Shapes$outside_disk$(_xx_1, _y_0, _half_1, _cx_0, _cy_0, _radius_0)), run_loop($Shapes$inside_disk$(_xx_1, _y_0, _half_1, _cx_0, _cy_0, _radius_0)), _xx_1, _y_0, _cx_0, _cy_0, _radius_0, _color_0, _opacity_0, _tr_0));
          const _c_1 = run_loop($Shapes$disk_tree$(_rest_0, _half_1, run_loop($Shapes$outside_disk$(_x_0, _yy_1, _half_1, _cx_0, _cy_0, _radius_0)), run_loop($Shapes$inside_disk$(_x_0, _yy_1, _half_1, _cx_0, _cy_0, _radius_0)), _x_0, _yy_1, _cx_0, _cy_0, _radius_0, _color_0, _opacity_0, _bl_0));
          const _d_1 = run_loop($Shapes$disk_tree$(_rest_0, _half_1, run_loop($Shapes$outside_disk$(_xx_1, _yy_1, _half_1, _cx_0, _cy_0, _radius_0)), run_loop($Shapes$inside_disk$(_xx_1, _yy_1, _half_1, _cx_0, _cy_0, _radius_0)), _xx_1, _yy_1, _cx_0, _cy_0, _radius_0, _color_0, _opacity_0, _br_0));
          return {$: "Qua", ["tl"]: _a_1, ["tr"]: _b_1, ["bl"]: _c_1, ["br"]: _d_1};
        }
      }
    }
  }
}

function $Shapes$disk_valid$(_valid_0, _depth_0, _size_0, _cx_0, _cy_0, _radius_0, _color_0, _opacity_0, _image_0) {
  if (!_valid_0) {
    return _image_0;
  } else {
    const _shift_x_0 = run_loop($Shapes$biased$(_cx_0));
    const _shift_y_0 = run_loop($Shapes$biased$(_cy_0));
    return run_jump($Shapes$disk_tree$, [_depth_0, _size_0, run_loop($Shapes$outside_disk$(4096, 4096, _size_0, _shift_x_0, _shift_y_0, _radius_0)), run_loop($Shapes$inside_disk$(4096, 4096, _size_0, _shift_x_0, _shift_y_0, _radius_0)), 4096, 4096, _shift_x_0, _shift_y_0, _radius_0, _color_0, _opacity_0, _image_0]);
  }
}

function $Shapes$disk_gate$(_zero_radius_0, _zero_opacity_0, _depth_0, _size_0, _cx_0, _cy_0, _radius_0, _color_0, _opacity_0, _image_0) {
  if (_zero_radius_0) {
    return _image_0;
  } else {
    if (_zero_opacity_0) {
      return _image_0;
    } else {
      return run_jump($Shapes$disk_valid$, [run_loop($Bool$and$((_radius_0 <= 4096), run_loop($Bool$and$(run_loop($Shapes$valid_coord$(_cx_0)), run_loop($Shapes$valid_coord$(_cy_0)))))), _depth_0, _size_0, _cx_0, _cy_0, _radius_0, _color_0, _opacity_0, _image_0]);
    }
  }
}

function $Shapes$disk$(_depth_0, _size_0, _cx_0, _cy_0, _radius_0, _color_0, _opacity_0, _image_0) {
  return run_jump($Shapes$disk_gate$, [(_radius_0 === 0), (_opacity_0 === 0), _depth_0, _size_0, _cx_0, _cy_0, _radius_0, _color_0, _opacity_0, _image_0]);
}

function $Rect$empty$() {
  return {$: "Box", ["left"]: 0, ["top"]: 0, ["right"]: 0, ["bottom"]: 0};
}

function $Rect$screen$(_size_0) {
  return {$: "Box", ["left"]: 0, ["top"]: 0, ["right"]: _size_0, ["bottom"]: _size_0};
}

function $Rect$cell$(_x_0, _y_0, _size_0) {
  return {$: "Box", ["left"]: _x_0, ["top"]: _y_0, ["right"]: ((_x_0 + _size_0) >>> 0), ["bottom"]: ((_y_0 + _size_0) >>> 0)};
}

function $Rect$is_empty$(_box_0) {
  const _left_0 = _box_0["left"];
  const _top_0 = _box_0["top"];
  const _right_0 = _box_0["right"];
  const _bottom_0 = _box_0["bottom"];
  const _x_0 = (_left_0 >= _right_0);
  const _x_1 = (_top_0 >= _bottom_0);
  return (_x_0 || _x_1);
}

function $Rect$width$(_box_0) {
  const _left_0 = _box_0["left"];
  const _top_0 = _box_0["top"];
  const _right_0 = _box_0["right"];
  const _bottom_0 = _box_0["bottom"];
  const _x_0 = run_loop($U32$max$(_left_0, _right_0));
  return ((_x_0 - _left_0) >>> 0);
}

function $Rect$height$(_box_0) {
  const _left_0 = _box_0["left"];
  const _top_0 = _box_0["top"];
  const _right_0 = _box_0["right"];
  const _bottom_0 = _box_0["bottom"];
  const _x_0 = run_loop($U32$max$(_top_0, _bottom_0));
  return ((_x_0 - _top_0) >>> 0);
}

function $Rect$intersect$(_a_0, _b_0) {
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

function $Rect$overlaps$(_a_0, _b_0) {
  return run_jump($Bool$not$, [run_loop($Rect$is_empty$(run_loop($Rect$intersect$(_a_0, _b_0))))]);
}

function $Rect$contains_parts$(_a_0, _b_0) {
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

function $Rect$contains$(_a_0, _b_0) {
  const _x_0 = run_loop($Rect$is_empty$(_b_0));
  const _x_1 = run_loop($Bool$and$(run_loop($Bool$not$(run_loop($Rect$is_empty$(_a_0)))), run_loop($Rect$contains_parts$(_a_0, _b_0))));
  return (_x_0 || _x_1);
}

function $Rect$point$(_box_0, _x_0, _y_0) {
  const _left_0 = _box_0["left"];
  const _top_0 = _box_0["top"];
  const _right_0 = _box_0["right"];
  const _bottom_0 = _box_0["bottom"];
  return run_jump($Bool$and$, [run_loop($Bool$and$((_x_0 >= _left_0), (_x_0 < _right_0))), run_loop($Bool$and$((_y_0 >= _top_0), (_y_0 < _bottom_0)))]);
}

function $Rect$union_parts$(_a_0, _b_0) {
  const _al_0 = _a_0["left"];
  const _at_0 = _a_0["top"];
  const _ar_0 = _a_0["right"];
  const _ab_0 = _a_0["bottom"];
  const _bl_0 = _b_0["left"];
  const _bt_0 = _b_0["top"];
  const _br_0 = _b_0["right"];
  const _bb_0 = _b_0["bottom"];
  return {$: "Box", ["left"]: run_loop($U32$min$(_al_0, _bl_0)), ["top"]: run_loop($U32$min$(_at_0, _bt_0)), ["right"]: run_loop($U32$max$(_ar_0, _br_0)), ["bottom"]: run_loop($U32$max$(_ab_0, _bb_0))};
}

function $Rect$union_case$(_a_empty_0, _b_empty_0, _a_0, _b_0) {
  if (_a_empty_0) {
    return _b_0;
  } else {
    if (_b_empty_0) {
      return _a_0;
    } else {
      return run_jump($Rect$union_parts$, [_a_0, _b_0]);
    }
  }
}

function $Rect$union$(_a_0, _b_0) {
  return run_jump($Rect$union_case$, [run_loop($Rect$is_empty$(_a_0)), run_loop($Rect$is_empty$(_b_0)), _a_0, _b_0]);
}

function $Rect$sprite_valid$(_valid_0, _size_0, _sx_0, _sy_0, _span_0) {
  if (!_valid_0) {
    return run_jump($Rect$empty$, []);
  } else {
    const _x_0 = run_loop($U32$max$(_sx_0, 4096));
    const _x_1 = run_loop($U32$max$(_sy_0, 4096));
    const _x_2 = run_loop($U32$max$(((_sx_0 + _span_0) >>> 0), 4096));
    const _x_3 = run_loop($U32$max$(((_sy_0 + _span_0) >>> 0), 4096));
    return run_jump($Rect$intersect$, [run_loop($Rect$screen$(_size_0)), {$: "Box", ["left"]: ((_x_0 - 4096) >>> 0), ["top"]: ((_x_1 - 4096) >>> 0), ["right"]: ((_x_2 - 4096) >>> 0), ["bottom"]: ((_x_3 - 4096) >>> 0)}]);
  }
}

function $Rect$sprite$(_size_0, _left_0, _top_0, _span_0) {
  return run_jump($Rect$sprite_valid$, [run_loop($Bool$and$(run_loop($Bool$and$(run_loop($Shapes$valid_coord$(_left_0)), run_loop($Shapes$valid_coord$(_top_0)))), run_loop($Bool$and$((_size_0 <= 4096), (_span_0 <= 4096))))), _size_0, run_loop($Shapes$biased$(_left_0)), run_loop($Shapes$biased$(_top_0)), _span_0]);
}

function $ImageOps$tl$(_image_0) {
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

function $ImageOps$tr$(_image_0) {
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

function $ImageOps$bl$(_image_0) {
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

function $ImageOps$br$(_image_0) {
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

function $ImageOps$quad_case$(_same_0, _a_0, _b_0, _c_0, _d_0) {
  if (_same_0) {
    return {$: "Pix", ["color"]: _a_0};
  } else {
    return {$: "Qua", ["tl"]: {$: "Pix", ["color"]: _a_0}, ["tr"]: {$: "Pix", ["color"]: _b_0}, ["bl"]: {$: "Pix", ["color"]: _c_0}, ["br"]: {$: "Pix", ["color"]: _d_0}};
  }
}

function $ImageOps$quad$(_tl_0, _tr_0, _bl_0, _br_0) {
  if (_tl_0.$ === "Pix") {
    const _a_0 = _tl_0["color"];
    if (_tr_0.$ === "Pix") {
      const _b_0 = _tr_0["color"];
      if (_bl_0.$ === "Pix") {
        const _c_0 = _bl_0["color"];
        if (_br_0.$ === "Pix") {
          const _d_0 = _br_0["color"];
          return run_jump($ImageOps$quad_case$, [run_loop($Bool$and$(run_loop($Bool$and$((_a_0 === _b_0), (_a_0 === _c_0))), (_a_0 === _d_0))), _a_0, _b_0, _c_0, _d_0]);
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

function $Facet$covered$(_q_0, _x_0, _y_0) {
  return run_jump($Bool$not$, [run_loop($$$$Quad$outside$(_q_0, _x_0, _y_0, 0))]);
}

function $Facet$coverage$(_q_0, _x_0, _y_0) {
  const _x_1 = run_loop($Shapes$bit$(run_loop($Facet$covered$(_q_0, Math.fround(_x_0 + 0.25), Math.fround(_y_0 + 0.25)))));
  const _x_2 = run_loop($Shapes$bit$(run_loop($Facet$covered$(_q_0, Math.fround(_x_0 + 0.75), Math.fround(_y_0 + 0.25)))));
  const _x_3 = run_loop($Shapes$bit$(run_loop($Facet$covered$(_q_0, Math.fround(_x_0 + 0.25), Math.fround(_y_0 + 0.75)))));
  const _x_4 = run_loop($Shapes$bit$(run_loop($Facet$covered$(_q_0, Math.fround(_x_0 + 0.75), Math.fround(_y_0 + 0.75)))));
  const _x_5 = ((_x_1 + _x_2) >>> 0);
  const _x_6 = ((_x_3 + _x_4) >>> 0);
  return ((_x_5 + _x_6) >>> 0);
}

function $Facet$outside_pixels$(_q_0, _x_0, _y_0, _size_0) {
  return run_jump($$$$Quad$outside$, [_q_0, _x_0, _y_0, Math.fround(_size_0)]);
}

function $Facet$inside_pixels$(_q_0, _x_0, _y_0, _size_0) {
  return run_jump($$$$Quad$inside$, [_q_0, _x_0, _y_0, Math.fround(_size_0)]);
}

function $Facet$tree$(_depth_0, _size_0, _excluded_0, _full_0, _x_0, _y_0, _q_0, _color_0, _opacity_0, _image_0) {
  if (_depth_0 === 0n) {
    if (_excluded_0) {
      return _image_0;
    } else {
      return run_jump($Shapes$paint_leaf$, [run_loop($Facet$coverage$(_q_0, _x_0, _y_0)), _opacity_0, _color_0, _image_0]);
    }
  } else {
    const _rest_0 = (_depth_0 - 1n);
    if (_excluded_0) {
      return _image_0;
    } else {
      if (_full_0) {
        return run_jump($Shapes$full_disk$, [nat_chk(_rest_0 + 1n), _opacity_0, _color_0, _image_0]);
      } else {
        if (_image_0.$ === "Pix") {
          const _background_0 = _image_0["color"];
          const _half_0 = (2 === 0 ? 0 : (_size_0 / 2) >>> 0);
          const _delta_0 = Math.fround(_half_0);
          const _xx_0 = Math.fround(_x_0 + _delta_0);
          const _yy_0 = Math.fround(_y_0 + _delta_0);
          const _a_0 = run_loop($Facet$tree$(_rest_0, _half_0, run_loop($Facet$outside_pixels$(_q_0, _x_0, _y_0, _half_0)), run_loop($Facet$inside_pixels$(_q_0, _x_0, _y_0, _half_0)), _x_0, _y_0, _q_0, _color_0, _opacity_0, {$: "Pix", ["color"]: _background_0}));
          const _b_0 = run_loop($Facet$tree$(_rest_0, _half_0, run_loop($Facet$outside_pixels$(_q_0, _xx_0, _y_0, _half_0)), run_loop($Facet$inside_pixels$(_q_0, _xx_0, _y_0, _half_0)), _xx_0, _y_0, _q_0, _color_0, _opacity_0, {$: "Pix", ["color"]: _background_0}));
          const _c_0 = run_loop($Facet$tree$(_rest_0, _half_0, run_loop($Facet$outside_pixels$(_q_0, _x_0, _yy_0, _half_0)), run_loop($Facet$inside_pixels$(_q_0, _x_0, _yy_0, _half_0)), _x_0, _yy_0, _q_0, _color_0, _opacity_0, {$: "Pix", ["color"]: _background_0}));
          const _d_0 = run_loop($Facet$tree$(_rest_0, _half_0, run_loop($Facet$outside_pixels$(_q_0, _xx_0, _yy_0, _half_0)), run_loop($Facet$inside_pixels$(_q_0, _xx_0, _yy_0, _half_0)), _xx_0, _yy_0, _q_0, _color_0, _opacity_0, {$: "Pix", ["color"]: _background_0}));
          return {$: "Qua", ["tl"]: _a_0, ["tr"]: _b_0, ["bl"]: _c_0, ["br"]: _d_0};
        } else {
          const _tl_0 = _image_0["tl"];
          const _tr_0 = _image_0["tr"];
          const _bl_0 = _image_0["bl"];
          const _br_0 = _image_0["br"];
          const _half_1 = (2 === 0 ? 0 : (_size_0 / 2) >>> 0);
          const _delta_1 = Math.fround(_half_1);
          const _xx_1 = Math.fround(_x_0 + _delta_1);
          const _yy_1 = Math.fround(_y_0 + _delta_1);
          const _a_1 = run_loop($Facet$tree$(_rest_0, _half_1, run_loop($Facet$outside_pixels$(_q_0, _x_0, _y_0, _half_1)), run_loop($Facet$inside_pixels$(_q_0, _x_0, _y_0, _half_1)), _x_0, _y_0, _q_0, _color_0, _opacity_0, _tl_0));
          const _b_1 = run_loop($Facet$tree$(_rest_0, _half_1, run_loop($Facet$outside_pixels$(_q_0, _xx_1, _y_0, _half_1)), run_loop($Facet$inside_pixels$(_q_0, _xx_1, _y_0, _half_1)), _xx_1, _y_0, _q_0, _color_0, _opacity_0, _tr_0));
          const _c_1 = run_loop($Facet$tree$(_rest_0, _half_1, run_loop($Facet$outside_pixels$(_q_0, _x_0, _yy_1, _half_1)), run_loop($Facet$inside_pixels$(_q_0, _x_0, _yy_1, _half_1)), _x_0, _yy_1, _q_0, _color_0, _opacity_0, _bl_0));
          const _d_1 = run_loop($Facet$tree$(_rest_0, _half_1, run_loop($Facet$outside_pixels$(_q_0, _xx_1, _yy_1, _half_1)), run_loop($Facet$inside_pixels$(_q_0, _xx_1, _yy_1, _half_1)), _xx_1, _yy_1, _q_0, _color_0, _opacity_0, _br_0));
          return {$: "Qua", ["tl"]: _a_1, ["tr"]: _b_1, ["bl"]: _c_1, ["br"]: _d_1};
        }
      }
    }
  }
}

function $Facet$draw_valid$(_valid_0, _depth_0, _size_0, _q_0, _color_0, _opacity_0, _image_0) {
  if (!_valid_0) {
    return _image_0;
  } else {
    return run_jump($Facet$tree$, [_depth_0, _size_0, run_loop($Facet$outside_pixels$(_q_0, 0, 0, _size_0)), run_loop($Facet$inside_pixels$(_q_0, 0, 0, _size_0)), 0, 0, _q_0, _color_0, _opacity_0, _image_0]);
  }
}

function $Facet$draw$(_depth_0, _size_0, _q_0, _color_0, _opacity_0, _image_0) {
  const _ab_0 = _q_0["ab"];
  const _bc_0 = _q_0["bc"];
  const _cd_0 = _q_0["cd"];
  const _da_0 = _q_0["da"];
  const _area_0 = _q_0["area"];
  return run_jump($Facet$draw_valid$, [run_loop($Bool$and$((_area_0 > 0.10000000149011612), (_opacity_0 !== 0))), _depth_0, _size_0, {$: "Shape", ["ab"]: _ab_0, ["bc"]: _bc_0, ["cd"]: _cd_0, ["da"]: _da_0, ["area"]: _area_0}, _color_0, _opacity_0, _image_0]);
}

function $AffineTexture$point_x$(_point_0) {
  const _x_0 = _point_0["x"];
  const _y_0 = _point_0["y"];
  return _x_0;
}

function $AffineTexture$point_y$(_point_0) {
  const _x_0 = _point_0["x"];
  const _y_0 = _point_0["y"];
  return _y_0;
}

function $AffineTexture$valid_source_size$(_source_size_0) {
  return (_source_size_0 !== 0);
}

function $AffineTexture$texel_case$(_low_0, _high_0, _value_0, _source_size_0) {
  if (_low_0) {
    return 0;
  } else {
    if (_high_0) {
      return ((_source_size_0 - 1) >>> 0);
    } else {
      const _x_0 = Math.fround(_source_size_0);
      const _x_1 = Math.fround(_value_0 * _x_0);
      return (_x_1 >= 1 && _x_1 < 4294967296 ? Math.floor(_x_1) : 0);
    }
  }
}

function $AffineTexture$texel$(_value_0, _source_size_0) {
  return run_jump($AffineTexture$texel_case$, [run_loop($Bool$not$((_value_0 > 0))), run_loop($Bool$not$((_value_0 < 1))), _value_0, _source_size_0]);
}

function $AffineTexture$index_at$(_basis_0, _x_0, _y_0, _source_size_0) {
  const _ux_0 = _basis_0["ux"];
  const _uy_0 = _basis_0["uy"];
  const _vx_0 = _basis_0["vx"];
  const _vy_0 = _basis_0["vy"];
  const _ox_0 = _basis_0["ox"];
  const _oy_0 = _basis_0["oy"];
  const _x_1 = Math.fround(_x_0);
  const _x_2 = Math.fround(_x_1 + 0.5);
  const _dx_0 = Math.fround(_x_2 - _ox_0);
  const _x_3 = Math.fround(_y_0);
  const _x_4 = Math.fround(_x_3 + 0.5);
  const _dy_0 = Math.fround(_x_4 - _oy_0);
  const _x_5 = Math.fround(_ux_0 * _dx_0);
  const _x_6 = Math.fround(_uy_0 * _dy_0);
  const _u_0 = Math.fround(_x_5 + _x_6);
  const _x_7 = Math.fround(_vx_0 * _dx_0);
  const _x_8 = Math.fround(_vy_0 * _dy_0);
  const _v_0 = Math.fround(_x_7 + _x_8);
  return {$: "Index", ["u"]: run_loop($AffineTexture$texel$(_u_0, _source_size_0)), ["v"]: run_loop($AffineTexture$texel$(_v_0, _source_size_0))};
}

function $AffineTexture$color_index$(_index_0, _source_0, _source_depth_0) {
  const _u_0 = _index_0["u"];
  const _v_0 = _index_0["v"];
  return run_jump($$$$pixels$Pixel$sample_xy$, [_source_depth_0, _u_0, _v_0, _source_0]);
}

function $AffineTexture$color_at$(_basis_0, _x_0, _y_0, _source_0, _source_depth_0, _source_size_0) {
  return run_jump($AffineTexture$color_index$, [run_loop($AffineTexture$index_at$(_basis_0, _x_0, _y_0, _source_size_0)), _source_0, _source_depth_0]);
}

function $AffineTexture$same_index$(_a_0, _b_0) {
  const _au_0 = _a_0["u"];
  const _av_0 = _a_0["v"];
  const _bu_0 = _b_0["u"];
  const _bv_0 = _b_0["v"];
  return run_jump($Bool$and$, [(_au_0 === _bu_0), (_av_0 === _bv_0)]);
}

function $AffineTexture$one_texel$(_basis_0, _x_0, _y_0, _size_0, _source_size_0) {
  const _x_1 = ((_x_0 + _size_0) >>> 0);
  const _xx_0 = ((_x_1 - 1) >>> 0);
  const _x_2 = ((_y_0 + _size_0) >>> 0);
  const _yy_0 = ((_x_2 - 1) >>> 0);
  const _a_0 = run_loop($AffineTexture$index_at$(_basis_0, _x_0, _y_0, _source_size_0));
  const _b_0 = run_loop($AffineTexture$index_at$(_basis_0, _xx_0, _y_0, _source_size_0));
  const _c_0 = run_loop($AffineTexture$index_at$(_basis_0, _x_0, _yy_0, _source_size_0));
  const _d_0 = run_loop($AffineTexture$index_at$(_basis_0, _xx_0, _yy_0, _source_size_0));
  return run_jump($Bool$and$, [run_loop($Bool$and$(run_loop($AffineTexture$same_index$(_a_0, _b_0)), run_loop($AffineTexture$same_index$(_a_0, _c_0)))), run_loop($AffineTexture$same_index$(_a_0, _d_0))]);
}

function $AffineTexture$can_fill$(_inside_0, _basis_0, _x_0, _y_0, _size_0, _source_size_0) {
  if (!_inside_0) {
    return false;
  } else {
    return run_jump($AffineTexture$one_texel$, [_basis_0, _x_0, _y_0, _size_0, _source_size_0]);
  }
}

function $AffineTexture$fill_test$(_depth_0, _size_0, _x_0, _y_0, _q_0, _basis_0, _source_size_0) {
  if (_depth_0 === 0n) {
    return false;
  } else {
    const _rest_0 = (_depth_0 - 1n);
    return run_jump($AffineTexture$can_fill$, [run_loop($Facet$inside_pixels$(_q_0, Math.fround(_x_0), Math.fround(_y_0), _size_0)), _basis_0, _x_0, _y_0, _size_0, _source_size_0]);
  }
}

function $AffineTexture$leaf_case$(_empty_0, _count_0, _basis_0, _x_0, _y_0, _source_0, _source_depth_0, _source_size_0, _opacity_0, _image_0) {
  if (_empty_0) {
    return _image_0;
  } else {
    return run_jump($Shapes$paint_leaf$, [_count_0, _opacity_0, run_loop($AffineTexture$color_at$(_basis_0, _x_0, _y_0, _source_0, _source_depth_0, _source_size_0)), _image_0]);
  }
}

function $AffineTexture$leaf$(_count_0, _basis_0, _x_0, _y_0, _source_0, _source_depth_0, _source_size_0, _opacity_0, _image_0) {
  return run_jump($AffineTexture$leaf_case$, [(_count_0 === 0), _count_0, _basis_0, _x_0, _y_0, _source_0, _source_depth_0, _source_size_0, _opacity_0, _image_0]);
}

function $AffineTexture$tree$(_depth_0, _size_0, _outside_0, _fill_0, _x_0, _y_0, _q_0, _basis_0, _source_0, _source_depth_0, _source_size_0, _opacity_0, _image_0) {
  if (_depth_0 === 0n) {
    if (_outside_0) {
      return _image_0;
    } else {
      return run_jump($AffineTexture$leaf$, [run_loop($Facet$coverage$(_q_0, Math.fround(_x_0), Math.fround(_y_0))), _basis_0, _x_0, _y_0, _source_0, _source_depth_0, _source_size_0, _opacity_0, _image_0]);
    }
  } else {
    const _rest_0 = (_depth_0 - 1n);
    if (_outside_0) {
      return _image_0;
    } else {
      if (_fill_0) {
        return run_jump($Shapes$full_disk$, [nat_chk(_rest_0 + 1n), _opacity_0, run_loop($AffineTexture$color_at$(_basis_0, _x_0, _y_0, _source_0, _source_depth_0, _source_size_0)), _image_0]);
      } else {
        if (_image_0.$ === "Pix") {
          const _background_0 = _image_0["color"];
          const _half_0 = (2 === 0 ? 0 : (_size_0 / 2) >>> 0);
          const _xx_0 = ((_x_0 + _half_0) >>> 0);
          const _yy_0 = ((_y_0 + _half_0) >>> 0);
          const _a_0 = run_loop($AffineTexture$tree$(_rest_0, _half_0, run_loop($Facet$outside_pixels$(_q_0, Math.fround(_x_0), Math.fround(_y_0), _half_0)), run_loop($AffineTexture$fill_test$(_rest_0, _half_0, _x_0, _y_0, _q_0, _basis_0, _source_size_0)), _x_0, _y_0, _q_0, _basis_0, _source_0, _source_depth_0, _source_size_0, _opacity_0, {$: "Pix", ["color"]: _background_0}));
          const _b_0 = run_loop($AffineTexture$tree$(_rest_0, _half_0, run_loop($Facet$outside_pixels$(_q_0, Math.fround(_xx_0), Math.fround(_y_0), _half_0)), run_loop($AffineTexture$fill_test$(_rest_0, _half_0, _xx_0, _y_0, _q_0, _basis_0, _source_size_0)), _xx_0, _y_0, _q_0, _basis_0, _source_0, _source_depth_0, _source_size_0, _opacity_0, {$: "Pix", ["color"]: _background_0}));
          const _c_0 = run_loop($AffineTexture$tree$(_rest_0, _half_0, run_loop($Facet$outside_pixels$(_q_0, Math.fround(_x_0), Math.fround(_yy_0), _half_0)), run_loop($AffineTexture$fill_test$(_rest_0, _half_0, _x_0, _yy_0, _q_0, _basis_0, _source_size_0)), _x_0, _yy_0, _q_0, _basis_0, _source_0, _source_depth_0, _source_size_0, _opacity_0, {$: "Pix", ["color"]: _background_0}));
          const _d_0 = run_loop($AffineTexture$tree$(_rest_0, _half_0, run_loop($Facet$outside_pixels$(_q_0, Math.fround(_xx_0), Math.fround(_yy_0), _half_0)), run_loop($AffineTexture$fill_test$(_rest_0, _half_0, _xx_0, _yy_0, _q_0, _basis_0, _source_size_0)), _xx_0, _yy_0, _q_0, _basis_0, _source_0, _source_depth_0, _source_size_0, _opacity_0, {$: "Pix", ["color"]: _background_0}));
          return {$: "Qua", ["tl"]: _a_0, ["tr"]: _b_0, ["bl"]: _c_0, ["br"]: _d_0};
        } else {
          const _tl_0 = _image_0["tl"];
          const _tr_0 = _image_0["tr"];
          const _bl_0 = _image_0["bl"];
          const _br_0 = _image_0["br"];
          const _half_1 = (2 === 0 ? 0 : (_size_0 / 2) >>> 0);
          const _xx_1 = ((_x_0 + _half_1) >>> 0);
          const _yy_1 = ((_y_0 + _half_1) >>> 0);
          const _a_1 = run_loop($AffineTexture$tree$(_rest_0, _half_1, run_loop($Facet$outside_pixels$(_q_0, Math.fround(_x_0), Math.fround(_y_0), _half_1)), run_loop($AffineTexture$fill_test$(_rest_0, _half_1, _x_0, _y_0, _q_0, _basis_0, _source_size_0)), _x_0, _y_0, _q_0, _basis_0, _source_0, _source_depth_0, _source_size_0, _opacity_0, _tl_0));
          const _b_1 = run_loop($AffineTexture$tree$(_rest_0, _half_1, run_loop($Facet$outside_pixels$(_q_0, Math.fround(_xx_1), Math.fround(_y_0), _half_1)), run_loop($AffineTexture$fill_test$(_rest_0, _half_1, _xx_1, _y_0, _q_0, _basis_0, _source_size_0)), _xx_1, _y_0, _q_0, _basis_0, _source_0, _source_depth_0, _source_size_0, _opacity_0, _tr_0));
          const _c_1 = run_loop($AffineTexture$tree$(_rest_0, _half_1, run_loop($Facet$outside_pixels$(_q_0, Math.fround(_x_0), Math.fround(_yy_1), _half_1)), run_loop($AffineTexture$fill_test$(_rest_0, _half_1, _x_0, _yy_1, _q_0, _basis_0, _source_size_0)), _x_0, _yy_1, _q_0, _basis_0, _source_0, _source_depth_0, _source_size_0, _opacity_0, _bl_0));
          const _d_1 = run_loop($AffineTexture$tree$(_rest_0, _half_1, run_loop($Facet$outside_pixels$(_q_0, Math.fround(_xx_1), Math.fround(_yy_1), _half_1)), run_loop($AffineTexture$fill_test$(_rest_0, _half_1, _xx_1, _yy_1, _q_0, _basis_0, _source_size_0)), _xx_1, _yy_1, _q_0, _basis_0, _source_0, _source_depth_0, _source_size_0, _opacity_0, _br_0));
          return {$: "Qua", ["tl"]: _a_1, ["tr"]: _b_1, ["bl"]: _c_1, ["br"]: _d_1};
        }
      }
    }
  }
}

function $AffineTexture$draw_valid$(_valid_0, _depth_0, _size_0, _q_0, _basis_0, _source_0, _source_depth_0, _source_size_0, _opacity_0, _image_0) {
  if (!_valid_0) {
    return _image_0;
  } else {
    return run_jump($AffineTexture$tree$, [_depth_0, _size_0, run_loop($Facet$outside_pixels$(_q_0, 0, 0, _size_0)), run_loop($AffineTexture$fill_test$(_depth_0, _size_0, 0, 0, _q_0, _basis_0, _source_size_0)), 0, 0, _q_0, _basis_0, _source_0, _source_depth_0, _source_size_0, _opacity_0, _image_0]);
  }
}

function $AffineTexture$draw_basis$(_valid_0, _depth_0, _size_0, _q_0, _x0_0, _y0_0, _du_x_0, _du_y_0, _dv_x_0, _dv_y_0, _det_0, _source_0, _source_depth_0, _source_size_0, _opacity_0, _image_0) {
  if (!_valid_0) {
    return _image_0;
  } else {
    const _inverse_0 = Math.fround(1 / _det_0);
    const _x_0 = Math.fround(0 - _dv_x_0);
    const _x_1 = Math.fround(0 - _du_y_0);
    const _basis_0 = {$: "Basis", ["ux"]: Math.fround(_dv_y_0 * _inverse_0), ["uy"]: Math.fround(_x_0 * _inverse_0), ["vx"]: Math.fround(_x_1 * _inverse_0), ["vy"]: Math.fround(_du_x_0 * _inverse_0), ["ox"]: _x0_0, ["oy"]: _y0_0};
    return run_jump($AffineTexture$draw_valid$, [true, _depth_0, _size_0, _q_0, _basis_0, _source_0, _source_depth_0, _source_size_0, _opacity_0, _image_0]);
  }
}

function $AffineTexture$draw_shape$(_q_0, _depth_0, _size_0, _x0_0, _y0_0, _du_x_0, _du_y_0, _dv_x_0, _dv_y_0, _det_0, _source_0, _source_depth_0, _source_size_0, _opacity_0, _image_0) {
  const _ab_0 = _q_0["ab"];
  const _bc_0 = _q_0["bc"];
  const _cd_0 = _q_0["cd"];
  const _da_0 = _q_0["da"];
  const _area_0 = _q_0["area"];
  const _x_0 = Math.fround(Math.abs(_det_0));
  return run_jump($AffineTexture$draw_basis$, [run_loop($Bool$and$((_x_0 > 0.10000000149011612), (_area_0 > 0.10000000149011612))), _depth_0, _size_0, {$: "Shape", ["ab"]: _ab_0, ["bc"]: _bc_0, ["cd"]: _cd_0, ["da"]: _da_0, ["area"]: _area_0}, _x0_0, _y0_0, _du_x_0, _du_y_0, _dv_x_0, _dv_y_0, _det_0, _source_0, _source_depth_0, _source_size_0, _opacity_0, _image_0]);
}

function $AffineTexture$draw_geometry$(_depth_0, _size_0, _p00_0, _p10_0, _p01_0, _source_0, _source_depth_0, _source_size_0, _opacity_0, _image_0) {
  const _x0_0 = run_loop($AffineTexture$point_x$(_p00_0));
  const _y0_0 = run_loop($AffineTexture$point_y$(_p00_0));
  const _x_0 = run_loop($AffineTexture$point_x$(_p10_0));
  const _du_x_0 = Math.fround(_x_0 - _x0_0);
  const _x_1 = run_loop($AffineTexture$point_y$(_p10_0));
  const _du_y_0 = Math.fround(_x_1 - _y0_0);
  const _x_2 = run_loop($AffineTexture$point_x$(_p01_0));
  const _dv_x_0 = Math.fround(_x_2 - _x0_0);
  const _x_3 = run_loop($AffineTexture$point_y$(_p01_0));
  const _dv_y_0 = Math.fround(_x_3 - _y0_0);
  const _x_4 = Math.fround(_du_x_0 * _dv_y_0);
  const _x_5 = Math.fround(_du_y_0 * _dv_x_0);
  const _det_0 = Math.fround(_x_4 - _x_5);
  const _x_6 = Math.fround(_du_x_0 + _dv_x_0);
  const _x_7 = Math.fround(_du_y_0 + _dv_y_0);
  const _p11_0 = {$: "Point", ["x"]: Math.fround(_x0_0 + _x_6), ["y"]: Math.fround(_y0_0 + _x_7)};
  return run_jump($AffineTexture$draw_shape$, [run_loop($$$$Quad$make$(_p00_0, _p10_0, _p11_0, _p01_0)), _depth_0, _size_0, _x0_0, _y0_0, _du_x_0, _du_y_0, _dv_x_0, _dv_y_0, _det_0, _source_0, _source_depth_0, _source_size_0, _opacity_0, _image_0]);
}

function $AffineTexture$draw_config$(_valid_0, _depth_0, _size_0, _p00_0, _p10_0, _p01_0, _source_0, _source_depth_0, _source_size_0, _opacity_0, _image_0) {
  if (!_valid_0) {
    return _image_0;
  } else {
    return run_jump($AffineTexture$draw_geometry$, [_depth_0, _size_0, _p00_0, _p10_0, _p01_0, _source_0, _source_depth_0, _source_size_0, _opacity_0, _image_0]);
  }
}

function $AffineTexture$draw_zero$(_zero_0, _depth_0, _size_0, _p00_0, _p10_0, _p01_0, _source_0, _source_depth_0, _source_size_0, _opacity_0, _image_0) {
  if (_zero_0) {
    return _image_0;
  } else {
    return run_jump($AffineTexture$draw_config$, [run_loop($AffineTexture$valid_source_size$(_source_size_0)), _depth_0, _size_0, _p00_0, _p10_0, _p01_0, _source_0, _source_depth_0, _source_size_0, _opacity_0, _image_0]);
  }
}

function $AffineTexture$draw$(_depth_0, _size_0, _p00_0, _p10_0, _p01_0, _source_depth_0, _source_size_0, _source_0, _opacity_0, _image_0) {
  return run_jump($AffineTexture$draw_zero$, [(_opacity_0 === 0), _depth_0, _size_0, _p00_0, _p10_0, _p01_0, _source_0, _source_depth_0, _source_size_0, _opacity_0, _image_0]);
}

function $Gather$split$(_depth_0, _x_0, _y_0, _xx_0, _yy_0, _image_0) {
  return {$: "GatherDone", ["values"]: {$: "Four", ["a"]: run_loop($$$$pixels$Pixel$sample_xy$(_depth_0, _x_0, _y_0, _image_0)), ["b"]: run_loop($$$$pixels$Pixel$sample_xy$(_depth_0, _xx_0, _y_0, _image_0)), ["c"]: run_loop($$$$pixels$Pixel$sample_xy$(_depth_0, _x_0, _yy_0, _image_0)), ["d"]: run_loop($$$$pixels$Pixel$sample_xy$(_depth_0, _xx_0, _yy_0, _image_0))}};
}

function $Gather$choose$(_same_x_0, _same_y_0, _right_0, _bottom_0, _depth_0, _half_0, _x_0, _y_0, _xx_0, _yy_0, _image_0) {
  if (_same_x_0) {
    if (_same_y_0) {
      if (!_right_0) {
        if (!_bottom_0) {
          if (_image_0.$ === "Qua") {
            const _a_0 = _image_0["tl"];
            const _b_0 = _image_0["tr"];
            const _c_0 = _image_0["bl"];
            const _d_0 = _image_0["br"];
            return {$: "GatherNext", ["size"]: _half_0, ["x"]: _x_0, ["y"]: _y_0, ["xx"]: _xx_0, ["yy"]: _yy_0, ["image"]: _a_0};
          } else {
            return run_jump($Gather$split$, [_depth_0, _x_0, _y_0, _xx_0, _yy_0, _image_0]);
          }
        } else {
          if (_image_0.$ === "Qua") {
            const _a_1 = _image_0["tl"];
            const _b_1 = _image_0["tr"];
            const _c_1 = _image_0["bl"];
            const _d_1 = _image_0["br"];
            return {$: "GatherNext", ["size"]: _half_0, ["x"]: _x_0, ["y"]: ((_y_0 - _half_0) >>> 0), ["xx"]: _xx_0, ["yy"]: ((_yy_0 - _half_0) >>> 0), ["image"]: _c_1};
          } else {
            return run_jump($Gather$split$, [_depth_0, _x_0, _y_0, _xx_0, _yy_0, _image_0]);
          }
        }
      } else {
        if (!_bottom_0) {
          if (_image_0.$ === "Qua") {
            const _a_2 = _image_0["tl"];
            const _b_2 = _image_0["tr"];
            const _c_2 = _image_0["bl"];
            const _d_2 = _image_0["br"];
            return {$: "GatherNext", ["size"]: _half_0, ["x"]: ((_x_0 - _half_0) >>> 0), ["y"]: _y_0, ["xx"]: ((_xx_0 - _half_0) >>> 0), ["yy"]: _yy_0, ["image"]: _b_2};
          } else {
            return run_jump($Gather$split$, [_depth_0, _x_0, _y_0, _xx_0, _yy_0, _image_0]);
          }
        } else {
          if (_image_0.$ === "Qua") {
            const _a_3 = _image_0["tl"];
            const _b_3 = _image_0["tr"];
            const _c_3 = _image_0["bl"];
            const _d_3 = _image_0["br"];
            return {$: "GatherNext", ["size"]: _half_0, ["x"]: ((_x_0 - _half_0) >>> 0), ["y"]: ((_y_0 - _half_0) >>> 0), ["xx"]: ((_xx_0 - _half_0) >>> 0), ["yy"]: ((_yy_0 - _half_0) >>> 0), ["image"]: _d_3};
          } else {
            return run_jump($Gather$split$, [_depth_0, _x_0, _y_0, _xx_0, _yy_0, _image_0]);
          }
        }
      }
    } else {
      return run_jump($Gather$split$, [_depth_0, _x_0, _y_0, _xx_0, _yy_0, _image_0]);
    }
  } else {
    return run_jump($Gather$split$, [_depth_0, _x_0, _y_0, _xx_0, _yy_0, _image_0]);
  }
}

function $Gather$prepare$(_depth_0, _size_0, _x_0, _y_0, _xx_0, _yy_0, _image_0) {
  if (_depth_0 === 0n) {
    if (_image_0.$ === "Pix") {
      const _color_0 = _image_0["color"];
      return {$: "GatherDone", ["values"]: {$: "Four", ["a"]: _color_0, ["b"]: _color_0, ["c"]: _color_0, ["d"]: _color_0}};
    } else {
      const _a_0 = _image_0["tl"];
      const _b_0 = _image_0["tr"];
      const _c_0 = _image_0["bl"];
      const _d_0 = _image_0["br"];
      return {$: "GatherDone", ["values"]: {$: "Four", ["a"]: 0, ["b"]: 0, ["c"]: 0, ["d"]: 0}};
    }
  } else {
    const _rest_0 = (_depth_0 - 1n);
    if (_image_0.$ === "Pix") {
      const _color_1 = _image_0["color"];
      return {$: "GatherDone", ["values"]: {$: "Four", ["a"]: _color_1, ["b"]: _color_1, ["c"]: _color_1, ["d"]: _color_1}};
    } else {
      const _a_1 = _image_0["tl"];
      const _b_1 = _image_0["tr"];
      const _c_1 = _image_0["bl"];
      const _d_1 = _image_0["br"];
      const _h_0 = (2 === 0 ? 0 : (_size_0 / 2) >>> 0);
      const _right_0 = (_x_0 >= _h_0);
      const _bottom_0 = (_y_0 >= _h_0);
      const _x_1 = (_xx_0 >= _h_0);
      const _x_2 = (_yy_0 >= _h_0);
      return run_jump($Gather$choose$, [run_loop($Bool$not$((_right_0 !== _x_1))), run_loop($Bool$not$((_bottom_0 !== _x_2))), _right_0, _bottom_0, nat_chk(_rest_0 + 1n), _h_0, _x_0, _y_0, _xx_0, _yy_0, {$: "Qua", ["tl"]: _a_1, ["tr"]: _b_1, ["bl"]: _c_1, ["br"]: _d_1}]);
    }
  }
}

function $Gather$descend$(_depth_0, _work_0) {
  if (_depth_0 === 0n) {
    if (_work_0.$ === "GatherDone") {
      const _values_0 = _work_0["values"];
      return _values_0;
    } else {
      const _size_0 = _work_0["size"];
      const _x_0 = _work_0["x"];
      const _y_0 = _work_0["y"];
      const _xx_0 = _work_0["xx"];
      const _yy_0 = _work_0["yy"];
      const _image_0 = _work_0["image"];
      return {$: "Four", ["a"]: 0, ["b"]: 0, ["c"]: 0, ["d"]: 0};
    }
  } else {
    const _rest_0 = (_depth_0 - 1n);
    if (_work_0.$ === "GatherDone") {
      const _values_1 = _work_0["values"];
      return _values_1;
    } else {
      const _size_1 = _work_0["size"];
      const _x_1 = _work_0["x"];
      const _y_1 = _work_0["y"];
      const _xx_1 = _work_0["xx"];
      const _yy_1 = _work_0["yy"];
      const _image_1 = _work_0["image"];
      return run_jump($Gather$descend$, [_rest_0, run_loop($Gather$prepare$(_rest_0, _size_1, _x_1, _y_1, _xx_1, _yy_1, _image_1))]);
    }
  }
}

function $Gather$valid$(_valid_0, _depth_0, _size_0, _x_0, _y_0, _image_0) {
  if (!_valid_0) {
    return {$: "Four", ["a"]: 0, ["b"]: 0, ["c"]: 0, ["d"]: 0};
  } else {
    const _last_0 = ((_size_0 - 1) >>> 0);
    const _x_1 = run_loop($U32$min$(_x_0, _last_0));
    const _y_1 = run_loop($U32$min$(_y_0, _last_0));
    return run_jump($Gather$descend$, [_depth_0, run_loop($Gather$prepare$(_depth_0, _size_0, _x_1, _y_1, run_loop($U32$min$(((_x_1 + 1) >>> 0), _last_0)), run_loop($U32$min$(((_y_1 + 1) >>> 0), _last_0)), _image_0))]);
  }
}

function $Gather$neighbors$(_depth_0, _size_0, _x_0, _y_0, _image_0) {
  return run_jump($Gather$valid$, [(_size_0 !== 0), _depth_0, _size_0, _x_0, _y_0, _image_0]);
}

function $RgbaSample$size$(_texture_0) {
  const _depth_0 = _texture_0["depth"];
  const _size_0 = _texture_0["size"];
  const _colors_0 = _texture_0["colors"];
  const _mask_0 = _texture_0["mask"];
  return _size_0;
}

function $RgbaSample$color$(_texel_0) {
  const _color_0 = _texel_0["color"];
  const _alpha_0 = _texel_0["alpha"];
  return _color_0;
}

function $RgbaSample$alpha$(_texel_0) {
  const _color_0 = _texel_0["color"];
  const _alpha_0 = _texel_0["alpha"];
  return _alpha_0;
}

function $RgbaSample$nearest_valid$(_valid_0, _texture_0, _x_0, _y_0) {
  if (!_valid_0) {
    return {$: "Texel", ["color"]: 0, ["alpha"]: 0};
  } else {
    const _depth_0 = _texture_0["depth"];
    const _size_0 = _texture_0["size"];
    const _colors_0 = _texture_0["colors"];
    const _mask_0 = _texture_0["mask"];
    const _xx_0 = run_loop($U32$min$(_x_0, ((_size_0 - 1) >>> 0)));
    const _yy_0 = run_loop($U32$min$(_y_0, ((_size_0 - 1) >>> 0)));
    return {$: "Texel", ["color"]: run_loop($$$$pixels$Pixel$sample_xy$(_depth_0, _xx_0, _yy_0, _colors_0)), ["alpha"]: run_loop($Color$red$(run_loop($$$$pixels$Pixel$sample_xy$(_depth_0, _xx_0, _yy_0, _mask_0))))};
  }
}

function $RgbaSample$nearest$(_texture_0, _x_0, _y_0) {
  const _x_1 = run_loop($RgbaSample$size$(_texture_0));
  return run_jump($RgbaSample$nearest_valid$, [(_x_1 !== 0), _texture_0, _x_0, _y_0]);
}

function $RgbaSample$sum4$(_a_0, _b_0, _c_0, _d_0) {
  const _x_0 = ((_a_0 + _b_0) >>> 0);
  const _x_1 = ((_c_0 + _d_0) >>> 0);
  return ((_x_0 + _x_1) >>> 0);
}

function $RgbaSample$weighted$(_sum_0, _a_0, _b_0, _c_0, _d_0, _wa_0, _wb_0, _wc_0, _wd_0) {
  const _x_0 = run_loop($RgbaSample$sum4$((Math.imul(_a_0, _wa_0) >>> 0), (Math.imul(_b_0, _wb_0) >>> 0), (Math.imul(_c_0, _wc_0) >>> 0), (Math.imul(_d_0, _wd_0) >>> 0)));
  const _x_1 = (2 === 0 ? 0 : (_sum_0 / 2) >>> 0);
  const _x_2 = ((_x_0 + _x_1) >>> 0);
  return (_sum_0 === 0 ? 0 : (_x_2 / _sum_0) >>> 0);
}

function $RgbaSample$finish$(_empty_0, _coverage_0, _total_0, _a_0, _b_0, _c_0, _d_0, _wa_0, _wb_0, _wc_0, _wd_0) {
  if (_empty_0) {
    return {$: "Texel", ["color"]: 0, ["alpha"]: 0};
  } else {
    return {$: "Texel", ["color"]: run_loop($Color$rgb$(run_loop($RgbaSample$weighted$(_total_0, run_loop($Color$red$(_a_0)), run_loop($Color$red$(_b_0)), run_loop($Color$red$(_c_0)), run_loop($Color$red$(_d_0)), _wa_0, _wb_0, _wc_0, _wd_0)), run_loop($RgbaSample$weighted$(_total_0, run_loop($Color$green$(_a_0)), run_loop($Color$green$(_b_0)), run_loop($Color$green$(_c_0)), run_loop($Color$green$(_d_0)), _wa_0, _wb_0, _wc_0, _wd_0)), run_loop($RgbaSample$weighted$(_total_0, run_loop($Color$blue$(_a_0)), run_loop($Color$blue$(_b_0)), run_loop($Color$blue$(_c_0)), run_loop($Color$blue$(_d_0)), _wa_0, _wb_0, _wc_0, _wd_0)))), ["alpha"]: _coverage_0};
  }
}

function $RgbaSample$mix_weights$(_a_0, _b_0, _c_0, _d_0, _wa_0, _wb_0, _wc_0, _wd_0) {
  const _ac_0 = _a_0["color"];
  const _aa_0 = _a_0["alpha"];
  const _bc_0 = _b_0["color"];
  const _ba_0 = _b_0["alpha"];
  const _cc_0 = _c_0["color"];
  const _ca_0 = _c_0["alpha"];
  const _dc_0 = _d_0["color"];
  const _da_0 = _d_0["alpha"];
  const _aw_0 = (Math.imul(_wa_0, _aa_0) >>> 0);
  const _bw_0 = (Math.imul(_wb_0, _ba_0) >>> 0);
  const _cw_0 = (Math.imul(_wc_0, _ca_0) >>> 0);
  const _dw_0 = (Math.imul(_wd_0, _da_0) >>> 0);
  const _total_0 = run_loop($RgbaSample$sum4$(_aw_0, _bw_0, _cw_0, _dw_0));
  const _x_0 = ((_total_0 + 32768) >>> 0);
  const _coverage_0 = (65536 === 0 ? 0 : (_x_0 / 65536) >>> 0);
  return run_jump($RgbaSample$finish$, [(_coverage_0 === 0), _coverage_0, _total_0, _ac_0, _bc_0, _cc_0, _dc_0, _aw_0, _bw_0, _cw_0, _dw_0]);
}

function $RgbaSample$mix$(_a_0, _b_0, _c_0, _d_0, _fx_0, _fy_0) {
  const _x_0 = run_loop($U32$min$(_fx_0, 255));
  const _y_0 = run_loop($U32$min$(_fy_0, 255));
  const _ix_0 = ((256 - _x_0) >>> 0);
  const _iy_0 = ((256 - _y_0) >>> 0);
  return run_jump($RgbaSample$mix_weights$, [_a_0, _b_0, _c_0, _d_0, (Math.imul(_ix_0, _iy_0) >>> 0), (Math.imul(_x_0, _iy_0) >>> 0), (Math.imul(_ix_0, _y_0) >>> 0), (Math.imul(_x_0, _y_0) >>> 0)]);
}

function $RgbaSample$mix_gather$(_colors_0, _mask_0, _fx_0, _fy_0) {
  const _a_0 = _colors_0["a"];
  const _b_0 = _colors_0["b"];
  const _c_0 = _colors_0["c"];
  const _d_0 = _colors_0["d"];
  const _aa_0 = _mask_0["a"];
  const _bb_0 = _mask_0["b"];
  const _cc_0 = _mask_0["c"];
  const _dd_0 = _mask_0["d"];
  return run_jump($RgbaSample$mix$, [{$: "Texel", ["color"]: _a_0, ["alpha"]: run_loop($Color$red$(_aa_0))}, {$: "Texel", ["color"]: _b_0, ["alpha"]: run_loop($Color$red$(_bb_0))}, {$: "Texel", ["color"]: _c_0, ["alpha"]: run_loop($Color$red$(_cc_0))}, {$: "Texel", ["color"]: _d_0, ["alpha"]: run_loop($Color$red$(_dd_0))}, _fx_0, _fy_0]);
}

function $RgbaSample$linear$(_texture_0, _x_0, _y_0, _fx_0, _fy_0) {
  const _depth_0 = _texture_0["depth"];
  const _size_0 = _texture_0["size"];
  const _colors_0 = _texture_0["colors"];
  const _mask_0 = _texture_0["mask"];
  return run_jump($RgbaSample$mix_gather$, [run_loop($Gather$neighbors$(_depth_0, _size_0, _x_0, _y_0, _colors_0)), run_loop($Gather$neighbors$(_depth_0, _size_0, _x_0, _y_0, _mask_0)), _fx_0, _fy_0]);
}

function $RgbaSample$axis$(_value_0, _size_0) {
  const _x_0 = Math.fround(_size_0);
  const _x_1 = Math.fround(_value_0 * _x_0);
  const _x_2 = run_loop($U32$max$(_size_0, 1));
  const _x_3 = ((_x_2 - 1) >>> 0);
  const _position_0 = run_loop($F32$clamp$(Math.fround(_x_1 - 0.5), 0, Math.fround(_x_3)));
  const _index_0 = (_position_0 >= 1 && _position_0 < 4294967296 ? Math.floor(_position_0) : 0);
  const _x_4 = Math.fround(_index_0);
  const _x_5 = Math.fround(_position_0 - _x_4);
  const _x_6 = Math.fround(_x_5 * 256);
  return {$: "Axis", ["index"]: _index_0, ["fraction"]: run_loop($U32$min$(255, (_x_6 >= 1 && _x_6 < 4294967296 ? Math.floor(_x_6) : 0)))};
}

function $RgbaSample$linear_axes$(_texture_0, _x_0, _y_0) {
  const _ix_0 = _x_0["index"];
  const _fx_0 = _x_0["fraction"];
  const _iy_0 = _y_0["index"];
  const _fy_0 = _y_0["fraction"];
  return run_jump($RgbaSample$linear$, [_texture_0, _ix_0, _iy_0, _fx_0, _fy_0]);
}

function $RgbaSample$uv$(_filter_0, _texture_0, _u_0, _v_0) {
  if (_filter_0.$ === "Nearest") {
    return run_jump($RgbaSample$nearest$, [_texture_0, run_loop($AffineTexture$texel$(_u_0, run_loop($RgbaSample$size$(_texture_0)))), run_loop($AffineTexture$texel$(_v_0, run_loop($RgbaSample$size$(_texture_0))))]);
  } else {
    return run_jump($RgbaSample$linear_axes$, [_texture_0, run_loop($RgbaSample$axis$(_u_0, run_loop($RgbaSample$size$(_texture_0)))), run_loop($RgbaSample$axis$(_v_0, run_loop($RgbaSample$size$(_texture_0))))]);
  }
}

function $Layer$over_tree$(_depth_0, _src_0, _opacity_0, _dest_0) {
  if (_depth_0 === 0n) {
    if (_src_0.$ === "Pix") {
      const _source_0 = _src_0["color"];
      if (_dest_0.$ === "Pix") {
        const _background_0 = _dest_0["color"];
        return {$: "Pix", ["color"]: run_loop($Color$over$(_source_0, _background_0, _opacity_0))};
      } else {
        const _tl_0 = _dest_0["tl"];
        const _tr_0 = _dest_0["tr"];
        const _bl_0 = _dest_0["bl"];
        const _br_0 = _dest_0["br"];
        return {$: "Pix", ["color"]: _source_0};
      }
    } else {
      const _tl_1 = _src_0["tl"];
      const _tr_1 = _src_0["tr"];
      const _bl_1 = _src_0["bl"];
      const _br_1 = _src_0["br"];
      if (_dest_0.$ === "Pix") {
        const _background_1 = _dest_0["color"];
        return {$: "Pix", ["color"]: _background_1};
      } else {
        const _a_0 = _dest_0["tl"];
        const _b_0 = _dest_0["tr"];
        const _c_0 = _dest_0["bl"];
        const _d_0 = _dest_0["br"];
        return {$: "Pix", ["color"]: 0};
      }
    }
  } else {
    const _rest_0 = (_depth_0 - 1n);
    if (_src_0.$ === "Pix") {
      const _source_1 = _src_0["color"];
      if (_dest_0.$ === "Pix") {
        const _background_2 = _dest_0["color"];
        return {$: "Pix", ["color"]: run_loop($Color$over$(_source_1, _background_2, _opacity_0))};
      } else {
        const _tl_2 = _dest_0["tl"];
        const _tr_2 = _dest_0["tr"];
        const _bl_2 = _dest_0["bl"];
        const _br_2 = _dest_0["br"];
        const _a_1 = run_loop($Layer$over_tree$(_rest_0, {$: "Pix", ["color"]: _source_1}, _opacity_0, _tl_2));
        const _b_1 = run_loop($Layer$over_tree$(_rest_0, {$: "Pix", ["color"]: _source_1}, _opacity_0, _tr_2));
        const _c_1 = run_loop($Layer$over_tree$(_rest_0, {$: "Pix", ["color"]: _source_1}, _opacity_0, _bl_2));
        const _d_1 = run_loop($Layer$over_tree$(_rest_0, {$: "Pix", ["color"]: _source_1}, _opacity_0, _br_2));
        return {$: "Qua", ["tl"]: _a_1, ["tr"]: _b_1, ["bl"]: _c_1, ["br"]: _d_1};
      }
    } else {
      const _tl_3 = _src_0["tl"];
      const _tr_3 = _src_0["tr"];
      const _bl_3 = _src_0["bl"];
      const _br_3 = _src_0["br"];
      if (_dest_0.$ === "Pix") {
        const _background_3 = _dest_0["color"];
        const _a_2 = run_loop($Layer$over_tree$(_rest_0, _tl_3, _opacity_0, {$: "Pix", ["color"]: _background_3}));
        const _b_2 = run_loop($Layer$over_tree$(_rest_0, _tr_3, _opacity_0, {$: "Pix", ["color"]: _background_3}));
        const _c_2 = run_loop($Layer$over_tree$(_rest_0, _bl_3, _opacity_0, {$: "Pix", ["color"]: _background_3}));
        const _d_2 = run_loop($Layer$over_tree$(_rest_0, _br_3, _opacity_0, {$: "Pix", ["color"]: _background_3}));
        return {$: "Qua", ["tl"]: _a_2, ["tr"]: _b_2, ["bl"]: _c_2, ["br"]: _d_2};
      } else {
        const _aa_0 = _dest_0["tl"];
        const _bb_0 = _dest_0["tr"];
        const _cc_0 = _dest_0["bl"];
        const _dd_0 = _dest_0["br"];
        const _a_3 = run_loop($Layer$over_tree$(_rest_0, _tl_3, _opacity_0, _aa_0));
        const _b_3 = run_loop($Layer$over_tree$(_rest_0, _tr_3, _opacity_0, _bb_0));
        const _c_3 = run_loop($Layer$over_tree$(_rest_0, _bl_3, _opacity_0, _cc_0));
        const _d_3 = run_loop($Layer$over_tree$(_rest_0, _br_3, _opacity_0, _dd_0));
        return {$: "Qua", ["tl"]: _a_3, ["tr"]: _b_3, ["bl"]: _c_3, ["br"]: _d_3};
      }
    }
  }
}

function $Layer$over_case$(_empty_0, _full_0, _depth_0, _src_0, _opacity_0, _dest_0) {
  if (_empty_0) {
    return _dest_0;
  } else {
    if (_full_0) {
      return _src_0;
    } else {
      return run_jump($Layer$over_tree$, [_depth_0, _src_0, _opacity_0, _dest_0]);
    }
  }
}

function $Layer$over$(_depth_0, _src_0, _opacity_0, _dest_0) {
  return run_jump($Layer$over_case$, [(_opacity_0 === 0), (_opacity_0 >= 255), _depth_0, _src_0, _opacity_0, _dest_0]);
}

function $Layer$add_tree$(_depth_0, _src_0, _dest_0) {
  if (_depth_0 === 0n) {
    if (_src_0.$ === "Pix") {
      const _source_0 = _src_0["color"];
      if (_dest_0.$ === "Pix") {
        const _background_0 = _dest_0["color"];
        return {$: "Pix", ["color"]: run_loop($Color$add$(_source_0, _background_0))};
      } else {
        const _tl_0 = _dest_0["tl"];
        const _tr_0 = _dest_0["tr"];
        const _bl_0 = _dest_0["bl"];
        const _br_0 = _dest_0["br"];
        return {$: "Pix", ["color"]: _source_0};
      }
    } else {
      const _tl_1 = _src_0["tl"];
      const _tr_1 = _src_0["tr"];
      const _bl_1 = _src_0["bl"];
      const _br_1 = _src_0["br"];
      if (_dest_0.$ === "Pix") {
        const _background_1 = _dest_0["color"];
        return {$: "Pix", ["color"]: _background_1};
      } else {
        const _a_0 = _dest_0["tl"];
        const _b_0 = _dest_0["tr"];
        const _c_0 = _dest_0["bl"];
        const _d_0 = _dest_0["br"];
        return {$: "Pix", ["color"]: 0};
      }
    }
  } else {
    const _rest_0 = (_depth_0 - 1n);
    if (_src_0.$ === "Pix") {
      const _source_1 = _src_0["color"];
      if (_dest_0.$ === "Pix") {
        const _background_2 = _dest_0["color"];
        return {$: "Pix", ["color"]: run_loop($Color$add$(_source_1, _background_2))};
      } else {
        const _tl_2 = _dest_0["tl"];
        const _tr_2 = _dest_0["tr"];
        const _bl_2 = _dest_0["bl"];
        const _br_2 = _dest_0["br"];
        const _a_1 = run_loop($Layer$add_tree$(_rest_0, {$: "Pix", ["color"]: _source_1}, _tl_2));
        const _b_1 = run_loop($Layer$add_tree$(_rest_0, {$: "Pix", ["color"]: _source_1}, _tr_2));
        const _c_1 = run_loop($Layer$add_tree$(_rest_0, {$: "Pix", ["color"]: _source_1}, _bl_2));
        const _d_1 = run_loop($Layer$add_tree$(_rest_0, {$: "Pix", ["color"]: _source_1}, _br_2));
        return {$: "Qua", ["tl"]: _a_1, ["tr"]: _b_1, ["bl"]: _c_1, ["br"]: _d_1};
      }
    } else {
      const _tl_3 = _src_0["tl"];
      const _tr_3 = _src_0["tr"];
      const _bl_3 = _src_0["bl"];
      const _br_3 = _src_0["br"];
      if (_dest_0.$ === "Pix") {
        const _background_3 = _dest_0["color"];
        const _a_2 = run_loop($Layer$add_tree$(_rest_0, _tl_3, {$: "Pix", ["color"]: _background_3}));
        const _b_2 = run_loop($Layer$add_tree$(_rest_0, _tr_3, {$: "Pix", ["color"]: _background_3}));
        const _c_2 = run_loop($Layer$add_tree$(_rest_0, _bl_3, {$: "Pix", ["color"]: _background_3}));
        const _d_2 = run_loop($Layer$add_tree$(_rest_0, _br_3, {$: "Pix", ["color"]: _background_3}));
        return {$: "Qua", ["tl"]: _a_2, ["tr"]: _b_2, ["bl"]: _c_2, ["br"]: _d_2};
      } else {
        const _aa_0 = _dest_0["tl"];
        const _bb_0 = _dest_0["tr"];
        const _cc_0 = _dest_0["bl"];
        const _dd_0 = _dest_0["br"];
        const _a_3 = run_loop($Layer$add_tree$(_rest_0, _tl_3, _aa_0));
        const _b_3 = run_loop($Layer$add_tree$(_rest_0, _tr_3, _bb_0));
        const _c_3 = run_loop($Layer$add_tree$(_rest_0, _bl_3, _cc_0));
        const _d_3 = run_loop($Layer$add_tree$(_rest_0, _br_3, _dd_0));
        return {$: "Qua", ["tl"]: _a_3, ["tr"]: _b_3, ["bl"]: _c_3, ["br"]: _d_3};
      }
    }
  }
}

function $MaskedLayer$effective$(_alpha_0, _opacity_0) {
  const _x_0 = run_loop($U32$min$(_opacity_0, 255));
  const _x_1 = (Math.imul(_alpha_0, _x_0) >>> 0);
  const _x_2 = ((_x_1 + 127) >>> 0);
  return (255 === 0 ? 0 : (_x_2 / 255) >>> 0);
}

function $MaskedLayer$transparent$(_mask_0) {
  if (_mask_0.$ === "Pix") {
    const _color_0 = _mask_0["color"];
    const _x_0 = run_loop($Color$red$(_color_0));
    return (_x_0 === 0);
  } else {
    const _tl_0 = _mask_0["tl"];
    const _tr_0 = _mask_0["tr"];
    const _bl_0 = _mask_0["bl"];
    const _br_0 = _mask_0["br"];
    return false;
  }
}

function $MaskedLayer$tree$(_depth_0, _colors_0, _mask_0, _opacity_0, _image_0) {
  if (_depth_0 === 0n) {
    if (_mask_0.$ === "Pix") {
      const _color_0 = _mask_0["color"];
      return run_jump($Layer$over$, [0n, _colors_0, run_loop($MaskedLayer$effective$(run_loop($Color$red$(_color_0)), _opacity_0)), _image_0]);
    } else {
      const _tl_0 = _mask_0["tl"];
      const _tr_0 = _mask_0["tr"];
      const _bl_0 = _mask_0["bl"];
      const _br_0 = _mask_0["br"];
      return _image_0;
    }
  } else {
    const _rest_0 = (_depth_0 - 1n);
    if (_mask_0.$ === "Pix") {
      const _color_1 = _mask_0["color"];
      return run_jump($Layer$over$, [nat_chk(_rest_0 + 1n), _colors_0, run_loop($MaskedLayer$effective$(run_loop($Color$red$(_color_1)), _opacity_0)), _image_0]);
    } else {
      const _tl_1 = _mask_0["tl"];
      const _tr_1 = _mask_0["tr"];
      const _bl_1 = _mask_0["bl"];
      const _br_1 = _mask_0["br"];
      const _a_0 = run_loop($MaskedLayer$tree$(_rest_0, run_loop($ImageOps$tl$(_colors_0)), _tl_1, _opacity_0, run_loop($ImageOps$tl$(_image_0))));
      const _b_0 = run_loop($MaskedLayer$tree$(_rest_0, run_loop($ImageOps$tr$(_colors_0)), _tr_1, _opacity_0, run_loop($ImageOps$tr$(_image_0))));
      const _c_0 = run_loop($MaskedLayer$tree$(_rest_0, run_loop($ImageOps$bl$(_colors_0)), _bl_1, _opacity_0, run_loop($ImageOps$bl$(_image_0))));
      const _d_0 = run_loop($MaskedLayer$tree$(_rest_0, run_loop($ImageOps$br$(_colors_0)), _br_1, _opacity_0, run_loop($ImageOps$br$(_image_0))));
      return {$: "Qua", ["tl"]: _a_0, ["tr"]: _b_0, ["bl"]: _c_0, ["br"]: _d_0};
    }
  }
}

function $MaskedLayer$over_zero$(_zero_0, _depth_0, _colors_0, _mask_0, _opacity_0, _image_0) {
  if (_zero_0) {
    return _image_0;
  } else {
    return run_jump($MaskedLayer$tree$, [_depth_0, _colors_0, _mask_0, _opacity_0, _image_0]);
  }
}

function $MaskedLayer$over$(_depth_0, _colors_0, _mask_0, _opacity_0, _image_0) {
  return run_jump($MaskedLayer$over_zero$, [(_opacity_0 === 0), _depth_0, _colors_0, _mask_0, _opacity_0, _image_0]);
}

function $Transform2D$identity$() {
  return {$: "Matrix", ["a"]: 1, ["b"]: 0, ["c"]: 0, ["d"]: 1, ["tx"]: 0, ["ty"]: 0};
}

function $Transform2D$translate$(_x_0, _y_0) {
  return {$: "Matrix", ["a"]: 1, ["b"]: 0, ["c"]: 0, ["d"]: 1, ["tx"]: _x_0, ["ty"]: _y_0};
}

function $Transform2D$scale$(_x_0, _y_0) {
  return {$: "Matrix", ["a"]: _x_0, ["b"]: 0, ["c"]: 0, ["d"]: _y_0, ["tx"]: 0, ["ty"]: 0};
}

function $Transform2D$rotate$(_radians_0) {
  const _c_0 = Math.fround(Math.cos(_radians_0));
  const _s_0 = Math.fround(Math.sin(_radians_0));
  return {$: "Matrix", ["a"]: _c_0, ["b"]: _s_0, ["c"]: (-_s_0), ["d"]: _c_0, ["tx"]: 0, ["ty"]: 0};
}

function $Transform2D$point$(_matrix_0, _point_0) {
  const _a_0 = _matrix_0["a"];
  const _b_0 = _matrix_0["b"];
  const _c_0 = _matrix_0["c"];
  const _d_0 = _matrix_0["d"];
  const _tx_0 = _matrix_0["tx"];
  const _ty_0 = _matrix_0["ty"];
  const _x_0 = _point_0["x"];
  const _y_0 = _point_0["y"];
  const _x_1 = Math.fround(_a_0 * _x_0);
  const _x_2 = Math.fround(_c_0 * _y_0);
  const _x_3 = Math.fround(_x_1 + _x_2);
  const _x_4 = Math.fround(_b_0 * _x_0);
  const _x_5 = Math.fround(_d_0 * _y_0);
  const _x_6 = Math.fround(_x_4 + _x_5);
  return {$: "Point", ["x"]: Math.fround(_x_3 + _tx_0), ["y"]: Math.fround(_x_6 + _ty_0)};
}

function $Transform2D$compose$(_outer_0, _inner_0) {
  const _a_0 = _outer_0["a"];
  const _b_0 = _outer_0["b"];
  const _c_0 = _outer_0["c"];
  const _d_0 = _outer_0["d"];
  const _tx_0 = _outer_0["tx"];
  const _ty_0 = _outer_0["ty"];
  const _e_0 = _inner_0["a"];
  const _f_0 = _inner_0["b"];
  const _g_0 = _inner_0["c"];
  const _h_0 = _inner_0["d"];
  const _ux_0 = _inner_0["tx"];
  const _uy_0 = _inner_0["ty"];
  const _x_0 = Math.fround(_a_0 * _e_0);
  const _x_1 = Math.fround(_c_0 * _f_0);
  const _x_2 = Math.fround(_b_0 * _e_0);
  const _x_3 = Math.fround(_d_0 * _f_0);
  const _x_4 = Math.fround(_a_0 * _g_0);
  const _x_5 = Math.fround(_c_0 * _h_0);
  const _x_6 = Math.fround(_b_0 * _g_0);
  const _x_7 = Math.fround(_d_0 * _h_0);
  const _x_8 = Math.fround(_a_0 * _ux_0);
  const _x_9 = Math.fround(_c_0 * _uy_0);
  const _x_10 = Math.fround(_x_8 + _x_9);
  const _x_11 = Math.fround(_b_0 * _ux_0);
  const _x_12 = Math.fround(_d_0 * _uy_0);
  const _x_13 = Math.fround(_x_11 + _x_12);
  return {$: "Matrix", ["a"]: Math.fround(_x_0 + _x_1), ["b"]: Math.fround(_x_2 + _x_3), ["c"]: Math.fround(_x_4 + _x_5), ["d"]: Math.fround(_x_6 + _x_7), ["tx"]: Math.fround(_x_10 + _tx_0), ["ty"]: Math.fround(_x_13 + _ty_0)};
}

function $Transform2D$inverse_case$(_valid_0, _matrix_0, _det_0) {
  if (!_valid_0) {
    return {$: "None"};
  } else {
    const _a_0 = _matrix_0["a"];
    const _b_0 = _matrix_0["b"];
    const _c_0 = _matrix_0["c"];
    const _d_0 = _matrix_0["d"];
    const _tx_0 = _matrix_0["tx"];
    const _ty_0 = _matrix_0["ty"];
    const _inv_0 = Math.fround(1 / _det_0);
    const _ia_0 = Math.fround(_d_0 * _inv_0);
    const _x_0 = Math.fround(_b_0 * _inv_0);
    const _ib_0 = (-_x_0);
    const _x_1 = Math.fround(_c_0 * _inv_0);
    const _ic_0 = (-_x_1);
    const _id_0 = Math.fround(_a_0 * _inv_0);
    const _x_2 = Math.fround(_ia_0 * _tx_0);
    const _x_3 = Math.fround(_ic_0 * _ty_0);
    const _x_4 = Math.fround(_x_2 + _x_3);
    const _x_5 = Math.fround(_ib_0 * _tx_0);
    const _x_6 = Math.fround(_id_0 * _ty_0);
    const _x_7 = Math.fround(_x_5 + _x_6);
    return {$: "Some", ["value"]: {$: "Matrix", ["a"]: _ia_0, ["b"]: _ib_0, ["c"]: _ic_0, ["d"]: _id_0, ["tx"]: (-_x_4), ["ty"]: (-_x_7)}};
  }
}

function $Transform2D$inverse$(_matrix_0, _epsilon_0) {
  const _a_0 = _matrix_0["a"];
  const _b_0 = _matrix_0["b"];
  const _c_0 = _matrix_0["c"];
  const _d_0 = _matrix_0["d"];
  const _tx_0 = _matrix_0["tx"];
  const _ty_0 = _matrix_0["ty"];
  const _x_0 = Math.fround(_a_0 * _d_0);
  const _x_1 = Math.fround(_b_0 * _c_0);
  const _det_0 = Math.fround(_x_0 - _x_1);
  const _x_2 = Math.fround(Math.abs(_det_0));
  const _x_3 = Math.fround(Math.abs(_epsilon_0));
  return run_jump($Transform2D$inverse_case$, [(_x_2 > _x_3), {$: "Matrix", ["a"]: _a_0, ["b"]: _b_0, ["c"]: _c_0, ["d"]: _d_0, ["tx"]: _tx_0, ["ty"]: _ty_0}, _det_0]);
}

function $RgbaAffine$px$(_p_0) {
  const _x_0 = _p_0["x"];
  const _y_0 = _p_0["y"];
  return _x_0;
}

function $RgbaAffine$py$(_p_0) {
  const _x_0 = _p_0["x"];
  const _y_0 = _p_0["y"];
  return _y_0;
}

function $RgbaAffine$floor_bound$(_value_0) {
  const _x_0 = run_loop($F32$clamp$(_value_0, 0, 4096));
  const _x_1 = Math.fround(Math.floor(_x_0));
  return (_x_1 >= 1 && _x_1 < 4294967296 ? Math.floor(_x_1) : 0);
}

function $RgbaAffine$ceil_bound$(_value_0) {
  const _x_0 = run_loop($F32$clamp$(_value_0, 0, 4096));
  const _x_1 = Math.fround(Math.ceil(_x_0));
  return (_x_1 >= 1 && _x_1 < 4294967296 ? Math.floor(_x_1) : 0);
}

function $RgbaAffine$bounds4$(_a_0, _b_0, _c_0, _d_0) {
  return {$: "Box", ["left"]: run_loop($RgbaAffine$floor_bound$(run_loop($F32$min$(run_loop($F32$min$(run_loop($RgbaAffine$px$(_a_0)), run_loop($RgbaAffine$px$(_b_0)))), run_loop($F32$min$(run_loop($RgbaAffine$px$(_c_0)), run_loop($RgbaAffine$px$(_d_0)))))))), ["top"]: run_loop($RgbaAffine$floor_bound$(run_loop($F32$min$(run_loop($F32$min$(run_loop($RgbaAffine$py$(_a_0)), run_loop($RgbaAffine$py$(_b_0)))), run_loop($F32$min$(run_loop($RgbaAffine$py$(_c_0)), run_loop($RgbaAffine$py$(_d_0)))))))), ["right"]: run_loop($RgbaAffine$ceil_bound$(run_loop($F32$max$(run_loop($F32$max$(run_loop($RgbaAffine$px$(_a_0)), run_loop($RgbaAffine$px$(_b_0)))), run_loop($F32$max$(run_loop($RgbaAffine$px$(_c_0)), run_loop($RgbaAffine$px$(_d_0)))))))), ["bottom"]: run_loop($RgbaAffine$ceil_bound$(run_loop($F32$max$(run_loop($F32$max$(run_loop($RgbaAffine$py$(_a_0)), run_loop($RgbaAffine$py$(_b_0)))), run_loop($F32$max$(run_loop($RgbaAffine$py$(_c_0)), run_loop($RgbaAffine$py$(_d_0))))))))};
}

function $RgbaAffine$prepared_inverse$(_valid_0, _shape_0, _inverse_0, _bounds_0) {
  if (!_valid_0) {
    return {$: "Empty"};
  } else {
    if (_inverse_0.$ === "None") {
      return {$: "Empty"};
    } else {
      const _matrix_0 = _inverse_0["value"];
      return {$: "Surface", ["shape"]: _shape_0, ["inverse"]: _matrix_0, ["bounds"]: _bounds_0};
    }
  }
}

function $RgbaAffine$prepared_shape$(_shape_0, _matrix_0, _bounds_0) {
  const _ab_0 = _shape_0["ab"];
  const _bc_0 = _shape_0["bc"];
  const _cd_0 = _shape_0["cd"];
  const _da_0 = _shape_0["da"];
  const _area_0 = _shape_0["area"];
  return run_jump($RgbaAffine$prepared_inverse$, [(_area_0 > 0.10000000149011612), {$: "Shape", ["ab"]: _ab_0, ["bc"]: _bc_0, ["cd"]: _cd_0, ["da"]: _da_0, ["area"]: _area_0}, run_loop($Transform2D$inverse$(_matrix_0, 0.10000000149011612)), _bounds_0]);
}

function $RgbaAffine$prepare$(_matrix_0) {
  const _a_0 = run_loop($Transform2D$point$(_matrix_0, {$: "Point", ["x"]: 0, ["y"]: 0}));
  const _b_0 = run_loop($Transform2D$point$(_matrix_0, {$: "Point", ["x"]: 1, ["y"]: 0}));
  const _c_0 = run_loop($Transform2D$point$(_matrix_0, {$: "Point", ["x"]: 1, ["y"]: 1}));
  const _d_0 = run_loop($Transform2D$point$(_matrix_0, {$: "Point", ["x"]: 0, ["y"]: 1}));
  return run_jump($RgbaAffine$prepared_shape$, [run_loop($$$$Quad$make$(_a_0, _b_0, _c_0, _d_0)), _matrix_0, run_loop($RgbaAffine$bounds4$(_a_0, _b_0, _c_0, _d_0))]);
}

function $RgbaAffine$prepare_points$(_a_0, _b_0, _d_0) {
  const _x_0 = run_loop($RgbaAffine$px$(_b_0));
  const _x_1 = run_loop($RgbaAffine$px$(_a_0));
  const _x_2 = run_loop($RgbaAffine$py$(_b_0));
  const _x_3 = run_loop($RgbaAffine$py$(_a_0));
  const _x_4 = run_loop($RgbaAffine$px$(_d_0));
  const _x_5 = run_loop($RgbaAffine$px$(_a_0));
  const _x_6 = run_loop($RgbaAffine$py$(_d_0));
  const _x_7 = run_loop($RgbaAffine$py$(_a_0));
  return run_jump($RgbaAffine$prepare$, [{$: "Matrix", ["a"]: Math.fround(_x_0 - _x_1), ["b"]: Math.fround(_x_2 - _x_3), ["c"]: Math.fround(_x_4 - _x_5), ["d"]: Math.fround(_x_6 - _x_7), ["tx"]: run_loop($RgbaAffine$px$(_a_0)), ["ty"]: run_loop($RgbaAffine$py$(_a_0))}]);
}

function $RgbaAffine$bounds$(_geometry_0) {
  if (_geometry_0.$ === "Empty") {
    return run_jump($Rect$empty$, []);
  } else {
    const _shape_0 = _geometry_0["shape"];
    const _inverse_0 = _geometry_0["inverse"];
    const _bounds_0 = _geometry_0["bounds"];
    return _bounds_0;
  }
}

function $RgbaAffine$paint$(_texel_0, _count_0, _opacity_0, _target_0) {
  const _color_0 = _texel_0["color"];
  const _alpha_0 = _texel_0["alpha"];
  return run_jump($Shapes$paint_leaf$, [_count_0, run_loop($MaskedLayer$effective$(_alpha_0, _opacity_0)), _color_0, _target_0]);
}

function $RgbaAffine$sample_point$(_point_0, _texture_0, _filter_0) {
  const _u_0 = _point_0["x"];
  const _v_0 = _point_0["y"];
  return run_jump($RgbaSample$uv$, [_filter_0, _texture_0, _u_0, _v_0]);
}

function $RgbaAffine$leaf_case$(_empty_0, _count_0, _inverse_0, _x_0, _y_0, _texture_0, _filter_0, _opacity_0, _target_0) {
  if (_empty_0) {
    return _target_0;
  } else {
    const _x_1 = Math.fround(_x_0);
    const _x_2 = Math.fround(_y_0);
    return run_jump($RgbaAffine$paint$, [run_loop($RgbaAffine$sample_point$(run_loop($Transform2D$point$(_inverse_0, {$: "Point", ["x"]: Math.fround(_x_1 + 0.5), ["y"]: Math.fround(_x_2 + 0.5)})), _texture_0, _filter_0)), _count_0, _opacity_0, _target_0]);
  }
}

function $RgbaAffine$leaf$(_count_0, _inverse_0, _x_0, _y_0, _texture_0, _filter_0, _opacity_0, _target_0) {
  return run_jump($RgbaAffine$leaf_case$, [(_count_0 === 0), _count_0, _inverse_0, _x_0, _y_0, _texture_0, _filter_0, _opacity_0, _target_0]);
}

function $RgbaAffine$excluded$(_shape_0, _clip_0, _x_0, _y_0, _size_0) {
  const _x_1 = run_loop($Bool$not$(run_loop($Rect$overlaps$(_clip_0, run_loop($Rect$cell$(_x_0, _y_0, _size_0))))));
  const _x_2 = run_loop($Facet$outside_pixels$(_shape_0, Math.fround(_x_0), Math.fround(_y_0), _size_0));
  return (_x_1 || _x_2);
}

function $RgbaAffine$region$(_depth_0, _size_0, _x_0, _y_0, _outside_0, _shape_0, _inverse_0, _clip_0, _texture_0, _filter_0, _opacity_0, _target_0) {
  if (_depth_0 === 0n) {
    if (_outside_0) {
      return _target_0;
    } else {
      return run_jump($RgbaAffine$leaf$, [run_loop($Facet$coverage$(_shape_0, Math.fround(_x_0), Math.fround(_y_0))), _inverse_0, _x_0, _y_0, _texture_0, _filter_0, _opacity_0, _target_0]);
    }
  } else {
    const _rest_0 = (_depth_0 - 1n);
    if (_outside_0) {
      return _target_0;
    } else {
      const _h_0 = (2 === 0 ? 0 : (_size_0 / 2) >>> 0);
      const _xx_0 = ((_x_0 + _h_0) >>> 0);
      const _yy_0 = ((_y_0 + _h_0) >>> 0);
      const _a_0 = run_loop($RgbaAffine$region$(_rest_0, _h_0, _x_0, _y_0, run_loop($RgbaAffine$excluded$(_shape_0, _clip_0, _x_0, _y_0, _h_0)), _shape_0, _inverse_0, _clip_0, _texture_0, _filter_0, _opacity_0, run_loop($ImageOps$tl$(_target_0))));
      const _b_0 = run_loop($RgbaAffine$region$(_rest_0, _h_0, _xx_0, _y_0, run_loop($RgbaAffine$excluded$(_shape_0, _clip_0, _xx_0, _y_0, _h_0)), _shape_0, _inverse_0, _clip_0, _texture_0, _filter_0, _opacity_0, run_loop($ImageOps$tr$(_target_0))));
      const _c_0 = run_loop($RgbaAffine$region$(_rest_0, _h_0, _x_0, _yy_0, run_loop($RgbaAffine$excluded$(_shape_0, _clip_0, _x_0, _yy_0, _h_0)), _shape_0, _inverse_0, _clip_0, _texture_0, _filter_0, _opacity_0, run_loop($ImageOps$bl$(_target_0))));
      const _d_0 = run_loop($RgbaAffine$region$(_rest_0, _h_0, _xx_0, _yy_0, run_loop($RgbaAffine$excluded$(_shape_0, _clip_0, _xx_0, _yy_0, _h_0)), _shape_0, _inverse_0, _clip_0, _texture_0, _filter_0, _opacity_0, run_loop($ImageOps$br$(_target_0))));
      return {$: "Qua", ["tl"]: _a_0, ["tr"]: _b_0, ["bl"]: _c_0, ["br"]: _d_0};
    }
  }
}

function $RgbaAffine$region_geometry$(_geometry_0, _depth_0, _size_0, _x_0, _y_0, _texture_0, _filter_0, _opacity_0, _clip_0, _target_0) {
  if (_geometry_0.$ === "Empty") {
    return _target_0;
  } else {
    const _shape_0 = _geometry_0["shape"];
    const _inverse_0 = _geometry_0["inverse"];
    const _bounds_0 = _geometry_0["bounds"];
    return run_jump($RgbaAffine$region$, [_depth_0, _size_0, _x_0, _y_0, run_loop($RgbaAffine$excluded$(_shape_0, _clip_0, _x_0, _y_0, _size_0)), _shape_0, _inverse_0, _clip_0, _texture_0, _filter_0, _opacity_0, _target_0]);
  }
}

function $RgbaAffine$draw_zero$(_zero_0, _depth_0, _size_0, _geometry_0, _texture_0, _filter_0, _opacity_0, _clip_0, _target_0) {
  if (_zero_0) {
    return _target_0;
  } else {
    return run_jump($RgbaAffine$region_geometry$, [_geometry_0, _depth_0, _size_0, 0, 0, _texture_0, _filter_0, _opacity_0, _clip_0, _target_0]);
  }
}

function $RgbaAffine$draw$(_depth_0, _size_0, _geometry_0, _texture_0, _filter_0, _opacity_0, _clip_0, _target_0) {
  const _x_0 = run_loop($RgbaSample$size$(_texture_0));
  const _x_1 = (_opacity_0 === 0);
  const _x_2 = (_x_0 === 0);
  return run_jump($RgbaAffine$draw_zero$, [(_x_1 || _x_2), _depth_0, _size_0, _geometry_0, _texture_0, _filter_0, _opacity_0, _clip_0, _target_0]);
}

function $bounds$(_path_0) {
  if (_path_0.$ === "Empty") {
    return run_jump($Rect$empty$, []);
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

function $line_case$(_valid_0, _a_0, _b_0, _radius_0) {
  if (!_valid_0) {
    return {$: "Empty"};
  } else {
    const _ax_0 = _a_0["x"];
    const _ay_0 = _a_0["y"];
    const _bx_0 = _b_0["x"];
    const _by_0 = _b_0["y"];
    const _x_0 = run_loop($F32$min$(_ax_0, _bx_0));
    const _x_1 = run_loop($F32$min$(_ay_0, _by_0));
    const _x_2 = run_loop($F32$max$(_ax_0, _bx_0));
    const _x_3 = run_loop($F32$max$(_ay_0, _by_0));
    return {$: "Capsule", ["ax"]: _ax_0, ["ay"]: _ay_0, ["bx"]: _bx_0, ["by"]: _by_0, ["radius2"]: Math.fround(_radius_0 * _radius_0), ["bounds"]: {$: "Box", ["left"]: run_loop($RgbaAffine$floor_bound$(Math.fround(_x_0 - _radius_0))), ["top"]: run_loop($RgbaAffine$floor_bound$(Math.fround(_x_1 - _radius_0))), ["right"]: run_loop($RgbaAffine$ceil_bound$(Math.fround(_x_2 + _radius_0))), ["bottom"]: run_loop($RgbaAffine$ceil_bound$(Math.fround(_x_3 + _radius_0)))}};
  }
}

function $line$(_a_0, _b_0, _radius_0) {
  return run_jump($line_case$, [run_loop($Bool$and$((_radius_0 > 0), (_radius_0 <= 512))), _a_0, _b_0, _radius_0]);
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
      return {$: "Join", ["left"]: _left_0, ["right"]: _right_0, ["bounds"]: run_loop($Rect$union$(run_loop($bounds$(_left_0)), run_loop($bounds$(_right_0))))};
    }
  }
}

function $middle$(_a_0, _b_0) {
  const _ax_0 = _a_0["x"];
  const _ay_0 = _a_0["y"];
  const _bx_0 = _b_0["x"];
  const _by_0 = _b_0["y"];
  const _x_0 = Math.fround(_ax_0 + _bx_0);
  const _x_1 = Math.fround(_ay_0 + _by_0);
  return {$: "Point", ["x"]: Math.fround(_x_0 * 0.5), ["y"]: Math.fround(_x_1 * 0.5)};
}

function $quadratic$(_levels_0, _a_0, _control_0, _b_0, _radius_0) {
  if (_levels_0 === 0n) {
    return run_jump($line$, [_a_0, _b_0, _radius_0]);
  } else {
    const _rest_0 = (_levels_0 - 1n);
    const _ac_0 = run_loop($middle$(_a_0, _control_0));
    const _cb_0 = run_loop($middle$(_control_0, _b_0));
    const _mid_0 = run_loop($middle$(_ac_0, _cb_0));
    const _l_0 = run_loop($quadratic$(_rest_0, _a_0, _ac_0, _mid_0, _radius_0));
    const _r_0 = run_loop($quadratic$(_rest_0, _mid_0, _cb_0, _b_0, _radius_0));
    return run_jump($join$, [_l_0, _r_0]);
  }
}

function $cubic$(_levels_0, _a_0, _c1_0, _c2_0, _b_0, _radius_0) {
  if (_levels_0 === 0n) {
    return run_jump($line$, [_a_0, _b_0, _radius_0]);
  } else {
    const _rest_0 = (_levels_0 - 1n);
    const _ab_0 = run_loop($middle$(_a_0, _c1_0));
    const _bc_0 = run_loop($middle$(_c1_0, _c2_0));
    const _cd_0 = run_loop($middle$(_c2_0, _b_0));
    const _abc_0 = run_loop($middle$(_ab_0, _bc_0));
    const _bcd_0 = run_loop($middle$(_bc_0, _cd_0));
    const _mid_0 = run_loop($middle$(_abc_0, _bcd_0));
    const _l_0 = run_loop($cubic$(_rest_0, _a_0, _ab_0, _abc_0, _mid_0, _radius_0));
    const _r_0 = run_loop($cubic$(_rest_0, _mid_0, _bcd_0, _cd_0, _b_0, _radius_0));
    return run_jump($join$, [_l_0, _r_0]);
  }
}

function $projection$(_zero_0, _numerator_0, _denominator_0) {
  if (_zero_0) {
    return 0;
  } else {
    return run_jump($F32$clamp$, [Math.fround(_numerator_0 / _denominator_0), 0, 1]);
  }
}

function $capsule$(_ax_0, _ay_0, _bx_0, _by_0, _radius2_0, _x_0, _y_0) {
  const _dx_0 = Math.fround(_bx_0 - _ax_0);
  const _dy_0 = Math.fround(_by_0 - _ay_0);
  const _x_1 = Math.fround(_dx_0 * _dx_0);
  const _x_2 = Math.fround(_dy_0 * _dy_0);
  const _denom_0 = Math.fround(_x_1 + _x_2);
  const _x_3 = Math.fround(_x_0 - _ax_0);
  const _x_4 = Math.fround(_y_0 - _ay_0);
  const _x_5 = Math.fround(_x_3 * _dx_0);
  const _x_6 = Math.fround(_x_4 * _dy_0);
  const _t_0 = run_loop($projection$((_denom_0 === 0), Math.fround(_x_5 + _x_6), _denom_0));
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

function $hit_case$(_path_0, _excluded_0, _x_0, _y_0) {
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
      return run_jump($capsule$, [_ax_0, _ay_0, _bx_0, _by_0, _radius2_0, _x_0, _y_0]);
    }
  } else {
    const _left_0 = _path_0["left"];
    const _right_0 = _path_0["right"];
    const _box_0 = _path_0["bounds"];
    if (_excluded_0) {
      return false;
    } else {
      const _x_1 = run_loop($hit_case$(_left_0, run_loop($Bool$not$(run_loop($Rect$point$(run_loop($bounds$(_left_0)), (_x_0 >= 1 && _x_0 < 4294967296 ? Math.floor(_x_0) : 0), (_y_0 >= 1 && _y_0 < 4294967296 ? Math.floor(_y_0) : 0))))), _x_0, _y_0));
      const _x_2 = run_loop($hit_case$(_right_0, run_loop($Bool$not$(run_loop($Rect$point$(run_loop($bounds$(_right_0)), (_x_0 >= 1 && _x_0 < 4294967296 ? Math.floor(_x_0) : 0), (_y_0 >= 1 && _y_0 < 4294967296 ? Math.floor(_y_0) : 0))))), _x_0, _y_0));
      return (_x_1 || _x_2);
    }
  }
}

function $hit$(_path_0, _x_0, _y_0) {
  return run_jump($hit_case$, [_path_0, run_loop($Bool$not$(run_loop($Rect$point$(run_loop($bounds$(_path_0)), (_x_0 >= 1 && _x_0 < 4294967296 ? Math.floor(_x_0) : 0), (_y_0 >= 1 && _y_0 < 4294967296 ? Math.floor(_y_0) : 0))))), _x_0, _y_0]);
}

function $coverage$(_path_0, _x_0, _y_0) {
  const _x_1 = run_loop($Shapes$bit$(run_loop($hit$(_path_0, Math.fround(_x_0 + 0.25), Math.fround(_y_0 + 0.25)))));
  const _x_2 = run_loop($Shapes$bit$(run_loop($hit$(_path_0, Math.fround(_x_0 + 0.75), Math.fround(_y_0 + 0.25)))));
  const _x_3 = run_loop($Shapes$bit$(run_loop($hit$(_path_0, Math.fround(_x_0 + 0.25), Math.fround(_y_0 + 0.75)))));
  const _x_4 = run_loop($Shapes$bit$(run_loop($hit$(_path_0, Math.fround(_x_0 + 0.75), Math.fround(_y_0 + 0.75)))));
  const _x_5 = ((_x_1 + _x_2) >>> 0);
  const _x_6 = ((_x_3 + _x_4) >>> 0);
  return ((_x_5 + _x_6) >>> 0);
}

function $region$(_depth_0, _size_0, _x_0, _y_0, _excluded_0, _path_0, _clip_0, _ink_0, _opacity_0, _target_0) {
  if (_depth_0 === 0n) {
    if (_excluded_0) {
      return _target_0;
    } else {
      return run_jump($Shapes$paint_leaf$, [run_loop($coverage$(_path_0, Math.fround(_x_0), Math.fround(_y_0))), _opacity_0, _ink_0, _target_0]);
    }
  } else {
    const _rest_0 = (_depth_0 - 1n);
    if (_excluded_0) {
      return _target_0;
    } else {
      const _h_0 = (2 === 0 ? 0 : (_size_0 / 2) >>> 0);
      const _xx_0 = ((_x_0 + _h_0) >>> 0);
      const _yy_0 = ((_y_0 + _h_0) >>> 0);
      const _a_0 = run_loop($region$(_rest_0, _h_0, _x_0, _y_0, run_loop($Bool$not$(run_loop($Rect$overlaps$(_clip_0, run_loop($Rect$cell$(_x_0, _y_0, _h_0)))))), _path_0, _clip_0, _ink_0, _opacity_0, run_loop($ImageOps$tl$(_target_0))));
      const _b_0 = run_loop($region$(_rest_0, _h_0, _xx_0, _y_0, run_loop($Bool$not$(run_loop($Rect$overlaps$(_clip_0, run_loop($Rect$cell$(_xx_0, _y_0, _h_0)))))), _path_0, _clip_0, _ink_0, _opacity_0, run_loop($ImageOps$tr$(_target_0))));
      const _c_0 = run_loop($region$(_rest_0, _h_0, _x_0, _yy_0, run_loop($Bool$not$(run_loop($Rect$overlaps$(_clip_0, run_loop($Rect$cell$(_x_0, _yy_0, _h_0)))))), _path_0, _clip_0, _ink_0, _opacity_0, run_loop($ImageOps$bl$(_target_0))));
      const _d_0 = run_loop($region$(_rest_0, _h_0, _xx_0, _yy_0, run_loop($Bool$not$(run_loop($Rect$overlaps$(_clip_0, run_loop($Rect$cell$(_xx_0, _yy_0, _h_0)))))), _path_0, _clip_0, _ink_0, _opacity_0, run_loop($ImageOps$br$(_target_0))));
      return {$: "Qua", ["tl"]: _a_0, ["tr"]: _b_0, ["bl"]: _c_0, ["br"]: _d_0};
    }
  }
}

function $draw$(_depth_0, _size_0, _path_0, _ink_0, _opacity_0, _clip_0, _target_0) {
  const _visible_0 = run_loop($Rect$intersect$(run_loop($bounds$(_path_0)), _clip_0));
  const _x_0 = (_opacity_0 === 0);
  const _x_1 = run_loop($Bool$not$(run_loop($Rect$overlaps$(_visible_0, run_loop($Rect$screen$(_size_0))))));
  return run_jump($region$, [_depth_0, _size_0, 0, 0, (_x_0 || _x_1), _path_0, _visible_0, _ink_0, _opacity_0, _target_0]);
}

function $U32$min$(_a_0, _b_0) {
  return run_jump($Bool$pick$, [(_a_0 < _b_0), _a_0, _b_0]);
}

function $U32$max$(_a_0, _b_0) {
  return run_jump($Bool$pick$, [(_a_0 < _b_0), _b_0, _a_0]);
}

function $Bool$and$(_a_0, _b_0) {
  if (!_a_0) {
    return false;
  } else {
    return _b_0;
  }
}

function $Bool$not$(_b_0) {
  if (!_b_0) {
    return true;
  } else {
    return false;
  }
}

function $$$$Quad$outside$(_q_0, _x_0, _y_0, _size_0) {
  const _a_0 = _q_0["ab"];
  const _b_0 = _q_0["bc"];
  const _c_0 = _q_0["cd"];
  const _d_0 = _q_0["da"];
  const _area_0 = _q_0["area"];
  const _x_1 = run_loop($$$$Quad$edge$high$(_a_0, _x_0, _y_0, _size_0));
  const _x_2 = run_loop($$$$Quad$edge$high$(_b_0, _x_0, _y_0, _size_0));
  const _x_3 = run_loop($$$$Quad$edge$high$(_c_0, _x_0, _y_0, _size_0));
  const _x_4 = run_loop($$$$Quad$edge$high$(_d_0, _x_0, _y_0, _size_0));
  const _x_5 = (_x_3 < 0);
  const _x_6 = (_x_4 < 0);
  const _x_7 = (_x_2 < 0);
  const _x_8 = (_x_5 || _x_6);
  const _x_9 = (_x_1 < 0);
  const _x_10 = (_x_7 || _x_8);
  return (_x_9 || _x_10);
}

function $$$$Quad$inside$(_q_0, _x_0, _y_0, _size_0) {
  const _a_0 = _q_0["ab"];
  const _b_0 = _q_0["bc"];
  const _c_0 = _q_0["cd"];
  const _d_0 = _q_0["da"];
  const _area_0 = _q_0["area"];
  return run_jump($Bool$and$, [run_loop($$$$Quad$edge$inside$(_a_0, _x_0, _y_0, _size_0)), run_loop($Bool$and$(run_loop($$$$Quad$edge$inside$(_b_0, _x_0, _y_0, _size_0)), run_loop($Bool$and$(run_loop($$$$Quad$edge$inside$(_c_0, _x_0, _y_0, _size_0)), run_loop($$$$Quad$edge$inside$(_d_0, _x_0, _y_0, _size_0))))))]);
}

function $$$$pixels$Pixel$sample_xy$(_depth_0, _x_0, _y_0, _image_0) {
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
      return run_jump($$$$pixels$Pixel$sample_xy$, [_rest_0, _next_x_0, _next_y_0, _child_0]);
    }
  }
}

function $$$$Quad$make$(_a_0, _b_0, _c_0, _d_0) {
  const _ax_0 = _a_0["x"];
  const _ay_0 = _a_0["y"];
  const _bx_0 = _b_0["x"];
  const _by_0 = _b_0["y"];
  const _cx_0 = _c_0["x"];
  const _cy_0 = _c_0["y"];
  const _dx_0 = _d_0["x"];
  const _dy_0 = _d_0["y"];
  const _x_0 = Math.fround(_ax_0 + _bx_0);
  const _x_1 = Math.fround(_x_0 + _cx_0);
  const _x_2 = Math.fround(_x_1 + _dx_0);
  const _x_3 = Math.fround(_ay_0 + _by_0);
  const _x_4 = Math.fround(_x_3 + _cy_0);
  const _x_5 = Math.fround(_x_4 + _dy_0);
  const _center_0 = {$: "Point", ["x"]: Math.fround(_x_2 / 4), ["y"]: Math.fround(_x_5 / 4)};
  const _x_6 = Math.fround(_bx_0 - _ax_0);
  const _x_7 = Math.fround(_dy_0 - _ay_0);
  const _x_8 = Math.fround(_by_0 - _ay_0);
  const _x_9 = Math.fround(_dx_0 - _ax_0);
  const _x_10 = Math.fround(_x_6 * _x_7);
  const _x_11 = Math.fround(_x_8 * _x_9);
  const _x_12 = Math.fround(_x_10 - _x_11);
  return {$: "Shape", ["ab"]: run_loop($$$$Quad$edge$({$: "Point", ["x"]: _ax_0, ["y"]: _ay_0}, {$: "Point", ["x"]: _bx_0, ["y"]: _by_0}, _center_0)), ["bc"]: run_loop($$$$Quad$edge$({$: "Point", ["x"]: _bx_0, ["y"]: _by_0}, {$: "Point", ["x"]: _cx_0, ["y"]: _cy_0}, _center_0)), ["cd"]: run_loop($$$$Quad$edge$({$: "Point", ["x"]: _cx_0, ["y"]: _cy_0}, {$: "Point", ["x"]: _dx_0, ["y"]: _dy_0}, _center_0)), ["da"]: run_loop($$$$Quad$edge$({$: "Point", ["x"]: _dx_0, ["y"]: _dy_0}, {$: "Point", ["x"]: _ax_0, ["y"]: _ay_0}, _center_0)), ["area"]: Math.fround(Math.abs(_x_12))};
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

function $Bool$pick$(_c_0, _a_0, _b_0) {
  if (!_c_0) {
    return _b_0;
  } else {
    return _a_0;
  }
}

function $$$$Quad$edge$high$(_e_0, _x_0, _y_0, _size_0) {
  const _a_0 = _e_0["a"];
  const _b_0 = _e_0["b"];
  const _c_0 = _e_0["c"];
  const _inset_0 = _e_0["inset"];
  const _x_1 = Math.fround(_a_0 * _x_0);
  const _x_2 = Math.fround(_b_0 * _y_0);
  const _x_3 = Math.fround(_x_1 + _x_2);
  const _x_4 = Math.fround(_x_3 + _c_0);
  const _x_5 = run_loop($F32$max$(0, Math.fround(_a_0 * _size_0)));
  const _x_6 = Math.fround(_x_4 + _x_5);
  const _x_7 = run_loop($F32$max$(0, Math.fround(_b_0 * _size_0)));
  return Math.fround(_x_6 + _x_7);
}

function $$$$Quad$edge$inside$(_e_0, _x_0, _y_0, _size_0) {
  const _a_0 = _e_0["a"];
  const _b_0 = _e_0["b"];
  const _c_0 = _e_0["c"];
  const _inset_0 = _e_0["inset"];
  const _x_1 = run_loop($$$$Quad$edge$low$({$: "Edge", ["a"]: _a_0, ["b"]: _b_0, ["c"]: _c_0, ["inset"]: _inset_0}, _x_0, _y_0, _size_0));
  return (_x_1 >= _inset_0);
}

function $$$$Quad$edge$(_p_0, _q_0, _center_0) {
  const _x_0 = _p_0["x"];
  const _y_0 = _p_0["y"];
  const _xx_0 = _q_0["x"];
  const _yy_0 = _q_0["y"];
  const _cx_0 = _center_0["x"];
  const _cy_0 = _center_0["y"];
  const _a_0 = Math.fround(_y_0 - _yy_0);
  const _b_0 = Math.fround(_xx_0 - _x_0);
  const _x_1 = Math.fround(_x_0 * _yy_0);
  const _x_2 = Math.fround(_xx_0 * _y_0);
  const _c_0 = Math.fround(_x_1 - _x_2);
  const _x_3 = Math.fround(_a_0 * _cx_0);
  const _x_4 = Math.fround(_b_0 * _cy_0);
  const _x_5 = Math.fround(_x_3 + _x_4);
  const _x_6 = Math.fround(_x_5 + _c_0);
  const _sign_0 = run_loop($Bool$pick$((_x_6 < 0), Math.fround(0 - 1), 1));
  const _x_7 = Math.fround(Math.abs(_a_0));
  const _x_8 = Math.fround(Math.abs(_b_0));
  return {$: "Edge", ["a"]: Math.fround(_a_0 * _sign_0), ["b"]: Math.fround(_b_0 * _sign_0), ["c"]: Math.fround(_c_0 * _sign_0), ["inset"]: Math.fround(_x_7 + _x_8)};
}

function $$$$Quad$edge$low$(_e_0, _x_0, _y_0, _size_0) {
  const _a_0 = _e_0["a"];
  const _b_0 = _e_0["b"];
  const _c_0 = _e_0["c"];
  const _inset_0 = _e_0["inset"];
  const _x_1 = Math.fround(_a_0 * _x_0);
  const _x_2 = Math.fround(_b_0 * _y_0);
  const _x_3 = Math.fround(_x_1 + _x_2);
  const _x_4 = Math.fround(_x_3 + _c_0);
  const _x_5 = run_loop($F32$min$(0, Math.fround(_a_0 * _size_0)));
  const _x_6 = Math.fround(_x_4 + _x_5);
  const _x_7 = run_loop($F32$min$(0, Math.fround(_b_0 * _size_0)));
  return Math.fround(_x_6 + _x_7);
}
export default {
  "Color.red": run_lib($Color$red$, 1),
  "Color.green": run_lib($Color$green$, 1),
  "Color.blue": run_lib($Color$blue$, 1),
  "Color.rgb": run_lib($Color$rgb$, 3),
  "Color.channel": run_lib($Color$channel$, 3),
  "Color.over_partial": run_lib($Color$over_partial$, 3),
  "Color.over_case": run_lib($Color$over_case$, 5),
  "Color.over": run_lib($Color$over$, 3),
  "Color.add_channel": run_lib($Color$add_channel$, 2),
  "Color.add": run_lib($Color$add$, 2),
  "Color.scale": run_lib($Color$scale$, 2),
  "Shapes.valid_coord": run_lib($Shapes$valid_coord$, 1),
  "Shapes.biased": run_lib($Shapes$biased$, 1),
  "Shapes.diff": run_lib($Shapes$diff$, 2),
  "Shapes.square": run_lib($Shapes$square$, 1),
  "Shapes.near_case": run_lib($Shapes$near_case$, 5),
  "Shapes.near": run_lib($Shapes$near$, 3),
  "Shapes.far": run_lib($Shapes$far$, 3),
  "Shapes.outside_disk": run_lib($Shapes$outside_disk$, 6),
  "Shapes.inside_disk": run_lib($Shapes$inside_disk$, 6),
  "Shapes.bit": run_lib($Shapes$bit$, 1),
  "Shapes.disk_point": run_lib($Shapes$disk_point$, 5),
  "Shapes.disk_coverage": run_lib($Shapes$disk_coverage$, 5),
  "Shapes.paint_leaf": run_lib($Shapes$paint_leaf$, 4),
  "Shapes.full_blend": run_lib($Shapes$full_blend$, 4),
  "Shapes.full_case": run_lib($Shapes$full_case$, 5),
  "Shapes.full_disk": run_lib($Shapes$full_disk$, 4),
  "Shapes.disk_tree": run_lib($Shapes$disk_tree$, 12),
  "Shapes.disk_valid": run_lib($Shapes$disk_valid$, 9),
  "Shapes.disk_gate": run_lib($Shapes$disk_gate$, 10),
  "Shapes.disk": run_lib($Shapes$disk$, 8),
  "Rect.empty": run_lib($Rect$empty$, 0),
  "Rect.screen": run_lib($Rect$screen$, 1),
  "Rect.cell": run_lib($Rect$cell$, 3),
  "Rect.is_empty": run_lib($Rect$is_empty$, 1),
  "Rect.width": run_lib($Rect$width$, 1),
  "Rect.height": run_lib($Rect$height$, 1),
  "Rect.intersect": run_lib($Rect$intersect$, 2),
  "Rect.overlaps": run_lib($Rect$overlaps$, 2),
  "Rect.contains_parts": run_lib($Rect$contains_parts$, 2),
  "Rect.contains": run_lib($Rect$contains$, 2),
  "Rect.point": run_lib($Rect$point$, 3),
  "Rect.union_parts": run_lib($Rect$union_parts$, 2),
  "Rect.union_case": run_lib($Rect$union_case$, 4),
  "Rect.union": run_lib($Rect$union$, 2),
  "Rect.sprite_valid": run_lib($Rect$sprite_valid$, 5),
  "Rect.sprite": run_lib($Rect$sprite$, 4),
  "ImageOps.tl": run_lib($ImageOps$tl$, 1),
  "ImageOps.tr": run_lib($ImageOps$tr$, 1),
  "ImageOps.bl": run_lib($ImageOps$bl$, 1),
  "ImageOps.br": run_lib($ImageOps$br$, 1),
  "ImageOps.quad_case": run_lib($ImageOps$quad_case$, 5),
  "ImageOps.quad": run_lib($ImageOps$quad$, 4),
  "Facet.covered": run_lib($Facet$covered$, 3),
  "Facet.coverage": run_lib($Facet$coverage$, 3),
  "Facet.outside_pixels": run_lib($Facet$outside_pixels$, 4),
  "Facet.inside_pixels": run_lib($Facet$inside_pixels$, 4),
  "Facet.tree": run_lib($Facet$tree$, 10),
  "Facet.draw_valid": run_lib($Facet$draw_valid$, 7),
  "Facet.draw": run_lib($Facet$draw$, 6),
  "AffineTexture.point_x": run_lib($AffineTexture$point_x$, 1),
  "AffineTexture.point_y": run_lib($AffineTexture$point_y$, 1),
  "AffineTexture.valid_source_size": run_lib($AffineTexture$valid_source_size$, 1),
  "AffineTexture.texel_case": run_lib($AffineTexture$texel_case$, 4),
  "AffineTexture.texel": run_lib($AffineTexture$texel$, 2),
  "AffineTexture.index_at": run_lib($AffineTexture$index_at$, 4),
  "AffineTexture.color_index": run_lib($AffineTexture$color_index$, 3),
  "AffineTexture.color_at": run_lib($AffineTexture$color_at$, 6),
  "AffineTexture.same_index": run_lib($AffineTexture$same_index$, 2),
  "AffineTexture.one_texel": run_lib($AffineTexture$one_texel$, 5),
  "AffineTexture.can_fill": run_lib($AffineTexture$can_fill$, 6),
  "AffineTexture.fill_test": run_lib($AffineTexture$fill_test$, 7),
  "AffineTexture.leaf_case": run_lib($AffineTexture$leaf_case$, 10),
  "AffineTexture.leaf": run_lib($AffineTexture$leaf$, 9),
  "AffineTexture.tree": run_lib($AffineTexture$tree$, 13),
  "AffineTexture.draw_valid": run_lib($AffineTexture$draw_valid$, 10),
  "AffineTexture.draw_basis": run_lib($AffineTexture$draw_basis$, 16),
  "AffineTexture.draw_shape": run_lib($AffineTexture$draw_shape$, 15),
  "AffineTexture.draw_geometry": run_lib($AffineTexture$draw_geometry$, 10),
  "AffineTexture.draw_config": run_lib($AffineTexture$draw_config$, 11),
  "AffineTexture.draw_zero": run_lib($AffineTexture$draw_zero$, 11),
  "AffineTexture.draw": run_lib($AffineTexture$draw$, 10),
  "Gather.split": run_lib($Gather$split$, 6),
  "Gather.choose": run_lib($Gather$choose$, 11),
  "Gather.prepare": run_lib($Gather$prepare$, 7),
  "Gather.descend": run_lib($Gather$descend$, 2),
  "Gather.valid": run_lib($Gather$valid$, 6),
  "Gather.neighbors": run_lib($Gather$neighbors$, 5),
  "RgbaSample.size": run_lib($RgbaSample$size$, 1),
  "RgbaSample.color": run_lib($RgbaSample$color$, 1),
  "RgbaSample.alpha": run_lib($RgbaSample$alpha$, 1),
  "RgbaSample.nearest_valid": run_lib($RgbaSample$nearest_valid$, 4),
  "RgbaSample.nearest": run_lib($RgbaSample$nearest$, 3),
  "RgbaSample.sum4": run_lib($RgbaSample$sum4$, 4),
  "RgbaSample.weighted": run_lib($RgbaSample$weighted$, 9),
  "RgbaSample.finish": run_lib($RgbaSample$finish$, 11),
  "RgbaSample.mix_weights": run_lib($RgbaSample$mix_weights$, 8),
  "RgbaSample.mix": run_lib($RgbaSample$mix$, 6),
  "RgbaSample.mix_gather": run_lib($RgbaSample$mix_gather$, 4),
  "RgbaSample.linear": run_lib($RgbaSample$linear$, 5),
  "RgbaSample.axis": run_lib($RgbaSample$axis$, 2),
  "RgbaSample.linear_axes": run_lib($RgbaSample$linear_axes$, 3),
  "RgbaSample.uv": run_lib($RgbaSample$uv$, 4),
  "Layer.over_tree": run_lib($Layer$over_tree$, 4),
  "Layer.over_case": run_lib($Layer$over_case$, 6),
  "Layer.over": run_lib($Layer$over$, 4),
  "Layer.add_tree": run_lib($Layer$add_tree$, 3),
  "MaskedLayer.effective": run_lib($MaskedLayer$effective$, 2),
  "MaskedLayer.transparent": run_lib($MaskedLayer$transparent$, 1),
  "MaskedLayer.tree": run_lib($MaskedLayer$tree$, 5),
  "MaskedLayer.over_zero": run_lib($MaskedLayer$over_zero$, 6),
  "MaskedLayer.over": run_lib($MaskedLayer$over$, 5),
  "Transform2D.identity": run_lib($Transform2D$identity$, 0),
  "Transform2D.translate": run_lib($Transform2D$translate$, 2),
  "Transform2D.scale": run_lib($Transform2D$scale$, 2),
  "Transform2D.rotate": run_lib($Transform2D$rotate$, 1),
  "Transform2D.point": run_lib($Transform2D$point$, 2),
  "Transform2D.compose": run_lib($Transform2D$compose$, 2),
  "Transform2D.inverse_case": run_lib($Transform2D$inverse_case$, 3),
  "Transform2D.inverse": run_lib($Transform2D$inverse$, 2),
  "RgbaAffine.px": run_lib($RgbaAffine$px$, 1),
  "RgbaAffine.py": run_lib($RgbaAffine$py$, 1),
  "RgbaAffine.floor_bound": run_lib($RgbaAffine$floor_bound$, 1),
  "RgbaAffine.ceil_bound": run_lib($RgbaAffine$ceil_bound$, 1),
  "RgbaAffine.bounds4": run_lib($RgbaAffine$bounds4$, 4),
  "RgbaAffine.prepared_inverse": run_lib($RgbaAffine$prepared_inverse$, 4),
  "RgbaAffine.prepared_shape": run_lib($RgbaAffine$prepared_shape$, 3),
  "RgbaAffine.prepare": run_lib($RgbaAffine$prepare$, 1),
  "RgbaAffine.prepare_points": run_lib($RgbaAffine$prepare_points$, 3),
  "RgbaAffine.bounds": run_lib($RgbaAffine$bounds$, 1),
  "RgbaAffine.paint": run_lib($RgbaAffine$paint$, 4),
  "RgbaAffine.sample_point": run_lib($RgbaAffine$sample_point$, 3),
  "RgbaAffine.leaf_case": run_lib($RgbaAffine$leaf_case$, 9),
  "RgbaAffine.leaf": run_lib($RgbaAffine$leaf$, 8),
  "RgbaAffine.excluded": run_lib($RgbaAffine$excluded$, 5),
  "RgbaAffine.region": run_lib($RgbaAffine$region$, 12),
  "RgbaAffine.region_geometry": run_lib($RgbaAffine$region_geometry$, 10),
  "RgbaAffine.draw_zero": run_lib($RgbaAffine$draw_zero$, 9),
  "RgbaAffine.draw": run_lib($RgbaAffine$draw$, 8),
  "bounds": run_lib($bounds$, 1),
  "line_case": run_lib($line_case$, 4),
  "line": run_lib($line$, 3),
  "join": run_lib($join$, 2),
  "middle": run_lib($middle$, 2),
  "quadratic": run_lib($quadratic$, 5),
  "cubic": run_lib($cubic$, 6),
  "projection": run_lib($projection$, 3),
  "capsule": run_lib($capsule$, 7),
  "hit_case": run_lib($hit_case$, 4),
  "hit": run_lib($hit$, 3),
  "coverage": run_lib($coverage$, 3),
  "region": run_lib($region$, 10),
  "draw": run_lib($draw$, 7),
};
