import {test} from 'node:test';
import assert from 'node:assert/strict';
import {focusFirstInvalid} from '../../web/lib/contact-focus.mjs';

test('focuses the first marked control in form order', () => {
 const focused=[];
 const controls=[{invalid:false,focus:()=>focused.push('name')},{invalid:true,focus:()=>focused.push('email')},{invalid:true,focus:()=>focused.push('message')}];
 const form={querySelector(selector){assert.equal(selector,'[aria-invalid="true"]');return controls.find(control=>control.invalid)||null;}};
 focusFirstInvalid(form);assert.deepEqual(focused,['email']);
});
test('missing form or invalid control leaves focus unchanged', () => {
 focusFirstInvalid(null);focusFirstInvalid({querySelector:()=>null});
});
