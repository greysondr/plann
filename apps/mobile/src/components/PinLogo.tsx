import React from "react";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { color } from "../theme/tokens";

// Interpretación en ícono del logo: pin rosa con un ticket recortado en crema y una estrellita.
// (El SVG maestro es un póster de referencia a tamaño de página; este es el ícono derivado para UI.)
export function PinLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2C7.86 2 4.5 5.36 4.5 9.5c0 5.25 6.24 11.44 7.06 12.24a.6.6 0 00.88 0C13.26 20.94 19.5 14.75 19.5 9.5 19.5 5.36 16.14 2 12 2z"
        fill={color.pink}
      />
      <Rect x={8.7} y={5.6} width={6.6} height={9.4} rx={1.4} fill={color.cream} />
      <Circle cx={8.7} cy={10.3} r={1.15} fill={color.pink} />
      <Circle cx={15.3} cy={10.3} r={1.15} fill={color.pink} />
      <Line x1={12} y1={6.4} x2={12} y2={8.8} stroke={color.pink} strokeWidth={0.6} strokeDasharray="0.9,0.9" />
      <Line x1={12} y1={11.8} x2={12} y2={14.2} stroke={color.pink} strokeWidth={0.6} strokeDasharray="0.9,0.9" />
      <Path
        d="M16.6 4.2l.36.86.93.08-.7.62.22.92-.81-.49-.81.49.22-.92-.7-.62.93-.08z"
        fill={color.cream}
        opacity={0.9}
      />
    </Svg>
  );
}
