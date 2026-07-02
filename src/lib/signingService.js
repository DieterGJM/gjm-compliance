// ─── Signing Service — Supabase backend for remote client signing ─────────────
import { supabase } from './supabase'

const SITE_URL = typeof window !== 'undefined'
  ? window.location.origin
  : 'https://dieter-compliance.netlify.app'

// ── Create a new signing session ─────────────────────────────────────────────
export async function createSigningSession({
  documentName, documentB64, sigFields,
  clientName, clientEmail, clientMobile, docHash
}) {
  const { data, error } = await supabase
    .from('signing_sessions')
    .insert({
      document_name:  documentName,
      document_b64:   documentB64,
      sig_fields:     sigFields,
      client_name:    clientName,
      client_email:   clientEmail,
      client_mobile:  clientMobile,
      advisor_name:   'Dieter Hartig',
      doc_hash:       docHash,
      status:         'pending',
      audit_trail:    [{ ts: new Date().toISOString(), action: 'SESSION_CREATED',
        detail: `Document: ${documentName} | Client: ${clientName} | Hash: ${docHash}` }]
    })
    .select('session_token, id')
    .single()

  if (error) throw error
  return {
    sessionToken: data.session_token,
    sessionId:    data.id,
    signingUrl:   `${SITE_URL}/sign/${data.session_token}`,
  }
}

// ── Fetch a session by token (for client signing page) ───────────────────────
export async function getSigningSession(token) {
  const { data, error } = await supabase
    .from('signing_sessions')
    .select('*')
    .eq('session_token', token)
    .single()

  if (error) throw error
  if (!data) throw new Error('Signing session not found or expired')
  if (new Date(data.expires_at) < new Date()) throw new Error('This signing link has expired')
  return data
}

// ── Client submits their signature ───────────────────────────────────────────
export async function submitClientSignature(token, { clientSig, auditEntry }) {
  const session = await getSigningSession(token)
  const newAudit = [
    ...(session.audit_trail || []),
    { ts: new Date().toISOString(), action: 'CLIENT_SIGNED',
      detail: `Client signature applied | ${new Date().toISOString()}` },
    auditEntry
  ]

  const { error } = await supabase
    .from('signing_sessions')
    .update({
      client_sig:  clientSig,
      status:      'client_signed',
      audit_trail: newAudit,
    })
    .eq('session_token', token)

  if (error) throw error
}

// ── Advisor adds their signature and marks complete ───────────────────────────
export async function submitAdvisorSignature(token, { advisorSig }) {
  const session = await getSigningSession(token)
  const newAudit = [
    ...(session.audit_trail || []),
    { ts: new Date().toISOString(), action: 'ADVISOR_SIGNED',
      detail: `Advisor (Dieter Hartig) signature applied | Document finalised` },
  ]

  const { error } = await supabase
    .from('signing_sessions')
    .update({
      advisor_sig: advisorSig,
      status:      'complete',
      audit_trail: newAudit,
    })
    .eq('session_token', token)

  if (error) throw error
}

// ── List all sessions for the advisor dashboard ───────────────────────────────
export async function listSigningSessions() {
  const { data, error } = await supabase
    .from('signing_sessions')
    .select('id, session_token, document_name, client_name, status, created_at, expires_at, doc_hash')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return data || []
}

// ── Delete a session ──────────────────────────────────────────────────────────
export async function deleteSigningSession(token) {
  const { error } = await supabase
    .from('signing_sessions')
    .delete()
    .eq('session_token', token)
  if (error) throw error
}

// ── Subscribe to real-time updates on a session ───────────────────────────────
export function subscribeToSession(token, callback) {
  return supabase
    .channel(`session_${token}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'signing_sessions',
      filter: `session_token=eq.${token}`
    }, payload => callback(payload.new))
    .subscribe()
}
