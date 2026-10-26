"""Read complete HTML sources; inventory observable markup, infer proposed contracts.
No JavaScript execution, prototype edits, HTTP requests, or archive extraction.
"""
from pathlib import Path, PurePosixPath
from html.parser import HTMLParser
from collections import Counter, defaultdict
import hashlib, json, os, re, subprocess, datetime, urllib.parse, argparse

args_parser=argparse.ArgumentParser(description=__doc__)
args_parser.add_argument('--repo-n1',type=Path,default=Path(__file__).resolve().parents[1])
args_parser.add_argument('--repo-n2',type=Path)
args_parser.add_argument('--output-dir',type=Path)
args=args_parser.parse_args()
ROOTS={'N1':args.repo_n1.resolve(),'N2':(args.repo_n2 or args.repo_n1.resolve().parent/'nexify-ai-finales-agentur-gesamtprojekt-09-2026').resolve()}
OUT=(args.output_dir or ROOTS['N1']/'docs/contracts').resolve()
EXCLUDE={'.git','node_modules','.venv','venv','__pycache__','.cache','build','dist','.next','coverage'}
DOMAINS=['identity','tenants','inquiries','offers','projects','acceptance','documents','billing','api-access','model-inference','commerce','fitment','appointments','vouchers','affiliates','content','consent','data-rights','workspace','inbox','decisions','operations','administration','knowledge','learning','integrations','support','partners','media']

def digest(b):return hashlib.sha256(b).hexdigest()
def clean(s):
 s=re.sub(r'\s+',' ',s or '').strip()
 s=re.sub(r'(?:sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{20,}|glpat-[A-Za-z0-9_-]{20,})','[REDACTED]',s)
 return s
def url(s):
 s=clean(s)
 if '{{' in s or '}}' in s:return {'value':s,'kind':'dynamic_template'}
 try:
  u=urllib.parse.urlsplit(s)
  if u.scheme=='mailto':return {'value':'mailto:[recipient-redacted]','kind':'contact_link'}
  if u.scheme=='tel':return {'value':'tel:[number-redacted]','kind':'contact_link'}
  host=u.hostname or ''
  if u.port:host+=':'+str(u.port)
  query=[]
  for k,v in urllib.parse.parse_qsl(u.query,keep_blank_values=True):
   query.append((k,v if k in {'lang','weg','layout','tab','view','markt'} else '[value-redacted]'))
  safe=urllib.parse.urlunsplit((u.scheme,host if u.netloc else '',u.path,urllib.parse.urlencode(query),u.fragment))
  return {'value':safe,'kind':'external' if u.scheme in {'http','https'} or u.netloc else 'inline_javascript' if u.scheme=='javascript' else 'inline_data' if u.scheme=='data' else 'fragment' if s.startswith('#') else 'relative','query_values_redacted':bool(u.query and any(v=='[value-redacted]' for _,v in query))}
 except ValueError:return {'value':'[unparseable-url]','kind':'unparseable','sha256':digest(s.encode())}
def safe_expression(s):
 s=clean(s)
 if re.fullmatch(r'\{\{[\s\w.$!()&|?:-]+\}\}',s) or re.fullmatch(r'[\w.$]+\(\)',s):return {'symbolic_expression':s}
 return {'expression_sha256':digest(s.encode()),'identifier_candidates':sorted(set(re.findall(r'\b([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\(',s)))}

