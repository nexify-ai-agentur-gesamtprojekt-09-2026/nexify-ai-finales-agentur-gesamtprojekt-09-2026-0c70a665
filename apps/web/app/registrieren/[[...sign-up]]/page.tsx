import AuthForms from "../../../components/shop/AuthForms";
import {routeMetadata,localeOf} from "../../../lib/page-seo";
export const generateMetadata = async ({searchParams}:{searchParams:Promise<{lang?:string|string[]}>}) => routeMetadata("signup", false, localeOf((await searchParams).lang));
export default function SignUpPage() {
  return <AuthForms mode="register" />;
}
