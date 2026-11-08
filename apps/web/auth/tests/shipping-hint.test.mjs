import test from 'node:test';
import assert from 'node:assert/strict';
import {freeShippingHint} from '../../components/shop/shipping-hint.ts';

const cart=(subtotal_cents,extra={})=>({count:1,subtotal_cents,free_shipping_threshold_cents:7500,...extra});

test('free shipping starts exactly at the server threshold of 75 EUR',()=>{
  assert.deepEqual(freeShippingHint(cart(7499)),{kind:'remaining',remaining_cents:1,threshold_cents:7500});
  assert.deepEqual(freeShippingHint(cart(7500)),{kind:'reached'});
  assert.deepEqual(freeShippingHint(cart(12000)),{kind:'reached'});
});

test('no claim without a cart or without a valid server threshold',()=>{
  assert.equal(freeShippingHint(cart(0,{count:0})),null);
  assert.equal(freeShippingHint({count:2,subtotal_cents:5000}),null);
  assert.equal(freeShippingHint(cart(5000,{free_shipping_threshold_cents:0})),null);
  assert.equal(freeShippingHint(cart(5000,{free_shipping_threshold_cents:75.5})),null);
});