class PageParser(HTMLParser):
 def __init__(self):
  super().__init__(convert_charrefs=True)
  self.stack=[];self.meta=[];self.titles=[];self.headings=[];self.forms=[];self.controls=[];self.actions=[];self.links=[];self.resources=[];self.api=[];self.auth=[];self.scripts=[];self.nodes=0
 def handle_starttag(self,tag,attrs):
  self.nodes+=1;a={k.lower():v for k,v in attrs};line=self.getpos()[0]
  item={'tag':tag,'attrs':a,'text':[],'line':line,'refs':[]}
  if tag=='meta':self.meta.append({'line':line,'name':a.get('name') or a.get('property'),'content':clean(a.get('content'))})
  if tag=='form':
   f={'form_id':'form-'+str(len(self.forms)+1),'line':line,'id':a.get('id'),'method_attribute':a.get('method'),'action':url(a['action']) if a.get('action') else None,'event_attributes':{k:safe_expression(v) for k,v in a.items() if k.startswith('on') and v},'control_ids':[]}
   self.forms.append(f);item['form_id']=f['form_id']
  if tag in {'input','select','textarea'}:
   c={'control_id':'control-'+str(len(self.controls)+1),'line':line,'tag':tag,'type':a.get('type'),'name':a.get('name'),'id':a.get('id'),'required':'required' in a,'autocomplete':a.get('autocomplete'),'placeholder':clean(a.get('placeholder')),'input_value_omitted': 'value' in a}
   self.controls.append(c)
   for parent in reversed(self.stack):
    if 'form_id'in parent:
     next(f for f in self.forms if f['form_id']==parent['form_id'])['control_ids'].append(c['control_id']);break
  events={k:safe_expression(v) for k,v in a.items() if (k.startswith('on') or k.startswith('@')) and v}
  if tag=='button' or events or 'data-api-endpoint'in a:
   action={'action_id':'action-'+str(len(self.actions)+1),'tag':tag,'line':line,'id':a.get('id'),'button_type':a.get('type'),'aria_label':clean(a.get('aria-label')),'events':events,'label':None}
   if a.get('data-api-endpoint'):action['api_marker']=clean(a['data-api-endpoint'])
   self.actions.append(action);item['refs'].append(action)
  if a.get('href'):
   link={'tag':tag,'line':line,'rel':a.get('rel'),'target':a.get('target'),'href':url(a['href']),'label':None};self.links.append(link);item['refs'].append(link)
  if a.get('src'):
   self.resources.append({'tag':tag,'line':line,'src':url(a['src']),'original_relative':a['src'] if not urllib.parse.urlsplit(a['src']).scheme else None})
  if a.get('data-api-endpoint'):self.api.append({'line':line,'attribute':'data-api-endpoint','marker':clean(a['data-api-endpoint'])})
  for k,v in a.items():
   if re.search(r'loggedin|loggedout|auth|session|tenant|mandant|rolle|role|password|2fa|einmallink',k+' '+str(v),re.I):
    self.auth.append({'line':line,'tag':tag,'attribute':k,'symbolic_signal':clean(v) if k in {'type','name','id','autocomplete','role'} else safe_expression(v or ''),'enforcement_proven':False})
  if tag not in {'meta','link','input','img','br','hr','source','wbr','area','base','embed','param','track','col'}:self.stack.append(item)
 def handle_startendtag(self,tag,attrs):
  self.handle_starttag(tag,attrs)
  if self.stack and self.stack[-1]['tag']==tag:self.handle_endtag(tag)
 def handle_data(self,data):
  if self.stack and self.stack[-1]['tag'] in {'style','script'}:
   self.stack[-1]['text'].append(data);return
  for p in self.stack:
   if p['tag'] not in {'script','style'}:p['text'].append(data)
 def handle_endtag(self,tag):
  indices=[i for i,p in enumerate(self.stack) if p['tag']==tag]
  if not indices:return
  idx=indices[-1];items=self.stack[idx:];self.stack=self.stack[:idx]
  for item in reversed(items):self.finish(item)
 def finish(self,item):
  text=''.join(item['text']);label=clean(text)
  for ref in item['refs']:ref['label']=label
  if item['tag']=='title' and label:self.titles.append({'line':item['line'],'text':label})
  if item['tag'] in {'h1','h2','h3'} and label:self.headings.append({'level':int(item['tag'][1]),'line':item['line'],'text':label})
  if item['tag']=='script':self.scripts.append({'line':item['line'],'text':text,'src':item['attrs'].get('src')})
 def complete(self):
  for item in reversed(self.stack):self.finish(item)
  self.stack=[]

