import { mutation, query } from "./_generated/server";

export const checkPending = query({
  args: {},
  handler: async (ctx) => {
    const steps = await ctx.db.query("steps").collect();
    const slides = await ctx.db.query("slides").collect();
    const pendingSteps = steps.filter((s) => !s.presentationId).length;
    const pendingSlides = slides.filter((s) => !s.presentationId).length;
    return {
      pendingSteps,
      pendingSlides,
      needsMigration: pendingSteps > 0 || pendingSlides > 0,
    };
  },
});

export const run = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Check if there's already any presentation
    const presentations = await ctx.db.query("presentations").collect();
    let presentationId;
    if (presentations.length === 0) {
      // Create the default presentation as specified by the user
      presentationId = await ctx.db.insert("presentations", {
        title: "Agentes y WordPress",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      presentationId = presentations[0]._id;
    }

    // 2. Fetch all steps without presentationId and update them
    const steps = await ctx.db.query("steps").collect();
    let stepsMigrated = 0;
    for (const step of steps) {
      if (!step.presentationId) {
        await ctx.db.patch(step._id, { presentationId });
        stepsMigrated++;
      }
    }

    // 3. Fetch all slides without presentationId and update them
    const slides = await ctx.db.query("slides").collect();
    let slidesMigrated = 0;
    for (const slide of slides) {
      if (!slide.presentationId) {
        await ctx.db.patch(slide._id, { presentationId });
        slidesMigrated++;
      }
    }

    // 4. Update presentationState to point to this presentation
    const state = await ctx.db.query("presentationState").first();
    if (state) {
      await ctx.db.patch(state._id, { activePresentationId: presentationId });
    } else {
      await ctx.db.insert("presentationState", {
        activePresentationId: presentationId,
        currentStepId: null,
        activeSlideId: null,
      });
    }

    return { 
      success: true, 
      presentationId,
      stepsMigrated,
      slidesMigrated,
      message: "Migració completada amb èxit per a la presentació 'Agentes y WordPress'." 
    };
  },
});

