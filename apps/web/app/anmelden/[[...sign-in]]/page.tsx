import AuthForms from "../../../components/shop/AuthForms";
import {routeMetadata,localeOf} from "../../../lib/page-seo";
// Titel und Beschreibung kommen sprachabhängig aus dem Seitenkatalog (routeMetadata), kein fester deutscher Titel (KS-015).
export const generateMetadata = async ({searchParams}:{searchParams:Promise<{lang?:string|string[]}>}) => routeMetadata("login", false, localeOf((await searchParams).lang));
export default function SignInPage() {
  return <AuthForms mode="login" />;
}
