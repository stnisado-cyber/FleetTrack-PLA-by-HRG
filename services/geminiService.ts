
import { GoogleGenAI } from "@google/genai";
import { UsageLog } from "../types";

export async function analyzeFleetLogs(logs: UsageLog[]) {
  const ai = new GoogleGenAI({ apiKey: (process.env.API_KEY as string) });
  
  const logSummary = logs.map(l => ({
    car: l.carName,
    user: l.driverName,
    dept: l.department,
    dist: (l.endOdometer || 0) - l.startOdometer,
    purpose: l.purpose,
    condition: l.endCondition
  }));

  const prompt = `Sebagai konsultan HRGA Pro, analisa data penggunaan kendaraan berikut:
  ${JSON.stringify(logSummary)}
  
  Berikan:
  1. Ringkasan unit yang paling sering digunakan (high mileage).
  2. Departemen yang paling aktif.
  3. Catatan khusus jika ada kendaraan yang butuh servis (berdasarkan kondisi 'PERLU PENGECEKAN').
  4. Tips efisiensi armada.
  
  Gunakan bahasa Indonesia yang profesional dan ringkas.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return "Gagal melakukan analisa AI. Pastikan koneksi internet stabil.";
  }
}
