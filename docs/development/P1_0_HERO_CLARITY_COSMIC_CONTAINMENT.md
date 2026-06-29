# P1.0 Hero Clarity and Cosmic Containment

Status: backlog item only. Do not implement during P0.3B.2, P0.3C, or any
authentication/security gate.

## Trigger

This backlog item was created after P0.3B.2 merged, per product review
feedback. The landing page already has a strong visual identity; the issue is
clarity and containment, not a need for more visual intensity.

## Problem

- Orbiting celestial bodies overlap the headline and compete with the core
  value proposition.
- The large circular Shri emblem consumes attention without advancing the
  user's next action.
- The lower-right "Paused" control reads like a development artifact rather
  than a refined accessibility control.

## Goal

Keep the cosmic system as a decorative background layer that supports the
message without becoming foreground content.

## Requirements

- Cosmic bodies must never overlap CTA text, headline text, or supporting copy.
- Decorative cosmic elements must not capture pointer events.
- Motion and visual density must not reduce text contrast.
- The Shri emblem must be scaled and placed so it supports brand identity
  without dominating the first decision point.
- The paused/reduced-motion state must be clean, labeled,
  keyboard-accessible, and unobtrusive.
- Reduced-motion behavior must preserve clarity without replacing the interface
  with a development-looking control.
- The first viewport must still communicate the product value proposition and
  primary action clearly on desktop and mobile.

## Out Of Scope

- No auth changes.
- No Resend, Inngest, Pinecone, PostHog, Sentry, hosted LLM, or notification
  work.
- No copy rewrite beyond labels needed for accessibility.
- No broad landing-page redesign.

## Acceptance Criteria

- Desktop and mobile screenshots show no overlap between decorative orbit
  bodies and headline/CTA text.
- Primary CTA remains visually dominant over decorative elements.
- Decorative cosmic layer has `pointer-events: none` or equivalent behavior.
- Paused/reduced-motion control is keyboard-accessible, labeled, and visually
  integrated.
- Contrast checks pass for hero text and controls.
- Playwright or equivalent screenshot evidence is attached before closing this
  backlog item.
