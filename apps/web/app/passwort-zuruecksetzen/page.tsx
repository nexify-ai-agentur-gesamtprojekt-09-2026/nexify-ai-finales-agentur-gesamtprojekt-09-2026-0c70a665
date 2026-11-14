import AuthForms from "../../components/shop/AuthForms";
export const metadata = { title: "Passwort zurücksetzen · NeXify AI" };
export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <AuthForms mode="reset" token={token} />;
}
