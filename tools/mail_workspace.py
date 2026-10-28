"""Bounded local mail snapshots and prepared outbox. No provider or dispatch adapter.

Only trusted local ingestion may provision accounts or supply source snapshots.
All identities include tenant/project/provider/mailbox. HTML is inert stored text.
"""
from contextlib import contextmanager
import json
import re
import uuid
import remediation_queue as rq

PROVIDERS = {'gmail', 'hostinger'}
ADDRESS = re.compile(r"^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?\.[A-Za-z]{2,63}$")


def fields(value, expected):
    rq.require(type(value) is dict and set(value) == set(expected), 'unknown_or_missing_schema_field')


def string(value, maximum=1000, empty=False, multiline=False):
    rq.require(type(value) is str and (empty or bool(value)) and len(value) <= maximum
               and not any((ord(c) < 32 and not (multiline and c in '\n\t')) or ord(c) == 127 or 0xD800 <= ord(c) <= 0xDFFF for c in value), 'invalid_mail_text')
    return value


def address(value):
    string(value, 254)
    rq.require(ADDRESS.fullmatch(value) is not None and '..' not in value and len(value.split('@')[0]) <= 64, 'invalid_mail_address')
    local, domain = value.rsplit('@', 1)
    rq.require(not local.startswith('.') and not local.endswith('.')
               and all(re.fullmatch(r'[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?', label) for label in domain.split('.')), 'invalid_mail_address')
    return value


def addresses(value):
    rq.require(type(value) is list and len(value) <= 50, 'invalid_mail_addresses')
    result = [address(v) for v in value]
    rq.require(len({v.casefold() for v in result}) == len(result), 'duplicate_mail_address')
    return result


def revision(value):
    rq.require(type(value) is int and 1 <= value <= 2**53 - 1, 'invalid_mail_revision')
    return value


