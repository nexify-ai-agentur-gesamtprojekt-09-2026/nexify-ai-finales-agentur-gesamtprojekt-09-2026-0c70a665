import test from 'node:test';
import assert from 'node:assert/strict';
import {briefComplete,briefLimits,briefMailto,briefText,emptyBrief} from '../../web/lib/project-brief.mjs';
import {projectBriefCopy} from '../../web/lib/project-brief-i18n.ts';

test('empty briefs are independent and never ready for handoff',()=>{
 const a=emptyBrief(),b=emptyBrief();a.goal='local';assert.equal(b.goal,'');
 assert.equal(briefComplete(b),false);assert.equal(b.originPath,null);assert.equal(b.open,false);
 for(const value of [null,{},'text',{goal:' ',situation:'now',nextStep:'next'}])assert.equal(briefComplete(value),false);
});
test('completion requires three bounded user answers',()=>{
 const complete={...emptyBrief(),goal:'A',situation:'B',nextStep:'C'};assert.equal(briefComplete(complete),true);
 for(const [key,max] of Object.entries(briefLimits)){
  assert.equal(briefComplete({...complete,[key]:'x'.repeat(max)}),true);
  assert.equal(briefComplete({...complete,[key]:'x'.repeat(max+1)}),false);
 }
});
test('summary preserves user facts as text with a known page source',()=>{
 const text=briefText({...emptyBrief(),goal:' <script>not executed</script> ',situation:'Line1\nLine2',nextStep:'Ask'},projectBriefCopy.de,'Kontakt');
 assert.match(text,/Ziel: <script>not executed<\/script>/);assert.match(text,/Line1\nLine2/);assert.match(text,/Begonnen auf: Kontakt/);
 assert.doesNotMatch(text,/gebucht|gesendet|kostenlos|Preis/);
});
test('mail preparation has only the fixed recipient and encoded user fields',()=>{
 for(const address of [undefined,'other@example.invalid','mail@nexifyai.cloud?bcc=other@example.invalid'])assert.equal(briefMailto(address,'x','y'),null);
 const link=briefMailto('mail@nexifyai.cloud','Title\r\nBcc: other@example.invalid','A&B?cc=example\n<script>');
 const url=new URL(link);assert.equal(url.pathname,'mail@nexifyai.cloud');assert.deepEqual([...url.searchParams.keys()],['subject','body']);
 assert.doesNotMatch(url.searchParams.get('subject'),/[\r\n]/);assert.equal(url.searchParams.get('body'),'A&B?cc=example\n<script>');
});
test('DE NL FR have complete equal labels and three actual questions',()=>{
 for(const locale of ['de','nl','fr']){
  assert.deepEqual(Object.keys(projectBriefCopy[locale]),Object.keys(projectBriefCopy.de));
  assert.equal(projectBriefCopy[locale].questions.length,3);
  for(const label of Object.values(projectBriefCopy[locale]).flat())assert.ok(typeof label==='string'&&label.trim());
 }
});
