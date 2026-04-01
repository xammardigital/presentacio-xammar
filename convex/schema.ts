import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  presentationState: defineTable({
    currentStepId: v.union(v.id("steps"), v.null()),
  }),
  steps: defineTable({
    type: v.union(v.literal("BIENVENIDA"), v.literal("TEXTO"), v.literal("ENCUESTA")),
    title: v.string(),
    content: v.optional(v.string()), // Used for TEXTO
    options: v.optional(v.array(v.string())), // Used for ENCUESTA
    votes: v.optional(v.array(v.number())), // Used for ENCUESTA, keeps track of vote counts
    order: v.number(),
  }),
});
