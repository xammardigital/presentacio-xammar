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

// Added for more robust frontend validation
export const checkToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    return args.token === process.env.ADMIN_TOKEN;
  },
});

export const activateStep = mutation({
  args: { 
    id: v.union(v.id("steps"), v.null()),
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
    const existing = await ctx.db.query("presentationState").first();
    if (existing) {
      await ctx.db.patch(existing._id, { currentStepId: args.id });
    } else {
      await ctx.db.insert("presentationState", { currentStepId: args.id });
    }
  },
});