class MailWorkspace:
    def __init__(self, queue, tenant, project):
        self.queue = queue
        self.tenant, self.project = rq.identifier(tenant), rq.identifier(project)
        rq.require(not queue.read_only, 'read_only_registry')
        with queue.connection() as db:
            db.executescript('''
            CREATE TABLE IF NOT EXISTS mail_mailboxes(
              tenant TEXT, project TEXT, provider TEXT, mailbox TEXT, address TEXT,
              sync TEXT NOT NULL, PRIMARY KEY(tenant,project,provider,mailbox));
            CREATE TABLE IF NOT EXISTS mail_messages(
              tenant TEXT, project TEXT, provider TEXT, mailbox TEXT, message TEXT,
              source TEXT NOT NULL, revision INTEGER NOT NULL, is_read INTEGER NOT NULL,
              task_status TEXT NOT NULL, archived INTEGER NOT NULL,
              PRIMARY KEY(tenant,project,provider,mailbox,message));
            CREATE TABLE IF NOT EXISTS mail_outbox(
              tenant TEXT, project TEXT, provider TEXT, mailbox TEXT, idempotency TEXT,
              payload TEXT NOT NULL, result TEXT NOT NULL,
              PRIMARY KEY(tenant,project,provider,mailbox,idempotency));
            ''')

    @contextmanager
    def _transaction(self):
        with self.queue.connection() as db:
            db.execute('BEGIN IMMEDIATE')
            try:
                yield db
                db.execute('COMMIT')
            except BaseException:
                db.execute('ROLLBACK')
                raise

    def _key(self, provider, mailbox_id):
        rq.require(type(provider) is str and provider in PROVIDERS, 'unsupported_mail_provider')
        return self.tenant, self.project, provider, rq.identifier(mailbox_id)

    def _mailbox(self, db, key):
        row = db.execute('SELECT * FROM mail_mailboxes WHERE tenant=? AND project=? AND provider=? AND mailbox=?', key).fetchone()
        rq.require(row is not None, 'mailbox_not_connected')
        return row

    def provision_mailbox(self, provider, mailbox_id, address):
        """Trusted local account declaration, never evidence of a live connection."""
        key = self._key(provider, mailbox_id)
        account_address = globals()['address'](address)
        with self._transaction() as db:
            row = db.execute('SELECT address FROM mail_mailboxes WHERE tenant=? AND project=? AND provider=? AND mailbox=?', key).fetchone()
            if row:
                rq.require(row['address'] == account_address, 'mailbox_identity_locked')
            else:
                rq.require(db.execute('SELECT count(*) FROM mail_mailboxes WHERE tenant=? AND project=?', key[:2]).fetchone()[0] < 20, 'mailbox_limit')
                db.execute('INSERT INTO mail_mailboxes VALUES(?,?,?,?,?,?)', (*key, account_address, rq.canonical({'coverage':'not_synced','cursor':None,'next_cursor':None,'seen':[]})))
        return self.messages(provider, mailbox_id)['mailbox']

    def _source(self, value):
        fields(value, ['provider_id','rfc_message_id','subject','from','to','cc','reply_to','text','revision','attachments','provider_metadata'])
        rq.identifier(value['provider_id'])
        if value['rfc_message_id'] is not None:
            string(value['rfc_message_id'], 998)
            rq.require(re.fullmatch(r'<[^\s<>@]+@[^\s<>@]+>', value['rfc_message_id']) is not None, 'invalid_rfc_message_id')
        string(value['subject'], 998, empty=True)
        address(value['from'])
        for name in ('to','cc','reply_to'):
            addresses(value[name])
        string(value['text'], 100000, empty=True, multiline=True)
        revision(value['revision'])
        rq.require(type(value['attachments']) is list and len(value['attachments']) <= 20, 'invalid_mail_attachments')
        for item in value['attachments']:
            fields(item, ['id','filename','content_type','size'])
            rq.identifier(item['id'])
            string(item['filename'], 255)
            rq.require('/' not in item['filename'] and '\\' not in item['filename'], 'unsafe_attachment_name')
            string(item['content_type'], 127)
            rq.require(re.fullmatch(r'[A-Za-z0-9!#$&^_.+-]+/[A-Za-z0-9!#$&^_.+-]+', item['content_type']) is not None, 'invalid_attachment_type')
            rq.require(type(item['size']) is int and 0 <= item['size'] <= 100000000, 'invalid_attachment_size')
        meta = value['provider_metadata']
        fields(meta, ['labels','classification'])
        rq.require(type(meta['labels']) is list and len(meta['labels']) <= 30, 'invalid_mail_labels')
        for label in meta['labels']:
            string(label, 100)
        rq.require(type(meta['classification']) is str and meta['classification'] in {'unknown','ordinary','advertising','security'}, 'invalid_mail_classification')
        return rq.canonical(value)

    def ingest_page(self, provider, mailbox_id, messages, *, cursor, next_cursor, complete):
        key = self._key(provider, mailbox_id)
        rq.require(type(messages) is list and len(messages) <= 100, 'mail_page_limit')
        sources = [(v['provider_id'], self._source(v)) for v in messages if type(v) is dict and 'provider_id' in v]
        rq.require(len(sources) == len(messages) and len(set(k for k, _ in sources)) == len(sources), 'invalid_or_duplicate_mail_messages')
        for token in (cursor, next_cursor):
            if token is not None:
                string(token, 512)
        rq.require(type(complete) is bool and (next_cursor is None) == complete and (next_cursor is None or next_cursor != cursor), 'invalid_mail_pagination')
        with self._transaction() as db:
            account = self._mailbox(db, key)
            sync = json.loads(account['sync'])
            rq.require(cursor is not None or sync['coverage'] != 'partial', 'mail_cursor_stale_or_repeated')
            seen = [] if cursor is None else sync['seen']
            rq.require(cursor is None or (cursor == sync['next_cursor'] and cursor not in seen), 'mail_cursor_stale_or_repeated')
            rq.require(next_cursor is None or next_cursor not in seen, 'mail_cursor_stale_or_repeated')
            seen = [*seen, cursor]
            rq.require(len(seen) <= 100, 'mail_page_limit')
            for message_id, source in sources:
                old = db.execute('SELECT * FROM mail_messages WHERE tenant=? AND project=? AND provider=? AND mailbox=? AND message=?', (*key, message_id)).fetchone()
                if old:
                    previous = json.loads(old['source'])
                    incoming = json.loads(source)
                    rq.require(incoming['rfc_message_id'] == previous['rfc_message_id'], 'mail_rfc_identity_changed')
                    rq.require(incoming['revision'] >= previous['revision'], 'stale_mail_source')
                    rq.require(incoming['revision'] != previous['revision'] or source == old['source'], 'mail_source_revision_conflict')
                    if source != old['source']:
                        db.execute('UPDATE mail_messages SET source=?,revision=revision+1 WHERE tenant=? AND project=? AND provider=? AND mailbox=? AND message=?', (source,*key,message_id))
                else:
                    db.execute('INSERT INTO mail_messages VALUES(?,?,?,?,?,?,1,0,?,0)', (*key,message_id,source,'open'))
            rq.require(db.execute('SELECT count(*) FROM mail_messages WHERE tenant=? AND project=? AND provider=? AND mailbox=?', key).fetchone()[0] <= 100, 'mail_snapshot_limit')
            sync = {'coverage':'complete' if complete else 'partial','cursor':cursor,'next_cursor':next_cursor,'seen':seen}
            db.execute('UPDATE mail_mailboxes SET sync=? WHERE tenant=? AND project=? AND provider=? AND mailbox=?', (rq.canonical(sync),*key))
        return self.messages(provider, mailbox_id)

    def _message(self, db, key, message_id):
        rq.identifier(message_id)
        row = db.execute('SELECT * FROM mail_messages WHERE tenant=? AND project=? AND provider=? AND mailbox=? AND message=?', (*key,message_id)).fetchone()
        rq.require(row is not None, 'mail_message_not_found')
        return row

    def _view(self, row):
        source = json.loads(row['source'])
        return {**source,'source_revision':source['revision'],'revision':row['revision'], 'read':bool(row['is_read']), 'task_status':row['task_status'],'local_archived':bool(row['archived'])}

    @contextmanager
    def _read_snapshot(self):
        with self.queue.connection(read_only=True) as db:
            db.execute('BEGIN')
            yield db
            db.execute('COMMIT')

    def _bounded(self, value):
        rq.require(len(rq.canonical(value).encode('utf-8')) <= 2 * 1024 * 1024, 'mail_projection_limit')
        return value

    def _messages(self, db, key):
        row = self._mailbox(db, key)
        sync = json.loads(row['sync'])
        mailbox = {'provider':key[2],'mailbox_id':key[3],'address':row['address'],'connector_status':'not_connected', 'sync':{k:sync[k] for k in ('coverage','cursor','next_cursor')}}
        result = {'mailbox':mailbox,'messages':[], 'pagination':mailbox['sync']}
        for row in db.execute('SELECT * FROM mail_messages WHERE tenant=? AND project=? AND provider=? AND mailbox=? ORDER BY message',key):
            result['messages'].append(self._view(row))
            self._bounded(result)
        return result

    def messages(self, provider, mailbox_id):
        key = self._key(provider, mailbox_id)
        with self._read_snapshot() as db:
            return self._messages(db, key)

    def _list_mailboxes(self, db):
        result = []
        for row in db.execute('SELECT provider,mailbox FROM mail_mailboxes WHERE tenant=? AND project=? ORDER BY provider,mailbox',(self.tenant,self.project)):
            value = self._messages(db, self._key(row['provider'], row['mailbox']))
            result.append({**value['mailbox'],'messages':value['messages']})
            self._bounded(result)
        return result

    def list_mailboxes(self):
        with self._read_snapshot() as db:
            return self._list_mailboxes(db)

    def _plan(self, account, source, mode):
        rq.require(type(mode) is str and mode in {'reply','reply-all','forward'}, 'invalid_mail_mode')
        own = account.casefold()
        def unique(values, excluded=()):
            seen = {own, *(v.casefold() for v in excluded)}
            result = []
            for value in values:
                if value.casefold() not in seen:
                    result.append(value)
                    seen.add(value.casefold())
            return result
        target = source['reply_to'] or [source['from']]
        to = unique(target + (source['to'] if mode == 'reply-all' else [])) if mode != 'forward' else []
        cc = unique(source['cc'], to) if mode == 'reply-all' else []
        return {'sender':account,'to':to,'cc':cc,'bcc':[],'reply_to':[],'mode':mode}

    def recipient_plan(self, provider, mailbox_id, message_id, mode):
        key = self._key(provider, mailbox_id)
        with self.queue.connection(read_only=True) as db:
            account = self._mailbox(db,key)
            row = self._message(db,key,message_id)
            return self._plan(account['address'],json.loads(row['source']),mode)

    def prepare(self, provider, mailbox_id, message_id, mode, expected_revision, *, to, cc, bcc, reply_to, text, signature_text, signature_html, idempotency_key):
        key = self._key(provider,mailbox_id)
        revision(expected_revision)
        rq.identifier(message_id)
        rq.identifier(idempotency_key)
        for group in (to,cc,bcc,reply_to):
            addresses(group)
        rq.require(bool(to) and len({v.casefold() for v in to+cc+bcc}) == len(to+cc+bcc), 'invalid_mail_recipients')
        string(text,100000,empty=True,multiline=True)
        string(signature_text,10000,empty=True,multiline=True)
        string(signature_html,20000,empty=True,multiline=True)
        rq.require(type(mode) is str and mode in {'reply','reply-all','forward'}, 'invalid_mail_mode')
        payload = rq.canonical({'provider':provider,'mailbox_id':mailbox_id,'message_id':message_id,'mode':mode,'expected_revision':expected_revision,'to':to,'cc':cc,'bcc':bcc,'reply_to':reply_to,'text':text,'signature_text':signature_text,'signature_html':signature_html})
        with self._transaction() as db:
            account = self._mailbox(db,key)
            rq.require(reply_to in ([],[account['address']]), 'mail_sender_identity_locked')
            old = db.execute('SELECT * FROM mail_outbox WHERE tenant=? AND project=? AND provider=? AND mailbox=? AND idempotency=?',(*key,idempotency_key)).fetchone()
            if old:
                rq.require(old['payload'] == payload, 'mail_idempotency_conflict')
                return self._outbox_view(old)
            row = self._message(db,key,message_id)
            rq.require(row['revision'] == expected_revision, 'stale_mail_revision')
            rq.require(db.execute('SELECT count(*) FROM mail_outbox WHERE tenant=? AND project=?',key[:2]).fetchone()[0] < 1000,'mail_outbox_limit')
            source = json.loads(row['source'])
            result = {**json.loads(payload),'id':str(uuid.uuid4()),'sender':account['address'],'state':'prepared','send_status':'unavailable','connector_status':'not_connected','recipient_plan':self._plan(account['address'],source,mode),'in_reply_to':source['rfc_message_id'] if mode != 'forward' else None}
            db.execute('INSERT INTO mail_outbox VALUES(?,?,?,?,?,?,?)',(*key,idempotency_key,payload,rq.canonical(result)))
            return result

    def set_local_state(self, provider, mailbox_id, message_id, expected_revision, *, read=None, task_status=None, local_archived=None):
        key = self._key(provider,mailbox_id)
        revision(expected_revision)
        rq.require(read is None or type(read) is bool, 'invalid_mail_read_state')
        rq.require(local_archived is None or type(local_archived) is bool, 'invalid_local_archive_state')
        rq.require(task_status is None or (type(task_status) is str and task_status in {'open','in_progress','done'}), 'invalid_mail_task_status')
        rq.require(any(v is not None for v in (read,task_status,local_archived)), 'empty_mail_state_change')
        with self._transaction() as db:
            self._mailbox(db,key)
            row = self._message(db,key,message_id)
            rq.require(row['revision'] == expected_revision, 'stale_mail_revision')
            db.execute('UPDATE mail_messages SET revision=revision+1,is_read=?,task_status=?,archived=? WHERE tenant=? AND project=? AND provider=? AND mailbox=? AND message=?',(row['is_read'] if read is None else int(read),row['task_status'] if task_status is None else task_status,row['archived'] if local_archived is None else int(local_archived),*key,message_id))
            return self._view(self._message(db,key,message_id))

    def _outbox_view(self, row):
        """Fail closed on malformed persisted states; no state implies dispatch."""
        try:
            payload = json.loads(row['payload'])
            result = json.loads(row['result'])
            payload_fields = {'provider','mailbox_id','message_id','mode','expected_revision','to','cc','bcc','reply_to','text','signature_text','signature_html'}
            fields(payload, payload_fields)
            fields(result, payload_fields | {'id','sender','state','send_status','connector_status','recipient_plan','in_reply_to'})
            rq.require(all(result[k] == payload[k] for k in payload_fields), 'invalid_persisted_outbox')
            rq.require(result['state'] == 'prepared' and result['send_status'] == 'unavailable' and result['connector_status'] == 'not_connected', 'invalid_persisted_outbox')
            rq.require(result['provider'] == row['provider'] and result['mailbox_id'] == row['mailbox'], 'invalid_persisted_outbox')
            self._key(result['provider'],result['mailbox_id'])
            rq.identifier(result['message_id'])
            rq.identifier(row['idempotency'])
            revision(result['expected_revision'])
            rq.require(type(result['mode']) is str and result['mode'] in {'reply','reply-all','forward'}, 'invalid_persisted_outbox')
            rq.require(type(result['id']) is str and str(uuid.UUID(result['id'])) == result['id'], 'invalid_persisted_outbox')
            address(result['sender'])
            for key in ('to','cc','bcc','reply_to'):
                addresses(result[key])
            rq.require(bool(result['to']) and len({v.casefold() for v in result['to']+result['cc']+result['bcc']}) == len(result['to']+result['cc']+result['bcc']), 'invalid_persisted_outbox')
            rq.require(result['reply_to'] in ([],[result['sender']]), 'invalid_persisted_outbox')
            for key, maximum in [('text',100000),('signature_text',10000),('signature_html',20000)]:
                string(result[key],maximum,empty=True,multiline=True)
            plan = result['recipient_plan']
            fields(plan,['sender','to','cc','bcc','reply_to','mode'])
            rq.require(plan['sender'] == result['sender'] and plan['mode'] == result['mode'], 'invalid_persisted_outbox')
            for key in ('to','cc','bcc','reply_to'):
                addresses(plan[key])
            if result['in_reply_to'] is not None:
                string(result['in_reply_to'],998)
                rq.require(re.fullmatch(r'<[^\s<>@]+@[^\s<>@]+>',result['in_reply_to']) is not None, 'invalid_persisted_outbox')
            return self._bounded(result)
        except (rq.QueueError, ValueError, TypeError, KeyError, AttributeError) as exc:
            raise rq.QueueError('unknown_mail_send_state') from exc

    def snapshot(self):
        with self._read_snapshot() as db:
            result = {'schema_version':'local-mail-1','binding':'local_only','mailboxes':self._list_mailboxes(db),'outbox':[]}
            self._bounded(result)
            for row in db.execute('SELECT * FROM mail_outbox WHERE tenant=? AND project=? ORDER BY rowid',(self.tenant,self.project)):
                result['outbox'].append(self._outbox_view(row))
                self._bounded(result)
            return result
