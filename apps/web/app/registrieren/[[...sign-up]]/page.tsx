import PublicExperience from "../../../components/PublicExperience";
import {publicExperienceData} from "../../../lib/catalog";
import { SignUp } from "@clerk/nextjs";
import { clerkConfiguration } from "../../../auth/policy";
import AuthAvailabilityNotice from "../../../components/AuthAvailabilityNotice";
export const dynamic = "force-dynamic";
export default function SignUpPage() {
  const ready=clerkConfiguration(process.env).ready;
  return <><section className="public-page">{ready&&<SignUp routing="path" path="/registrieren" signInUrl="/anmelden" forceRedirectUrl="/" /> }<AuthAvailabilityNotice kind="signup" ready={ready}/></section><PublicExperience page={publicExperienceData.pages.find(page=>page.id==="signup")!} data={publicExperienceData} documentTitle/></>;
}
