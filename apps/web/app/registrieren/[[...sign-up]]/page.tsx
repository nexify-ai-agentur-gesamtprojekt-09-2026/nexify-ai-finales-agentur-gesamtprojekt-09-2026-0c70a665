import AuthForms from "../../../components/shop/AuthForms";
import {routeMetadata} from "../../../lib/page-seo";
export const generateMetadata = () => routeMetadata("signup", false);
export default function SignUpPage() {
  return <AuthForms mode="register" />;
}
