---
name: roast
description: "Conselho adversarial de 5 personas paralelas + juiz com veredito APROVADO/REMODELADO/MORTO e o teste de 48h mais barato, para stress-testar ideia, plano, decisão, oferta ou trabalho. Use quando o usuário quiser pushback honesto em vez de concordância: /roast, 'critica isso de verdade', 'me dá um roast', 'para de concordar comigo', 'destrói essa ideia', 'isso tem furo?', 'advogado do diabo', 'stress test this', ou quando estiver prestes a se comprometer com um plano e perguntar se sustenta."
---

# Roast

## Purpose

Force a hard, multi-angle critique of whatever the user is proposing, instead of agreeing with
it. The skill spins up a council of five adversarial personas in parallel, each attacking the
subject from a different angle, then a judge synthesizes everything into a single verdict and
one cheap experiment to run next. The point is to break agreement mode: surface fatal flaws,
unexamined assumptions, real market data, and the honest reaction of the person who'd be
affected — before the user invests time or money.

## When to use

Use whenever the user wants to pressure-test an idea rather than hear approval. Triggers
include `/roast`, "critica isso de verdade", "para de concordar comigo", "destrói essa ideia",
"isso tem furo?", "advogado do diabo", "stress test this idea", or any moment a plan/offer/
decision is on the table and the user wants to know if it actually survives scrutiny. Works on
business ideas, technical plans, content strategy, offers, life/career decisions — anything.

## Workflow

### 1. Identify the subject

Determine exactly what is being roasted:
- If the user passed it as an argument (`/roast <ideia>`), use that.
- Otherwise, use the most substantial idea/plan/decision the user has described in the recent
  conversation.
- If the subject is genuinely ambiguous, ask ONE sharp question to pin it down — then proceed.
  Do not interrogate; one question maximum.

Write a tight `## CONTEXT` block (3-8 lines) capturing the subject, any constraints the user
gave, and what "success" would mean to them. This block is injected verbatim into every agent.

### 2. Read the council briefs

Read `references/council.md`. It contains the five persona prompts and the judge prompt,
plus the shared output format. Use those briefs verbatim — they are tuned to force a committed
stance from each persona.

### 3. Dispatch the 5 personas IN PARALLEL

In a **single message**, launch all five subagents at once (five Agent tool calls together,
`subagent_type: "general-purpose"`). Each agent's prompt = the `## CONTEXT` block + that
persona's full brief from `council.md` + the shared output format.

| # | Persona | Angle |
|---|---------|-------|
| 1 | Contrarian | Find the fatal flaw that kills it |
| 2 | Expansionista | Find the biggest upside / 10x version |
| 3 | Primeiros Princípios | Rebuild from pure logic, zero context |
| 4 | Pesquisador Profundo | Pull real web data: market, competitors, precedents, prior art |
| 5 | Comprador / parte afetada | Role-play the end user — would they actually buy/adopt it? |

The Pesquisador must actually use WebSearch/WebFetch — note in its prompt that real sources
are required, no invented data.

### 4. Dispatch the Judge

After all five return, launch ONE more agent (`general-purpose`) using the JUIZ brief from
`council.md`. Feed it the `## CONTEXT` block plus the five persona reports verbatim. Running
the judge as a fresh subagent (that never saw the warm conversation) keeps the verdict harsh
and independent — do not synthesize it yourself in agreement mode.

### 5. Present the verdict

Relay to the user, in **PT-BR**:
- The judge's **VEREDITO** (APROVADO / REMODELADO / MORTO) and its reasoning.
- A condensed digest of each persona's "Tiro mais forte" (one line each) so the user sees the
  five angles at a glance.
- The **Teste de 48h** prominently — this is the actionable payoff.

Keep it direct and unsoftened. Do not append reassurance or hedge the verdict to make the user
feel better — that defeats the entire purpose of the skill.

## Notes

- All persona and judge output is in PT-BR. Briefs are written in PT-BR for that reason.
- If WebSearch/WebFetch is unavailable in the session, the Pesquisador still runs but must
  flag that it could not verify externally — never let it fabricate numbers.
- Five-plus-one parallel agents is intentional. Do not collapse it to fewer agents or do it
  inline; the independence between angles is what produces non-sycophantic critique.
