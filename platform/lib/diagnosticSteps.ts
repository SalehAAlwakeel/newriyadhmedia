import { z } from "zod";
import { generate, type LlmResult } from "./llm";
import { scrapeToPrompt, type ScrapedSite } from "./scrape";

// ---------------------------------------------------------------------------
// Website Diagnostics — powered by AvenueTech
//
// Analyses a scraped website and returns structured findings across 5 stages:
// Components → Observations → Problems → Root Causes → Hypotheses
// ---------------------------------------------------------------------------

const ComponentSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.string().min(1).max(60),
  notes: z.string().min(1).max(200),
});

const ObservationSchema = z.object({
  title: z.string().min(1).max(120),
  detail: z.string().min(1).max(300),
  severity: z.enum(["info", "warning", "critical"]),
});

const ProblemSchema = z.object({
  title: z.string().min(1).max(120),
  detail: z.string().min(1).max(300),
  impact: z.enum(["low", "medium", "high"]),
});

const RootCauseSchema = z.object({
  title: z.string().min(1).max(120),
  detail: z.string().min(1).max(300),
});

const HypothesisSchema = z.object({
  title: z.string().min(1).max(120),
  detail: z.string().min(1).max(300),
  priority: z.enum(["quick-win", "medium-effort", "strategic"]),
});

export const DiagnosticSchema = z.object({
  components: z.array(ComponentSchema).min(4).max(15),
  observations: z.array(ObservationSchema).min(3).max(10),
  problems: z.array(ProblemSchema).min(2).max(8),
  rootCauses: z.array(RootCauseSchema).min(2).max(8),
  hypotheses: z.array(HypothesisSchema).min(2).max(8),
  overallScore: z.number().int().min(0).max(100),
  summary: z.string().min(1).max(400),
});

export type DiagnosticResult = z.infer<typeof DiagnosticSchema>;

const diagnosticJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["components", "observations", "problems", "rootCauses", "hypotheses", "overallScore", "summary"],
  properties: {
    components: {
      type: "array",
      minItems: 4,
      maxItems: 15,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "type", "notes"],
        properties: {
          name: { type: "string" },
          type: { type: "string", description: "e.g. Navigation, Hero, CTA, Form, Footer, Content Block, Image, Video, Social Proof" },
          notes: { type: "string", description: "Brief assessment of this component" },
        },
      },
    },
    observations: {
      type: "array",
      minItems: 3,
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "detail", "severity"],
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          severity: { type: "string", enum: ["info", "warning", "critical"] },
        },
      },
    },
    problems: {
      type: "array",
      minItems: 2,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "detail", "impact"],
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          impact: { type: "string", enum: ["low", "medium", "high"] },
        },
      },
    },
    rootCauses: {
      type: "array",
      minItems: 2,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "detail"],
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
        },
      },
    },
    hypotheses: {
      type: "array",
      minItems: 2,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "detail", "priority"],
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          priority: { type: "string", enum: ["quick-win", "medium-effort", "strategic"] },
        },
      },
    },
    overallScore: { type: "integer", description: "Website health score 0-100" },
    summary: { type: "string", description: "2-3 sentence executive summary of the diagnostic" },
  },
} as const;

