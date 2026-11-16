import { z } from "zod";
const schema=z.object({NODE_ENV:z.enum(["development","test","production"]).default("development"),HOST:z.string().default("0.0.0.0"),PORT:z.coerce.number().int().min(1).max(65535).default(4000),DATABASE_URL:z.string().url().optional(),CORS_ORIGINS:z.string().default("http://localhost:8081,http://localhost:19006")});
export function loadConfig(source:NodeJS.ProcessEnv=process.env){const p=schema.safeParse(source);if(!p.success)throw new Error("Invalid environment configuration");return {...p.data,corsOrigins:p.data.CORS_ORIGINS.split(",").map(x=>x.trim()).filter(Boolean)};}
export type AppConfig=ReturnType<typeof loadConfig>;
