const {test}=require('node:test'),assert=require('node:assert/strict'),{decide}=require('./watchdog.cjs');
const now=Date.parse('2026-10-23T03:20:00Z'),r={id:1,event:'schedule',created_at:'2026-10-23T03:00:00Z',status:'completed',conclusion:'success'};
test('missing or previous-hour updates are dispatched',()=>{assert.equal(decide([],now).action,'dispatch');assert.equal(decide([{...r,created_at:'2026-10-23T02:00:00Z'}],now).action,'dispatch')});
test('successful and in-progress updates are not duplicated',()=>{assert.equal(decide([r],now).action,'skip');assert.equal(decide([{...r,status:'queued'}],now).action,'wait')});
test('failed updates retry at most three times',()=>{assert.equal(decide([{...r,conclusion:'failure',run_attempt:1}],now).action,'rerun');assert.equal(decide([{...r,conclusion:'failure',run_attempt:3}],now).action,'stop')});
