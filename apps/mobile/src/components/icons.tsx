import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { color } from "../theme/tokens";

interface IconProps {
  active?: boolean;
  size?: number;
}

function tint(active?: boolean) {
  return active ? color.pink : color.iconOff;
}

export function HomeIcon({ active, size = 22 }: IconProps) {
  const c = tint(active);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 11.5 12 4l8 7.5" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6 10v9a1 1 0 001 1h3v-6h4v6h3a1 1 0 001-1v-9" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function SearchIcon({ active, size = 22 }: IconProps) {
  const c = tint(active);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={6.5} stroke={c} strokeWidth={1.8} />
      <Path d="M20 20l-4.3-4.3" stroke={c} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function TicketIcon({ active, size = 22 }: IconProps) {
  const c = tint(active);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9.5a2 2 0 012-2h14a2 2 0 012 2v.7a1.6 1.6 0 000 2.6v.2a1.6 1.6 0 000 2.6v.9a2 2 0 01-2 2H5a2 2 0 01-2-2v-.9a1.6 1.6 0 000-2.6v-.2a1.6 1.6 0 000-2.6v-.7z"
        stroke={c}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path d="M14 8v8" stroke={c} strokeWidth={1.6} strokeDasharray="2,2.4" strokeLinecap="round" />
    </Svg>
  );
}

export function ProfileIcon({ active, size = 22 }: IconProps) {
  const c = tint(active);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8.2} r={3.4} stroke={c} strokeWidth={1.8} />
      <Path d="M5 20c1.2-3.6 4-5.4 7-5.4s5.8 1.8 7 5.4" stroke={c} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function ScanIcon({ active, size = 26, tintColor }: IconProps & { tintColor?: string }) {
  const c = tintColor ?? tint(active ?? true);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 8V5a1 1 0 011-1h3" stroke={c} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M20 8V5a1 1 0 00-1-1h-3" stroke={c} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M4 16v3a1 1 0 001 1h3" stroke={c} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M20 16v3a1 1 0 01-1 1h-3" stroke={c} strokeWidth={1.8} strokeLinecap="round" />
      <Rect x={9} y={9} width={6} height={6} rx={1} stroke={c} strokeWidth={1.8} />
    </Svg>
  );
}

export function ChevronRight({ size = 18, color: c = color.iconOff }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6l6 6-6 6" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CopyIcon({ size = 16, color: c = color.text2 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={8} y={8} width={11} height={11} rx={2} stroke={c} strokeWidth={1.6} />
      <Path d="M5 15V6a1 1 0 011-1h9" stroke={c} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function HeartIcon({ active, size = 20 }: IconProps) {
  const c = active ? color.pink : color.iconOff;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={active ? c : "none"}>
      <Path
        d="M12 20s-7.2-4.5-9.5-9A5 5 0 0112 6a5 5 0 019.5 5c-2.3 4.5-9.5 9-9.5 9z"
        stroke={c}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function StarIcon({ size = 12, color: c = color.text3 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={c}>
      <Path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.9-6.3 3.9 1.7-7L2 9.2l7.1-.6z" />
    </Svg>
  );
}

export function MapPinIcon({ size = 16, color: c = color.pink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 1113 0c0 5.4-6.5 11-6.5 11z"
        stroke={c}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={10} r={2.4} stroke={c} strokeWidth={1.8} />
    </Svg>
  );
}

export function FilterIcon({ active, size = 18 }: IconProps) {
  const c = active ? color.pink : color.text2;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 6h16" stroke={c} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M4 12h16" stroke={c} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M4 18h16" stroke={c} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={9} cy={6} r={2.1} fill={color.bg} stroke={c} strokeWidth={1.8} />
      <Circle cx={16} cy={12} r={2.1} fill={color.bg} stroke={c} strokeWidth={1.8} />
      <Circle cx={10} cy={18} r={2.1} fill={color.bg} stroke={c} strokeWidth={1.8} />
    </Svg>
  );
}

export function ListIcon({ active, size = 16 }: IconProps) {
  const c = active ? color.pink : color.text2;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={5} cy={6} r={1.4} fill={c} />
      <Circle cx={5} cy={12} r={1.4} fill={c} />
      <Circle cx={5} cy={18} r={1.4} fill={c} />
      <Path d="M10 6h10" stroke={c} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M10 12h10" stroke={c} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M10 18h10" stroke={c} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function BellIcon({ active, size = 16 }: IconProps) {
  const c = active ? color.pink : color.text2;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={active ? c : "none"}>
      <Path
        d="M6 10a6 6 0 0112 0v4l1.6 2.8a1 1 0 01-.9 1.5H5.3a1 1 0 01-.9-1.5L6 14z"
        stroke={c}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path d="M10 20a2 2 0 004 0" stroke={c} strokeWidth={1.8} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export function DashboardIcon({ active, size = 22 }: IconProps) {
  const c = tint(active);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={4} width={6.5} height={6.5} rx={1.6} stroke={c} strokeWidth={1.8} />
      <Rect x={13.5} y={4} width={6.5} height={6.5} rx={1.6} stroke={c} strokeWidth={1.8} />
      <Rect x={4} y={13.5} width={6.5} height={6.5} rx={1.6} stroke={c} strokeWidth={1.8} />
      <Rect x={13.5} y={13.5} width={6.5} height={6.5} rx={1.6} stroke={c} strokeWidth={1.8} />
    </Svg>
  );
}

export function CalendarIcon({ active, size = 22 }: IconProps) {
  const c = tint(active);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={5.5} width={16} height={14.5} rx={2.2} stroke={c} strokeWidth={1.8} />
      <Path d="M4 10h16" stroke={c} strokeWidth={1.8} />
      <Path d="M8.5 3.5v4M15.5 3.5v4" stroke={c} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function ReceiptIcon({ active, size = 22 }: IconProps) {
  const c = tint(active);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 3.5h12v17l-2.4-1.6L13.2 20.5 12 19.6l-1.2.9-2.4-1.6L6 20.5v-17z" stroke={c} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M9.5 8.5h5M9.5 12h5" stroke={c} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function MenuIcon({ active, size = 22 }: IconProps) {
  const c = tint(active);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4.5 7h15M4.5 12h15M4.5 17h15" stroke={c} strokeWidth={1.9} strokeLinecap="round" />
    </Svg>
  );
}

export function PlusIcon({ size = 20, color: c = color.white }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={c} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}
