import React, { useEffect } from 'react';
import { Routes, Route, useLocation, Outlet } from 'react-router-dom';
import { AuthProvider } from './auth.jsx';
import { Header, Footer } from './ui.jsx';
import { Home, ContentPage, Preise, Unternehmen, Kontakt, Briefing, Termin, ApiDocs, Skills, Verbindungen, Hilfe, NotFound } from './agency.jsx';
import { Legal } from './legal.jsx';
import { TkLayout, TkHome, TkCatalog, TkProduct, TkCart, TkCheckout, TkOrder, TkOrders, TkWorkshops, TkPartner, TkSupport, TkAdmin } from './shop.jsx';
import { Login, WsLayout, Dashboard, Chat, Projects, Documents, Offers, ApiKeys, Team } from './workspace.jsx';
import { OrientationChat } from './orientation.jsx';

function Agency() { return <><Header /><Outlet /><Footer /></>; }
function ScrollTop() { const { pathname } = useLocation(); useEffect(() => { window.scrollTo(0, 0); }, [pathname]); return null; }

export default function App() {
  return <AuthProvider><ScrollTop /><OrientationChat /><Routes>
    <Route element={<Agency />}>
      <Route index element={<Home />} />
      <Route path="leistungen" element={<ContentPage slug="leistungen" />} />
      {['marke', 'websites', 'automatisierung', 'ki-agenten', 'marketing', 'seo'].map(s => <Route key={s} path={'leistungen/' + s} element={<ContentPage slug={s} />} />)}
      <Route path="zusammenarbeit" element={<ContentPage slug="zusammenarbeit" />} />
      <Route path="care" element={<ContentPage slug="care" />} />
      <Route path="referenzen" element={<ContentPage slug="referenzen" />} />
      <Route path="produkte" element={<ContentPage slug="produkte" />} />
      {['nex2fly', 'one', 'oracle', 'api'].map(s => <Route key={s} path={'produkte/' + s} element={<ContentPage slug={s} />} />)}
      <Route path="produkte/api/dokumentation" element={<ApiDocs />} />
      <Route path="preise" element={<Preise />} />
      <Route path="unternehmen" element={<Unternehmen />} />
      <Route path="kontakt" element={<Kontakt />} />
      <Route path="projektbriefing" element={<Briefing />} />
      <Route path="termin" element={<Termin />} />
      <Route path="skills" element={<Skills />} />
      <Route path="verbindungen" element={<Verbindungen />} />
      <Route path="hilfe" element={<Hilfe />} />
      <Route path="rechtliches/:doc" element={<Legal />} />
      <Route path="anmelden" element={<Login />} />
      <Route path="*" element={<NotFound />} />
    </Route>
    <Route path="arbeitsbereich" element={<WsLayout />}>
      <Route index element={<Dashboard />} />
      <Route path="chat" element={<Chat />} />
      <Route path="projekte" element={<Projects />} />
      <Route path="dokumente" element={<Documents />} />
      <Route path="angebote" element={<Offers />} />
      <Route path="api-schluessel" element={<ApiKeys />} />
      <Route path="team" element={<Team />} />
    </Route>
    <Route path="teileklar" element={<TkLayout />}>
      <Route index element={<TkHome />} />
      <Route path="katalog" element={<TkCatalog />} />
      <Route path="produkt/:id" element={<TkProduct />} />
      <Route path="warenkorb" element={<TkCart />} />
      <Route path="kasse" element={<TkCheckout />} />
      <Route path="bestellung/:id" element={<TkOrder />} />
      <Route path="bestellungen" element={<TkOrders />} />
      <Route path="werkstaetten" element={<TkWorkshops />} />
      <Route path="partner" element={<TkPartner />} />
      <Route path="support" element={<TkSupport />} />
      <Route path="admin" element={<TkAdmin />} />
      <Route path="rechtliches/:doc" element={<Legal shop />} />
    </Route>
  </Routes></AuthProvider>;
}
