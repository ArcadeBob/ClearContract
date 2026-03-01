import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;

const SYSTEM_PROMPT = `You are a construction contract analyst specializing in glazing and glass installation contracts. Analyze the provided contract text and return a JSON object with the following structure:

{
  "client": "Name of the client/owner from the contract",
  "contractType": "Prime Contract" | "Subcontract" | "Purchase Order" | "Change Order",
  "riskScore": <number 0-100, where 100 is highest risk>,
  "findings": [
    {
      "severity": "Critical" | "High" | "Medium" | "Low" | "Info",
      "category": "<one of the categories below>",
      "title": "Short descriptive title",
      "description": "Detailed explanation of the finding",
      "recommendation": "What action to take",
      "clauseReference": "Section/clause reference if identifiable"
    }
  ],
  "dates": [
    {
      "label": "Description of the date",
      "date": "YYYY-MM-DD",
      "type": "Start" | "Milestone" | "Deadline" | "Expiry"
    }
  ]
}

Categories (use exactly these strings):
- Legal Issues
- Scope of Work
- Contract Compliance
- Labor Compliance
- Insurance Requirements
- Important Dates
- Financial Terms
- Technical Standards
- Risk Assessment

Guidelines:
- Focus on risks relevant to a glazing/glass installation subcontractor
- Flag unfavorable indemnification, pay-if-paid clauses, liquidated damages, retainage terms
- Identify missing or inadequate insurance requirements
- Note any ambiguous scope definitions that could lead to disputes
- Highlight compliance requirements (prevailing wage, safety, licensing)
- Extract all meaningful dates (start, completion, milestones, notice periods)
- Be thorough but precise — only report genuine findings, not boilerplate
- Set riskScore based on overall risk: 0-30 low risk, 31-60 moderate, 61-80 high, 81-100 critical
- Return ONLY the JSON object, no other text`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: missing API key' });
  }

  try {
    const { pdfBase64, fileName } = req.body;

    if (!pdfBase64 || typeof pdfBase64 !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid pdfBase64 field' });
    }

    // Extract text from PDF
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const pdfData = await pdf(pdfBuffer);
    const text = pdfData.text.trim();

    if (text.length < 100) {
      return res.status(422).json({
        error: 'Could not extract sufficient text from this PDF. It may be a scanned/image-based document. Please upload a text-based PDF.',
      });
    }

    // Truncate to ~100k chars to stay within Claude's context window
    const truncatedText = text.length > 100000 ? text.slice(0, 100000) : text;

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Please analyze this construction/glazing contract:\n\nFile: ${fileName || 'contract.pdf'}\n\n${truncatedText}`,
        },
      ],
    });

    // Extract text response
    const responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    // Parse JSON from response (handle markdown code fences)
    let jsonStr = responseText;
    const fenceMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1];
    }

    const parsed = JSON.parse(jsonStr.trim());

    // Validate and normalize
    const riskScore = Math.max(0, Math.min(100, Number(parsed.riskScore) || 50));

    const findings = (parsed.findings || []).map((f: Record<string, unknown>, i: number) => ({
      id: `f-${Date.now()}-${i}`,
      severity: f.severity || 'Medium',
      category: f.category || 'Risk Assessment',
      title: f.title || 'Untitled Finding',
      description: f.description || '',
      recommendation: f.recommendation || undefined,
      clauseReference: f.clauseReference || undefined,
    }));

    const dates = (parsed.dates || []).map((d: Record<string, unknown>) => ({
      label: d.label || 'Date',
      date: d.date || '',
      type: d.type || 'Milestone',
    }));

    const validTypes = ['Prime Contract', 'Subcontract', 'Purchase Order', 'Change Order'];
    const contractType = validTypes.includes(parsed.contractType as string)
      ? parsed.contractType
      : 'Prime Contract';

    return res.status(200).json({
      client: parsed.client || 'Unknown Client',
      contractType,
      riskScore,
      findings,
      dates,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };

    if (err.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please wait a moment and try again.' });
    }
    if (err.status === 401) {
      return res.status(500).json({ error: 'Server configuration error: invalid API key' });
    }
    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: 'Failed to parse AI response. Please try again.' });
    }

    console.error('Analysis error:', err.message || error);
    return res.status(500).json({ error: 'An error occurred during analysis. Please try again.' });
  }
}
