// A bounded arithmetic grammar. No eval, Function, property access or executable input.
const number = "(?:\\d+(?:\\.\\d*)?|\\.\\d+)";
const units: Record<string, [string, number, number?]> = {
  ms: ["time", 0.001],
  seconds: ["time", 1],
  s: ["time", 1],
  minutes: ["time", 60],
  min: ["time", 60],
  hours: ["time", 3600],
  h: ["time", 3600],
  days: ["time", 86400],
  mm: ["length", 0.001],
  cm: ["length", 0.01],
  m: ["length", 1],
  km: ["length", 1000],
  inches: ["length", 0.0254],
  feet: ["length", 0.3048],
  miles: ["length", 1609.344],
  g: ["mass", 0.001],
  kg: ["mass", 1],
  lb: ["mass", 0.45359237],
  B: ["data", 1],
  kB: ["data", 1000],
  MB: ["data", 1e6],
  GB: ["data", 1e9],
  KiB: ["data", 1024],
  MiB: ["data", 1048576],
  GiB: ["data", 1073741824],
  C: ["temperature", 1, 273.15],
  F: ["temperature", 5 / 9, 255.3722222222222],
  K: ["temperature", 1, 0],
};
function finite(value: number) {
  if (!Number.isFinite(value) || Math.abs(value) > 1e15)
    throw new Error("result is outside the supported finite range");
  return value;
}
const display = (n: number) => String(Number(n.toPrecision(12)));
export type NumericValue = { kind: "number"; value: number; unit?: string };
export const displayValue = (result: NumericValue): string =>
  `${display(result.value)}${result.unit ? ` ${result.unit}` : ""}`;
export function calculateValue(
  input: string,
  previous?: NumericValue,
): NumericValue {
  if (!input.trim() || input.length > 500)
    throw new Error("provide an expression of 1–500 characters");
  const boundValue = () => {
    if (!previous || previous.kind !== "number")
      throw new Error(
        "the result requires a completed prior calculation in this request",
      );
    return finite(previous.value);
  };
  const scalar = (raw: string) => {
    if (raw.toLowerCase() !== "result") return finite(Number(raw));
    const value = boundValue();
    if (previous!.unit)
      throw new Error(
        "arithmetic on a unit-bearing result is not supported; use an explicit unit conversion",
      );
    return value;
  };
  const convert = (value: number, from: string, to: string): NumericValue => {
    const a = units[from],
      b = units[to];
    if (!a || !b)
      throw new Error(
        "unsupported unit; use exact units such as MB, MiB, hours, minutes, C or F",
      );
    if (a[0] !== b[0]) throw new Error("incompatible unit dimensions");
    const base = finite(value * a[1] + (a[2] ?? 0));
    if (a[0] === "temperature" && base < 0)
      throw new Error("temperature is below absolute zero");
    return {
      kind: "number",
      value: finite((base - (b[2] ?? 0)) / b[1]),
      unit: to,
    };
  };
  const boundConversion = input.trim().match(/^result\s+to\s+([A-Za-z]+)$/i);
  if (boundConversion) {
    const value = boundValue();
    if (!previous!.unit)
      throw new Error("the prior result has no unit to convert");
    return convert(value, previous!.unit, boundConversion[1]);
  }
  const conversion = input
    .trim()
    .match(
      new RegExp(`^([+-]?${number})\\s*([A-Za-z]+)\\s+to\\s+([A-Za-z]+)$`),
    );
  if (conversion) {
    const [, raw, from, to] = conversion;
    return convert(finite(Number(raw)), from, to);
  }
  const percent = input
    .trim()
    .match(
      new RegExp(
        `^([+-]?${number}|result)%\\s+of\\s+([+-]?${number}|result)$`,
        "i",
      ),
    );
  if (percent)
    return {
      kind: "number",
      value: finite((scalar(percent[1]) / 100) * scalar(percent[2])),
    };
  if (/\d\s+\d/.test(input)) throw new Error("unsupported adjacent numbers");
  const raw = input.replace(/\s+/g, "");
  const tokens = raw.match(/result|\d+(?:\.\d*)?|\.\d+|[()+\-*/%]/gi) ?? [];
  if (tokens.join("") !== raw || tokens.length > 150)
    throw new Error(
      "unsupported expression; use numbers, parentheses, +, -, *, / and postfix %",
    );
  let index = 0,
    depth = 0;
  const peek = () => tokens[index];
  function primary(): number {
    if (++depth > 24) throw new Error("expression nesting limit exceeded");
    let value: number;
    if (peek() === "+" || peek() === "-") {
      const sign = tokens[index++];
      value = (sign === "-" ? -1 : 1) * primary();
    } else if (peek() === "(") {
      index++;
      value = expression();
      if (tokens[index++] !== ")")
        throw new Error("missing closing parenthesis");
    } else {
      const token = tokens[index++];
      if (!token || !/^\d|^\.\d|^result$/i.test(token))
        throw new Error("expected a number");
      value = scalar(token);
    }
    if (peek() === "%") {
      index++;
      value /= 100;
    }
    depth--;
    return finite(value);
  }
  function product(): number {
    let value = primary();
    while (peek() === "*" || peek() === "/") {
      const op = tokens[index++],
        rhs = primary();
      if (op === "/" && rhs === 0)
        throw new Error("division by zero is undefined");
      value = finite(op === "*" ? value * rhs : value / rhs);
    }
    return value;
  }
  function expression(): number {
    let value = product();
    while (peek() === "+" || peek() === "-") {
      const op = tokens[index++],
        rhs = product();
      value = finite(op === "+" ? value + rhs : value - rhs);
    }
    return value;
  }
  const result = expression();
  if (index !== tokens.length)
    throw new Error("unsupported or incomplete expression");
  return { kind: "number", value: result };
}
export function calculate(input: string): string {
  return displayValue(calculateValue(input));
}
