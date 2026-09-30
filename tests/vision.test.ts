import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseVisionResponse } from '../lib/gemini';

const response = (items: unknown) => JSON.stringify({is_recyclable_photo:true,is_screen_photo:false,items});
test('malformed AI counts/confidence cannot become paid items or overflow database integers', () => {
  for (const count of [true, '3', 1.5, 1e100, -1]) {
    assert.equal(parseVisionResponse(response([{type:'can',count,confidence:0.9}])), null);
  }
  assert.equal(parseVisionResponse(response([{type:'can',count:1,confidence:true}])), null);
  assert.equal(parseVisionResponse(response(null)), null);
});
test('repeated waste categories are not paid twice', () => {
  const item = {type:'can',count:2,confidence:0.9};
  assert.equal(parseVisionResponse(response([item,item])), null);
});
test('valid photos and genuine negative verdicts still parse', () => {
  assert.equal(parseVisionResponse(response([{type:'can',count:2,confidence:0.9}]))?.items[0].count, 2);
  assert.deepEqual(parseVisionResponse(response([]))?.items, []);
});
