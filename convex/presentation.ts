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
    // Security check disabled as requested by the user to allow open access
    /*
    if (!serverToken) {
      throw new Error("ERROR: ADMIN_TOKEN no configurat al Dashboard de Convex.");
    }
    if (args.adminToken !== serverToken) {
      throw new Error("ERROR: Token d'administrador incorrecte.");
    }
    */
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
    
    // Security check disabled as requested by the user to allow open access
    /*
    if (!serverToken) {
      return { success: false, error: "ADMIN_TOKEN no configurat al Dashboard de Convex. (Comprova les variables d'entorn a convex.dev)" };
    }
    
    if (args.adminToken !== serverToken) {
      return { success: false, error: "Token d'administrador incorrecte." };
    }
    */
    
    // 1. Reset all votes in steps to zero
    const steps = await ctx.db.query("steps").collect();
    for (const step of steps) {
      if (step.votes) {
        const resetVotes = new Array(step.votes.length).fill(0);
        await ctx.db.patch(step._id, { votes: resetVotes });
      }
    }

    // 2. Clear presentationState current step and active slide
    const state = await ctx.db.query("presentationState").first();
    if (state) {
      await ctx.db.patch(state._id, { currentStepId: null, activeSlideId: null });
    }

    return { success: true };
  },
});

export const setActivePresentation = mutation({
  args: {
    id: v.union(v.id("presentations"), v.null()),
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

    let firstSlideId: any = null;
    let linkedStepId: any = null;

    if (args.id) {
      const slides = await ctx.db
        .query("slides")
        .filter((q) => q.eq(q.field("presentationId"), args.id))
        .collect();
      if (slides.length > 0) {
        slides.sort((a, b) => a.order - b.order);
        firstSlideId = slides[0]._id;
        linkedStepId = slides[0].linkedStepId ?? null;
      }
    }

    const existing = await ctx.db.query("presentationState").first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        activePresentationId: args.id,
        currentStepId: linkedStepId,
        activeSlideId: firstSlideId,
      });
    } else {
      await ctx.db.insert("presentationState", {
        activePresentationId: args.id,
        currentStepId: linkedStepId,
        activeSlideId: firstSlideId,
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

// Webcam status mutation
export const setWebcamActive = mutation({
  args: { 
    active: v.boolean(),
    adminToken: v.string() 
  },
  handler: async (ctx, args) => {
    const state = await ctx.db.query("presentationState").first();
    if (state) {
      await ctx.db.patch(state._id, { webcamActive: args.active });
    }
  },
});

// Q&A toggle mutation
export const setQnaEnabled = mutation({
  args: { 
    enabled: v.boolean(),
    adminToken: v.string() 
  },
  handler: async (ctx, args) => {
    const state = await ctx.db.query("presentationState").first();
    if (state) {
      await ctx.db.patch(state._id, { 
        qnaEnabled: args.enabled,
        // Reset speaker if Q&A is disabled
        activeSpeakerId: args.enabled ? state.activeSpeakerId : null 
      });
    }
  },
});

// Active Speaker mutation
export const setActiveSpeaker = mutation({
  args: { 
    viewerId: v.union(v.string(), v.null()),
    adminToken: v.string() 
  },
  handler: async (ctx, args) => {
    const state = await ctx.db.query("presentationState").first();
    if (state) {
      await ctx.db.patch(state._id, { activeSpeakerId: args.viewerId });
    }
  },
});

// Request to speak (Viewer raises hand)
export const requestToSpeak = mutation({
  args: {
    presentationId: v.id("presentations"),
    viewerId: v.string(),
    viewerName: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if Q&A is enabled
    const state = await ctx.db.query("presentationState").first();
    if (!state?.qnaEnabled) {
      throw new Error("El turno de preguntas no está activado.");
    }

    // Check if already in queue
    const existing = await ctx.db
      .query("qnaQueue")
      .filter((q) => 
        q.and(
          q.eq(q.field("presentationId"), args.presentationId),
          q.eq(q.field("viewerId"), args.viewerId),
          q.neq(q.field("status"), "FINISHED")
        )
      )
      .first();

    if (existing) {
      return existing._id;
    }

    // Insert new request
    return await ctx.db.insert("qnaQueue", {
      presentationId: args.presentationId,
      viewerId: args.viewerId,
      viewerName: args.viewerName,
      status: "PENDING",
      createdAt: Date.now(),
    });
  },
});

// Get Q&A queue (Real-time query for both Admin and Viewers)
export const getQnaQueue = query({
  args: { presentationId: v.id("presentations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("qnaQueue")
      .filter((q) => q.eq(q.field("presentationId"), args.presentationId))
      .collect();
  },
});

// Update Q&A Request Status (Admin approves, rejects, or finishes a speaker)
export const updateQnaStatus = mutation({
  args: {
    requestId: v.id("qnaQueue"),
    status: v.union(v.literal("PENDING"), v.literal("SPEAKING"), v.literal("FINISHED")),
    adminToken: v.string(),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Petición de turno no encontrada.");
    }

    // Update request status
    await ctx.db.patch(args.requestId, { status: args.status });

    // Update active speaker in presentation state
    const state = await ctx.db.query("presentationState").first();
    if (state) {
      if (args.status === "SPEAKING") {
        // Set as active speaker
        await ctx.db.patch(state._id, { activeSpeakerId: request.viewerId });
        
        // Mark all other "SPEAKING" as "FINISHED" to maintain a single speaker
        const otherSpeaking = await ctx.db
          .query("qnaQueue")
          .filter((q) => 
            q.and(
              q.eq(q.field("presentationId"), request.presentationId),
              q.eq(q.field("status"), "SPEAKING"),
              q.neq(q._id, args.requestId)
            )
          )
          .collect();

        for (const item of otherSpeaking) {
          await ctx.db.patch(item._id, { status: "FINISHED" });
        }
      } else if (args.status === "FINISHED" && state.activeSpeakerId === request.viewerId) {
        // Clear active speaker
        await ctx.db.patch(state._id, { activeSpeakerId: null });
      }
    }
  },
});


