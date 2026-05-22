import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const presentations = await ctx.db.query("presentations").collect();
    return presentations.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
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

    return await ctx.db.insert("presentations", {
      title: args.title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("presentations"),
    title: v.string(),
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

    await ctx.db.patch(args.id, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("presentations"),
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

    // 1. Delete associated steps
    const steps = await ctx.db
      .query("steps")
      .filter((q) => q.eq(q.field("presentationId"), args.id))
      .collect();
    
    for (const step of steps) {
      await ctx.db.delete(step._id);
    }

    // 2. Delete associated slides and slideAssets (including storage)
    const slides = await ctx.db
      .query("slides")
      .filter((q) => q.eq(q.field("presentationId"), args.id))
      .collect();

    for (const slide of slides) {
      const assets = await ctx.db
        .query("slideAssets")
        .filter((q) => q.eq(q.field("slideId"), slide._id))
        .collect();

      for (const asset of assets) {
        try {
          await ctx.storage.delete(asset.storageId);
        } catch (e) {
          console.error("Failed to delete storage asset: ", asset.storageId, e);
        }
        await ctx.db.delete(asset._id);
      }

      await ctx.db.delete(slide._id);
    }

    // 3. Reset active presentation state if it was active
    const state = await ctx.db.query("presentationState").first();
    if (state && state.activePresentationId === args.id) {
      await ctx.db.patch(state._id, {
        activePresentationId: null,
        currentStepId: null,
        activeSlideId: null,
      });
    }

    // 4. Finally delete the presentation itself
    await ctx.db.delete(args.id);
  },
});
