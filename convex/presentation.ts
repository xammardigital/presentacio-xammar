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
    const serverToken = process.env.ADMIN_TOKEN;
    
    if (!serverToken) {
      return { success: false, error: "ADMIN_TOKEN no configurat al Dashboard de Convex. (Comprova les variables d'entorn a convex.dev)" };
    }
    
    if (args.adminToken !== serverToken) {
      return { success: false, error: "Token d'administrador incorrecte." };
    }

    try {
      // 1. Reset presentation state
      const state = await ctx.db.query("presentationState").first();
      if (state) {
        await ctx.db.patch(state._id, {
          currentStepId: null,
          activeSlideId: null,
        });

        // 2. Clear all votes in steps of the active presentation
        if (state.activePresentationId) {
          const steps = await ctx.db
            .query("steps")
            .filter((q) => q.eq(q.field("presentationId"), state.activePresentationId))
            .collect();
          for (const step of steps) {
            if (step.type === "ENCUESTA" && step.votes) {
              await ctx.db.patch(step._id, {
                votes: step.votes.map(() => 0),
              });
            }
          }
        }
      }
      
      return { success: true };
    } catch (err: any) {
      return { success: false, error: "Error de base de dades: " + err.message };
    }
  },
});

export const setActivePresentation = mutation({
  args: {
    id: v.union(v.id("presentations"), v.null()),
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
      await ctx.db.patch(existing._id, {
        activePresentationId: args.id,
        currentStepId: null,
        activeSlideId: null,
      });
    } else {
      await ctx.db.insert("presentationState", {
        activePresentationId: args.id,
        currentStepId: null,
        activeSlideId: null,
      });
    }

    if (args.id) {
      // Reinicio de votos for the activated presentation
      const steps = await ctx.db
        .query("steps")
        .filter((q) => q.eq(q.field("presentationId"), args.id))
        .collect();

      for (const step of steps) {
        if (step.type === "ENCUESTA" && step.votes) {
          await ctx.db.patch(step._id, {
            votes: step.votes.map(() => 0),
          });
        }
      }
    }
  },
});

