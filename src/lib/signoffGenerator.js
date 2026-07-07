// ─── AI-Powered Sign-off Paragraph Generator ─────────────────────────────────
// Uses Anthropic API (in-browser, no server) to generate profession-specific
// sign-off paragraphs for Onboarding and Transactional DD documents.
// POPIA safe: only occupation string is sent, never full client details.

const MODEL = 'claude-sonnet-4-20250514'

export async function generateSignoff(occupation, docType) {
  if (!occupation) return getDefaultSignoff(docType)

  const prompts = {
    onboarding: `You are a South African FICA compliance officer at GJM Ultra Brokers, a financial services firm.
Write a single professional compliance paragraph (4-6 sentences) for the sign-off section of a Client Onboarding Questionnaire for a client whose occupation is: "${occupation}".

The paragraph must:
- Reference the client's specific profession and its typical income sources and financial profile
- Confirm that all professional, financial, and compliance-related information has been completed accurately and verified against supporting documentation
- Mention confirming professional registration details (if applicable to the profession), source of income, business activities, and intended nature of the business relationship
- State that all screening checks, risk assessments, and due diligence requirements must be completed in accordance with internal compliance and FICA requirements
- State that any unusual findings, high-risk indicators, or discrepancies must immediately be escalated to Compliance or Senior Management
- End with a statement about secure maintenance of approved documentation within the client file for regulatory and audit purposes

Write ONLY the paragraph. No headings, no bullet points, no preamble. Professional legal tone.`,

    transactional: `You are a South African FICA compliance officer at GJM Ultra Brokers, a financial services firm.
Write a single professional compliance paragraph (4-6 sentences) for the sign-off section of a Transactional Due Diligence Questionnaire for a client whose occupation is: "${occupation}".

The paragraph must:
- Reference the advisor conducting the transactional due diligence review for a client in this specific profession
- Confirm that the client's onboarding information remains current and that all transactions are consistent with the client's professional profile, expected income levels, and historical transaction behaviour
- State that any unusual, high-value, or suspicious transactions, changes in client behaviour, or updates to regulatory or risk status must be escalated to Compliance or Senior Management for further investigation and approval
- Mention that where required, enhanced due diligence procedures and updated onboarding documentation must be completed prior to proceeding with the transaction
- End with a statement that all transactional reviews, approvals, and supporting documents must be retained in the client file in accordance with compliance, audit, and record-keeping requirements

Write ONLY the paragraph. No headings, no bullet points, no preamble. Professional legal tone.`
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompts[docType] || prompts.onboarding }]
      })
    })
    const data = await response.json()
    const text = data.content?.map(b => b.text || '').join('').trim()
    return text || getDefaultSignoff(docType)
  } catch (err) {
    console.error('Signoff generation failed:', err)
    return getDefaultSignoff(docType)
  }
}

function getDefaultSignoff(docType) {
  if (docType === 'transactional') {
    return `The advisor conducting the transactional due diligence review must confirm that the client's onboarding information remains current and that all transactions are consistent with the client's professional profile, expected income levels, and historical transaction behaviour. Any unusual, high-value, or suspicious transactions, changes in client behaviour, or updates to regulatory or risk status must be escalated to Compliance or Senior Management for further investigation and approval. Where required, enhanced due diligence procedures and updated onboarding documentation must be completed prior to proceeding with the transaction. All transactional reviews, approvals, and supporting documents must be retained in the client file in accordance with compliance, audit, and record-keeping requirements.`
  }
  return `The advisor completing the Onboarding Questionnaire must ensure that all professional, financial, and compliance-related information has been completed accurately and verified against supporting documentation. All screening checks, risk assessments, and due diligence requirements must be completed in accordance with internal compliance and FICA requirements. Any unusual findings, high-risk indicators, or discrepancies must immediately be escalated to Compliance or Senior Management for review and approval before onboarding may proceed. All approved documentation and supporting records must be securely maintained within the client file for regulatory and audit purposes.`
}
