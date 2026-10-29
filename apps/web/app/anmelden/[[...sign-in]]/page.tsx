import PublicExperience from "../../../components/PublicExperience";
import {publicExperienceData} from "../../../lib/catalog";
import { SignIn } from "@clerk/nextjs";
import { clerkConfiguration } from "../../../auth/policy";
import AuthAvailabilityNotice from "../../../components/AuthAvailabilityNotice";
export const dynamic = "force-dynamic";
export default function SignInPage() {
  const ready=clerkConfiguration(process.env).ready;
  return <><section className="public-page">{ready&&<SignIn routing="path" path="/anmelden" signUpUrl="/registrieren" forceRedirectUrl="/" /> }<AuthAvailabilityNotice kind="login" ready={ready}/></section><PublicExperience page={publicExperienceData.pages.find(page=>page.id==="login")!} data={publicExperienceData} documentTitle/></>;
}
