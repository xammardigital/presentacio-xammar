import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const slides = await ctx.db.query("slides").collect();
    return slides.sort((a, b) => a.order - b.order);
  },
});

export const getById = query({
  args: { id: v.union(v.id("slides"), v.null()) },
  handler: async (ctx, args) => {
    if (!args.id) return null;
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    markdownContent: v.string(),
    fontScale: v.union(v.literal(0.8), v.literal(1.0), v.literal(1.2), v.literal(1.5), v.literal(2.0)),
    linkedStepId: v.union(v.id("steps"), v.null()),
    autoActivate: v.boolean(),
    adminToken: v.string(),
  },
  handler: async (ctx, args) => {
    const serverToken = process.env.ADMIN_TOKEN;
    if (args.adminToken !== serverToken) {
      throw new Error("Unauthorized");
    }

    const allSlides = await ctx.db.query("slides").collect();
    const maxOrder = allSlides.reduce((max, s) => Math.max(max, s.order ?? 0), -1);

    return await ctx.db.insert("slides", {
      markdownContent: args.markdownContent,
      fontScale: args.fontScale,
      linkedStepId: args.linkedStepId,
      autoActivate: args.autoActivate,
      order: maxOrder + 1,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("slides"),
    markdownContent: v.string(),
    fontScale: v.union(v.literal(0.8), v.literal(1.0), v.literal(1.2), v.literal(1.5), v.literal(2.0)),
    linkedStepId: v.union(v.id("steps"), v.null()),
    autoActivate: v.boolean(),
    adminToken: v.string(),
  },
  handler: async (ctx, args) => {
    const serverToken = process.env.ADMIN_TOKEN;
    if (args.adminToken !== serverToken) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.id, {
      markdownContent: args.markdownContent,
      fontScale: args.fontScale,
      linkedStepId: args.linkedStepId,
      autoActivate: args.autoActivate,
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("slides"),
    adminToken: v.string(),
  },
  handler: async (ctx, args) => {
    const serverToken = process.env.ADMIN_TOKEN;
    if (args.adminToken !== serverToken) {
      throw new Error("Unauthorized");
    }

    // Remove slide assets too
    const assets = await ctx.db
      .query("slideAssets")
      .filter((q) => q.eq(q.field("slideId"), args.id))
      .collect();
    
    for (const asset of assets) {
      await ctx.storage.delete(asset.storageId);
      await ctx.db.delete(asset._id);
    }

    await ctx.db.delete(args.id);
  },
});

export const reorder = mutation({
  args: {
    orderedIds: v.array(v.id("slides")),
    adminToken: v.string(),
  },
  handler: async (ctx, args) => {
    const serverToken = process.env.ADMIN_TOKEN;
    if (args.adminToken !== serverToken) {
      throw new Error("Unauthorized");
    }

    for (let i = 0; i < args.orderedIds.length; i++) {
      await ctx.db.patch(args.orderedIds[i], { order: i });
    }
  },
});

export const setActive = mutation({
  args: {
    id: v.union(v.id("slides"), v.null()),
    adminToken: v.string(),
  },
  handler: async (ctx, args) => {
    const serverToken = process.env.ADMIN_TOKEN;
    if (args.adminToken !== serverToken) {
      throw new Error("Unauthorized");
    }

    const state = await ctx.db.query("presentationState").first();
    if (!state) {
      await ctx.db.insert("presentationState", {
        currentStepId: null,
        activeSlideId: args.id,
      });
    } else {
      await ctx.db.patch(state._id, { activeSlideId: args.id });
    }

    // Handling autoActivate
    if (args.id) {
      const slide = await ctx.db.get(args.id);
      if (slide && slide.autoActivate) {
        if (state) {
          await ctx.db.patch(state._id, { currentStepId: slide.linkedStepId ?? null });
        } else {
          await ctx.db.insert("presentationState", {
            currentStepId: slide.linkedStepId ?? null,
            activeSlideId: args.id,
          });
        }
      }
    }
  },
});

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const saveImage = mutation({
  args: {
    slideId: v.id("slides"),
    storageId: v.id("_storage"),
    altText: v.string(),
    adminToken: v.string(),
  },
  handler: async (ctx, args) => {
    const serverToken = process.env.ADMIN_TOKEN;
    if (args.adminToken !== serverToken) {
      throw new Error("Unauthorized");
    }

    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("File not found");

    return await ctx.db.insert("slideAssets", {
      slideId: args.slideId,
      storageId: args.storageId,
      url,
      altText: args.altText,
    });
  },
});
