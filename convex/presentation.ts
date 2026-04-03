import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getState = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("presentationState").first();
  },
});

export const validateToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    return args.token === process.env.ADMIN_TOKEN;
  },
});

export const activateStep = mutation({
  args: { id: v.union(v.id("steps"), v.null()), adminToken: v.string() },
  handler: async (ctx, args) => {
    if (args.adminToken !== process.env.ADMIN_TOKEN) {
      throw new Error("Unauthorized: Invalid admin token");
    }
    const existing = await ctx.db.query("presentationState").first();
    if (existing) {
      await ctx.db.patch(existing._id, { currentStepId: args.id });
    } else {
      await ctx.db.insert("presentationState", { currentStepId: args.id });
    }
  },
});
