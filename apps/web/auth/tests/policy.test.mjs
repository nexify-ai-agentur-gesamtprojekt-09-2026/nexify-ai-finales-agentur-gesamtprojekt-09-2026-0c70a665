import test from "node:test";
import { createPublicKey, createHash } from "node:crypto";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canonicalPath, clerkConfiguration, privateDecision, privateRoute } from "../policy.ts";
const map = JSON.parse(readFileSync(new URL("../../../../config/site-map.json", import.meta.url)));
const paths = map.pages.filter(page => page.access.auth_required || page.access.visibility !== "public").map(page => page.path);
const env = { NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_bG9jYWwuZXhhbXBsZS5pbnZhbGlkJA==", CLERK_SECRET_KEY: "sk_live_" + "a".repeat(32), NODE_ENV: "production" };
test("missing, placeholder, mismatched and test production keys cannot initialize auth", () => {
  for (const value of [{}, { NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY }, {...env, CLERK_SECRET_KEY:"REPLACE_ME"}, {...env, CLERK_SECRET_KEY:"sk_test_"+"a".repeat(32)}, {...env, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.replace("live", "test"), CLERK_SECRET_KEY:env.CLERK_SECRET_KEY.replace("live", "test")}]) assert.equal(clerkConfiguration(value).ready, false);
  assert.deepEqual(clerkConfiguration(env), {ready:true});
  assert.equal(clerkConfiguration({...env, NODE_ENV:"development", APP_ENV:"production", NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.replace("live","test"), CLERK_SECRET_KEY:env.CLERK_SECRET_KEY.replace("live","test")}).ready,false);
});
test("malformed publishable keys never mount a broken Provider", () => {
  const invalid = ["pk_live_a", "pk_live_====", "pk_live_bm90LWEtaG9zdA==",
    ...["host.example", "host.example$$", "https://clerk.example$", "user@host.example$",
        "host.example/path$", "host..example$", "-host.example$", "host.example:443$",
        "host.example$\n", "host.\u0000example$"].map(value=>"pk_live_"+btoa(value))];
  for (const key of invalid) assert.equal(clerkConfiguration({...env, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:key}).ready,false,key);
  assert.equal(clerkConfiguration({...env, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:"pk_live_"+btoa("clerk.example.invalid$")}).ready,true);
});
test("all ten protected site routes and descendants stay protected after canonicalization", () => {
  assert.equal(paths.length,10);
  for (const path of paths) {
    for (const candidate of [path, path+"/detail", path.replaceAll("/", "%2F"), path.replaceAll("/", "%252f"), "/public/.."+path]) assert.equal(privateRoute(canonicalPath(candidate), paths),true,candidate);
  }
  for (const path of ["/", "/angebote", "/api/chat", "/teileklar", "/portal/kundeneu"]) assert.equal(privateRoute(path, paths),false);
  for (const path of ["/%", "/\\portal/kunde", "/portal%00/kunde", "/portal%0a/kunde", "//evil.invalid?x"]) assert.equal(canonicalPath(path),null);
});
test("verified identity never auto-grants business membership, admin or first-user rights", () => {
  assert.equal(privateDecision(false,null),"unavailable");
  assert.equal(privateDecision(false,"subject"),"unavailable");
  assert.equal(privateDecision(true,null),"sign_in");
  for (const subject of ["new-first-user", "admin", "customer@company.invalid"]) assert.equal(privateDecision(true,subject),"membership_required");
});
test("public visitor API bypasses Clerk and no frontend secret or role promotion is introduced", () => {
  const proxy=readFileSync(new URL("../../proxy.ts",import.meta.url),"utf8");
  assert.match(proxy,/if \(!protectedRoute && !authRoute\) return NextResponse.next\(\)/);
  assert.match(proxy,/status: 503/);assert.match(proxy,/status: 401/);assert.match(proxy,/status: 403/);
  const layout=readFileSync(new URL("../../app/layout.tsx",import.meta.url),"utf8");
  assert.doesNotMatch(layout,/CLERK_SECRET_KEY|secretKey=/);
  assert.doesNotMatch(proxy,/unsafeMetadata|publicMetadata|emailAddress|role\s*:/);
});

test("deployment origins are exact and the supplied public key stays inactive until issuer verification", () => {
  const settings = JSON.parse(readFileSync(new URL("../../../../config/clerk-production.json", import.meta.url)));
  assert.deepEqual(settings.auth.authorized_parties, ["https://nexifyai.cloud", "https://nexifyai.de"]);
  assert.equal(settings.domain_decision.switch_cloud_dns_before_final_acceptance, false);
  assert.equal(settings.auth.automatic_cross_domain_sso, false);
  const proxy = readFileSync(new URL("../../proxy.ts", import.meta.url), "utf8");
  assert.match(proxy, /authorizedParties: productionConfig.auth.authorized_parties/);
  assert.doesNotMatch(proxy, /jwtKey:/);
  const material = settings.jwt_verification_material;
  assert.equal(material.active_static_jwt_key, false);
  assert.equal(material.bound_to_issuer, false);
  const key = createPublicKey(readFileSync(new URL("../../../../config/public-keys/clerk-provided.pem", import.meta.url)));
  assert.equal(key.asymmetricKeyType, "rsa");
  assert.equal(key.asymmetricKeyDetails.modulusLength, 2048);
  assert.equal(createHash("sha256").update(key.export({type:"spki",format:"der"})).digest("hex"), material.spki_der_sha256);
});


test("only authoritative server Preview admits matching test keys in an optimized build", () => {
  const keys={NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:"pk_test_"+btoa("synthetic.example.invalid$"),CLERK_SECRET_KEY:"sk_test_"+"a".repeat(32)};
  for (const APP_ENV of [undefined,"preview"]) {
    assert.equal(clerkConfiguration({...keys,NODE_ENV:"production",VERCEL:"1",VERCEL_ENV:"preview",VERCEL_TARGET_ENV:"preview",APP_ENV}).ready,true);
  }
  assert.equal(privateDecision(true,"synthetic-subject"),"membership_required");
});

test("unknown conflicting and client-only environment markers never enable auth", () => {
  const testKeys={NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:"pk_test_"+btoa("synthetic.example.invalid$"),CLERK_SECRET_KEY:"sk_test_"+"a".repeat(32)};
  const liveKeys={NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,CLERK_SECRET_KEY:env.CLERK_SECRET_KEY};
  const invalid=[{}, {NODE_ENV:"development"}, {NODE_ENV:"test"},
    {NODE_ENV:"production",VERCEL:"1"},
    {NODE_ENV:"production",VERCEL:"1",VERCEL_ENV:"preview"},
    {NODE_ENV:"production",VERCEL:"1",VERCEL_ENV:"preview",VERCEL_TARGET_ENV:"production"},
    {NODE_ENV:"production",VERCEL:"1",VERCEL_ENV:"preview",VERCEL_TARGET_ENV:"staging"},
    {NODE_ENV:"production",VERCEL:"1",VERCEL_ENV:"production",VERCEL_TARGET_ENV:"preview"},
    {NODE_ENV:"production",VERCEL_TARGET_ENV:"preview"},
    {NODE_ENV:"production",VERCEL_ENV:"preview"},
    {NODE_ENV:"production",VERCEL:"0",VERCEL_ENV:"preview"},
    {NODE_ENV:"production",VERCEL:"true",VERCEL_ENV:"preview"},
    {NODE_ENV:"production",VERCEL:"1",VERCEL_ENV:"Preview"},
    {NODE_ENV:"production",VERCEL:"1",VERCEL_ENV:"staging"},
    {NODE_ENV:"production",VERCEL:"1",VERCEL_ENV:"preview",VERCEL_TARGET_ENV:"preview",APP_ENV:"production"},
    {NODE_ENV:"production",VERCEL:"1",VERCEL_ENV:"production",APP_ENV:"preview"},
    {NODE_ENV:"production",VERCEL:"1",VERCEL_ENV:"preview",VERCEL_TARGET_ENV:"preview",APP_ENV:"development"},
    {NODE_ENV:"production",APP_ENV:"preview"},
    {NODE_ENV:"production",APP_ENV:"unknown"},
    {NODE_ENV:"development",VERCEL:"1",VERCEL_ENV:"preview"}];
  for(const keys of [testKeys,liveKeys])for(const runtime of invalid)assert.equal(clerkConfiguration({...keys,...runtime}).ready,false,JSON.stringify(runtime));
  for(const runtime of [{NODE_ENV:"production"},{NODE_ENV:"production",APP_ENV:"production"},{NODE_ENV:"production",VERCEL:"0"},{NODE_ENV:"production",VERCEL:"1",VERCEL_ENV:"production"},{NODE_ENV:"production",VERCEL:"1",VERCEL_ENV:"production",APP_ENV:"production"},{NODE_ENV:"production",VERCEL:"1",VERCEL_ENV:"production",VERCEL_TARGET_ENV:"production"}]){
    assert.equal(clerkConfiguration({...liveKeys,...runtime}).ready,true);
    assert.equal(clerkConfiguration({...testKeys,...runtime}).ready,false);
  }
  assert.equal(clerkConfiguration({...testKeys,NODE_ENV:"production",NEXT_PUBLIC_VERCEL_ENV:"preview",NEXT_PUBLIC_VERCEL:"1"}).ready,false);
});

test("Preview keeps key parsing and pair modes fail closed without granting membership", () => {
  const runtime={NODE_ENV:"production",VERCEL:"1",VERCEL_ENV:"preview",VERCEL_TARGET_ENV:"preview"};
  for(const keys of [{},{NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:"pk_test_invalid",CLERK_SECRET_KEY:"sk_test_"+"a".repeat(32)},
    {NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:"pk_test_"+btoa("synthetic.example.invalid$"),CLERK_SECRET_KEY:env.CLERK_SECRET_KEY},
    {NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,CLERK_SECRET_KEY:"sk_test_"+"a".repeat(32)},
    {NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,CLERK_SECRET_KEY:env.CLERK_SECRET_KEY}])assert.equal(clerkConfiguration({...keys,...runtime}).ready,false);
  assert.equal(privateDecision(true,null),"sign_in");
  assert.equal(privateDecision(true,"synthetic-subject"),"membership_required");
});