export async function runDiagnostic(site: ScrapedSite): Promise<LlmResult<DiagnosticResult>> {
  return generate<DiagnosticResult>({
    schemaName: "website_diagnostic",
    jsonSchema: diagnosticJsonSchema,
    validator: DiagnosticSchema,
    tier: "smart",
    maxTokens: 2400,
    system: `You are a senior UX strategist and web consultant at AvenueTech, a digital consultancy that audits websites for conversion, usability and brand effectiveness. You perform deep website diagnostics.

DIAGNOSTIC FRAMEWORK (follow this exactly):

1. COMPONENTS — Scan and map every distinct UI element on the page: navigation, hero section, CTAs, forms, content blocks, images, videos, testimonials, footer, etc. Note whether each is well-implemented, missing, or problematic.

2. OBSERVATIONS — Identify design choices, UX patterns, and content decisions. Note what's working and what's not. Consider: visual hierarchy, mobile-readiness, load speed indicators (heavy images, too many scripts), accessibility, brand consistency, content clarity, trust signals.

3. PROBLEMS — Diagnose specific issues tied to business goals: unclear value proposition, weak CTAs, missing social proof, poor navigation, content gaps, SEO issues, slow-loading indicators, accessibility barriers.

4. ROOT CAUSES — Go deeper: WHY do these problems exist? Is it a strategy problem (unclear positioning), a design problem (visual clutter), a content problem (wrong messaging), or a technical problem (poor structure)?

5. HYPOTHESES — Propose specific, actionable improvements. Each should be tied to a root cause. Classify as quick-win (can fix in days), medium-effort (weeks), or strategic (requires rethinking).

Score the site 0-100 based on: conversion readiness (30%), UX quality (25%), content effectiveness (20%), technical health (15%), brand consistency (10%).

Be specific and honest. Reference actual elements from the site content. Do not give generic advice — every finding must be grounded in what you actually see in the scraped content.`,
    user: `Run a full diagnostic on this website:\n\n${scrapeToPrompt(site)}`,
    mock: () => ({
      components: [
        { name: "Navigation Bar", type: "Navigation", notes: "Present but could use clearer hierarchy and mobile optimization." },
        { name: "Hero Section", type: "Hero", notes: "Has headline and subtext. Could benefit from a stronger visual hook." },
        { name: "Primary CTA", type: "CTA", notes: "Exists but placement and contrast could be improved for visibility." },
        { name: "Services Section", type: "Content Block", notes: "Lists services but lacks specificity and social proof." },
        { name: "Contact Form", type: "Form", notes: "Basic form present. Missing validation feedback and trust signals." },
        { name: "Footer", type: "Footer", notes: "Contains basic links. Missing social media links and secondary CTAs." },
        { name: "Images", type: "Image", notes: "Generic stock imagery. Could use authentic brand photography." },
        { name: "Testimonials", type: "Social Proof", notes: "Not found — major gap for building trust." },
      ],
      observations: [
        { title: "Value proposition is unclear above the fold", detail: "Visitors need to scroll to understand what the business actually does. The hero headline is vague.", severity: "warning" as const },
        { title: "No social proof visible", detail: "No testimonials, client logos, case studies, or review scores anywhere on the page.", severity: "critical" as const },
        { title: "CTA is below the fold", detail: "The primary call to action requires scrolling to reach. Mobile users may never see it.", severity: "warning" as const },
        { title: "Mobile experience unclear", detail: "Content structure suggests desktop-first design. Responsive behavior unknown from markup.", severity: "info" as const },
        { title: "Clean visual design", detail: "Color palette and typography are consistent and professional. Good foundation to build on.", severity: "info" as const },
      ],
      problems: [
        { title: "Weak conversion path", detail: "No clear journey from landing to action. Users see content but aren't guided to convert.", impact: "high" as const },
        { title: "Missing trust signals", detail: "No testimonials, certifications, client logos, or case studies to build credibility.", impact: "high" as const },
        { title: "Vague messaging", detail: "Headlines and descriptions are generic. They could apply to any business in the category.", impact: "medium" as const },
        { title: "No lead magnet or secondary CTA", detail: "Visitors who aren't ready to buy have no reason to stay engaged or leave their info.", impact: "medium" as const },
      ],
      rootCauses: [
        { title: "Strategy gap", detail: "The site was likely built around what the business does, not around what the visitor needs. Positioning is inside-out instead of outside-in." },
        { title: "Content under-investment", detail: "Copy reads like a first draft — functional but not persuasive. No evidence of copywriting for conversion." },
        { title: "No conversion architecture", detail: "The page lacks a deliberate funnel structure: hook → value → proof → action. It's a brochure, not a conversion tool." },
        { title: "Missing feedback loop", detail: "No analytics events, heatmap indicators, or A/B testing structure visible. The site likely hasn't been optimized based on real user data." },
      ],
      hypotheses: [
        { title: "Rewrite hero with specific value proposition", detail: "Replace generic headline with a clear statement: who it's for, what they get, and why this provider. Test with A/B.", priority: "quick-win" as const },
        { title: "Add 3 client testimonials above the fold", detail: "Even simple text quotes with names and companies dramatically increase conversion. Place near the primary CTA.", priority: "quick-win" as const },
        { title: "Build a conversion funnel structure", detail: "Restructure the page: Hook → Problem → Solution → Proof → CTA. Guide the visitor through a logical persuasion path.", priority: "medium-effort" as const },
        { title: "Create a lead magnet for non-ready visitors", detail: "Offer a free resource (guide, checklist, audit) to capture emails from visitors who aren't ready to buy yet.", priority: "strategic" as const },
      ],
      overallScore: 52,
      summary: "The site has a clean visual foundation but lacks conversion architecture, social proof, and specific messaging. With a clearer value proposition, testimonials, and a structured funnel, this site could significantly improve its conversion rate. (Sample diagnostic — add your OpenAI key for a real analysis.)",
    }),
  });
}
