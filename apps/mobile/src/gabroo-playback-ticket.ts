export type GabrooPlaybackTicket={url:string;audioId:string;expiresAt:string};

const PLAYBACK_PATH=/^\/api\/v1\/gabroo\/speech\/playback\/([0-9a-f]{64})$/;

/** Validate an API-issued, one-time playback ticket before constructing its URL. */
export function parseGabrooPlaybackTicket(payload:unknown,now=Date.now()):GabrooPlaybackTicket{
 if(typeof payload!=="object"||payload===null||
  !("playback_url" in payload)||typeof payload.playback_url!=="string"||
  !("method" in payload)||payload.method!=="GET"||
  !("expires_at" in payload)||typeof payload.expires_at!=="string"){
  throw new Error("Gabroo returned an invalid native playback ticket.");
 }
 const match=PLAYBACK_PATH.exec(payload.playback_url);
 if(!match)throw new Error("Gabroo returned an unsafe playback address.");
 const expiry=Date.parse(payload.expires_at);
 if(!Number.isFinite(expiry)||expiry<=now)throw new Error("Gabroo returned an expired playback ticket.");
 return {url:payload.playback_url,audioId:match[1]!,expiresAt:new Date(expiry).toISOString()};
}
