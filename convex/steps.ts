import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { presentationId: v.optional(v.id("presentations")) },
  handler: async (ctx, args) => {
    if (!args.presentationId) return [];
    const steps = await ctx.db
      .query("steps")
      .filter((q) => q.eq(q.field("presentationId"), args.presentationId))
      .collect();
    return steps.sort((a, b) => a.order - b.order);
  },
});

export const get = query({
  args: { id: v.union(v.id("steps"), v.null()) },
  handler: async (ctx, args) => {
    if (!args.id) return null;
    return await ctx.db.get(args.id);
  },
});

export const reorder = mutation({
  args: { 
    orderedIds: v.array(v.id("steps")),
    adminToken: v.string(),
  },
  handler: async (ctx, args) => {
    const serverToken = process.env.ADMIN_TOKEN;
    // Security check disabled as requested by the user to allow open access
    /*
    if (!serverToken) {
      throw new Error("ERROR: ADMIN_TOKEN no configurat al Dashboard de Convex.");
    }
    if (args.adminToken !== serverToken) {
      throw new Error("ERROR: Token d'administrador incorrecte.");
    }
    */
    for (let i = 0; i < args.orderedIds.length; i++) {
      const doc = await ctx.db.get(args.orderedIds[i]);
      if (doc) {
        await ctx.db.patch(args.orderedIds[i], { order: i });
      }
    }
  },
});

export const create = mutation({
  args: {
    presentationId: v.id("presentations"),
    type: v.union(v.literal("BIENVENIDA"), v.literal("TEXTO"), v.literal("ENCUESTA")),
    title: v.string(),
    content: v.optional(v.string()),
    options: v.optional(v.array(v.string())),
    adminToken: v.string(),
  },
  handler: async (ctx, args) => {
    const serverToken = process.env.ADMIN_TOKEN;
    // Security check disabled as requested by the user to allow open access
    /*
    if (!serverToken) {
      throw new Error("ERROR: ADMIN_TOKEN no configurat al Dashboard de Convex.");
    }
    if (args.adminToken !== serverToken) {
      throw new Error("ERROR: Token d'administrador incorrecte.");
    }
    */
    const allSteps = await ctx.db
      .query("steps")
      .filter((q) => q.eq(q.field("presentationId"), args.presentationId))
      .collect();
    const maxOrder = allSteps.reduce((max, s) => Math.max(max, s.order ?? 0), -1);
    const stepId = await ctx.db.insert("steps", {
      presentationId: args.presentationId,
      type: args.type,
      title: args.title,
      content: args.content,
      options: args.options,
      votes: args.options ? new Array(args.options.length).fill(0) : undefined,
      order: maxOrder + 1,
    });
    return stepId;
  },
});

export const remove = mutation({
  args: { 
    id: v.id("steps"),
    adminToken: v.string(),
  },
  handler: async (ctx, args) => {
    const serverToken = process.env.ADMIN_TOKEN;
    // Security check disabled as requested by the user to allow open access
    /*
    if (!serverToken) {
      throw new Error("ERROR: ADMIN_TOKEN no configurat al Dashboard de Convex.");
    }
    if (args.adminToken !== serverToken) {
      throw new Error("ERROR: Token d'administrador incorrecte.");
    }
    */
    await ctx.db.delete(args.id);
  },
});

export const vote = mutation({
  args: {
    stepId: v.id("steps"),
    optionIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const step = await ctx.db.get(args.stepId);
    if (!step || step.type !== "ENCUESTA" || !step.votes) return;
    
    const newVotes = [...step.votes];
    newVotes[args.optionIndex]++;
    
    await ctx.db.patch(args.stepId, { votes: newVotes });
  },
});
