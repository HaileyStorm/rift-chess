# Narrow endpoint and rejection laws for the generic Raw Graphics Asset codec.
# These signatures are DRAFT; general image semantics remain finite-tested.
import Base
import ../RgbImage.bend as RgbImage

law decode_depth_zero_single_pixel:
  {RgbImage.decode_bytes([82, 71, 65, 49, 0, 18, 52, 86]) ==
    RgbImage.Decoded{0, Pix{1193046}} : RgbImage.DecodeResult}

law decode_row_major_2x2:
  {RgbImage.decode_bytes([82, 71, 65, 49, 1,
      17, 17, 17, 34, 34, 34, 51, 51, 51, 68, 68, 68]) ==
    RgbImage.Decoded{1,
      Qua{Pix{1118481}, Pix{2236962}, Pix{3355443}, Pix{4473924}}} :
      RgbImage.DecodeResult}

law decode_bad_magic_fails:
  {RgbImage.decode_bytes([88, 71, 65, 49, 0, 18, 52, 86]) ==
    RgbImage.Rejected{RgbImage.BadMagic{}} : RgbImage.DecodeResult}

law decode_trailing_byte_fails:
  {RgbImage.decode_bytes([82, 71, 65, 49, 0, 18, 52, 86, 0]) ==
    RgbImage.Rejected{RgbImage.BadLength{}} : RgbImage.DecodeResult}

law decode_invalid_depth_fails:
  {RgbImage.decode_bytes([82, 71, 65, 49, 10]) ==
    RgbImage.Rejected{RgbImage.BadDepth{}} : RgbImage.DecodeResult}

law decode_non_byte_payload_fails:
  {RgbImage.decode_bytes([82, 71, 65, 49, 0, 256, 52, 86]) ==
    RgbImage.Rejected{RgbImage.NonByte{}} : RgbImage.DecodeResult}
