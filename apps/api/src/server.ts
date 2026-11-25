import pg from "pg";
import {loadConfig} from "./config.js";
import {buildApp} from "./app.js";
import {createOpenAICompatibleGabrooProvider} from "./gabroo-openai-provider.js";
const config=loadConfig();
const pool=config.DATABASE_URL?new pg.Pool({connectionString:config.DATABASE_URL,max:10,connectionTimeoutMillis:3000}):null;
const developmentOtpDelivery=config.NODE_ENV==="development"?{send:async()=>true}:undefined;
const gabrooProvider=config.GABROO_API_KEY&&config.GABROO_API_MODEL
 ?createOpenAICompatibleGabrooProvider({apiKey:config.GABROO_API_KEY,baseUrl:config.GABROO_API_BASE_URL,model:config.GABROO_API_MODEL,maxOutputTokens:config.GABROO_API_MAX_OUTPUT_TOKENS})
 :undefined;
const app=await buildApp(config,async()=>{if(!pool)return false;await pool.query("SELECT 1");return true;},pool??undefined,developmentOtpDelivery,gabrooProvider);
const shutdown=async()=>{await app.close();await pool?.end();process.exit(0);};
process.once("SIGINT",()=>void shutdown());process.once("SIGTERM",()=>void shutdown());
try{await app.listen({host:config.HOST,port:config.PORT});}catch(e){app.log.error(e);await pool?.end();process.exit(1);}
