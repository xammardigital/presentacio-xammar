import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("steps").order("asc").collect();
  },
});

export const get = query({
  args: { id: v.union(v.id("steps"), v.null()) },
  handler: async (ctx, args) => {
    if (!args.id) return null;
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    type: v.union(v.literal("BIENVENIDA"), v.literal("TEXTO"), v.literal("ENCUESTA")),
    title: v.string(),
    content: v.optional(v.string()),
    options: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const lastStep = await ctx.db.query("steps").order("desc").first();
    const order = lastStep ? lastStep.order + 1 : 0;
    const stepId = await ctx.db.insert("steps", {
      type: args.type,
      title: args.title,
      content: args.content,
      options: args.options,
      votes: args.options ? new Array(args.options.length).fill(0) : undefined,
      order,
    });
    return stepId;
  },
});

export const remove = mutation({
  args: { id: v.id("steps") },
  handler: async (ctx, args) => {
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
