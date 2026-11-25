import { z } from "zod";
const schema=z.object({
 NODE_ENV:z.enum(["development","test","production"]).default("development"),
 HOST:z.string().default("0.0.0.0"),
 PORT:z.coerce.number().int().min(1).max(65535).default(4000),
 DATABASE_URL:z.string().url().optional(),
 AUTH_TOKEN_SECRET:z.string().min(32).default("gabenglish-local-development-secret-change-before-deploy"),
 CORS_ORIGINS:z.string().default("http://localhost:8081,http://localhost:19006"),
 GABROO_API_KEY:z.preprocess(value=>value===""?undefined:value,z.string().min(1).optional()),
 GABROO_API_BASE_URL:z.string().url().default("https://api.openai.com/v1"),
 GABROO_API_MODEL:z.preprocess(value=>value===""?undefined:value,z.string().trim().min(1).optional())
}).superRefine((value,ctx)=>{
 if(value.NODE_ENV==="production"&&value.AUTH_TOKEN_SECRET==="gabenglish-local-development-secret-change-before-deploy"){
  ctx.addIssue({code:"custom",path:["AUTH_TOKEN_SECRET"],message:"AUTH_TOKEN_SECRET must be replaced before production."});
 }
 if(Boolean(value.GABROO_API_KEY)!==Boolean(value.GABROO_API_MODEL)){
  ctx.addIssue({code:"custom",path:["GABROO_API_MODEL"],message:"GABROO_API_KEY and GABROO_API_MODEL must be configured together."});
 }
});
export function loadConfig(source:NodeJS.ProcessEnv=process.env){
 const p=schema.safeParse(source);
 if(!p.success)throw new Error("Invalid environment configuration");
 return {...p.data,corsOrigins:p.data.CORS_ORIGINS.split(",").map(x=>x.trim()).filter(Boolean)};
}
export type AppConfig=ReturnType<typeof loadConfig>;
