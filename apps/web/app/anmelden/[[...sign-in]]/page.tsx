import AuthForms from "../../../components/shop/AuthForms";
export const metadata = { title: "Anmelden · TEILEKLAR", robots: { index: false, follow: false } };
export default function SignInPage() {
  return <AuthForms mode="login" />;
}
