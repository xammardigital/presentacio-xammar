import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const steps = await ctx.db.query("steps").collect();
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
    if (!serverToken) {
      throw new Error("ERROR: ADMIN_TOKEN no configurado en el Dashboard de Convex.");
    }
    if (args.adminToken !== serverToken) {
      throw new Error("ERROR: Token de administrador incorrecto.");
    }
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
    type: v.union(v.literal("BIENVENIDA"), v.literal("TEXTO"), v.literal("ENCUESTA")),
    title: v.string(),
    content: v.optional(v.string()),
    options: v.optional(v.array(v.string())),
    adminToken: v.string(),
  },
  handler: async (ctx, args) => {
    const serverToken = process.env.ADMIN_TOKEN;
    if (!serverToken) {
      throw new Error("ERROR: ADMIN_TOKEN no configurado en el Dashboard de Convex.");
    }
    if (args.adminToken !== serverToken) {
      throw new Error("ERROR: Token de administrador incorrecto.");
    }
    const allSteps = await ctx.db.query("steps").collect();
    const maxOrder = allSteps.reduce((max, s) => Math.max(max, s.order ?? 0), -1);
    const stepId = await ctx.db.insert("steps", {
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
    if (!serverToken) {
      throw new Error("ERROR: ADMIN_TOKEN no configurado en el Dashboard de Convex.");
    }
    if (args.adminToken !== serverToken) {
      throw new Error("ERROR: Token de administrador incorrecto.");
    }
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
