
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analysisSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      category: {
        type: Type.STRING,
        description: "One of the predefined UGF category names.",
      },
      description: {
        type: Type.STRING,
        description: "A brief description of what this category includes based on the masterplan legend.",
      },
      percentage: {
        type: Type.NUMBER,
        description: "The estimated percentage of the total development area covered by this category.",
      },
    },
    required: ['category', 'description', 'percentage']
  }
};

const getPrompt = () => {
  return `You are an expert landscape architect specializing in quantitative analysis of masterplans. Analyze the provided masterplan, which contains a landscape strategy and its legend. Your goal is to classify all distinct surface types according to the simplified Urban Greening Factor categories listed below and estimate the percentage of the total development area each category covers.

The development area is the entire area depicted within the property boundaries, excluding external roads like 'CAMPFIELD ROAD'. Sum of percentages should be approximately 100.

Simplified UGF Categories & Mapping Instructions:
1. TREES_AND_SHRUBS: Includes all proposed trees (T1-T7), structural/ornamental shrub planting, and hedges.
2. GREEN_OPEN_SPACE: Includes rear gardens, communal/open space/verges, species-rich grassland/wildflowers, and attenuation basins.
3. PERMEABLE_SURFACES: Includes communal parking courts, shared surfaces, and private/communal paths made of P.C. paving slabs or block paving.
4. IMPERMEABLE_SURFACES: Includes the footprints of the buildings and any black macadam access roads.
5. INCIDENTAL_PLAY_AREA: Includes the designated Play Area (LAP) and any incidental play features like timber logs.

Your output MUST be a valid JSON array of objects that strictly conforms to the provided schema. Do not include any text or markdown formatting outside of the JSON structure.`;
};


export const analyzeImage = async (base64ImageData: string, mimeType: string): Promise<AnalysisResult[]> => {
  const imagePart = {
    inlineData: {
      data: base64ImageData,
      mimeType: mimeType,
    },
  };

  const textPart = {
    text: getPrompt(),
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [textPart, imagePart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.1,
      },
    });

    const jsonText = response.text.trim();
    const parsedResult = JSON.parse(jsonText);

    if (!Array.isArray(parsedResult)) {
        throw new Error("API did not return a valid array.");
    }

    // Validate the structure of the parsed result
    const validatedResults = parsedResult.filter(
        (item: any): item is AnalysisResult => 
            typeof item === 'object' &&
            item !== null &&
            'category' in item &&
            'description' in item &&
            'percentage' in item &&
            typeof item.category === 'string' &&
            typeof item.description === 'string' &&
            typeof item.percentage === 'number'
    );
    
    if (validatedResults.length !== parsedResult.length) {
        console.warn("Some items in the API response were malformed and have been filtered out.");
    }
    
    if (validatedResults.length === 0) {
        throw new Error("API returned no valid analysis results.");
    }

    return validatedResults;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred during image analysis.");
  }
};
