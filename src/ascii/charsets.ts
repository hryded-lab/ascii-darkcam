export const RAMPS = {
  classic: " .:-=+*#%@",
  detailed:
    " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  blocks: " ░▒▓█",
  ink: " .,:;irsXA253hMHGS#9B&@",
} as const;

export type RampKey = keyof typeof RAMPS;

export const MATRIX_GLYPHS =
  "01ｱｲｳｴｵｶｷｸｹｺﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾗﾘﾙﾚﾛﾜﾝ";

export const EDGE_GLYPHS = ["—", "/", "|", "\\"] as const;

export const BRAILLE_BITS = [
  [0, 1, 2, 6],
  [3, 4, 5, 7],
];

export const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
