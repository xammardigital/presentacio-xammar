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
      throw new Error("ERROR: ADMIN_TOKEN no configurat al Dashboard de Convex.");
    }
    if (args.adminToken !== serverToken) {
      throw new Error("ERROR: Token d'administrador incorrecte.");
    }
    const existing = await ctx.db.query("presentationState").first();
    if (existing) {
      await ctx.db.patch(existing._id, { currentStepId: args.id });
    } else {
      await ctx.db.insert("presentationState", { currentStepId: args.id, activeSlideId: null });
    }
  },
});

export const resetPresentation = mutation({
  args: { 
    adminToken: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("Reiniciant presentació...");
    const serverToken = process.env.ADMIN_TOKEN;
    
    if (!serverToken) {
      console.error("ADMIN_TOKEN no configurat");
      throw new Error("ERROR: ADMIN_TOKEN no configurat al Dashboard de Convex.");
    }
    
    if (args.adminToken !== serverToken) {
      console.error("Token incorrecte");
      throw new Error("ERROR: Token d'administrador incorrecte.");
    }

    // 1. Reset presentation state
    const state = await ctx.db.query("presentationState").first();
    if (state) {
      console.log("Resetejant estat global...");
      await ctx.db.patch(state._id, {
        currentStepId: null,
        activeSlideId: null,
      });
    }

    // 2. Clear all votes in steps
    console.log("Buidant vots de les enquestes...");
    const steps = await ctx.db.query("steps").collect();
    for (const step of steps) {
      if (step.type === "ENCUESTA" && Array.isArray(step.votes)) {
        console.log(`Resetejant enquesta: ${step.title}`);
        await ctx.db.patch(step._id, {
          votes: step.votes.map(() => 0),
        });
      }
    }
    
    return { success: true };
  },
});
