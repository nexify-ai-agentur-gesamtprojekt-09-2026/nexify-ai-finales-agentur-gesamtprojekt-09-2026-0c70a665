import test from 'node:test';
import assert from 'node:assert/strict';
import {readWorkspaceCapabilities} from '../../web/components/WorkspaceCapabilities.ts';

const local={quote_pdf:true,pending_outbox:true,booking_request:true,marketing_template:true,email_delivery:false,external_calendar:false,model_chat:false,local_planning:true,speech_readout:false,chatgpt_option:false};
test('missing or malformed server capability descriptions never enable operations',()=>{
 for(const value of [undefined,null,true,[],{}, {quote_pdf:true}, {...local,model_chat:'false'}, {...local,quote_pdf:1}, {...local,booking_request:undefined}])assert.equal(readWorkspaceCapabilities(value),null);
});
test('local draft tools stay distinct from live model, delivery and calendar capabilities',()=>{
 const input={...local,admin:true,tenant:'UNTRUSTED_ROLE_SENTINEL'};
 const result=readWorkspaceCapabilities(input);
 assert.deepEqual(result,local);
 assert.equal(result.model_chat,false);assert.equal(result.email_delivery,false);assert.equal(result.external_calendar,false);
 assert.equal('admin' in result,false);assert.equal('tenant' in result,false);
 input.quote_pdf=false;assert.equal(result.quote_pdf,true);
});
