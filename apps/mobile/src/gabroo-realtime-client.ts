import {createGabrooRealtimeSessionTicket} from "./auth-api";
import {openGabrooRealtimeSession as openTransportSession,type GabrooRealtimeSocketCallbacks} from "./gabroo-realtime-transport";

/** Production entry point: secure API ticket issuance followed by WebSocket handshake. */
export function openGabrooRealtimeSession(input:{
 consentGranted:true;
 callbacks?:GabrooRealtimeSocketCallbacks;
}){
 return openTransportSession({
  consentGranted:input.consentGranted,
  ticketProvider:()=>createGabrooRealtimeSessionTicket(true),
  callbacks:input.callbacks
 });
}
