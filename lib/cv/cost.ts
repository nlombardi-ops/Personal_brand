// Pricing per million tokens (as of 2025)
const RATES: Record<string, [number, number]> = {
  "claude-opus-4-8":   [15,  75],
  "claude-sonnet-4-6": [3,   15],
  "claude-haiku-4-5":  [0.8,  4],
};

export function calcCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const [inputRate, outputRate] = RATES[model] ?? [3, 15];
  return (inputTokens * inputRate + outputTokens * outputRate) / 1_000_000;
}
