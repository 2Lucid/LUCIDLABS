
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Calculates CO2 impact based on number of tokens generated.
 * Estimation based on Gemini Pro processing.
 * 
 * Formula assumptions:
 * - 1000 tokens ≈ 0.0002 kWh (rough AI inference estimate)
 * - Carbon intensity ≈ 475 gCO2/kWh (Global average)
 * - Result in grams of CO2
 */
export function calculateCO2(tokens: number): { grams: number; impact: "Low" | "Medium" | "High" } {
    const kwhPerToken = 0.0000002;
    const gCO2PerKwh = 475;

    const grams = tokens * kwhPerToken * gCO2PerKwh;

    let impact: "Low" | "Medium" | "High" = "Low";
    if (grams > 100) impact = "Medium";
    if (grams > 1000) impact = "High";

    return { grams, impact };
}

export function formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(num);
}