def script_signals(source):
 methods=[];auth=[];calls=[];events=[]
 for n,line in enumerate(source.splitlines(),1):
  m=re.match(r'^\s*(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^()\n]*\)\s*\{',line)
  if m and m[1] not in {'if','for','while','switch','catch','function'}:methods.append({'line':n,'method_name':m[1]})
  for match in re.finditer(r'\b(loggedIn|loggedOut|isAuthenticated|authenticated|session|currentUser|tenantId|tenant_id|role|roles)\s*[:=]\s*(true|false|null)',line):auth.append({'line':n,'state_key':match[1],'literal_state':match[2],'enforcement_proven':False})
  for match in re.finditer(r'\b(localStorage|sessionStorage)\.(getItem|setItem|removeItem)\s*\(\s*([\'"])([^\'"]+)\3',line):
   key=match[4]
   if re.search(r'auth|login|session|token|tenant|role',key,re.I):auth.append({'line':n,'storage':match[1],'operation':match[2],'key_name':clean(key),'stored_value_omitted':True,'enforcement_proven':False})
  for match in re.finditer(r'\b(fetch|axios\.(?:get|post|put|patch|delete))\s*\(\s*([\'"])([^\'"]+)\2',line):calls.append({'line':n,'call':match[1],'literal_target':url(match[3]),'runtime_executed':False})
  for match in re.finditer(r'addEventListener\s*\(\s*([\'"])([^\'"]+)\1',line):events.append({'line':n,'event':clean(match[2])})
 return {'method_candidates':methods,'auth_state_signals':auth,'literal_http_calls':calls,'event_bindings':events,'extraction':'static regex candidates, not a JavaScript AST or runtime proof'}

# Page role is derived from filename and documented purpose, never authenticated by noindex.
def classify(path,title):
 name=PurePosixPath(path).name.lower()
 if name in {'nx-header.dc.html','nx-footer.dc.html'}:return 'shared_component',['content','identity','consent'],['identity.session.read','consent.preferences.read']
 if 'anmeldung'in name:return 'authentication',['identity','tenants','consent'],['identity.login','identity.logout','identity.session.read','identity.mfa.verify']
 if 'api-recht'in name or 'rechtliches'in name:return 'legal_reference',['content','consent','data-rights'],['consent.documents.read','data-rights.requests.create']
 if 'kundenportal'in name or 'kundenwege'in name:return 'customer_portal',['identity','tenants','offers','projects','acceptance','documents','billing','api-access','support'],['offers.read','offers.accept','offers.decline','offers.change-request','projects.read','acceptance.record','documents.read','billing.invoices.read','support.tickets.create']
 if 'nachbarschaft'in name:return 'neighbourhood_portal',['identity','appointments','vouchers','partners'],['appointments.read','appointments.create','vouchers.redeem']
 if 'partnerportal'in name:return 'partner_portal',['identity','partners','appointments','vouchers','billing','documents'],['partners.profile.read','partners.profile.update','appointments.read','vouchers.create','billing.invoices.read']
 if 'affiliate'in name:return 'affiliate_portal',['identity','affiliates','billing'],['affiliates.attribution.read','affiliates.links.create','affiliates.commissions.read']
 if name=='konto.dc.html':return 'account_portal',['identity','tenants','appointments','vouchers','commerce','consent','data-rights','fitment'],['identity.session.read','identity.account.update','appointments.read','commerce.orders.read','consent.preferences.update','data-rights.requests.create']
 if 'workspace'in name:return 'internal_workspace',['identity','workspace','projects','decisions','model-inference','knowledge'],['workspace.runs.create','workspace.runs.read','decisions.read','model-inference.requests.create','knowledge.search']
 if 'posteingang'in name:return 'internal_inbox',['identity','inbox','inquiries','offers','decisions','documents'],['inbox.messages.read','inbox.drafts.create','decisions.read','offers.drafts.create']
 if 'leitstand'in name:return 'internal_control',['identity','operations','decisions','projects','learning'],['operations.health.read','decisions.read','projects.read','learning.candidates.read']
 if 'myadmin'in name or 'organisation'in name:return 'internal_administration',['identity','tenants','administration','projects','billing','affiliates','partners','inbox','decisions','integrations','operations','knowledge','learning'],['administration.dashboard.read','projects.read','billing.invoices.read','decisions.read','integrations.registry.read','knowledge.search','learning.candidates.read']
 if name=='nx-intern.dc.html':return 'internal_navigation',['identity','content','administration','operations'],['identity.session.read']
 if 'architektur'in name or 'systemkarte'in name:return 'internal_architecture_reference',['operations','integrations','administration'],['integrations.registry.read','operations.health.read']
 if 'zielverfolgung'in name:return 'internal_goal_tracking',['projects','administration','operations'],['projects.goals.read','projects.goals.update']
 if any(x in name for x in ['fitment','batterie-berater','reifenrechner']):return 'public_tool',['fitment','content'],['fitment.checks.create']
 if 'shop'in name:return ('production_commerce_reference' if 'teileklar'in name else 'demo_commerce_reference'),['commerce','fitment','vouchers','identity','consent','billing','model-inference'],['commerce.catalog.read','commerce.cart.update','commerce.orders.create','commerce.orders.read','commerce.returns.create','fitment.checks.create','vouchers.redeem']
 if 'one.dc.html'in name or 'nexify api'in name:return 'public_ai_product',['content','identity','api-access','billing','model-inference','workspace'],['api-access.keys.create','api-access.keys.revoke','api-access.usage.read','billing.topups.create','model-inference.requests.create']
 if 'companion'in name:return 'public_ai_assistant',['model-inference','knowledge','inquiries','content'],['model-inference.requests.create','knowledge.search','inquiries.create']
 if 'werkstatt-partnerseite'in name or 'partner-werden'in name:return 'public_partner_content',['content','partners','appointments','inquiries'],['partners.applications.create','appointments.availability.read','inquiries.create']
 if 'e-mail'in name:return 'email_template',['content','documents','offers' if 'angebot'in name else 'consent'],['documents.templates.read']
 if any(x in name for x in ['broschuere','powerpoint','visitenkarte','geschaeftsdokumente']):return 'print_document_reference',['content','documents'],['documents.templates.read']
 if 'designsystem'in name or path.startswith('packages/ui/'):return 'design_reference',['content'],[]
 if 'cloud v12'in name:return 'public_agency_site',['content','inquiries','model-inference','knowledge','media'],['content.pages.read','inquiries.create','model-inference.requests.create','knowledge.search','media.assets.read']
 if 'local-seo'in name or 'wissenshub'in name:return 'public_content',['content','knowledge','inquiries'],['content.pages.read','knowledge.search','inquiries.create']
 if name in {'apps-index.html','index.html','preview-prototypes.html','start.dc.html'}:return 'reference_navigation',['content','operations'],[]
 return 'unclassified_html',['content'],[]

