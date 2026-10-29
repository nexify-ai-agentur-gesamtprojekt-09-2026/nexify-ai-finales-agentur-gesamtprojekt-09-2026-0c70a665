/** Only server-described availability; absence never grants an operation. */
export type WorkspaceCapabilities={quote_pdf:boolean;pending_outbox:boolean;booking_request:boolean;marketing_template:boolean;email_delivery:boolean;external_calendar:boolean;model_chat:boolean;local_planning:boolean;speech_readout:boolean;chatgpt_option:boolean};
export function readWorkspaceCapabilities(value:unknown):WorkspaceCapabilities|null{
 if(!value||typeof value!=="object"||Array.isArray(value))return null;
 const keys=["quote_pdf","pending_outbox","booking_request","marketing_template","email_delivery","external_calendar","model_chat","local_planning"] as const;
 const result={} as WorkspaceCapabilities;
 for(const key of keys){const flag=(value as Record<string,unknown>)[key];if(typeof flag!=="boolean")return null;result[key]=flag;}
 // Newer provider flags are optional: only an explicit true enables them.
 for(const key of ["speech_readout","chatgpt_option"] as const)result[key]=(value as Record<string,unknown>)[key]===true;
 return result;
}
