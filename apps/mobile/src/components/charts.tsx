import React, { useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Line, Path, Stop } from "react-native-svg";
import { color, fontFamily } from "../theme/tokens";

const GRID = "rgba(255,255,255,0.08)";

// Curva suave (Catmull-Rom -> Bézier) que pasa por todos los puntos.
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function AreaChart({
  data,
  height = 150,
  format = (v: number) => String(Math.round(v)),
}: {
  data: { label: string; value: number }[];
  height?: number;
  format?: (v: number) => string;
}) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const max = Math.max(1, ...data.map((d) => d.value));
  const padTop = 8;
  const plotH = height - padTop - 4;
  const pts = data.map((d, i) => ({
    x: data.length <= 1 ? width / 2 : (i / (data.length - 1)) * width,
    y: padTop + plotH - (d.value / max) * plotH,
  }));
  const line = smoothPath(pts);
  const area = pts.length > 1 ? `${line} L ${pts[pts.length - 1].x} ${height} L ${pts[0].x} ${height} Z` : "";
  const mid = data[Math.floor(data.length / 2)];

  return (
    <View>
      <View style={styles.axisTop}>
        <Text style={styles.axisText}>máx. {format(max)}</Text>
      </View>
      <View onLayout={onLayout} style={{ height }}>
        {width > 0 && (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color.pink} stopOpacity={0.35} />
                <Stop offset="1" stopColor={color.pink} stopOpacity={0.02} />
              </LinearGradient>
            </Defs>
            {[0.25, 0.5, 0.75].map((f) => (
              <Line key={f} x1={0} x2={width} y1={padTop + plotH * f} y2={padTop + plotH * f} stroke={GRID} strokeWidth={1} />
            ))}
            {area !== "" && <Path d={area} fill="url(#areaFill)" />}
            <Path d={line} stroke={color.pink} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        )}
      </View>
      {data.length > 0 && (
        <View style={styles.axisBottom}>
          <Text style={styles.axisText}>{data[0].label}</Text>
          {data.length > 2 && <Text style={styles.axisText}>{mid.label}</Text>}
          <Text style={styles.axisText}>{data[data.length - 1].label}</Text>
        </View>
      )}
    </View>
  );
}

export function ColumnChart({ data, height = 110 }: { data: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View>
      <View style={[styles.columns, { height }]}>
        {data.map((d) => (
          <View key={d.label} style={styles.columnSlot}>
            <Text style={styles.columnValue}>{d.value > 0 ? d.value : ""}</Text>
            <View style={[styles.column, { height: Math.max(3, (d.value / max) * (height - 18)) }, d.value === 0 && { opacity: 0.25 }]} />
          </View>
        ))}
      </View>
      <View style={styles.columnLabels}>
        {data.map((d) => (
          <Text key={d.label} style={[styles.axisText, styles.columnLabel]}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function BarList({ data, format }: { data: { name: string; value: number }[]; format: (v: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={{ gap: 14 }}>
      {data.map((d) => (
        <View key={d.name} style={{ gap: 6 }}>
          <View style={styles.barRow}>
            <Text style={styles.barName} numberOfLines={1}>
              {d.name}
            </Text>
            <Text style={styles.barValue}>{format(d.value)}</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${(d.value / max) * 100}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  axisTop: { alignItems: "flex-end", marginBottom: 2 },
  axisBottom: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  axisText: { fontFamily: fontFamily.semiBold, fontSize: 11, color: color.text3 },
  columns: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  columnSlot: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 3 },
  column: { width: "100%", maxWidth: 30, borderRadius: 6, backgroundColor: color.pink },
  columnValue: { fontFamily: fontFamily.bold, fontSize: 10.5, color: color.text2 },
  columnLabels: { flexDirection: "row", gap: 6, marginTop: 6 },
  columnLabel: { flex: 1, textAlign: "center" },
  barRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  barName: { flex: 1, fontFamily: fontFamily.semiBold, fontSize: 13, color: color.text2 },
  barValue: { fontFamily: fontFamily.extraBold, fontSize: 13, color: color.text },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.10)", overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4, backgroundColor: color.pink },
});
