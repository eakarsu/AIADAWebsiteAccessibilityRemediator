'use strict';
const express = require('express');
const { pool } = require('../db');
const auth = require('../middleware/auth');
const { assessRemediation } = require('../domain/remediationPolicy');
const router = express.Router();
const authorize = (...roles) => (req,res,next) => {
  req.tenantId = req.user?.tenantId || req.user?.tenant_id;
  if (!req.tenantId) return res.status(403).json({ error: 'Tenant claim required' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient role' });
  next();
};
router.use(auth);
router.get('/', authorize('auditor','reviewer','admin'), async (req,res) => {
  const result = await pool.query('SELECT * FROM remediation_workflows WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 100',[req.tenantId]);
  res.json(result.rows);
});
router.post('/', authorize('auditor','admin'), async (req,res) => {
  const key=req.get('Idempotency-Key');
  if(!key||key.length>128) return res.status(400).json({error:'Valid Idempotency-Key required'});
  const assessment=assessRemediation(req.body||{});
  const status=assessment.valid?'verified':'failed';
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const prior=await client.query('SELECT * FROM remediation_workflows WHERE tenant_id=$1 AND idempotency_key=$2 FOR UPDATE',[req.tenantId,key]);
    if(prior.rows[0]){await client.query('COMMIT');return res.json(prior.rows[0]);}
    const result=await client.query(`INSERT INTO remediation_workflows (tenant_id,idempotency_key,status,input,verification,failure_code,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[req.tenantId,key,status,req.body,assessment,assessment.valid?null:'validation_failed',String(req.user.id)]);
    await client.query('INSERT INTO remediation_workflow_audit(workflow_id,tenant_id,actor_id,action,details) VALUES($1,$2,$3,$4,$5)',[result.rows[0].id,req.tenantId,String(req.user.id),status,{violations:assessment.violations}]);
    await client.query('COMMIT');res.status(201).json(result.rows[0]);
  }catch(_){await client.query('ROLLBACK');res.status(500).json({error:'Workflow persistence failed',code:'workflow_persistence_failed'});}finally{client.release();}
});
router.post('/:id/submit',authorize('auditor','admin'),async(req,res)=>{
  const result=await pool.query(`UPDATE remediation_workflows SET status='pending_review',updated_at=NOW() WHERE id=$1 AND tenant_id=$2 AND status='verified' RETURNING *`,[req.params.id,req.tenantId]);
  if(!result.rows[0])return res.status(409).json({error:'Only verified remediation can be submitted'});
  await pool.query('INSERT INTO remediation_workflow_audit(workflow_id,tenant_id,actor_id,action) VALUES($1,$2,$3,$4)',[req.params.id,req.tenantId,String(req.user.id),'submitted']);res.json(result.rows[0]);
});
router.post('/:id/decision',authorize('reviewer','admin'),async(req,res)=>{
  if(!['approve','reject'].includes(req.body?.decision)||!String(req.body?.reason||'').trim()||!req.body?.manualReviewReference)return res.status(400).json({error:'decision, reason and manualReviewReference required'});
  const status=req.body.decision==='approve'?'approved':'rejected';
  const result=await pool.query(`UPDATE remediation_workflows SET status=$1,reviewed_by=$2,review_reason=$3,manual_review_reference=$4,updated_at=NOW() WHERE id=$5 AND tenant_id=$6 AND status='pending_review' AND created_by<>$2 RETURNING *`,[status,String(req.user.id),req.body.reason.trim(),req.body.manualReviewReference,req.params.id,req.tenantId]);
  if(!result.rows[0])return res.status(409).json({error:'Pending workflow and independent reviewer required'});
  await pool.query('INSERT INTO remediation_workflow_audit(workflow_id,tenant_id,actor_id,action,details) VALUES($1,$2,$3,$4,$5)',[req.params.id,req.tenantId,String(req.user.id),status,{reason:req.body.reason,manualReviewReference:req.body.manualReviewReference}]);res.json(result.rows[0]);
});
module.exports=router;
