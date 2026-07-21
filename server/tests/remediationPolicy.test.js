'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {validateAuthorizedTarget,assessRemediation}=require('../domain/remediationPolicy');
const {validateRuntime}=require('../config/runtime');
test('blocks SSRF and targets outside authorization scope',()=>{
 assert.equal(validateAuthorizedTarget('http://127.0.0.1/admin','example.com').valid,false);
 assert.ok(validateAuthorizedTarget('https://evil.example.net','example.com').violations.includes('outside_authorized_scope'));
});
test('accepts reproducible improved evidence but still requires manual review',()=>{
 const result=assessRemediation({targetUrl:'https://app.example.com/',authorizedHost:'example.com',authorizationReference:'scope-7',sourceRevision:'git:abc',patch:{files:['index.html']},evidence:{before:{runId:'axe-1',findings:[{},{}]},after:{runId:'axe-2',findings:[{}]}}});
 assert.equal(result.valid,true);assert.equal(result.verification.resolvedCount,1);assert.equal(result.verification.manualReviewRequired,true);
});
test('detects a regression',()=>{const result=assessRemediation({targetUrl:'https://example.com',authorizedHost:'example.com',authorizationReference:'scope',sourceRevision:'r',patch:{files:['a']},evidence:{before:{runId:'1',findings:[]},after:{runId:'2',findings:[{}]}}});assert.ok(result.violations.includes('regression_detected'));});
test('runtime rejects an undocumented database boundary',()=>assert.throws(()=>validateRuntime({JWT_SECRET:'x'.repeat(32)}),/DATABASE_URL/));
test('runtime quarantines legacy routes and forbids production opt-in',()=>{assert.equal(validateRuntime({DATABASE_URL:'postgres://db',JWT_SECRET:'x'.repeat(32)}).legacyPrototypeRoutesEnabled,false);assert.throws(()=>validateRuntime({NODE_ENV:'production',DATABASE_URL:'postgres://db',CLIENT_URL:'https://app.example',JWT_SECRET:'x'.repeat(32),ENABLE_LEGACY_PROTOTYPE_ROUTES:'true'}),/cannot be enabled/);});
