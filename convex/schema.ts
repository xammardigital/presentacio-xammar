import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  presentationState: defineTable({
    currentStepId: v.union(v.id("steps"), v.null()),
    activeSlideId: v.optional(v.union(v.id("slides"), v.null())),
  }),
  steps: defineTable({
    type: v.union(v.literal("BIENVENIDA"), v.literal("TEXTO"), v.literal("ENCUESTA")),
    title: v.string(),
    content: v.optional(v.string()), // Used for TEXTO
    options: v.optional(v.array(v.string())), // Used for ENCUESTA
    votes: v.optional(v.array(v.number())), // Used for ENCUESTA, keeps track of vote counts
    order: v.number(),
  }),
  slides: defineTable({
    order: v.number(),
    internalTitle: v.optional(v.string()),
    markdownContent: v.string(),
    fontScale: v.union(v.literal(0.8), v.literal(1.0), v.literal(1.2), v.literal(1.5), v.literal(2.0)),
    linkedStepId: v.union(v.id("steps"), v.null()),
    autoActivate: v.boolean(),
  }),
  slideAssets: defineTable({
    slideId: v.id("slides"),
    storageId: v.id("_storage"),
    url: v.string(),
    altText: v.string(),
  }),
});
