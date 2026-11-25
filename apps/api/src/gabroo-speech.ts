import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Pool } from "pg";
import { z } from "zod";
import { GabrooRecognitionError } from "@gabenglish/contracts";
import type { AppConfig } from "./config.js";
import { authenticateLearner } from "./auth.js";
import { getActiveSubscriptionEntitlement } from "./subscriptions.js";
import { generateGabrooSpeechAsset, type GabrooSpeechAssetProvider } from "./gabroo-speech-assets.js";

const requestSchema = z.object({
  text: z.string().trim().min(1).max(5_000),
  language: z.enum(["ml", "en"]),
  speech_rate: z.number().min(0.75).max(1.5),
}).strict();

function sendError(reply: any, requestId: string, status: number, code: string, message: string) {
  return reply.code(status).send({ error: { code, message, request_id: requestId } });
}
function headerValue(request: FastifyRequest, name: string): string | undefined {
  const value = request.headers[name];
  return typeof value === "string" ? value : undefined;
}

export async function registerGabrooSpeechRoutes(
  app: FastifyInstance,
  pool: Pool,
  config: AppConfig,
  provider?: GabrooSpeechAssetProvider,
) {
  app.get("/api/v1/gabroo/speech/status", async (request, reply) => {
    const learner = await authenticateLearner(request, pool, config);
    if (!learner) return sendError(reply, request.id, 401, "VERIFIED_ACCOUNT_REQUIRED", "Please sign in with your verified account to check Gabroo speech availability.");
    const entitlement = await getActiveSubscriptionEntitlement(pool, learner.id);
    if (!entitlement) return sendError(reply, request.id, 403, "PAID_SUBSCRIPTION_REQUIRED", "An active Gabenglish subscription is required to use Gabroo speech.");
    return {
      available: Boolean(provider),
      supported_languages: ["ml", "en"],
      speech_rate: { minimum: 0.75, maximum: 1.5 },
      consent_required: true,
    };
  });

  app.post("/api/v1/gabroo/speech", async (request, reply) => {
    const learner = await authenticateLearner(request, pool, config);
    if (!learner) return sendError(reply, request.id, 401, "VERIFIED_ACCOUNT_REQUIRED", "Please sign in with your verified account to generate Gabroo speech.");
    const entitlement = await getActiveSubscriptionEntitlement(pool, learner.id);
    if (!entitlement) return sendError(reply, request.id, 403, "PAID_SUBSCRIPTION_REQUIRED", "An active Gabenglish subscription is required to use Gabroo speech.");
    if (headerValue(request, "x-gabroo-consent") !== "true") {
      return sendError(reply, request.id, 400, "CONSENT_REQUIRED", "Please confirm that you want Gabroo to generate speech for this response.");
    }
    if (!provider) {
      return sendError(reply, request.id, 503, "PROVIDER_UNAVAILABLE", "Gabroo speech generation is not configured yet. No audio was generated.");
    }
    const parsed = requestSchema.safeParse(request.body);
    if (!parsed.success) return sendError(reply, request.id, 400, "INVALID_SPEECH_REQUEST", "Please provide valid Gabroo speech text, language and speaking speed.");

    const controller = new AbortController();
    const onAborted = () => controller.abort();
    const onResponseClosed = () => { if (!reply.raw.writableEnded) controller.abort(); };
    request.raw.once("aborted", onAborted);
    reply.raw.once("close", onResponseClosed);
    try {
      const speechAsset = await generateGabrooSpeechAsset({
        text: parsed.data.text,
        language: parsed.data.language,
        speechRate: parsed.data.speech_rate,
        consentGranted: true,
        provider,
        signal: controller.signal,
      });
      return { speech_asset: speechAsset, request_id: request.id };
    } catch (error) {
      if (error instanceof GabrooRecognitionError) {
        const status = error.code === "CONSENT_REQUIRED" || error.code === "INVALID_AUDIO" ? 400
          : error.code === "PROVIDER_TIMEOUT" ? 504 : 503;
        const message = error.code === "PROVIDER_TIMEOUT" ? "Gabroo speech generation took too long. Please try again."
          : error.code === "PROVIDER_UNAVAILABLE" ? "Gabroo speech generation is temporarily unavailable."
          : "The Gabroo speech request is invalid.";
        return sendError(reply, request.id, status, error.code, message);
      }
      request.log.error({ request_id: request.id }, "Gabroo speech generation request failed");
      return sendError(reply, request.id, 503, "PROVIDER_FAILED", "Gabroo speech generation is temporarily unavailable. Please try again.");
    } finally {
      request.raw.removeListener("aborted", onAborted);
      reply.raw.removeListener("close", onResponseClosed);
    }
  });
}
