import {createHash} from "node:crypto";
import {readdir,readFile} from "node:fs/promises";
import {join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import type {Pool,PoolClient} from "pg";

const DEFAULT_MIGRATIONS_DIR=fileURLToPath(new URL("../../../infrastructure/database/migrations/",import.meta.url));
const LOCK_KEY="gabenglish:database:migrations";

export async function runMigrations(pool:Pool,migrationsDirectory=DEFAULT_MIGRATIONS_DIR){
 const client:PoolClient=await pool.connect();
 let locked=false;
 try{
  await client.query("SELECT pg_advisory_lock(hashtext($1))",[LOCK_KEY]);
  locked=true;
  const ledgerSql=[
   "CREATE TABLE IF NOT EXISTS schema_migrations(",
   "version text PRIMARY KEY,",
   "checksum text NOT NULL,",
   "applied_at timestamptz NOT NULL DEFAULT now()",
   ")"
  ].join("\n");
  await client.query(ledgerSql);
  const files=(await readdir(migrationsDirectory)).filter(name=>/^\d+.*\.sql$/.test(name)).sort();
  for(const version of files){
   const sql=await readFile(join(migrationsDirectory,version),"utf8");
   const checksum=createHash("sha256").update(sql).digest("hex");
   const existing=await client.query<{checksum:string}>("SELECT checksum FROM schema_migrations WHERE version=$1",[version]);
   if(existing.rows[0]){
    if(existing.rows[0].checksum!==checksum)throw new Error("Applied migration checksum mismatch: "+version);
    continue;
   }
   await client.query("BEGIN");
   try{
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations(version,checksum) VALUES($1,$2)",[version,checksum]);
    await client.query("COMMIT");
   }catch(error){
    await client.query("ROLLBACK");
    throw error;
   }
  }
 }finally{
  if(locked){
   try{await client.query("SELECT pg_advisory_unlock(hashtext($1))",[LOCK_KEY]);}
   finally{client.release();}
  }else client.release();
 }
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 const databaseUrl=process.env.DATABASE_URL;
 if(!databaseUrl)throw new Error("DATABASE_URL is required to run migrations");
 const {Pool}=await import("pg");
 const pool=new Pool({connectionString:databaseUrl,max:1,connectionTimeoutMillis:5000});
 try{
  await runMigrations(pool);
  process.stdout.write("Gabenglish database migrations are up to date.\n");
 }finally{await pool.end();}
}