def api_proposal(marker):
 marker=clean(marker);match=re.match(r'^(GET|POST|PUT|PATCH|DELETE)\s+(.+)$',marker,re.I)
 declared_method=match[1].upper() if match else None;route=match[2] if match else marker
 low=route.lower();method=declared_method or ('GET' if any(x in low for x in ['/pdf','documents/','/usage','/ledger','/reports']) else 'POST' if any(x in low for x in ['login','logout','accept','decline','change-request','orders','/pay','topup','tickets','submit']) else None)
 return {'observed_marker':marker,'suggested_method':method,'method_status':'observed_literal' if declared_method else 'derived_candidate' if method else 'undetermined','suggested_path':route if route.startswith('/v1/') else '/v1/'+route.lstrip('/'),'path_status':'observed_literal' if route.startswith('/v1/') else 'derived_v1_namespace','implemented':False}

pages=[];sources=[];discovery=[];docindex={};errors=[]
for repo,root in ROOTS.items():
 tracked={s.decode('utf-8','surrogateescape') for s in subprocess.check_output(['git','-C',str(root),'ls-files','-z']).split(b'\0') if s}
 htmls=[];docs=[];excluded=[]
 def onerror(exc):errors.append({'repository':repo,'path':str(exc.filename),'error':type(exc).__name__})
 for parent,dirs,files in os.walk(root,followlinks=False,onerror=onerror):
  for d in list(dirs):
   p=Path(parent)/d
   if d in EXCLUDE or p.is_symlink():excluded.append(str(p.relative_to(root)));dirs.remove(d)
  for f in files:
   p=Path(parent)/f
   if p.suffix.lower() in {'.html','.htm'}:htmls.append(p)
   elif p.suffix.lower()=='.md' and 'docs/contracts/' not in str(p.relative_to(root)):docs.append(p)
 doclines=[]
 for p in sorted(docs):
  raw=p.read_bytes();source={'repository':repo,'path':str(p.relative_to(root)),'sha256':digest(raw),'kind':'documentation','hash_policy':'historical_snapshot_only_not_a_live_hash_guard'};sources.append(source)
  doclines.extend((source['path'],n,clean(line)) for n,line in enumerate(raw.decode('utf-8','replace').splitlines(),1))
 raw_remote=subprocess.check_output(['git','-C',str(root),'remote','get-url','origin'],text=True).strip()
 remote_url=urllib.parse.urlsplit(raw_remote)
 remote_path=(remote_url.path if remote_url.scheme else raw_remote.split(':',1)[-1]).strip('/').removesuffix('.git')
 remote_host=remote_url.hostname if remote_url.scheme else raw_remote.split(':',1)[0].rsplit('@',1)[-1]
 discovery.append({'repository':repo,'root':str(root),'mount_path':root.name,'origin':{'host':remote_host,'name':remote_path},'head':subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD'],text=True).strip(),'html_count':len(htmls),'documentation_files_read':len(docs),'excluded_directories':excluded,'excludes_generated_contract_docs_from_document_crossrefs':True})
 for p in sorted(htmls):
  rel=str(p.relative_to(root));page_id=repo+':'+rel
  if p.is_symlink() and not p.resolve().is_relative_to(root):errors.append({'page_id':page_id,'error':'external_symlink_not_read'});continue
  raw=p.read_bytes();html=raw.decode('utf-8','replace');parser=PageParser()
  try:parser.feed(html);parser.close();parser.complete()
  except Exception as e:errors.append({'page_id':page_id,'error':type(e).__name__});raise
  basename=p.name;docrefs=[{'path':path,'line':n,'excerpt':text[:600],'excerpt_truncated':len(text)>600} for path,n,text in doclines if basename in text]
  title=parser.titles[0]['text'] if parser.titles else parser.headings[0]['text'] if parser.headings else basename
  description=next((m['content'] for m in parser.meta if m['name']=='description' and m['content'] and m['content'].lower() not in {'seite','page'}),None)
  role,domains,capabilities=classify(rel,title)
  declarations=[]
  for line_n,line_text in enumerate(html.splitlines(),1):
   for m in re.finditer(r'TODO\(BACKEND\):?\s*(?:(GET|POST|PUT|PATCH|DELETE)\s+([^\s<]+))?([^<]*)',line_text,re.I):
    declarations.append({'line':line_n,'method':m[1].upper() if m[1] else None,'path':clean(m[2]) if m[2] else None,'note':clean(m[0].removesuffix('-->'))})
  proposals=[];endpoint_conflicts=[]
  marker_caps={'auth/login':'identity.login','auth/register':'identity.register','offers/{id}/pdf':'offers.pdf.read','offers/{id}/change-request':'offers.change-request','offers/{id}/decline':'offers.decline','offers/{id}/accept':'offers.accept','billing/invoices/{id}/pdf':'billing.invoices.read','billing/invoices/{id}/pay':'billing.invoices.pay','crosssell/orders':'commerce.crosssell.orders.create','documents/{id}':'documents.read','customer/appointments/{id}/status':'appointments.status.update','customer/vouchers/redeem':'vouchers.redeem','customer/appointments':'appointments.create','account/data-rights':'data-rights.requests.create','POST /v1/requests':'inquiries.create','partner/appointments/{id}/status':'appointments.status.update','partner/vouchers/orders':'vouchers.orders.create','partner/profile':'partners.profile.update'}
  for marker in parser.api:
   proposal=api_proposal(marker['marker']);proposal['source_line']=marker['line']
   nearby=[d for d in declarations if d['method'] and 0<=marker['line']-d['line']<=3]
   if nearby:
    decl=nearby[-1];proposal['nearby_backend_declaration']=decl
    route=re.sub(r'^(GET|POST|PUT|PATCH|DELETE)\s+','',marker['marker'],flags=re.I)
    if decl['path']==route:
     proposal['suggested_method']=decl['method'];proposal['method_status']='observed_backend_todo_not_implemented'
    else:
     endpoint_conflicts.append({'marker':marker,'nearby_declaration':decl,'status':'different_literal_paths_do_not_silently_unify'})
   proposals.append(proposal)
   if marker['marker'] in marker_caps and marker_caps[marker['marker']] not in capabilities:capabilities.append(marker_caps[marker['marker']])
  for cap in capabilities:
   domain=cap.split('.',1)[0]
   if domain in DOMAINS and domain not in domains:domains.append(domain)
  script_rows=[]
  for script in parser.scripts:
   if script['text'].strip():script_rows.append({'kind':'inline_script','line':script['line'],'sha256':digest(script['text'].encode()),'signals':script_signals(script['text'])})
  for resource in parser.resources:
   if resource['tag']!='script' or not resource['original_relative']:continue
   target=resource['original_relative']
   if '{{' in target:continue
   local=(p.parent/urllib.parse.unquote(urllib.parse.urlsplit(target).path)).resolve()
   if not local.is_relative_to(root):continue
   if local.is_file():
    b=local.read_bytes();script_rows.append({'kind':'direct_local_script','path':str(local.relative_to(root)),'sha256':digest(b),'signals':script_signals(b.decode('utf-8','replace'))})
   else:script_rows.append({'kind':'direct_local_script','path':str(local.relative_to(root)),'missing':True})
  unresolved=[]
  for collection,key in [(parser.links,'href'),(parser.resources,'src')]:
   for item in collection:
    ref=item[key]
    if ref['kind']!='relative':continue
    u=urllib.parse.urlsplit(ref['value']);pathpart=urllib.parse.unquote(u.path)
    if not pathpart or pathpart.startswith(('javascript:','data:')):continue
    target=(root/pathpart.lstrip('/') if pathpart.startswith('/') else p.parent/pathpart).resolve()
    item['local_resolution']={'path':str(target.relative_to(root)) if target.is_relative_to(root) else None,'within_repository':target.is_relative_to(root),'exists':target.exists() if target.is_relative_to(root) else False}
    if not item['local_resolution']['exists']:unresolved.append({'line':item['line'],'reference':ref['value'],'kind':key})
  observed={'titles':parser.titles,'meta':parser.meta,'headings':parser.headings,'forms':parser.forms,'controls':parser.controls,'actions':parser.actions,'links':parser.links,'resources':parser.resources,'api_markers':parser.api,'backend_todos':declarations,'backend_endpoint_conflicts':endpoint_conflicts,'auth_markup_signals':parser.auth,'script_sources':script_rows,'document_references':docrefs,'unresolved_local_references':unresolved,'parsed_html_element_count':parser.nodes}
  page={'page_id':page_id,'repository':repo,'path':rel,'sha256':digest(raw),'bytes':len(raw),'tracked':rel in tracked,'title':title,'purpose':{'text':description or title,'status':'observed_meta_description' if description else 'derived_from_heading_or_title','source':{'repository':repo,'path':rel}},'observed':observed,'derived':{'page_role':role,'domains':domains,'proposed_required_operations':capabilities,'api_proposals':proposals,'auth_requirement':{'authenticated_proposed':role.startswith(('internal_','customer_portal','partner_portal','affiliate_portal','account_portal','neighbourhood_portal')),'enforcement_verified':False,'source_basis':'page purpose + AGENTS.md + docs/09-final/05 and 14; prototype auth state is not an authorization boundary'},'status':'derived_target_contract_candidates','confidence':'needs_contract_review'},'runtime_validation':{'executed':False,'backend_connected':False,'visual_or_interaction_tested':False},'limitations':['Static markup, direct local scripts and heuristic method/event patterns are inventoried; dynamic JavaScript-generated controls, imported module behavior and server authorization need separate runtime/contract verification.','Cross-reference documentation may contain historical or conflicting statements; it is not approval or proof of current deployment.']}
  pages.append(page)

byhash=defaultdict(list);byname=defaultdict(list);byrole=defaultdict(list);bydomain=defaultdict(list);bycapability=defaultdict(list)
for p in pages:
 byhash[p['sha256']].append(p['page_id']);byname[PurePosixPath(p['path']).name].append(p['page_id']);byrole[p['derived']['page_role']].append(p['page_id'])
 for d in p['derived']['domains']:bydomain[d].append(p['page_id'])
 for c in p['derived']['proposed_required_operations']:bycapability[c].append(p['page_id'])
result={'schema_version':1,'created_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Complete discovered HTML inventory N1 and N2, static evidence plus proposed domain/API/auth derivation; no executable prototype copying, no live API claim','discovery':discovery,'coverage':{'html_discovered':sum(x['html_count'] for x in discovery),'html_catalogued':len(pages),'html_read_to_end':True,'javascript_executed':False,'source_errors':errors,'all_discovered_html_catalogued':sum(x['html_count'] for x in discovery)==len(pages)},'status_definitions':{'observed':'Literal source markup/text/hashes or a documentation reference, not observed runtime behavior','derived':'Proposed domain, capability, auth requirement or normalized API path inferred from source purpose; review against target contract','verified_runtime':'Not provided by this static inventory'},'domain_vocabulary':DOMAINS,'pages':pages,'groups':{'by_role':dict(sorted(byrole.items())),'by_domain':dict(sorted(bydomain.items())),'by_proposed_capability':dict(sorted(bycapability.items())),'exact_content_duplicates':[{'sha256':h,'page_ids':ids} for h,ids in sorted(byhash.items()) if len(ids)>1],'same_filename_families':[{'filename':name,'page_ids':ids,'different_content':len({p['sha256'] for p in pages if p['page_id'] in ids})>1} for name,ids in sorted(byname.items()) if len(ids)>1]},'documentation_sources':sources,'documentation_hash_policy':'All documentation hashes are historical scan snapshots, not guards against later PROGRESS/state updates; validate current HTML hashes and referenced normative contract source files separately','deficits':{'original_factory_openapi_contract_recovered':False,'prototype_markers_are_placeholders_not_live_routes':True,'runtime_auth_enforcement_not_proven':True,'archive_contents_excluded':True,'referenced_js_module_graph_not_exhaustively_executed':True,'media_provider_contract':{'status':'user_reported_not_verified','runway':'User reports videos in Runway and missing create action; no provider action verified by this catalog','voices':['Nex','AIFly','user voice reported by user'],'elevenlabs_via_composio':'user_reported; exposed tool/action and provider contract not verified; no tool names invented','authoritative_context_file':'docs/contracts/hero-media.json if provided by coordinator'}}}
assert result['coverage']['all_discovered_html_catalogued'] and not errors
assert len({p['page_id'] for p in pages})==len(pages)
assert all(set(p['derived']['domains'])<=set(DOMAINS) for p in pages)
OUT.mkdir(parents=True,exist_ok=True);out=OUT/'prototype-pages.json';out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');assert json.loads(out.read_text())==result
lines=['# Vollständiger statischer Seiten- und Funktionskatalog','',f"Stand: {result['created_at']}. Datenquelle: `prototype-pages.json`. Status: abgeleiteter Zielvertrag mit wortgetreuen statischen Quellenbelegen; keine Live- oder Produktabnahme.",'','## Umfang','','| Repository | HTML vollständig erfasst | Markdown-Dateien gelesen |','|---|---:|---:|']
for d in discovery:lines.append(f"| {d['repository']} | {d['html_count']} | {d['documentation_files_read']} |")
lines+=['',f"Insgesamt {len(pages)} HTML-Dateien; alle vollständig gelesen und geparst, auch außerhalb von prototypen/. Keine Archivextraktion und keine JavaScript-Ausführung. Vollständige Pfade, SHA256, Titel, Zweck, Formulare, Steuerelemente, Aktionen, Links, Authsignale und direkte lokale Skriptquellen stehen je Seite im JSON. Ressourcen-/Navigationsverweise werden lokal auf Existenz geprüft, ohne externe Seiten aufzurufen.",'','`observed` bedeutet hier ausschließlich statisch im Quelltext vorhanden. `derived` enthält vorgeschlagene Domains, Fähigkeiten, API-Pfade/Methoden und Auth-Anforderungen. Formularattribute, noindex, loggedIn-Variablen und clientseitiger SessionStorage beweisen keine serverseitige Autorisierung. HTML-Inputwerte werden nicht ausgegeben; Kontaktziele und sensible URL-Parameter sind redigiert. Ausführbare Scriptkörper werden nicht kopiert.','','## Alle Seiten','','| Page-ID | Titel / Bestimmung | Abgeleitete Rolle | Domains | Aktionen / Formulare / API-Marker |','|---|---|---|---|']
for p in pages:
 obs=p['observed'];lines.append(f"| `{p['page_id']}` | {p['title'].replace('|','/')} | {p['derived']['page_role']} | {', '.join(p['derived']['domains'])} | {len(obs['actions'])} / {len(obs['forms'])} / {len(obs['api_markers'])} |")
lines+=['','## Gruppierung und Dubletten','',f"{len(result['groups']['exact_content_duplicates'])} Gruppen mit exakt gleichem SHA256. Gleichnamige Dateien bilden zusätzlich Familien; unterschiedliche Hashes bleiben getrennte Versionen. Es wird keine kanonische Quelle allein aus dem Dateinamen oder dem größeren Repository abgeleitet.",'','## API-/Auth-Ableitung','','- Stabile Seiten-ID: `N1:<relativer-Pfad>` bzw. `N2:<relativer-Pfad>`. Die Contractdateien können diese IDs als Herkunft referenzieren.','- `proposed_required_operations` enthält vorgeschlagene Capability-Strings, keine zugesicherten API-operationIds oder MCP-Toolnamen.','- `data-api-endpoint` wird exakt inventarisiert; ein daraus ergänztes `/v1/` oder HTTP-Verfahren ist ausdrücklich abgeleitet.','- Ziel-Auth folgt Seitenzweck und technischem Soll: öffentliche Inhalte/Anfragen, Konto-/Mandantenkontext für private Portale, zusätzliche Rollen/MFA/Freigaben für interne und folgenreiche Aktionen. Konkrete Durchsetzung und Scopeprüfung gehören in den separat geprüften API-/Auth-Vertrag.','- NeXify-Factory-Zielvertrag `/v1` und Affilinet-Ist-API `/api` bleiben getrennt. Kein Nachweis, dass eine Affilinet-Route die NeXify-Referenz bereits implementiert.','','## Quelldefizite und Grenzen','','- Die HTMLs sind Design-/Verhaltensreferenzen. Einige Aktionen sind lokale Zustandswechsel oder Download-Muster; Backend-TODOs sind keine vorhandenen Funktionen.','- Dynamisch erzeugtes DOM und transitiv importierte Modulabläufe sind ohne isolierten Runtime-Test nicht vollständig bewiesen; alle HTML-Dateien sind dennoch vollständig im Katalog enthalten.','- Historische Dokumentverweise enthalten teils nicht mehr gültige Preise, Pfade und Freigabestände. Sie werden mit Quellenort geführt und nicht automatisch produktiv übernommen.','- Relative Rootpfade können für den geplanten Webserver sinnvoll sein, obwohl keine gleichnamige Datei im Checkout existiert. Solche Fälle sind als unresolved_local_references sichtbar, keine pauschale Behauptung eines Live-Linkfehlers.','- Kein wiederhergestellter historischer OpenAPI-Vertrag, keine technische Auth-Abnahme, keine verifizierte Gesellschafts-/Provideridentität.','- Medien/HeroVideo ist user_reported: Runway-Videos mit gemeldeter fehlender create-Aktion; Nex/AIFly/eigene Stimme; ElevenLabs über Composio. Dieser Katalog verifiziert weder die Assets noch die Tool-Exposition. Maßgeblicher ergänzender Kontext: hero-media.json des Koordinators; keine Action-/Toolnamen erfinden.','','## Wiederholbarkeit','','Generator: `python3 tools/catalog_factory_pages.py --repo-n2 <Pfad-zum-N2-Checkout>`. Standard N1 ist das Repository des Generators; N2 ist standardmäßig der gleichnamige Nachbarcheckout. `--repo-n1` und `--output-dir` erlauben andere Checkouts/Artefaktverzeichnisse. Dokumentationshashes sind historische Scanbelege; Änderungen von PROGRESS.md lösen allein keinen notwendigen Neuscan aus. Neue oder geänderte HTML-Dateien ändern Katalogeinträge/Hashes. Alle Quellen unverändert lassen; Katalog und Vertrag müssen nach Quellenänderungen erneut abgeglichen werden.']
conflicts=[(p['page_id'],c) for p in pages for c in p['observed']['backend_endpoint_conflicts']]
if conflicts:
 lines+=['','## Beobachtete widersprüchliche Endpoint-Schreibweisen','','| Seite | DOM-Marker | Benachbarter Backend-TODO | Status |','|---|---|---|---|']
 for page_id,c in conflicts:
  lines.append(f"| `{page_id}` | `{c['marker']['marker']}` | `{c['nearby_declaration']['method']} {c['nearby_declaration']['path']}` | Getrennt beobachtet; Zielvertrag entscheidet explizit. |")
(OUT/'prototype-pages.md').write_text('\n'.join(lines)+'\n')
print(json.dumps({'pages':len(pages),'per_repository':{d['repository']:d['html_count'] for d in discovery},'roles':{k:len(v) for k,v in byrole.items()},'actions':sum(len(p['observed']['actions']) for p in pages),'forms':sum(len(p['observed']['forms']) for p in pages),'api_markers':sum(len(p['observed']['api_markers']) for p in pages),'exact_duplicate_groups':len(result['groups']['exact_content_duplicates']),'unclassified':[p['page_id'] for p in pages if p['derived']['page_role']=='unclassified_html'],'output':str(out),'bytes':out.stat().st_size},ensure_ascii=False))
