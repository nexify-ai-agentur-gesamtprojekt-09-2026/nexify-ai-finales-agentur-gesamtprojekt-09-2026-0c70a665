import AuthForms from "../../../components/shop/AuthForms";
import {routeMetadata,localeOf} from "../../../lib/page-seo";
export const generateMetadata = async ({searchParams}:{searchParams:Promise<{lang?:string|string[]}>}) => ({...routeMetadata("login", false, localeOf((await searchParams).lang)), title: "Anmelden · NeXify AI"});
export default function SignInPage() {
  return <AuthForms mode="login" />;
}
