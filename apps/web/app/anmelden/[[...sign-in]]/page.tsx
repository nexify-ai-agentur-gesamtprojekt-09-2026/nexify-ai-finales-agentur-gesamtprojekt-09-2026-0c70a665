import AuthForms from "../../../components/shop/AuthForms";
import {routeMetadata} from "../../../lib/page-seo";
export const generateMetadata = () => routeMetadata("login", false);
export default function SignInPage() {
  return <AuthForms mode="login" />;
}
