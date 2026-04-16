import { Injectable, BadRequestException, Logger } from '@nestjs/common'
import Anthropic from '@anthropic-ai/sdk'
// import pdfParse from 'pdf-parse'

// The shape we expect Claude to return
const pdfParse = require('pdf-parse-fork')

export interface ExtractedProperty {
  propertyName: string | null
  buildings: Array<{
    street: string
    houseNumber: string
    postalCode: string
    city: string
  }>
units: Array<{
  unitNumber:        string
  unitType:          'APARTMENT' | 'OFFICE' | 'GARDEN' | 'PARKING'
  buildingReference: string | null
  floor:             number
  entrance:          string | null
  sizeSqm:           number
  coOwnershipShare:  number
  constructionYear:  number | null
  rooms:             number | null
}>
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name)
  private readonly anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  async extractFromPdf(fileBuffer: Buffer): Promise<ExtractedProperty> {
    // Step 1: Extract raw text from the PDF
    let pdfText: string
    try {
      const parsed = await pdfParse(fileBuffer)
      pdfText = parsed.text
    } catch {
      throw new BadRequestException('Could not read the PDF file. Please check the file is valid.')
    }

    if (!pdfText || pdfText.trim().length < 50) {
      throw new BadRequestException('The PDF appears to be empty or image-only and cannot be parsed.')
    }

    // Step 2: Send the extracted text to Claude and ask for structured JSON.
    //
    // Prompt decisions worth explaining:
    // - We ask for JSON only, no preamble — makes parsing reliable
    // - We specify the exact shape we expect — reduces hallucination
    // - We tell Claude to use null for missing fields rather than guess —
    //   the user will review and fill gaps, we don't want invented data
    // - coOwnershipShare as a fraction 0-1 normalises it regardless of
    //   whether the document expresses it as per-mille or percentage
    const prompt = `You are extracting property data from a German Teilungserklärung (declaration of division).

Extract the following information and return it as valid JSON only — no explanation, no markdown, no preamble.

Required JSON shape:
{
  "propertyName": string or null,
  "buildings": [
    {
      "street": string,
      "houseNumber": string,
      "postalCode": string,
      "city": string
    }
  ],
  "units": [
    {
      "unitNumber": string,
      "unitType": "APARTMENT" | "OFFICE" | "GARDEN" | "PARKING",
      "buildingReference": "string | null  // e.g. 'Haus A', 'Gebäude 1', 'Building A' — the building name as stated in the document",
      "floor": number,
      "entrance": string or null,
      "sizeSqm": number,
      "coOwnershipShare": number (express as a fraction between 0 and 1, e.g. 43.2/1000 = 0.0432),
      "constructionYear": number or null,
      "rooms": number or null
    }
  ]
}

Rules:
- If a field is not clearly stated in the document, use null — do not guess
- unitType: classify Wohnung/Apartment as APARTMENT, Büro/Office as OFFICE, Garten/Garden as GARDEN, Stellplatz/Garage/Parking as PARKING
- Return an empty array for buildings or units if none are found
- Return only the JSON object, nothing else

Document text:
${pdfText.slice(0, 12000)}`
    // We slice to 12000 chars to stay well within token limits.
    // A typical Teilungserklärung is dense but the key structured data
    // (unit list, addresses) appears early in the document.

    let extracted: ExtractedProperty

    try {
      const response = await this.anthropic.messages.create({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages:   [{ role: 'user', content: prompt }],
      })

      const rawText = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as any).text)
        .join('')

      // Strip any accidental markdown code fences before parsing
      const cleaned = rawText.replace(/```json|```/g, '').trim()
      extracted = JSON.parse(cleaned)
    } catch (err) {
      this.logger.error('AI extraction failed', err)
      // We don't re-throw here — a failed extraction should not block
      // the user from continuing manually. We return empty arrays.
      return {
        propertyName: null,
        buildings:    [],
        units:        [],
      }
    }

    this.logger.log(
      `Extracted: ${extracted.buildings?.length ?? 0} buildings, ${extracted.units?.length ?? 0} units`,
    )

    return extracted
  }
}