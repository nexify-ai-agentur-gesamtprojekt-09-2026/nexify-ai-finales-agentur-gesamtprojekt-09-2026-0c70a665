#!/usr/bin/env python3
"""Finite local controller using the existing remediation database, never shell/MCP/SSH."""
import argparse
import json
from pathlib import Path
import sys
import time
import uuid

sys.path.insert(0, str(Path(__file__).resolve().parent))
import remediation_queue as rq
import context_executor
import brain_ingestion

ROOT = Path(__file__).resolve().parents[1]
POLICY = 'config/local-control.json'
OPERATIONS = {'context.select', 'source.verify', 'brain.preview'}
STATES = {'open_awaiting_verification', 'in_progress_limited', 'review_pending', 'verified_complete', 'blocked_not_reviewed'}


def require(value, code):
    if not value:
        raise rq.QueueError(code)


def object_fields(value, fields):
    require(isinstance(value, dict) and set(value) == set(fields), 'unknown_or_missing_schema_field')


class LocalControl:
    """Trusted local operator API. Actor labels are NOT server authentication."""
    def __init__(self, *, root=ROOT, database=None, tenant, project, now=None, read_only=False):
        self.root = Path(root).absolute()
        self.tenant, self.project = rq.identifier(tenant), rq.identifier(project)
        require(project == 'canonical_agency_project', 'project_scope_forbidden')
        self.now = now or time.time
        queue_policy=rq.json_value(rq.read_source(self.root,'config/remediation-policy.json'))
        selected=Path(database if database is not None else queue_policy['default_database'])
        selected=(selected if selected.is_absolute() else self.root/selected).absolute()
        require(selected == self.root/'.local/remediation/queue.sqlite3','single_existing_registry_required')
        self.queue = rq.RemediationQueue(database, root=self.root, read_only=read_only)
        self.policy = rq.json_value(rq.read_source(self.root, POLICY))
        require(self.policy['schema_version'] == 1 and self.policy['scope'] == project, 'unsupported_control_policy')
        require({c['operation'] for c in self.policy['capabilities']} == OPERATIONS, 'unsupported_operation_catalog')
        self.limits = self.policy['limits']
        for key, maximum in [('max_jobs', 32), ('max_requests', 2000), ('lease_seconds', 60),
                             ('evidence_ttl_seconds', 3600), ('max_result_bytes', 262144)]:
            require(type(self.limits[key]) is int and 1 <= self.limits[key] <= maximum, 'invalid_control_limit')
        if read_only:
            return
        # Additive tables in the ONE existing remediation database; no second error queue.
        with self.queue.transaction() as db:
            for statement in [
                'CREATE TABLE IF NOT EXISTS control_requests(id TEXT PRIMARY KEY,tenant TEXT,project TEXT,definition TEXT NOT NULL,hash TEXT NOT NULL,created REAL)',
                'CREATE TABLE IF NOT EXISTS control_jobs(id TEXT PRIMARY KEY,request_id TEXT NOT NULL,local_id TEXT NOT NULL,spec TEXT NOT NULL,state TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,fence INTEGER,worker TEXT,health_id TEXT,contract_hash TEXT,result TEXT,result_hash TEXT,checkpoint TEXT,blocked_reason TEXT,gap_id TEXT,updated REAL)',
                'CREATE TABLE IF NOT EXISTS control_health(id TEXT PRIMARY KEY,tenant TEXT,project TEXT,operation TEXT,target TEXT,contract_hash TEXT,observed REAL,expires REAL,pagination_complete INTEGER)',
                'CREATE TABLE IF NOT EXISTS control_leases(resource TEXT PRIMARY KEY,token INTEGER NOT NULL,worker TEXT,job_id TEXT,expires REAL)',
                'CREATE TABLE IF NOT EXISTS control_events(id INTEGER PRIMARY KEY,job_id TEXT,event TEXT,details TEXT,at REAL)',
                'CREATE TABLE IF NOT EXISTS control_reviews(job_id TEXT PRIMARY KEY,reviewer TEXT,result_hash TEXT,evidence_path TEXT,evidence_sha256 TEXT,at REAL)'
            ]:
                db.execute(statement)

    def _event(self, db, job, event, details):
        db.execute('INSERT INTO control_events(job_id,event,details,at) VALUES(?,?,?,?)', (job, event, rq.canonical(details), self.now()))

    def _contract(self, operation):
        require(operation in OPERATIONS, 'unknown_operation_no_shell_fallback')
        policy = rq.json_value(rq.read_source(self.root, POLICY))
        capability = next(c for c in policy['capabilities'] if c['operation'] == operation)
        require(capability['effect'] == 'local_read' and capability['version'] == '1', 'unsupported_adapter_contract')
        manifest = rq.json_value(rq.read_source(self.root, 'config/project-skills.json'))
        skill = next((s for s in manifest['skills'] if s['name'] == capability['skill']), None)
        require(skill is not None, 'missing_registered_skill')
        raw = rq.read_source(self.root, skill['source_path'])
        require(rq.digest(raw) == skill['sha256'], 'skill_hash_drift')
        # Load only the selected pinned skill as guidance; never execute its contents.
        require(raw.decode('utf-8').startswith('---\nname: ' + skill['name'] + '\n'), 'skill_identity_mismatch')
        paths = [POLICY, 'config/project-skills.json', 'tools/local_control.py', skill['source_path'], *capability['adapter_sources']]
        refs = {path: rq.digest(rq.read_source(self.root, path)) for path in paths}
        return capability, refs, rq.digest(rq.canonical(refs))

    def probe(self, operation):
        """Native local source/skill probe; not provider, auth or pagination evidence."""
        _, refs, fingerprint = self._contract(operation)
        now = self.now(); identifier = uuid.uuid4().hex
        with self.queue.transaction() as db:
            require(db.execute('SELECT COUNT(*) FROM control_health').fetchone()[0] < self.queue.policy['max_history_records'],'health_history_limit')
            db.execute('INSERT INTO control_health VALUES(?,?,?,?,?,?,?,?,1)',
                       (identifier, self.tenant, self.project, operation, str(self.root), fingerprint, now, now+self.limits['evidence_ttl_seconds']))
        return {'id': identifier, 'operation': operation, 'target': str(self.root), 'observed_at': now,
                'sources': refs, 'proof_scope': 'local_adapter_source_and_skill_integrity_only', 'distributed_or_remote_verified': False}

    def _preflight(self, db, spec, health_id, contract_hash=None):
        require(spec['target'] == str(self.root), 'target_host_mismatch_no_ssh_fallback')
        capability, refs, fingerprint = self._contract(spec['operation'])
        require(spec['intent'] == capability['intent'] and spec['effect'] == capability['effect'], 'intent_or_effect_scope_mismatch')
        object_fields(spec['inputs'], capability['input_fields'])
        require(contract_hash is None or contract_hash == fingerprint, 'adapter_contract_changed')
        health = db.execute('SELECT * FROM control_health WHERE id=?', (health_id,)).fetchone()
        require(health is not None and (health['tenant'], health['project'], health['operation'], health['target'], health['contract_hash']) ==
                (self.tenant, self.project, spec['operation'], str(self.root), fingerprint), 'operation_evidence_scope_mismatch')
        require(health['pagination_complete'] == 1, 'incomplete_pagination')
        require(health['observed'] <= self.now() < health['expires'], 'stale_operation_evidence')
        if spec['operation'] == 'context.select':
            rq.text(spec['inputs']['task'])
        else:
            require(isinstance(spec['inputs']['sha256'], str) and rq.SHA.fullmatch(spec['inputs']['sha256']), 'expected_source_hash_required')
            raw = rq.read_source(self.root, spec['inputs']['path'])
            require(rq.digest(raw) == spec['inputs']['sha256'], 'source_hash_changed')
        return fingerprint

    def submit(self, definition):
        object_fields(definition, ['id','revision','tenant','project','title','data_class','deadline','jobs'])
        require((definition['tenant'], definition['project']) == (self.tenant, self.project), 'tenant_or_project_mismatch')
        require(definition['data_class'] in {'synthetic','project_source'}, 'customer_or_private_data_forbidden')
        for key in ('id','revision'): rq.identifier(definition[key])
        rq.text(definition['title'])
        require(type(definition['deadline']) in {int,float} and 0 < definition['deadline'] < 10**12, 'explicit_bounded_deadline_required')
        jobs = definition['jobs']
        require(isinstance(jobs,list) and 1 <= len(jobs) <= self.limits['max_jobs'], 'bounded_jobs_required')
        ids = []
        for job in jobs:
            object_fields(job, ['id','intent','operation','effect','target','inputs','health_id','dependencies','start_dependencies','source_reported_status','max_attempts'])
            rq.identifier(job['id']); ids.append(job['id'])
            for field in ('intent','operation','effect','target','health_id'): rq.text(job[field])
            require(job['source_reported_status'] in {'todo','in_progress','done'}, 'unknown_source_status')
            require(type(job['max_attempts']) is int and 1 <= job['max_attempts'] <= self.queue.policy['max_attempts'], 'attempt_limit_required')
        require(len(set(ids)) == len(ids), 'duplicate_job_id')
        by_id = {j['id']:j for j in jobs}
        # Start prerequisites and completion aggregation are DIFFERENT DAGs.
        for field in ('dependencies','start_dependencies'):
            for job in jobs:
                require(isinstance(job[field],list) and len(set(job[field])) == len(job[field]) and all(d in by_id and d != job['id'] for d in job[field]), 'invalid_dependency_reference')
            visited, active = set(), set()
            def walk(key):
                require(key not in active, 'dependency_cycle:'+field)
                if key in visited: return
                active.add(key)
                for child in by_id[key][field]: walk(child)
                active.remove(key); visited.add(key)
            for key in ids: walk(key)
        raw = rq.canonical(definition); require(len(raw.encode()) <= 65536, 'request_size_limit')
        require(not rq.SECRET.search(raw), 'sensitive_request_forbidden')
        request_id = rq.digest(rq.canonical([self.tenant,self.project,definition['id'],definition['revision']]))
        with self.queue.transaction() as db:
            old = db.execute('SELECT * FROM control_requests WHERE id=?',(request_id,)).fetchone()
            if old:
                require(old['hash'] == rq.digest(raw), 'immutable_revision_conflict')
                return {'id':request_id,'deduplicated':True}
            require(self.now() < definition['deadline'] < self.now()+604800,'explicit_bounded_deadline_required')
            require(db.execute('SELECT COUNT(*) FROM control_events').fetchone()[0]+len(jobs)+8 <= self.queue.policy['max_history_records'],'control_history_limit')
            require(db.execute('SELECT COUNT(*) FROM control_requests').fetchone()[0] < self.limits['max_requests'], 'request_limit')
            db.execute('INSERT INTO control_requests VALUES(?,?,?,?,?,?)',(request_id,self.tenant,self.project,raw,rq.digest(raw),self.now()))
            for job in jobs:
                jid = rq.digest(request_id+':'+job['id']); reason=None; fingerprint=None
                try: fingerprint=self._preflight(db,job,job['health_id'])
                except (rq.QueueError,OSError,ValueError,KeyError,StopIteration) as exc:
                    reason=str(exc) if isinstance(exc,rq.QueueError) else 'source_or_contract_unavailable'
                state='blocked_not_reviewed' if reason else 'open_awaiting_verification'
                db.execute('INSERT INTO control_jobs(id,request_id,local_id,spec,state,health_id,contract_hash,blocked_reason,updated) VALUES(?,?,?,?,?,?,?,?,?)',
                           (jid,request_id,job['id'],rq.canonical(job),state,job['health_id'],fingerprint,reason,self.now()))
                self._event(db,jid,'imported',{'state':state,'source_reported_status':job['source_reported_status']})
        self.sync_gaps(request_id)
        return {'id':request_id,'deduplicated':False}

    def _job(self, db, job_id):
        row=db.execute('SELECT j.*,r.definition FROM control_jobs j JOIN control_requests r ON r.id=j.request_id WHERE j.id=? AND r.tenant=? AND r.project=?',
                       (job_id,self.tenant,self.project)).fetchone()
        require(row is not None,'scoped_job_not_found');return row

    def _valid_lease(self, db, ticket):
        row=self._job(db,ticket['job_id']); lease=db.execute('SELECT * FROM control_leases WHERE resource=?',(str(self.root),)).fetchone()
        require(lease is not None and (lease['job_id'],lease['worker'],lease['token']) == (row['id'],ticket['worker'],ticket['fence'])
                and row['fence']==ticket['fence'] and row['state']=='in_progress_limited' and self.now()<lease['expires']
                and self.now()<json.loads(row['definition'])['deadline'], 'expired_or_superseded_local_lease')
        return row

    def claim(self, request_id, worker):
        rq.identifier(worker)
        with self.queue.transaction() as db:
            lease=db.execute('SELECT * FROM control_leases WHERE resource=?',(str(self.root),)).fetchone()
            if lease and lease['worker'] is not None and lease['expires']>self.now(): return None
            rows=db.execute('SELECT j.id FROM control_jobs j JOIN control_requests r ON r.id=j.request_id WHERE r.id=? AND r.tenant=? AND r.project=? ORDER BY j.rowid',
                            (request_id,self.tenant,self.project)).fetchall()
            for candidate in rows:
                row=self._job(db,candidate['id']); spec=json.loads(row['spec']); definition=json.loads(row['definition'])
                if row['state'] not in {'open_awaiting_verification','in_progress_limited'}:continue
                deps=[db.execute('SELECT state,result FROM control_jobs WHERE request_id=? AND local_id=?',(request_id,d)).fetchone() for d in spec['start_dependencies']]
                try:
                    require(self.now()<definition['deadline'],'job_deadline_expired')
                    if any(d['state'] not in {'review_pending','verified_complete'} or d['result'] is None for d in deps):continue
                    require(row['attempts']<spec['max_attempts'],'attempts_exhausted')
                    self._preflight(db,spec,row['health_id'],row['contract_hash'])
                except (rq.QueueError,OSError,ValueError,KeyError) as exc:
                    reason=str(exc) if isinstance(exc,rq.QueueError) else 'source_or_contract_unavailable'
                    db.execute("UPDATE control_jobs SET state='blocked_not_reviewed',blocked_reason=?,updated=? WHERE id=?",(reason,self.now(),row['id']))
                    self._event(db,row['id'],'blocked',{'reason':reason});continue
                token=(lease['token'] if lease else 0)+1
                expires=min(self.now()+self.limits['lease_seconds'],definition['deadline'])
                db.execute('INSERT INTO control_leases VALUES(?,?,?,?,?) ON CONFLICT(resource) DO UPDATE SET token=excluded.token,worker=excluded.worker,job_id=excluded.job_id,expires=excluded.expires',
                           (str(self.root),token,worker,row['id'],expires))
                db.execute("UPDATE control_jobs SET state='in_progress_limited',worker=?,fence=?,attempts=attempts+1,updated=? WHERE id=?",(worker,token,self.now(),row['id']))
                self._event(db,row['id'],'claimed',{'worker':worker,'fence':token})
                return {'job_id':row['id'],'worker':worker,'fence':token}
        self.sync_gaps(request_id)
        return None

    def heartbeat(self,ticket):
        with self.queue.transaction() as db:
            row=self._valid_lease(db,ticket)
            db.execute('UPDATE control_leases SET expires=? WHERE resource=?',
                       (min(self.now()+self.limits['lease_seconds'],json.loads(row['definition'])['deadline']),str(self.root)))

    def _adapter(self,spec):
        inputs=spec['inputs']; operation=spec['operation']
        if operation=='context.select':
            result=context_executor.build_context(inputs['task'],root=self.root)
            require(result['status']=='selected','context_incomplete_no_full_read_claim')
            return result
        raw=rq.read_source(self.root,inputs['path']);require(rq.digest(raw)==inputs['sha256'],'source_hash_changed')
        if operation=='source.verify':return {'path':inputs['path'],'sha256':rq.digest(raw),'status':'exact_local_readback'}
        require(operation=='brain.preview','unknown_operation_no_shell_fallback')
        require(inputs['path'].endswith('.md'),'markdown_required')
        content,redactions,candidates=brain_ingestion.redact(raw)
        parts=brain_ingestion.chunks(content,rq.digest(raw))
        return {'path':inputs['path'],'source_sha256':rq.digest(raw),'redactions':redactions,'candidate_kinds':candidates,
                'chunk_hashes':[rq.digest(rq.canonical(p)) for p in parts], 'remote_write':False,'external_indexed':None,'status':'local_preview_only'}

    def execute(self,ticket):
        try:
            return self._execute(ticket)
        except (rq.QueueError, OSError, ValueError, KeyError, brain_ingestion.StagingError) as exc:
            reason=str(exc) if isinstance(exc,rq.QueueError) else 'local_adapter_failed'
            # A stale worker cannot block or release its successor's lease either.
            with self.queue.transaction() as db:
                row=self._valid_lease(db,ticket)
                db.execute("UPDATE control_jobs SET state='blocked_not_reviewed',blocked_reason=?,updated=? WHERE id=?",(reason,self.now(),row['id']))
                db.execute('UPDATE control_leases SET worker=NULL,job_id=NULL,expires=? WHERE resource=?',(self.now(),str(self.root)))
                self._event(db,row['id'],'execution_blocked',{'reason':reason})
            self.sync_gaps(row['request_id'])
            raise rq.QueueError(reason) from None

    def _execute(self,ticket):
        with self.queue.transaction() as db:
            row=self._valid_lease(db,ticket);spec=json.loads(row['spec'])
            self._preflight(db,spec,row['health_id'],row['contract_hash'])
            checkpoint={'phase':'validated_before_local_read','contract_hash':row['contract_hash'],'fence':ticket['fence']}
            db.execute('UPDATE control_jobs SET checkpoint=? WHERE id=?',(rq.canonical(checkpoint),row['id']))
        # Only fixed bounded readers outside the writer transaction. Stale workers
        # may finish reading, but can never commit after losing their fence.
        result=self._adapter(spec); raw=rq.canonical(result)
        require(len(raw.encode())<=self.limits['max_result_bytes'],'result_limit')
        with self.queue.transaction() as db:
            row=self._valid_lease(db,ticket)
            self._preflight(db,spec,row['health_id'],row['contract_hash'])
            db.execute("UPDATE control_jobs SET state='review_pending',result=?,result_hash=?,checkpoint=?,updated=? WHERE id=?",
                       (raw,rq.digest(raw),rq.canonical({'phase':'result_persisted','result_hash':rq.digest(raw)}),self.now(),row['id']))
            db.execute('UPDATE control_leases SET worker=NULL,job_id=NULL,expires=? WHERE resource=?',(self.now(),str(self.root)))
            self._event(db,row['id'],'result_persisted',{'sha256':rq.digest(raw),'fence':ticket['fence']})
        return {'job_id':row['id'],'state':'review_pending','sha256':rq.digest(raw),'result':result}

    def refresh_review(self,job_id,*,health_id):
        """Explicit fresh local evidence; retain immutable result, contract and attempts."""
        with self.queue.transaction() as db:
            row=self._job(db,job_id);spec=json.loads(row['spec'])
            require(row['state']=='review_pending','review_pending_required')
            require(self.now()<json.loads(row['definition'])['deadline'],'job_deadline_expired')
            self._preflight(db,spec,health_id,row['contract_hash'])
            require(rq.canonical(self._adapter(spec))==row['result'],'native_review_readback_mismatch')
            db.execute('UPDATE control_jobs SET health_id=?,updated=? WHERE id=?',(health_id,self.now(),job_id))
            self._event(db,job_id,'review_evidence_refreshed',{'health_id':health_id,'result_hash':row['result_hash']})
        return {'state':'review_pending','attempts_preserved':row['attempts']}

    def review(self,job_id,*,reviewer,result_hash,evidence_path,evidence_sha256):
        """Explicit separate local operator review + native recheck; no production grant."""
        rq.identifier(reviewer)
        with self.queue.transaction() as db:
            row=self._job(db,job_id); spec=json.loads(row['spec'])
            require(row['state'] in {'review_pending','verified_complete'},'result_required_for_review')
            require(reviewer!=row['worker'],'separate_reviewer_required')
            require(result_hash==row['result_hash'] and rq.digest(row['result'])==result_hash,'review_result_binding')
            receipt_raw=rq.read_source(self.root,evidence_path)
            require(rq.digest(receipt_raw)==evidence_sha256,'review_evidence_binding')
            receipt=rq.json_value(receipt_raw)
            require(receipt=={'job_id':job_id,'reviewer':reviewer,'result_hash':result_hash,
                              'contract_hash':row['contract_hash'],'decision':'accept','proof_scope':'local_only'},'review_receipt_scope_mismatch')
            old=db.execute('SELECT * FROM control_reviews WHERE job_id=?',(job_id,)).fetchone()
            if old:
                require((old['reviewer'],old['result_hash'],old['evidence_path'],old['evidence_sha256'])==(reviewer,result_hash,evidence_path,evidence_sha256),'review_replay_conflict')
                return {'state':'verified_complete','scope':'local_only','replayed':True}
            require(self.now()<json.loads(row['definition'])['deadline'],'job_deadline_expired')
            self._preflight(db,spec,row['health_id'],row['contract_hash'])
            require(all(db.execute('SELECT state FROM control_jobs WHERE request_id=? AND local_id=?',(row['request_id'],d)).fetchone()['state']=='verified_complete' for d in spec['dependencies']), 'completion_dependencies_pending')
            require(rq.canonical(self._adapter(spec))==row['result'],'native_review_readback_mismatch')
            db.execute('INSERT INTO control_reviews VALUES(?,?,?,?,?,?)',(job_id,reviewer,result_hash,evidence_path,evidence_sha256,self.now()))
            db.execute("UPDATE control_jobs SET state='verified_complete',updated=? WHERE id=?",(self.now(),job_id))
            self._event(db,job_id,'local_review_recorded',{'reviewer':reviewer,'result_hash':result_hash})
        return {'state':'verified_complete','scope':'local_only','replayed':False}

    def sync_gaps(self,request_id):
        with self.queue.connection() as db:
            rows=db.execute("SELECT j.id FROM control_jobs j JOIN control_requests r ON r.id=j.request_id WHERE r.id=? AND r.tenant=? AND r.project=? AND j.state='blocked_not_reviewed' AND j.gap_id IS NULL",(request_id,self.tenant,self.project)).fetchall()
        for entry in rows:
            # Existing registry is the ONLY error queue. A missing generic prerequisite
            # never resolves on a supplied success boolean or model output.
            gap=self.queue.register({'project':self.project,'component':'local_control','resource':entry['id'],'requirement':'capability_preconditions'},
                 {'kind':'local_control_prerequisites','job_id':entry['id'],'tenant':self.tenant},
                 source_paths=[POLICY,'tools/local_control.py'],owner='D08',next_action='Review blocked job and provide valid local prerequisites; never use SSH or paid fallback.')
            with self.queue.transaction() as db: db.execute('UPDATE control_jobs SET gap_id=? WHERE id=?',(gap['id'],entry['id']))

    def check_prerequisites(self,job_id):
        with self.queue.connection() as db:
            row=self._job(db,job_id);spec=json.loads(row['spec'])
            require(row['state'] in STATES,'unknown_persisted_state')
            require(self.now()<json.loads(row['definition'])['deadline'],'job_deadline_expired')
            require(row['attempts']<spec['max_attempts'] or row['result_hash'] is not None,'attempts_exhausted')
            self._preflight(db,spec,row['health_id'],row['contract_hash'])
        return {'outcome':'passed','code':'exact_local_job_prerequisites_only','production_accepted':False}

    def resume(self,job_id,*,health_id):
        with self.queue.transaction() as db:
            row=self._job(db,job_id);spec=json.loads(row['spec'])
            require(row['state']=='blocked_not_reviewed','blocked_job_required')
            require(self.now()<json.loads(row['definition'])['deadline'],'job_deadline_expired')
            require(row['attempts']<spec['max_attempts'],'attempts_exhausted')
            fingerprint=self._preflight(db,spec,health_id,row['contract_hash'])
            db.execute('UPDATE control_jobs SET health_id=?,contract_hash=? WHERE id=?',(health_id,fingerprint,job_id))
        self.sync_gaps(row['request_id'])
        with self.queue.connection() as db: gap=self._job(db,job_id)['gap_id']
        verified=self.queue.verify(gap,event_key='control-resume:'+job_id+':'+health_id)
        require(verified['state']=='resolved','remediation_verification_required')
        with self.queue.transaction() as db:
            row=self._job(db,job_id)
            require(row['state']=='blocked_not_reviewed','concurrent_resume_state_changed')
            self._preflight(db,spec,health_id,row['contract_hash'])
            db.execute("UPDATE control_jobs SET state='open_awaiting_verification',blocked_reason=NULL,updated=? WHERE id=?",(self.now(),job_id))
            self._event(db,job_id,'explicit_resume',{'health_id':health_id,'gap_id':gap})
        return {'state':'open_awaiting_verification','attempts_preserved':row['attempts']}

    def status(self,request_id):
        self.sync_gaps(request_id)
        return self.status_snapshot(request_id)

    def status_snapshot(self,request_id):
        """Pure scoped snapshot. No gap reconciliation, lease renewal or event writes."""
        rq.identifier(request_id)
        with self.queue.connection(read_only=True) as db:
            db.execute("BEGIN")  # One read snapshot across jobs, receipts and parent join.
            rows=db.execute('SELECT j.* FROM control_jobs j JOIN control_requests r ON r.id=j.request_id WHERE r.id=? AND r.tenant=? AND r.project=? ORDER BY j.rowid',(request_id,self.tenant,self.project)).fetchall()
            require(rows,'scoped_request_not_found')
            jobs=[{key:row[key] for key in ('id','local_id','state','attempts','worker','fence','result_hash','checkpoint','blocked_reason','gap_id')} for row in rows]
            lease=db.execute('SELECT * FROM control_leases WHERE resource=?',(str(self.root),)).fetchone()
            for job,row in zip(jobs,rows):
                require(job['state'] in STATES,'unknown_persisted_state')
                job['implementation_status']='locally_tested' if job['result_hash'] else 'not_verified'
                receipt=db.execute('SELECT * FROM control_reviews WHERE job_id=?',(job['id'],)).fetchone()
                orphaned=job['state']=='in_progress_limited' and (lease is None or lease['job_id']!=job['id'] or lease['token']!=job['fence'] or lease['expires']<=self.now())
                definition=json.loads(self._job(db,job['id'])['definition']); spec=json.loads(row['spec'])
                job['valid_until']=definition['deadline']
                expired=self.now()>=definition['deadline']
                cause=job['blocked_reason'] or ('local_lease_expired_or_superseded' if orphaned else None)
                next_action={
                    'open_awaiting_verification':'assign_operator_and_claim_after_start_dependencies',
                    'in_progress_limited':'reclaim_with_fresh_fence' if orphaned else 'await_current_worker_or_lease_expiry',
                    'review_pending':'assign_separate_reviewer_and_compare_exact_result',
                    'blocked_not_reviewed':'repair_prerequisite_then_explicitly_resume',
                    'verified_complete':'retain_receipt_for_parent_join',
                }[job['state']]
                if job['state']!='verified_complete' and (expired or job['attempts']>=spec['max_attempts'] and not job['result_hash'] and (job['state']!='in_progress_limited' or orphaned)):
                    cause='job_deadline_expired' if expired else 'attempts_exhausted'
                    next_action='obtain_explicit_new_revision_no_blind_retry'
                reviewer_needed=job['state']=='review_pending'
                job['follow_up']={'coordinator_role':'D08','owner_role':'independent_local_reviewer' if reviewer_needed or receipt else 'local_control_operator',
                    'assigned_executor':receipt['reviewer'] if receipt else None if reviewer_needed else job['worker'],
                    'cause':cause,'next_action':next_action,'orphaned_local_claim':orphaned,
                    'required_prerequisites':['exact_tenant_project','current_contract_and_source','fresh_operation_evidence','valid_deadline',
                        'separate_reviewer_and_bound_receipt' if reviewer_needed else 'exclusive_local_lease_for_execution']}
                job['closed_loop_receipt']={'closed':job['state']=='verified_complete' and receipt is not None,
                    'result_hash':job['result_hash'],'contract_hash':row['contract_hash'],
                    'review_evidence_path':receipt['evidence_path'] if receipt else None,
                    'review_evidence_sha256':receipt['evidence_sha256'] if receipt else None,
                    'register':'existing_remediation_database/control_jobs+control_reviews+control_events',
                    'external_knowledge_return_verified':False}
            return {'id':request_id,'state':'verified_complete' if all(j['closed_loop_receipt']['closed'] for j in jobs) else 'blocked_not_reviewed' if any(r['state']=='blocked_not_reviewed' for r in rows) else 'in_progress_limited',
                    'jobs':jobs,'proof_scope':'local_only','distributed_fencing_verified':False,'production_accepted':False}


    def workspace_status(self, request_id):
        """Versioned allowlist DTO; never expose raw spec/checkpoint/paths/actor claims."""
        snapshot = self.status_snapshot(request_id)
        jobs = []
        approvals = []
        for job in snapshot['jobs']:
            follow = job['follow_up']
            receipt = job['closed_loop_receipt']
            jobs.append({key: job[key] for key in ('id', 'local_id', 'state', 'attempts', 'result_hash')})
            jobs[-1].update(owner_role=follow['owner_role'], blocked_reason=follow['cause'],
                            next_action=follow['next_action'], joined=receipt['closed'])
            if job['state'] in ('review_pending', 'verified_complete'):
                approvals.append(dict(
                    id=job['id'], subject=job['local_id'], purpose='independent_local_result_review',
                    status='accepted_local_only' if receipt['closed'] else 'review_pending',
                    owner_role='independent_local_reviewer', risk='local_read_only',
                    cost_cap=None, valid_until=job['valid_until'],
                    source=dict(result_hash=receipt['result_hash'], contract_hash=receipt['contract_hash'],
                                evidence_sha256=receipt['review_evidence_sha256']),
                    next_action=follow['next_action']))
        state = ('verified_complete' if all(j['joined'] for j in jobs) else
                 'blocked_not_reviewed' if any(j['state']=='blocked_not_reviewed' for j in jobs) else
                 'in_progress_limited' if any(j['state']=='in_progress_limited' for j in jobs) else
                 'review_pending' if any(j['state']=='review_pending' for j in jobs) else
                 'open_awaiting_verification')
        return dict(schema_version='workspace-read-1', request_id=snapshot['id'],
                    state=state, jobs=jobs, approvals=approvals,
                    approval_scope='existing_local_result_reviews_only',
                    business_approval_binding='not_connected', proof_scope='local_only',
                    production_accepted=False)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--tenant',required=True);parser.add_argument('--project',required=True)
    sub=parser.add_subparsers(dest='command',required=True)
    probe=sub.add_parser('probe');probe.add_argument('operation')
    submit=sub.add_parser('submit');submit.add_argument('request_file')
    run=sub.add_parser('run-once');run.add_argument('request_id');run.add_argument('--worker',required=True)
    status=sub.add_parser('status');status.add_argument('request_id')
    resume=sub.add_parser('resume');resume.add_argument('job_id');resume.add_argument('--health-id',required=True)
    refresh=sub.add_parser('refresh-review');refresh.add_argument('job_id');refresh.add_argument('--health-id',required=True)
    review=sub.add_parser('review');review.add_argument('job_id');review.add_argument('--reviewer',required=True);review.add_argument('--result-hash',required=True);review.add_argument('--evidence-path',required=True);review.add_argument('--evidence-sha256',required=True)
    args=parser.parse_args();control=LocalControl(tenant=args.tenant,project=args.project)
    if args.command=='probe': result=control.probe(args.operation)
    elif args.command=='submit':result=control.submit(rq.json_value(rq.read_source(ROOT,args.request_file)))
    elif args.command=='status':result=control.status(args.request_id)
    elif args.command=='resume':result=control.resume(args.job_id,health_id=args.health_id)
    elif args.command=='refresh-review':result=control.refresh_review(args.job_id,health_id=args.health_id)
    elif args.command=='review':result=control.review(args.job_id,reviewer=args.reviewer,result_hash=args.result_hash,evidence_path=args.evidence_path,evidence_sha256=args.evidence_sha256)
    else:
        ticket=control.claim(args.request_id,args.worker)
        result=control.execute(ticket) if ticket else control.status(args.request_id)
    print(rq.canonical(result))


if __name__=='__main__':
    try:main()
    except (rq.QueueError,OSError,ValueError,KeyError) as exc:
        raise SystemExit('local control blocked: '+str(exc))
