import pg from "pg";
import {loadConfig} from "./config.js";
import {buildApp} from "./app.js";
import {createGabrooConversationProvider} from "./gabroo-provider.js";
const config=loadConfig();
const pool=config.DATABASE_URL?new pg.Pool({connectionString:config.DATABASE_URL,max:10,connectionTimeoutMillis:3000}):null;
const developmentOtpDelivery=config.NODE_ENV==="development"?{send:async()=>true}:undefined;
const gabrooProvider=createGabrooConversationProvider(config);
const app=await buildApp(config,async()=>{if(!pool)return false;await pool.query("SELECT 1");return true;},pool??undefined,developmentOtpDelivery,gabrooProvider);
const shutdown=async()=>{await app.close();await pool?.end();process.exit(0);};
process.once("SIGINT",()=>void shutdown());process.once("SIGTERM",()=>void shutdown());
try{await app.listen({host:config.HOST,port:config.PORT});}catch(e){app.log.error(e);await pool?.end();process.exit(1);}
