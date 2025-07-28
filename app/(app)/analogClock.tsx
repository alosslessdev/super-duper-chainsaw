import React, { useEffect, useState } from "react";
import { View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Line,
  RadialGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";

const AnalogClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const radius = 110;
  const center = radius;
  const hour = time.getHours() % 12;
  const minute = time.getMinutes();
  const second = time.getSeconds();

  const hourAngle = (hour + minute / 60) * 30;
  const minuteAngle = (minute + second / 60) * 6;
  const secondAngle = second * 6;

  const angleToCoord = (angle: number, length: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: center + length * Math.cos(rad),
      y: center + length * Math.sin(rad),
    };
  };

  // Posiciones para números 1 a 12
  const numbers = Array.from({ length: 12 }, (_, i) => i + 1);
  const numberPositions = numbers.map((num) => {
    const angle = num * 30;
    return {
      num,
      ...angleToCoord(angle, radius * 0.8),
    };
  });

  // Marcas para minutos (60 marcas pequeñas)
  const minuteMarks = Array.from({ length: 60 }, (_, i) => i);

  const hourCoord = angleToCoord(hourAngle, radius * 0.5);
  const minuteCoord = angleToCoord(minuteAngle, radius * 0.75);
  const secondCoord = angleToCoord(secondAngle, radius * 0.9);

  return (
    <View style={{ alignItems: "center", marginTop: 50 }}>
      <Svg width={radius * 2} height={radius * 2}>
        {/* Definición del degradado radial */}
        <Defs>
          <RadialGradient
            id="grad"
            cx="50%"
            cy="50%"
            r="50%"
            fx="50%"
            fy="50%"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor="#e0f7fa" />
            <Stop offset="100%" stopColor="#80deea" />
          </RadialGradient>
        </Defs>

        {/* Fondo circular con degradado */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="url(#grad)"
          stroke="#333"
          strokeWidth="6"
        />

        {/* Marcas de minutos */}
        {minuteMarks.map((mark) => {
          const angle = mark * 6;
          const outer = angleToCoord(angle, radius);
          const inner = angleToCoord(
            angle,
            mark % 5 === 0 ? radius * 0.9 : radius * 0.95
          );
          return (
            <Line
              key={mark}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke={mark % 5 === 0 ? "#333" : "#999"}
              strokeWidth={mark % 5 === 0 ? 3 : 1}
              strokeLinecap="round"
            />
          );
        })}

        {/* Números */}
        {numberPositions.map(({ num, x, y }) => (
          <SvgText
            key={num}
            x={x}
            y={y + 6}
            fontSize="20"
            fontWeight="bold"
            fill="#006064"
            textAnchor="middle"
            fontFamily="Arial"
          >
            {num}
          </SvgText>
        ))}

        {/* Manecilla de hora */}
        <Line
          x1={center}
          y1={center}
          x2={hourCoord.x}
          y2={hourCoord.y}
          stroke="#004d40"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Manecilla de minuto */}
        <Line
          x1={center}
          y1={center}
          x2={minuteCoord.x}
          y2={minuteCoord.y}
          stroke="#00796b"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Manecilla de segundo */}
        <Line
          x1={center}
          y1={center}
          x2={secondCoord.x}
          y2={secondCoord.y}
          stroke="#d32f2f"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Centro del reloj (círculo pequeño) */}
        <Circle cx={center} cy={center} r={6} fill="#004d40" />
      </Svg>
    </View>
  );
};

export default AnalogClock;
